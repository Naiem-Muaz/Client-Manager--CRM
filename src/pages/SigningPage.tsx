import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, Download } from 'lucide-react';

// The /sign API is mounted at the backend root (NOT under /api).
const API_ROOT = ((import.meta as any).env?.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api').replace(/\/api\/?$/, '');

type State =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'expired'; firmName?: string }
  | { phase: 'signed'; signerName?: string; signedAt?: string; firmName?: string }
  | { phase: 'pending'; clientName?: string; firmName?: string; templateName?: string; templateBody?: string; partnerName?: string };

// Renders the full-HTML letter in an isolated, auto-height iframe (its own <style> can't leak).
function LetterFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const resize = () => {
    const f = ref.current;
    try { if (f?.contentWindow?.document?.body) f.style.height = f.contentWindow.document.body.scrollHeight + 24 + 'px'; } catch { /* noop */ }
  };
  return (
    <iframe
      ref={ref}
      srcDoc={html}
      title="Engagement letter"
      onLoad={resize}
      sandbox="allow-same-origin"
      style={{ width: '100%', border: 'none', minHeight: 400, display: 'block', background: '#fff' }}
    />
  );
}

export function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<State>({ phase: 'loading' });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ signedAt: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_ROOT}/sign/${token}`);
        if (!res.ok) { setState({ phase: 'error' }); return; }
        const body = await res.json();
        const d = body.data;
        if (!body.success || !d) { setState({ phase: 'error' }); return; }
        if (d.status === 'expired') setState({ phase: 'expired', firmName: d.firmName });
        else if (d.status === 'signed') setState({ phase: 'signed', signerName: d.signerName, signedAt: d.signedAt, firmName: d.firmName });
        else if (d.status === 'sent') { setState({ phase: 'pending', clientName: d.clientName, firmName: d.firmName, templateName: d.templateName, templateBody: d.templateBody, partnerName: d.partnerName }); if (d.clientEmail) setEmail(d.clientEmail); }
        else setState({ phase: 'error' });
      } catch { setState({ phase: 'error' }); }
    })();
  }, [token]);

  const sign = async () => {
    if (!name.trim() || !email.trim() || !agreed) return;
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`${API_ROOT}/sign/${token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signerName: name.trim(), signerEmail: email.trim() }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        setError(body.error === 'already_signed' ? 'This document has already been signed.' : body.error === 'expired' ? 'This signing link has expired.' : 'Could not sign the document. Please try again.');
        setSubmitting(false); return;
      }
      setDone({ signedAt: body.data.signedAt });
    } catch { setError('Network error. Please try again.'); setSubmitting(false); }
  };

  const firm = (state as any).firmName || 'Tax Digital Accountants';

  // Header bar shown on every screen.
  const Header = () => (
    <div style={{ borderTop: '4px solid #1a365d' }} className="bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-5 py-4">
        <div className="text-sm font-bold text-[#1a365d]">{firm}</div>
        <div className="text-xs text-slate-400">Engagement Letter</div>
      </div>
    </div>
  );
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <div className="max-w-2xl mx-auto px-4 py-6">{children}</div>
    </div>
  );

  if (state.phase === 'loading') return <Shell><div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading document…</div></Shell>;
  if (state.phase === 'error') return <Shell><Card icon={<AlertTriangle className="text-red-500" size={40} />} title="Link not found" body="This signing link is invalid or has been revoked. Please contact your accountant for a new link." /></Shell>;
  if (state.phase === 'expired') return <Shell><Card icon={<AlertTriangle className="text-amber-500" size={40} />} title="This link has expired" body={`Please contact ${firm} to request a new engagement letter.`} /></Shell>;
  if (state.phase === 'signed') return <Shell><Card icon={<CheckCircle className="text-emerald-500" size={44} />} title="Already signed" body={`This engagement letter was signed${state.signerName ? ` by ${state.signerName}` : ''}${state.signedAt ? ` on ${fmt(state.signedAt)}` : ''}.`} /></Shell>;

  if (done) {
    const partnerName = (state as any).partnerName as string | undefined;
    return (
      <Shell>
        <Card icon={<CheckCircle className="text-emerald-500" size={48} />} title="Document signed successfully"
          body={`Signed on ${fmt(done.signedAt)} by ${name}.`}>
          <div className="mt-3 text-sm text-slate-600 leading-relaxed">
            <div>Signed on behalf of <strong>{firm}</strong></div>
            {partnerName && <div>Your engagement partner: <strong>{partnerName}</strong></div>}
          </div>
          <a href={`${API_ROOT}/sign/${token}/certificate`} target="_blank" rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 px-5 py-3 bg-[#1a365d] text-white rounded-lg text-sm font-semibold hover:bg-[#142a4a]" style={{ minHeight: 44 }}>
            <Download size={18} /> Download your signed copy
          </a>
        </Card>
      </Shell>
    );
  }

  // pending → letter + signature card
  return (
    <Shell>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-5">
        <LetterFrame html={state.templateBody || ''} />
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-bold text-[#1a365d] text-lg">Please sign below to confirm your agreement</h3>
        <p className="text-sm text-slate-500 mt-1 mb-5">By signing you confirm you have read and accept the terms of this engagement letter.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
              className="w-full px-4 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]" style={{ minHeight: 44 }} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
              className="w-full px-4 border border-slate-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#1a365d]/30 focus:border-[#1a365d]" style={{ minHeight: 44 }} />
          </div>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-slate-700 py-1">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 mt-0.5 accent-[#1a365d] flex-shrink-0" />
            <span>I confirm I have read and agree to the terms set out in this engagement letter.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={sign} disabled={!name.trim() || !email.trim() || !agreed || submitting}
            className="w-full bg-[#1a365d] text-white rounded-lg font-semibold text-base hover:bg-[#142a4a] disabled:opacity-40 inline-flex items-center justify-center gap-2" style={{ minHeight: 48 }}>
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Signing…</> : 'Sign Document'}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-5">Secured by {firm}</p>
    </Shell>
  );
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function Card({ icon, title, body, children }: { icon: React.ReactNode; title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-10 text-center">
      <div className="flex justify-center mb-4">{icon}</div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="text-slate-500 mt-2">{body}</p>
      {children}
    </div>
  );
}
