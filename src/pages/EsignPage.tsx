import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Loader2, XCircle, Clock, CheckCircle2, FileText, ExternalLink, ShieldCheck, Ban,
} from 'lucide-react';

/**
 * PUBLIC e-signature page — /esign/:token (design §4.2, slice C2).
 *
 * The eighth public route, and the RequestPage conventions throughout: branded
 * Shell/Terminal wrappers, validated accent hex, deadFirm branding on 410s,
 * mobile-first. No auth — the token in the URL is the credential.
 *
 * TWO THINGS THIS PAGE DOES DIFFERENTLY, both because signing is a legal act:
 *
 *   · THE PDF IS ALWAYS REACHABLE BY LINK, not only by embed. An <iframe> of a
 *     PDF is unreliable on iOS Safari — it can render blank, or download, or
 *     show a grey box — and most clients open these on a phone. So the
 *     "Open the document" link is not a fallback tucked under an error state:
 *     it is always visible, above the viewer. Nobody should be asked to sign
 *     something they could not open.
 *
 *   · THE CONSENT SENTENCE IS SHOWN VERBATIM, comes from the server, and is
 *     the same string stamped onto the certificate page. A signer sees exactly
 *     the words the PDF will later say they agreed to.
 */

const API_ROOT = (import.meta.env.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api').replace(/\/api\/?$/, '');
const NAVY = '#1a365d';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Firm {
  name: string; logoUrl: string | null; accentColor: string | null;
  address: string | null; licenceNumber: string | null;
  supportEmail: string; phone: string | null;
}
interface Evidence {
  signedAt: string | null; signatureName: string | null; signatureEmail: string | null;
  consentConfirmed: boolean | null; documentFingerprint: string | null;
}
interface Payload {
  status: 'sent' | 'viewed' | 'signed';
  title: string; message: string | null;
  signerName: string | null; signerEmail: string | null;
  documentName: string | null; sourcePdfUrl: string | null;
  firstViewedAt: string | null; consentStatement: string;
  firm: Firm;
  evidence?: Evidence; signedPdfUrl?: string | null; stampedCopy?: 'ready' | 'pending';
}

type Phase = 'loading' | 'view' | 'signed' | 'declined' | 'cancelled' | 'expired' | 'notfound' | 'error';

export function EsignPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [data, setData] = useState<Payload | null>(null);
  const [deadFirm, setDeadFirm] = useState<Firm | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [declining, setDeclining] = useState(false);
  const [declineName, setDeclineName] = useState('');
  const [declineReason, setDeclineReason] = useState('');

  const load = async () => {
    try {
      const res = await fetch(`${API_ROOT}/esign/${token}`);
      if (res.status === 404) return setPhase('notfound');
      if (res.status === 410) {
        const json = await res.json().catch(() => ({}));
        if (json?.firm) setDeadFirm(json.firm);
        return setPhase(json?.state === 'declined' ? 'declined'
          : json?.state === 'cancelled' ? 'cancelled' : 'expired');
      }
      if (!res.ok) return setPhase('error');
      const json = await res.json();
      const d: Payload = json.data;
      setData(d);
      setName((n) => n || d.signerName || '');
      setEmail((e) => e || d.signerEmail || '');
      setPhase(d.status === 'signed' ? 'signed' : 'view');
    } catch { setPhase('error'); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [token]);

  const canSign = !!name.trim() && EMAIL_RE.test(email.trim()) && consent && !busy;

  const sign = async () => {
    if (!canSign) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API_ROOT}/esign/${token}/sign`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), consent: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setData((d) => (d ? { ...d, ...json.data } : d)); return setPhase('signed'); }
      if (res.status === 409 && json?.error === 'already_signed') { await load(); return; }
      if (res.status === 409 && json?.error === 'document_changed') {
        // The one refusal a signer must not be allowed to shrug off.
        return setError('This document has changed since it was sent to you, so it cannot be signed. Please contact us for a fresh copy.');
      }
      if (res.status === 409) return setError('The document could not be read. Please contact us.');
      if (res.status === 410) { await load(); return; }
      setError(json?.error || 'Something went wrong. Please try again.');
    } catch { setError('Something went wrong. Please try again.'); }
    finally { setBusy(false); }
  };

  const decline = async () => {
    if (!declineName.trim() || !declineReason.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API_ROOT}/esign/${token}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: declineName.trim(), reason: declineReason.trim() }),
      });
      if (res.ok) { setDeadFirm(data?.firm || null); return setPhase('declined'); }
      const json = await res.json().catch(() => ({}));
      setError(json?.error || 'Could not record that. Please try again.');
    } catch { setError('Could not record that. Please try again.'); }
    finally { setBusy(false); setDeclining(false); }
  };

  const accent = data?.firm?.accentColor && HEX_RE.test(data.firm.accentColor) ? data.firm.accentColor : NAVY;

  if (phase === 'loading') {
    return <Shell accent={NAVY}><div className="py-24 flex justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div></Shell>;
  }
  if (phase === 'notfound' || phase === 'error') {
    return <Terminal accent={NAVY} icon={XCircle} tone="text-slate-400"
      title="This link isn't valid"
      body="If you had a link before, it may have been replaced — please use the most recent email from us, or get in touch. The link may also be mistyped. If you were expecting to sign a document, contact your accountant and they'll send a fresh link." />;
  }
  if (phase === 'expired' || phase === 'cancelled' || phase === 'declined') {
    const f = deadFirm;
    const meta = {
      expired:   { icon: Clock,  title: 'This signing link has expired', body: 'Signing links expire for security. Contact us and we\'ll send you a fresh one.' },
      cancelled: { icon: XCircle, title: 'This request was withdrawn',    body: 'Your accountant withdrew this document. Contact us if you think that\'s a mistake.' },
      declined:  { icon: Ban,     title: 'You declined this document',    body: 'We\'ve let your accountant know. If you declined by mistake, contact us and we\'ll send it again.' },
    }[phase];
    return <Terminal accent={f?.accentColor && HEX_RE.test(f.accentColor) ? f.accentColor : NAVY}
      icon={meta.icon} tone="text-amber-500" firm={f || undefined} title={meta.title} body={meta.body} />;
  }

  const d = data!;

  // ── signed: the confirmation + the evidence the signer keeps ──────────────
  if (phase === 'signed') {
    return (
      <Shell accent={accent}>
        <FirmHeader firm={d.firm} />
        <div className="pb-16">
          <div className="text-center py-8">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <h1 className="mt-3 text-xl font-bold text-slate-900">Signed — thank you</h1>
            <p className="mt-1.5 text-sm text-slate-500">{d.title}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl p-5 text-sm">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Your signature</div>
            <Row label="Signed by" value={d.evidence?.signatureName || name} />
            <Row label="Email" value={d.evidence?.signatureEmail || email} />
            <Row label="Date" value={d.evidence?.signedAt ? new Date(d.evidence.signedAt).toUTCString() : '—'} />
            {d.evidence?.documentFingerprint && (
              <Row label="Document fingerprint" value={<span className="font-mono text-[11px] break-all">{d.evidence.documentFingerprint}</span>} />
            )}
            <p className="mt-4 text-xs text-slate-400 leading-relaxed">
              The fingerprint identifies the exact file you signed. Keep this page or the signed copy
              for your records.
            </p>
          </div>
          {d.signedPdfUrl ? (
            <a href={d.signedPdfUrl} target="_blank" rel="noreferrer"
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold"
              style={{ background: accent }}>
              <FileText size={16} /> Download the signed copy
            </a>
          ) : (
            // Honest about the pending state rather than showing a dead button:
            // the signature is recorded either way, only the PDF is catching up.
            <div className="mt-4 text-sm text-slate-500 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-center">
              Your signed copy is being prepared. Your signature is already recorded —
              contact us if the copy doesn't arrive.
            </div>
          )}
          <FirmFooter firm={d.firm} />
        </div>
      </Shell>
    );
  }

  // ── the signing page ───────────────────────────────────────────────────────
  return (
    <Shell accent={accent}>
      <FirmHeader firm={d.firm} />
      <div className="pb-16">
        <h1 className="text-xl font-bold text-slate-900">{d.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {d.firm.name} has sent you this document to sign.
        </p>
        {d.message && <p className="mt-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl p-4">{d.message}</p>}

        {/* THE DOCUMENT. The link is always present and comes FIRST — an inline
            PDF viewer is unreliable on mobile Safari, and nobody should sign
            something they could not open. */}
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wide">The document</div>
            {d.sourcePdfUrl && (
              <a href={d.sourcePdfUrl} target="_blank" rel="noreferrer"
                className="text-sm font-semibold inline-flex items-center gap-1.5" style={{ color: accent }}>
                Open the document <ExternalLink size={13} />
              </a>
            )}
          </div>
          {d.sourcePdfUrl ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <iframe src={d.sourcePdfUrl} title={d.documentName || 'Document'} className="w-full h-[52vh] min-h-[320px]" />
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl bg-white p-6 text-center text-sm text-slate-500">
              The document couldn't be loaded. Please contact us before signing.
            </div>
          )}
          {d.documentName && <p className="mt-1.5 text-xs text-slate-400">{d.documentName}</p>}
        </div>

        {/* the signature */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Sign</div>
          <label className="block text-sm font-medium text-slate-700">Your full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name"
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-slate-200" />
          <label className="block text-sm font-medium text-slate-700 mt-4">Your email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
            className="w-full mt-1 px-3 py-2.5 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-slate-200" />

          <label className="mt-4 flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0" />
            {/* Verbatim from the server — the same sentence stamped on the PDF. */}
            <span className="text-sm text-slate-700 leading-relaxed">{d.consentStatement}</span>
          </label>

          {error && <div className="mt-3 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

          <button onClick={sign} disabled={!canSign}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-semibold disabled:opacity-40"
            style={{ background: accent }}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />} Sign this document
          </button>
          <p className="mt-2 text-xs text-slate-400 text-center">
            Your name, email, IP address and the time will be recorded as evidence of your signature.
          </p>
        </div>

        {/* decline — subordinate, but never hidden */}
        {!declining ? (
          <button onClick={() => { setDeclining(true); setDeclineName(name); }}
            className="mt-4 w-full text-sm text-slate-500 hover:text-slate-800 underline">
            I don't want to sign this
          </button>
        ) : (
          <div className="mt-4 bg-white border border-slate-200 rounded-xl p-5">
            <div className="text-sm font-semibold text-slate-900">Decline to sign</div>
            <p className="mt-1 text-xs text-slate-500">Both fields are required so we can follow up properly.</p>
            <input value={declineName} onChange={(e) => setDeclineName(e.target.value)} placeholder="Your full name"
              className="w-full mt-3 px-3 py-2.5 border border-slate-200 rounded-lg text-base" />
            <textarea value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} rows={3}
              placeholder="Why are you declining?"
              className="w-full mt-2 px-3 py-2.5 border border-slate-200 rounded-lg text-base" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setDeclining(false)} className="flex-1 px-4 py-2.5 text-slate-600 text-sm font-medium">Back</button>
              <button onClick={decline} disabled={!declineName.trim() || !declineReason.trim() || busy}
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-semibold disabled:opacity-40">
                {busy ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Decline'}
              </button>
            </div>
          </div>
        )}

        <FirmFooter firm={d.firm} />
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 text-right min-w-0">{value}</span>
    </div>
  );
}

function FirmHeader({ firm }: { firm: Firm }) {
  return (
    <div className="pt-10 pb-6">
      {firm.logoUrl
        ? <img src={firm.logoUrl} alt={firm.name} className="h-10 object-contain" />
        : <p className="text-lg font-bold" style={{ color: NAVY }}>{firm.name}</p>}
    </div>
  );
}

function FirmFooter({ firm }: { firm: Firm }) {
  return (
    <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-400 leading-relaxed">
      <p className="font-medium text-slate-500">{firm.name}</p>
      {firm.address && <p>{firm.address}</p>}
      {firm.licenceNumber && <p>Licence {firm.licenceNumber}</p>}
      <p className="mt-1">
        <a href={`mailto:${firm.supportEmail}`} className="underline">{firm.supportEmail}</a>
        {firm.phone ? <> · {firm.phone}</> : null}
      </p>
    </div>
  );
}

function Shell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50" style={{ borderTop: `4px solid ${accent}` }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8">{children}</div>
    </div>
  );
}

function Terminal({ accent, icon: Icon, tone, title, body, firm }: {
  accent: string; icon: any; tone: string; title: string; body: string; firm?: Firm;
}) {
  return (
    <Shell accent={accent}>
      <div className="py-24 text-center">
        {firm?.logoUrl ? <img src={firm.logoUrl} alt="" className="h-10 object-contain mx-auto mb-8" />
          : firm?.name ? <p className="text-lg font-bold mb-8" style={{ color: NAVY }}>{firm.name}</p> : null}
        <Icon size={40} className={`mx-auto ${tone}`} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{body}</p>
        {firm && (
          <p className="mt-6 text-sm text-slate-600">
            <a href={`mailto:${firm.supportEmail}`} className="font-medium underline">{firm.supportEmail}</a>
            {firm.phone ? <> · {firm.phone}</> : null}
          </p>
        )}
      </div>
    </Shell>
  );
}
