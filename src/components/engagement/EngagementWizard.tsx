import React, { useState } from 'react';
import { X, FileText, Check, ChevronRight, ChevronLeft, Send, Loader2 } from 'lucide-react';
import { useEngagementTemplates, generateEngagement, sendEngagement, Engagement } from '../../hooks/useEngagement';
import { LetterFrame } from '../clients/ClientEngagementTab';
import { errMsg } from '../../lib/errMsg';

export function EngagementWizard({ clientId, onClose, onDone }: { clientId: string; onClose: () => void; onDone: () => void }) {
  const { templates, isLoading } = useEngagementTemplates();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Engagement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the letter was marked sent but NOT emailed (no client email / send
  // failed) — we keep the wizard open and offer the signing link to share.
  const [warning, setWarning] = useState<{ msg: string; link: string } | null>(null);

  // Step 1 → 2: generate the draft (server merges the fields).
  const goReview = async () => {
    if (!templateId) return;
    setBusy(true); setError(null);
    try {
      const eng = await generateEngagement(clientId, templateId);
      setDraft(eng);
      setStep(2);
    } catch (e: any) { setError(errMsg(e, 'Failed to generate letter')); }
    finally { setBusy(false); }
  };

  // Step 3: send for signature. The server reports whether the client was
  // actually emailed — surface it honestly rather than always showing success.
  const send = async () => {
    if (!draft) return;
    setBusy(true); setError(null); setWarning(null);
    try {
      const res: any = await sendEngagement(clientId, draft.id);
      if (res?.emailSent === false) {
        setWarning({
          msg: res.emailStatus === 'no_client_email'
            ? 'Marked as sent, but this client has no email address on record, so nothing was emailed. Copy the signing link below to share it with them directly.'
            : `Marked as sent, but the email could not be delivered${res.emailDetail ? ` (${res.emailDetail})` : ''}. Copy the signing link below to share it manually.`,
          link: res.signUrl || '',
        });
        setBusy(false);
        return; // keep the wizard open so they can copy the link
      }
      onDone();
    } catch (e: any) { setError(errMsg(e, 'Failed to send for signature')); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900">New engagement letter</h3>
            <p className="text-xs text-slate-400">Step {step} of 3 — {step === 1 ? 'Choose template' : step === 2 ? 'Review' : 'Confirm & send'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            isLoading ? <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading templates…</div> : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map(t => (
                  <button key={t.id} onClick={() => setTemplateId(t.id)}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${templateId === t.id ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${templateId === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}><FileText size={16} /></div>
                      {t.isSystem && <span className="text-[10px] font-bold uppercase text-slate-400 ml-auto">System</span>}
                    </div>
                    <div className="font-semibold text-sm text-slate-900">{t.name}</div>
                    {t.description && <div className="text-xs text-slate-400 mt-0.5">{t.description}</div>}
                  </button>
                ))}
                {templates.length === 0 && <p className="col-span-2 text-center text-slate-400 py-8">No templates available.</p>}
              </div>
            )
          )}

          {step === 2 && draft && (
            <div>
              <p className="text-xs text-slate-400 mb-3">Review the merged letter. Merge fields have been populated from the client record.</p>
              <LetterFrame html={draft.templateBody || ''} />
            </div>
          )}

          {step === 3 && draft && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                The letter will be emailed to the client's address on record with a secure signing link (valid 30 days). You'll see the status update to <strong>Signed</strong> once they complete it.
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <p className="font-semibold text-slate-900 text-sm">{draft.templateName}</p>
                <p className="text-xs text-slate-400 mt-1">Ready to send for signature.</p>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

          {warning && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">{warning.msg}</p>
              {warning.link && (
                <div className="mt-3 flex items-center gap-2">
                  <input readOnly value={warning.link} className="flex-1 text-xs font-mono bg-white border border-amber-200 rounded px-2 py-1.5 text-slate-700" onFocus={e => e.currentTarget.select()} />
                  <button onClick={() => navigator.clipboard?.writeText(warning.link)} className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded hover:bg-amber-700">Copy link</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
          <button onClick={() => step === 1 ? onClose() : setStep((step - 1) as 1 | 2)} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm inline-flex items-center gap-1">
            {step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
          </button>
          {step === 1 && (
            <button onClick={goReview} disabled={!templateId || busy} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 text-sm inline-flex items-center gap-1">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Generating…</> : <>Review <ChevronRight size={16} /></>}
            </button>
          )}
          {step === 2 && (
            <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm inline-flex items-center gap-1">Continue <ChevronRight size={16} /></button>
          )}
          {step === 3 && !warning && (
            <button onClick={send} disabled={busy} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 text-sm inline-flex items-center gap-2">
              {busy ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : <><Send size={16} /> Send for signature</>}
            </button>
          )}
          {step === 3 && warning && (
            <button onClick={onDone} className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 text-sm inline-flex items-center gap-2">
              <Check size={16} /> Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
