import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Download, FileText, Loader2, XCircle,
} from 'lucide-react';

/**
 * PUBLIC proposal page — /proposal/:token (no auth; the token is the secret).
 * The firm's shop window: the prospect reads, toggles monthly/annual, accepts
 * (engagement-signing evidence standard) or declines. SigningPage's
 * architecture; the design deliberately elevated — the accent colour
 * (organisations.brand_accent_color) applied to a fixed palette: hero rule,
 * section eyebrows, totals, primary button. Mobile-first.
 */

const API_ROOT = (import.meta.env.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api').replace(/\/api\/?$/, '');
const NAVY = '#1a365d';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Item {
  name: string; scope_text: string | null; pricing_model: string;
  quantity: string | number; unit_price_pence: string | number; line_total_pence: string | number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
}
interface Payload {
  status: string;
  title?: string; introMd?: string | null; scopeMd?: string | null;
  items?: Item[];
  discountPercent?: number | null;
  monthlyTotalPence?: number; annualTotalPence?: number; oneoffTotalPence?: number;
  validUntil?: string | null;
  prospect?: { name: string | null; company: string | null };
  firm?: { name: string; logoUrl: string | null; accentColor: string | null };
  acceptedAt?: string | null; acceptedByName?: string | null; declinedAt?: string | null;
  hasPdf?: boolean;
  mandateUrl?: string | null; // step-6 seam: rendered when present
}

const money = (pence: any) => '£' + (Number(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FREQ: Record<string, string> = { monthly: '/month', quarterly: '/quarter', annual: '/year', one_off: 'one-off' };
const ANNUALISE: Record<string, number> = { monthly: 12, quarterly: 4, annual: 1 };
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export function ProposalPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<'loading' | 'view' | 'accepted' | 'declined' | 'expired' | 'unavailable' | 'notfound' | 'error'>('loading');
  const [data, setData] = useState<Payload | null>(null);
  const [justAccepted, setJustAccepted] = useState<{ email: string } | null>(null);
  const [view, setView] = useState<'monthly' | 'annual'>('monthly');

  const load = async () => {
    try {
      const res = await fetch(`${API_ROOT}/p/${token}`);
      if (res.status === 404) return setPhase('notfound');
      const json = await res.json();
      const d: Payload = json?.data || {};
      setData(d);
      if (d.status === 'expired') setPhase('expired');
      else if (d.status === 'unavailable') setPhase('unavailable');
      else if (d.status === 'accepted') setPhase('accepted');
      else if (d.status === 'declined') setPhase('declined');
      else if (d.status === 'sent' || d.status === 'viewed') setPhase('view');
      else setPhase('error');
    } catch {
      setPhase('error');
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const accent = data?.firm?.accentColor && HEX_RE.test(data.firm.accentColor) ? data.firm.accentColor : NAVY;
  const recurring = useMemo(() => (data?.items || []).filter(i => i.frequency !== 'one_off'), [data]);
  const oneOff = useMemo(() => (data?.items || []).filter(i => i.frequency === 'one_off'), [data]);

  if (phase === 'loading') {
    return <Shell accent={NAVY}><div className="py-24 flex justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div></Shell>;
  }
  if (phase === 'notfound' || phase === 'error') {
    return <Terminal accent={NAVY} icon={AlertTriangle} tone="text-slate-400" title="Link not found"
      body="This proposal link isn't recognised. Please check the link in your email, or contact the practice." />;
  }
  if (phase === 'unavailable') {
    return <Terminal accent={accent} icon={FileText} tone="text-slate-400" title="No longer available"
      body="This proposal has been withdrawn. Please contact the practice for an up-to-date version." firm={data?.firm} />;
  }
  if (phase === 'expired') {
    return <Terminal accent={accent} icon={Clock} tone="text-amber-500" title="This proposal has expired"
      body="The acceptance window has closed — but that doesn't mean the door has. Get in touch and we'll refresh it for you." firm={data?.firm} />;
  }
  if (phase === 'declined') {
    return <Terminal accent={accent} icon={XCircle} tone="text-slate-400" title="Proposal declined"
      body="You've declined this proposal. If circumstances change, we'd be glad to hear from you." firm={data?.firm} />;
  }

  const d = data!;
  return (
    <Shell accent={accent} firm={d.firm}>
      {/* Hero */}
      <header className="pt-10 pb-6">
        {d.firm?.logoUrl
          ? <img src={d.firm.logoUrl} alt={d.firm?.name || ''} className="h-10 sm:h-12 object-contain" />
          : <p className="text-xl font-bold" style={{ color: NAVY }}>{d.firm?.name}</p>}
        <div className="h-0.5 w-full mt-5 rounded-full" style={{ background: accent }} />
        <p className="mt-7 text-[11px] font-semibold tracking-[0.2em]" style={{ color: accent }}>PROPOSAL</p>
        <h1 className="mt-1.5 text-3xl sm:text-4xl font-bold text-slate-900 leading-tight">{d.title}</h1>
        <p className="mt-2.5 text-slate-500">
          Prepared for <span className="font-medium text-slate-700">{d.prospect?.name || 'you'}</span>
          {d.prospect?.company && <> — {d.prospect.company}</>}
        </p>
        {d.validUntil && phase === 'view' && (
          <p className="mt-1 text-xs text-slate-400 inline-flex items-center gap-1.5"><Clock size={12} />Valid until {fmtDate(d.validUntil)}</p>
        )}
      </header>

      {phase === 'accepted' && (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">
                {justAccepted ? 'Accepted — thank you!' : `Accepted by ${d.acceptedByName || 'you'} on ${fmtDate(d.acceptedAt)}`}
              </p>
              <div className="text-sm text-emerald-800 mt-2 space-y-1.5">
                <p><span className="font-medium">What happens next:</span></p>
                <p>1. Your engagement letter is on its way{justAccepted ? ` to ${justAccepted.email}` : ''} — a quick e-sign and we're official.</p>
                <p>2. We'll set up your client workspace and be in touch within one working day.</p>
              </div>
              {d.mandateUrl && (
                <a href={d.mandateUrl} className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm" style={{ background: accent }}>
                  Set up your direct debit
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Intro */}
      {d.introMd && <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line mb-8">{d.introMd}</p>}

      {/* Services */}
      <SectionLabel accent={accent}>Your services</SectionLabel>
      <div className="mt-3 space-y-3">
        {recurring.map((i, n) => <ServiceCard key={n} item={i} />)}
      </div>
      {!!oneOff.length && (
        <>
          <div className="mt-7"><SectionLabel accent={accent}>One-off</SectionLabel></div>
          <div className="mt-3 space-y-3">
            {oneOff.map((i, n) => <ServiceCard key={n} item={i} />)}
          </div>
        </>
      )}

      {/* Fee summary + toggle */}
      <div className="mt-8 rounded-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">Fee summary</p>
          <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
            {(['monthly', 'annual'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-md capitalize transition-colors ${view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {recurring.map((i, n) => {
            const line = Number(i.line_total_pence);
            const shown = view === 'annual' ? line * (ANNUALISE[i.frequency] || 1) : line;
            return (
              <div key={n} className="flex items-baseline justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">{i.name}{view === 'monthly' && i.frequency !== 'monthly' && <span className="text-slate-400"> ({FREQ[i.frequency].slice(1)})</span>}</span>
                <span className="tabular-nums font-medium text-slate-800">
                  {money(shown)}<span className="text-slate-400 font-normal">{view === 'annual' ? '/year' : FREQ[i.frequency]}</span>
                </span>
              </div>
            );
          })}
          {oneOff.map((i, n) => (
            <div key={`o${n}`} className="flex items-baseline justify-between px-5 py-3 text-sm">
              <span className="text-slate-600">{i.name} <span className="text-slate-400">(one-off)</span></span>
              <span className="tabular-nums font-medium text-slate-800">{money(i.line_total_pence)}</span>
            </div>
          ))}
          {d.discountPercent ? (
            <div className="flex items-baseline justify-between px-5 py-3 text-sm">
              <span className="font-medium" style={{ color: accent }}>Discount applied</span>
              <span className="font-medium" style={{ color: accent }}>−{d.discountPercent}%</span>
            </div>
          ) : null}
        </div>
        <div className="px-5 py-4" style={{ background: `${accent}0d`, borderTop: `2px solid ${accent}` }}>
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-slate-700">{view === 'annual' ? 'Annual investment' : 'Monthly total'}</span>
            <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
              {money(view === 'annual' ? d.annualTotalPence : d.monthlyTotalPence)}
              <span className="text-sm font-medium text-slate-400">{view === 'annual' ? '/year' : '/month'}</span>
            </span>
          </div>
          {Number(d.oneoffTotalPence) > 0 && (
            <p className="text-xs text-slate-500 mt-1 text-right">+ {money(d.oneoffTotalPence)} one-off</p>
          )}
        </div>
      </div>

      {/* Scope */}
      {d.scopeMd && (
        <div className="mt-8">
          <SectionLabel accent={accent}>Scope &amp; notes</SectionLabel>
          <p className="mt-2 text-sm leading-relaxed text-slate-500 whitespace-pre-line">{d.scopeMd}</p>
        </div>
      )}

      {d.hasPdf && (
        <a href={`${API_ROOT}/p/${token}/pdf`} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
          <Download size={15} />Download as PDF
        </a>
      )}

      {phase === 'view' && <AcceptPanel accent={accent} token={token!} firmName={d.firm?.name || ''} onAccepted={(email) => { setJustAccepted({ email }); setPhase('accepted'); }} onDeclined={() => setPhase('declined')} onStale={load} />}

      <footer className="mt-12 pb-10 text-center text-xs text-slate-400">
        {d.firm?.name} — this proposal is a summary of services and fees; formal terms follow in your engagement letter.
      </footer>
    </Shell>
  );
}

function Shell({ accent, firm, children }: { accent: string; firm?: Payload['firm']; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50" style={{ borderTop: `4px solid ${accent}` }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8">{children}{firm ? null : null}</div>
    </div>
  );
}

function Terminal({ accent, icon: Icon, tone, title, body, firm }: {
  accent: string; icon: any; tone: string; title: string; body: string; firm?: Payload['firm'];
}) {
  return (
    <Shell accent={accent}>
      <div className="py-24 text-center">
        {firm?.logoUrl ? <img src={firm.logoUrl} alt="" className="h-10 object-contain mx-auto mb-8" />
          : firm?.name ? <p className="text-lg font-bold mb-8" style={{ color: NAVY }}>{firm.name}</p> : null}
        <Icon size={40} className={`mx-auto ${tone}`} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{body}</p>
      </div>
    </Shell>
  );
}

function SectionLabel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>{children}</p>;
}

function ServiceCard({ item }: { item: Item }) {
  const qty = Number(item.quantity);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900">{item.name}</p>
        {(item.scope_text || (item.pricing_model === 'per_unit' && qty !== 1)) && (
          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
            {item.scope_text}{item.pricing_model === 'per_unit' && qty !== 1 && <span className="text-slate-400"> ({qty} × {money(item.unit_price_pence)})</span>}
          </p>
        )}
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-bold text-slate-900 tabular-nums">{money(item.line_total_pence)}</p>
        <p className="text-xs text-slate-400">{FREQ[item.frequency]}</p>
      </div>
    </div>
  );
}

function AcceptPanel({ accent, token, firmName, onAccepted, onDeclined, onStale }: {
  accent: string; token: string; firmName: string;
  onAccepted: (email: string) => void; onDeclined: () => void; onStale: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const field = 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent';

  const accept = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API_ROOT}/p/${token}/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), agree: agreed }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return onAccepted(email.trim());
      if (res.status === 409 || res.status === 410) return onStale(); // someone got there first / expired — refetch truth
      setError(json?.error || 'Something went wrong — please try again.');
    } catch {
      setError('Connection problem — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_ROOT}/p/${token}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (res.ok) return onDeclined();
      onStale();
    } catch {
      setError('Connection problem — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">Accept this proposal</h2>
      <p className="text-sm text-slate-500 mt-1">Takes under a minute — your name and email act as your signature.</p>
      <div className="mt-5 space-y-3.5">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name"
          className={field} style={{ ['--tw-ring-color' as any]: accent }} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" type="email" autoComplete="email"
          className={field} style={{ ['--tw-ring-color' as any]: accent }} />
        <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4.5 w-4.5 rounded" style={{ accentColor: accent }} />
          <span>I agree to the services and fees set out in this proposal and authorise {firmName || 'the practice'} to prepare our engagement letter.</span>
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={accept} disabled={!name.trim() || !email.trim() || !agreed || busy}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white font-semibold shadow-sm disabled:opacity-40 transition-opacity inline-flex items-center justify-center gap-2"
          style={{ background: accent }}>
          {busy && <Loader2 size={16} className="animate-spin" />}Accept proposal
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        {!declining ? (
          <button onClick={() => setDeclining(true)} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
            Not right for you? Decline this proposal
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">We'd genuinely value knowing why (optional):</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. going with another firm, timing, budget…"
              className={`${field} resize-none`} />
            <div className="flex gap-2">
              <button onClick={decline} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 disabled:opacity-50">
                Confirm decline
              </button>
              <button onClick={() => setDeclining(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
