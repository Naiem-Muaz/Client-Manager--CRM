import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle, Loader2, Download, FileSignature } from 'lucide-react';

// The /sign API is mounted at the backend root (NOT under /api).
const API_ROOT = ((import.meta as any).env?.VITE_NEXTGEN_API_URL || 'http://localhost:4000/api').replace(/\/api\/?$/, '');

type State =
  | { phase: 'loading' }
  | { phase: 'error' }
  | { phase: 'expired'; firmName?: string }
  | { phase: 'signed'; signerName?: string; signedAt?: string; firmName?: string }
  | { phase: 'pending'; clientName?: string; firmName?: string; templateName?: string; templateBody?: string };

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
        else if (d.status === 'sent') { setState({ phase: 'pending', clientName: d.clientName, firmName: d.firmName, templateName: d.templateName, templateBody: d.templateBody }); if (d.clientEmail) setEmail(d.clientEmail); }
        else setState({ phase: 'error' }); // draft / unknown → not signable via link
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
      if (!res.ok || !body.success) { setError(body.error === 'already_signed' ? 'This document has already been signed.' : body.error === 'expired' ? 'This signing link has expired.' : 'Could not sign the document. Please try again.'); setSubmitting(false); return; }
      setDone({ signedAt: body.data.signedAt });
    } catch { setError('Network error. Please try again.'); setSubmitting(false); }
  };

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl">{children}</div>
    </div>
  );
  const firm = (state as any).firmName || 'Tax Digital Accountants';

  if (state.phase === 'loading') return <Shell><div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading document…</div></Shell>;

  if (state.phase === 'error') return <Shell><Card icon={<AlertTriangle className="text-red-500" size={40} />} title="Link not found" body="This signing link is invalid or has been revoked. Please contact your accountant for a new link." /></Shell>;

  if (state.phase === 'expired') return <Shell><Card icon={<AlertTriangle className="text-amber-500" size={40} />} title="This link has expired" body={`Please contact ${firm} to request a new engagement letter.`} /></Shell>;

  if (state.phase === 'signed') return <Shell><Card icon={<CheckCircle className="text-emerald-500" size={40} />} title="Already signed" body={`This engagement letter was signed${state.signerName ? ` by ${state.signerName}` : ''}${state.signedAt ? ` on ${new Date(state.signedAt).toLocaleDateString('en-GB')}` : ''}.`} /></Shell>;

  if (done) return (
    <Shell>
      <Card icon={<CheckCircle className="text-emerald-500" size={40} />} title="Thank you — document signed"
        body={`Signed on ${new Date(done.signedAt).toLocaleString('en-GB')}. A copy has been recorded with ${firm}.`}>
        <a href={`${API_ROOT}/sign/${token}/certificate`} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Download size={16} /> Download your signed copy
        </a>
      </Card>
    </Shell>
  );

  // pending → render letter + sign form
  return (
    <Shell>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-slate-900 text-white px-8 py-5 flex items-center gap-3">
          <FileSignature size={22} className="text-emerald-400" />
          <div><div className="font-bold">{firm}</div><div className="text-xs text-slate-300">{state.templateName || 'Engagement letter'}</div></div>
        </div>
        <div className="p-6 sm:p-10 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: state.templateBody || '' }} />
        <div className="border-t border-slate-200 bg-slate-50 p-6 sm:p-8 space-y-4">
          <h3 className="font-bold text-slate-900">Sign this document</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Full name</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" placeholder="Your full name" /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" placeholder="you@example.com" /></div>
          </div>
          <label className="flex items-start gap-2 cursor-pointer text-sm text-slate-700">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-4 h-4 mt-0.5 text-emerald-600 rounded" />
            <span>I confirm I have read and agree to the terms set out in this engagement letter.</span>
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button onClick={sign} disabled={!name.trim() || !email.trim() || !agreed || submitting}
            className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center justify-center gap-2">
            {submitting ? <><Loader2 size={16} className="animate-spin" /> Signing…</> : 'Sign document'}
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-slate-400 mt-4">Secured by {firm}</p>
    </Shell>
  );
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
