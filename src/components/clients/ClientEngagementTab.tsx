import React, { useState, useRef } from 'react';
import { FileSignature, Plus, CheckCircle, Clock, AlertCircle, Download, ArrowLeft, Loader2 } from 'lucide-react';
import { EngagementWizard } from '../engagement/EngagementWizard';
import { useEngagementLetters, fetchCertificateUrl, Engagement } from '../../hooks/useEngagement';

// UK long-form date, e.g. "11 July 2026".
const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

// Renders the full-HTML letter in an isolated, auto-height iframe (its <style> can't leak).
export function LetterFrame({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const resize = () => {
    const f = ref.current;
    try { if (f?.contentWindow?.document?.body) f.style.height = f.contentWindow.document.body.scrollHeight + 24 + 'px'; } catch { /* noop */ }
  };
  return (
    <iframe ref={ref} srcDoc={html} title="Engagement letter" onLoad={resize} sandbox="allow-same-origin"
      style={{ width: '100%', border: '1px solid #e2e8f0', borderRadius: 12, minHeight: 400, display: 'block', background: '#fff' }} />
  );
}

const STATUS: Record<string, { label: string; cls: string; icon: any }> = {
  draft: { label: 'Draft', cls: 'bg-slate-100 text-slate-600', icon: FileSignature },
  sent: { label: 'Sent', cls: 'bg-blue-100 text-blue-700', icon: Clock },
  signed: { label: 'Signed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  expired: { label: 'Expired', cls: 'bg-red-100 text-red-700', icon: AlertCircle },
};

export function ClientEngagementTab({ clientId }: { clientId: string }) {
  const { letters, isLoading, mutate } = useEngagementLetters(clientId);
  const [showWizard, setShowWizard] = useState(false);
  const [selected, setSelected] = useState<Engagement | null>(null);
  const [downloading, setDownloading] = useState(false);

  const download = async (eng: Engagement) => {
    setDownloading(true);
    try {
      const url = await fetchCertificateUrl(clientId, eng.id);
      if (url) window.open(url, '_blank'); else window.alert('Certificate is not ready yet.');
    } catch { window.alert('Could not fetch the certificate.'); }
    finally { setDownloading(false); }
  };

  if (selected) {
    const s = STATUS[selected.status] || STATUS.draft;
    return (
      <div className="max-w-3xl space-y-5">
        <button onClick={() => setSelected(null)} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800"><ArrowLeft size={16} /> Back to engagements</button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selected.templateName || 'Engagement letter'}</h2>
            <p className="text-sm text-slate-500">Created {new Date(selected.createdAt).toLocaleDateString('en-GB')}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}><s.icon size={12} /> {s.label}</span>
        </div>

        {selected.status === 'signed' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800 flex items-center justify-between">
            <span>Signed by <strong>{selected.signerName}</strong> on {fmtDate(selected.signedAt)}</span>
            <button onClick={() => download(selected)} disabled={downloading} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Certificate
            </button>
          </div>
        )}
        {selected.status === 'sent' && selected.signingTokenExpiresAt && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            Sent for signature — link expires {fmtDate(selected.signingTokenExpiresAt)}.
          </div>
        )}

        <LetterFrame html={selected.templateBody || ''} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Engagement Letters</h2>
          <p className="text-sm text-slate-500">Generate, send for e-signature, and store signed copies.</p>
        </div>
        <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm">
          <Plus size={16} /> New engagement letter
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : letters.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><FileSignature size={28} /></div>
          <h4 className="font-semibold text-slate-900">No engagement letters yet</h4>
          <p className="text-slate-500 text-sm mt-1 mb-4">Engagement letters formalise your authority to act for this client.</p>
          <button onClick={() => setShowWizard(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">New engagement letter</button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
          {letters.map(l => {
            const s = STATUS[l.status] || STATUS.draft;
            return (
              <button key={l.id} onClick={() => setSelected(l)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 text-left">
                <div>
                  <div className="font-semibold text-slate-900">{l.templateName || 'Engagement letter'}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {l.status === 'signed' ? `Signed by ${l.signerName}` : l.status === 'sent' ? `Sent ${l.sentAt ? new Date(l.sentAt).toLocaleDateString('en-GB') : ''}` : `Created ${new Date(l.createdAt).toLocaleDateString('en-GB')}`}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${s.cls}`}><s.icon size={12} /> {s.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {showWizard && (
        <EngagementWizard clientId={clientId} onClose={() => setShowWizard(false)} onDone={() => { setShowWizard(false); mutate(); }} />
      )}
    </div>
  );
}
