import React, { useState } from 'react';
import { Loader2, X, Plus, Trash2, ArrowUp, ArrowDown, Copy, Check, Send, Mail, AlertTriangle } from 'lucide-react';
import {
  createDocumentRequest, sendDocumentRequest, ITEM_SUGGESTIONS, RequestDetail,
} from '../../hooks/useDocumentRequests';
import { errMsg } from '../../lib/errMsg';

/**
 * Create a document request, then optionally send it without leaving the modal.
 *
 * Two steps in one dialog because the link only exists in the SEND response.
 * Creating and then hunting for the request in a queue to send it would put a
 * navigation between minting the link and showing it — and there is no second
 * chance to read it.
 */
export function CreateRequestModal({ clientId, clientName, jobId, onClose, onCreated }: {
  clientId: string;
  clientName?: string;
  /** Prefilled when launched from a job drawer — links the request to that work. */
  jobId?: string | null;
  onClose: () => void;
  onCreated?: (r: RequestDetail) => void;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [items, setItems] = useState<Array<{ name: string; description: string }>>([{ name: '', description: '' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<RequestDetail | null>(null);
  const [copied, setCopied] = useState(false);

  const setItem = (i: number, patch: Partial<{ name: string; description: string }>) =>
    setItems((p) => p.map((it, n) => (n === i ? { ...it, ...patch } : it)));
  const addItem = (name = '') => setItems((p) => [...p, { name, description: '' }]);
  const removeItem = (i: number) => setItems((p) => (p.length === 1 ? p : p.filter((_, n) => n !== i)));
  const move = (i: number, d: -1 | 1) => setItems((p) => {
    const j = i + d;
    if (j < 0 || j >= p.length) return p;
    const n = [...p]; [n[i], n[j]] = [n[j], n[i]]; return n;
  });

  const named = items.map((i) => i.name.trim()).filter(Boolean);
  const canSubmit = !!title.trim() && named.length > 0 && !busy;

  const submit = async (thenSend: boolean) => {
    setBusy(true); setError(null);
    try {
      const created = await createDocumentRequest(clientId, {
        title: title.trim(),
        message: message.trim() || undefined,
        dueDate: dueDate || null,
        jobId: jobId || null,
        // Blank rows are dropped rather than rejected — an empty trailing row is
        // a natural by-product of the "add another" button, not a mistake.
        items: items.filter((i) => i.name.trim()).map((i) => ({
          name: i.name.trim(), description: i.description.trim() || undefined,
        })),
      });
      if (!thenSend) { onCreated?.(created); onClose(); return; }
      const result = await sendDocumentRequest(created.id);
      setSent(result);
      onCreated?.(result);
    } catch (e) {
      setError(errMsg(e, 'Could not create the request.'));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    if (!sent?.url) return;
    try { await navigator.clipboard.writeText(sent.url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Could not copy — select the link and copy it manually.'); }
  };

  // ── Sent confirmation: the ONLY time this URL is visible ──────────────────
  if (sent) {
    return (
      <Shell title="Request sent" subtitle={clientName} onClose={onClose}>
        <div className="p-5 space-y-4">
          {sent.emailed ? (
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <Mail size={16} className="text-emerald-600 mt-0.5 shrink-0" />
              <div className="text-sm text-emerald-800">
                Emailed to <strong>{sent.email}</strong>. They can upload straight from the link — no login needed.
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm text-amber-800">{sent.warning || 'The email did not go out. Copy the link below and send it yourself.'}</div>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Upload link</label>
            <div className="flex gap-2 mt-1">
              <input readOnly value={sent.url || ''} onFocus={(e) => e.target.select()}
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-50 text-slate-600" />
              <button onClick={copy} className="px-3 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5 shrink-0">
                {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {/* Not a warning about losing work — a statement of how the storage
                works, so nobody goes looking for the link later. */}
            <p className="text-xs text-slate-400 mt-1.5">
              We store only a fingerprint of this link, so it cannot be shown again. If it is lost,
              regenerate it from the request — which stops the old one working.
            </p>
          </div>
        </div>
        <Footer>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700">Done</button>
        </Footer>
      </Shell>
    );
  }

  return (
    <Shell title="Request documents" subtitle={clientName} onClose={onClose}>
      <div className="p-5 space-y-4 overflow-y-auto">
        {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">What is this for</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            placeholder="2025-26 Self Assessment records"
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Please send by <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-500 uppercase">Documents needed</label>
            <span className="text-xs text-slate-400">{named.length} item{named.length === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-1.5 space-y-2">
            {items.map((it, i) => (
              <div key={i} className="flex gap-2 items-start">
                <div className="flex-1 space-y-1">
                  <input value={it.name} onChange={(e) => setItem(i, { name: e.target.value })}
                    placeholder="e.g. March bank statements"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                  <input value={it.description} onChange={(e) => setItem(i, { description: e.target.value })}
                    placeholder="note for the client (optional)"
                    className="w-full px-3 py-1.5 border border-slate-100 rounded-lg text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
                <div className="flex flex-col gap-0.5 pt-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 p-0.5" title="Move up"><ArrowUp size={13} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-slate-300 hover:text-slate-600 disabled:opacity-30 p-0.5" title="Move down"><ArrowDown size={13} /></button>
                </div>
                <button onClick={() => removeItem(i)} disabled={items.length === 1}
                  className="text-slate-300 hover:text-rose-600 disabled:opacity-30 p-1 mt-1" title="Remove"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
          <button onClick={() => addItem()} className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Plus size={13} /> Add another
          </button>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {ITEM_SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => {
                // Fill the first empty row if there is one, else append — so the
                // first click after opening doesn't leave a blank row behind.
                const empty = items.findIndex((i) => !i.name.trim());
                if (empty >= 0) setItem(empty, { name: s }); else addItem(s);
              }} className="px-2.5 py-1 rounded-full border border-slate-200 text-xs font-medium text-slate-600 hover:border-blue-300 hover:text-blue-700">
                + {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 uppercase">Message <span className="font-normal normal-case text-slate-400">(optional)</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3}
            placeholder="Anything you want to say alongside the list…"
            className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        </div>
      </div>

      <Footer>
        <button onClick={onClose} className="px-3 py-2 text-slate-600 text-sm font-medium">Cancel</button>
        <button onClick={() => submit(false)} disabled={!canSubmit}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-40">
          Save as draft
        </button>
        <button onClick={() => submit(true)} disabled={!canSubmit}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-40 inline-flex items-center gap-2">
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Create &amp; send
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
          <div>
            <h3 className="font-bold text-slate-900">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
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
