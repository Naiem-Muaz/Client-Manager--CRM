import React, { useState } from 'react';
import { Loader2, X, Send, Copy, Check, Mail, AlertTriangle, PenLine } from 'lucide-react';
import { createSignatureRequest, sendSignatureRequest, SignatureDetail } from '../../hooks/useSignatureRequests';
import { errMsg } from '../../lib/errMsg';

/**
 * Request a signature on an already-stored PDF. Create and send finish in ONE
 * dialog for the same reason the document-request modal does: the signing link
 * exists only in the send response, and a navigation between minting it and
 * showing it would lose it.
 *
 * The signer fields are PREFILLED BY THE SERVER (contact-first resolution) and
 * editable here — the person who signs is often not the address on the client
 * record, and guessing wrong sends a legal document to the wrong inbox.
 */
export function RequestSignatureModal({ clientId, clientName, document, onClose, onDone }: {
  clientId: string;
  clientName?: string;
  document: { id: string; fileName: string };
  onClose: () => void;
  onDone?: (d: SignatureDetail) => void;
}) {
  const [title, setTitle] = useState(document.fileName.replace(/\.pdf$/i, ''));
  const [message, setMessage] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<SignatureDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const submit = async (thenSend: boolean) => {
    setBusy(true); setError(null);
    try {
      const created = await createSignatureRequest(clientId, {
        documentId: document.id,
        title: title.trim() || undefined,
        message: message.trim() || undefined,
        signerName: signerName.trim() || undefined,
        signerEmail: signerEmail.trim() || undefined,
      });
      if (!thenSend) { onDone?.(created); onClose(); return; }
      const result = await sendSignatureRequest(created.id);
      setSent(result);
      onDone?.(result);
    } catch (e) { setError(errMsg(e, 'Could not create the signature request.')); }
    finally { setBusy(false); }
  };

  const copy = async () => {
    if (!sent?.url) return;
    try { await navigator.clipboard.writeText(sent.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Could not copy — select the link and copy it manually.'); }
  };

  if (sent) {
    return (
      <Shell title="Sent for signature" subtitle={clientName} onClose={onClose}>
        <div className="p-5 space-y-4">
          {sent.emailed ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <Mail size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800">
                Emailed to <strong>{sent.signerEmail}</strong>. They can read and sign it in a browser — no login.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">{sent.warning || 'The email did not go out. Copy the link below and send it yourself.'}</div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Signing link</label>
            <div className="flex gap-2 mt-1">
              <input readOnly value={sent.url || ''} onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-600" />
              <button onClick={copy} className="px-3 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              We store only a fingerprint of this link, so it cannot be shown again. If it is lost,
              regenerate it from the request — which stops the old one working.
            </p>
          </div>
        </div>
        <Footer><button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Done</button></Footer>
      </Shell>
    );
  }

  return (
    <Shell title="Request a signature" subtitle={clientName} onClose={onClose}>
      <div className="p-5 space-y-4 overflow-y-auto">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700">
          <PenLine size={14} className="text-slate-400 shrink-0" />
          <span className="truncate">{document.fileName}</span>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">What is this document</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Signer name <span className="font-normal normal-case text-slate-400">(optional)</span></label>
            <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="from the client record"
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Signer email <span className="font-normal normal-case text-slate-400">(optional)</span></label>
            <input value={signerEmail} onChange={(e) => setSignerEmail(e.target.value)} placeholder="from the client record" type="email"
              className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
          </div>
        </div>
        <p className="text-xs text-slate-400 -mt-2">Leave blank to use the client's primary contact.</p>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Message <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
        </div>
      </div>
      <Footer>
        <button onClick={onClose} className="px-3 py-2 text-slate-600 text-sm font-medium">Cancel</button>
        <button onClick={() => submit(false)} disabled={busy || !title.trim()}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40">Save as draft</button>
        <button onClick={() => submit(true)} disabled={busy || !title.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for signature
        </button>
      </Footer>
    </Shell>
  );
}

function Shell({ title, subtitle, onClose, children }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[88vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div><h3 className="font-bold text-slate-900">{title}</h3>{subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}</div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
const Footer = ({ children }: { children: React.ReactNode }) => (
  <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">{children}</div>
);
