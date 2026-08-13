import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Loader2, Copy, Check, RefreshCw, Ban, FileText, Download, ShieldCheck,
  Bell, BellOff, RotateCcw, Send,
} from 'lucide-react';
import {
  useSignatureRequest, regenerateSignatureLink, updateSignatureRequest,
  restampSignatureRequest, sendSignatureAgain, sendSignatureRequest,
  SignatureDetail, SIGNATURE_STATUS_META,
} from '../../hooks/useSignatureRequests';
import { errMsg } from '../../lib/errMsg';

const fmtWhen = (iso?: string | null) => iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—';
const fmtSize = (b?: number | null) => (b == null ? '' : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

const EVENT_LABEL: Record<string, string> = {
  created: 'Request created',
  sent: 'Sent to signer',
  viewed: 'Signer opened the document',
  signed: 'Signed',
  declined: 'Declined',
  cancelled: 'Withdrawn',
  link_regenerated: 'Link regenerated',
  chase_sent: 'Reminder sent',
  chase_send_failed: 'Reminder failed',
};

const MAX_CHASES = 3;

export function SignatureDetailDrawer({ id, onClose, onCloned }: {
  id: string; onClose: () => void; onCloned?: (d: SignatureDetail) => void;
}) {
  const { request, isLoading } = useSignatureRequest(id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'regenerate' | null>(null);

  const run = async (key: string, fn: () => Promise<SignatureDetail>) => {
    setBusy(key); setError(null);
    try { return await fn(); }
    catch (e) { setError(errMsg(e, 'That did not work.')); return null; }
    finally { setBusy(null); setConfirm(null); }
  };

  const doRegenerate = async () => {
    const r = await run('regen', () => regenerateSignatureLink(id));
    if (r?.url) { setFreshUrl(r.url); setCopied(false); }
  };
  const doCancel  = () => run('cancel', () => updateSignatureRequest(id, { cancel: true }));
  const doChase   = (on: boolean) => run('chase', () => updateSignatureRequest(id, { chaseEnabled: on }));
  const doRestamp = () => run('restamp', () => restampSignatureRequest(id));
  const doSend    = async () => {
    const r = await run('send', () => sendSignatureRequest(id));
    if (r?.url) { setFreshUrl(r.url); setCopied(false); }
  };
  const doSendAgain = async () => {
    const r = await run('again', () => sendSignatureAgain(id));
    if (r) onCloned?.(r);
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Could not copy — select the link and copy it manually.'); }
  };

  const live = request && (request.status === 'sent' || request.status === 'viewed');
  // Re-stamp is offered exactly when the server would accept it: signed, with
  // no stored copy. A button whose only outcome is a 409 is worse than none.
  const needsRestamp = request?.status === 'signed' && !request.evidence.signedDocumentId;
  const canSendAgain = request?.status === 'declined' || request?.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{request?.title || 'Signature request'}</h3>
            {request && (
              <p className="text-xs text-slate-500 mt-0.5">
                <Link to={`/clients/${request.clientId}`} className="hover:text-blue-600 font-medium">{request.clientName || 'Client'}</Link>
                {' · '}<span className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${SIGNATURE_STATUS_META[request.status].cls}`}>
                  {SIGNATURE_STATUS_META[request.status].label}
                </span>
                {request.sentAt ? ` · sent ${fmtWhen(request.sentAt)}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 shrink-0"><X size={18} /></button>
        </div>

        {isLoading || !request ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm gap-2">
            <Loader2 className="animate-spin" size={16} /> Loading…
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2">{error}</div>}

            {freshUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-bold text-blue-800 uppercase mb-1.5">Signing link — shown once</div>
                <div className="flex gap-2">
                  <input readOnly value={freshUrl} onFocus={(e) => e.target.select()}
                    className="flex-1 px-2.5 py-1.5 border border-blue-200 rounded text-xs font-mono bg-white text-slate-600" />
                  <button onClick={() => copy(freshUrl)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 inline-flex items-center gap-1.5 shrink-0">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-1.5">Any previous link stopped working the moment this one was made.</p>
              </div>
            )}

            {/* ── the evidence, when signed ── */}
            {request.status === 'signed' && (
              <div className="bg-white border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Signature evidence</span>
                </div>
                <Row label="Signed by" value={request.evidence.signatureName} />
                <Row label="Email" value={request.evidence.signatureEmail} />
                <Row label="Date" value={fmtWhen(request.evidence.signedAt)} />
                <Row label="IP address" value={request.evidence.signatureIp} />
                <Row label="Consent" value={request.evidence.consentConfirmed ? 'Confirmed' : '—'} />
                <Row label="Document fingerprint" value={
                  <span className="font-mono text-[10px] break-all">{request.evidence.sourceSha256}</span>} />
              </div>
            )}

            {request.status === 'declined' && request.evidence.declineReason && (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-800">
                <strong>Declined {fmtWhen(request.evidence.declinedAt)}.</strong>
                <div className="mt-1">“{request.evidence.declineReason}”</div>
              </div>
            )}

            {/* ── the documents ── */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Document</div>
              {request.document ? (
                <a href={request.document.fileUrl || '#'} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 bg-slate-50 rounded px-3 py-2">
                  <FileText size={14} /><span className="truncate flex-1">{request.document.fileName}</span>
                  <span className="text-slate-400 text-xs">{fmtSize(request.document.fileSize)}</span>
                  <Download size={14} />
                </a>
              ) : <div className="text-sm text-slate-400">The source document is no longer available.</div>}

              {request.status === 'signed' && (
                needsRestamp ? (
                  // The C2 case: the signature is valid, only its PDF is missing.
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-sm text-amber-800">
                      <strong>Stamped copy pending.</strong> The signature is recorded and valid — the
                      PDF copy did not save. Re-stamping rebuilds it from the recorded evidence.
                    </div>
                    <button onClick={doRestamp} disabled={busy === 'restamp'}
                      className="mt-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded disabled:opacity-40 inline-flex items-center gap-1">
                      {busy === 'restamp' ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />} Re-stamp
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-emerald-700 inline-flex items-center gap-1.5">
                    <Check size={12} /> Stamped copy stored — it appears in the client's documents.
                  </div>
                )
              )}
            </div>

            {/* ── chase ── */}
            {live && (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-bold text-slate-500 uppercase">Auto-chase</div>
                  <button onClick={() => doChase(!request.chaseEnabled)} disabled={busy === 'chase'}
                    className={`px-2.5 py-1 border rounded-lg text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 ${
                      request.chaseEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                    {request.chaseEnabled ? <Bell size={13} /> : <BellOff size={13} />} {request.chaseEnabled ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {request.chaseCount > 0 ? `Chased ${request.chaseCount}×` : 'Not chased yet'}
                  {request.nextChaseAt
                    ? ` · next ${new Date(request.nextChaseAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                    : request.chaseCount >= MAX_CHASES ? ' · chasing finished' : ' · no further chases scheduled'}
                </div>
                {request.signerEmail && <div className="text-xs text-slate-400 mt-1">{request.signerEmail}</div>}
              </div>
            )}

            {/* ── events ── */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Activity</div>
              <div className="space-y-2">
                {request.events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-slate-700 font-medium">{EVENT_LABEL[e.type] || e.type}</span>
                      {/* actorName null = the signer, or the chase cron. */}
                      <span className="text-slate-400"> · {e.actorName || 'Signer'} · {fmtWhen(e.createdAt)}</span>
                      {e.metadata?.reason && <span className="text-amber-600"> · {e.metadata.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {request && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
            {confirm ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">
                  {confirm === 'cancel'
                    ? "Withdraw this request? The signer's link stops working."
                    : 'Regenerate the link? The old link stops working immediately.'}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="px-3 py-2 text-slate-600 text-sm font-medium">Keep it</button>
                  <button onClick={confirm === 'cancel' ? doCancel : doRegenerate} disabled={!!busy}
                    className={`px-4 py-2 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 disabled:opacity-50 ${
                      confirm === 'cancel' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                    {confirm === 'cancel' ? 'Withdraw' : 'Regenerate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2 flex-wrap">
                {request.status === 'draft' && (
                  <button onClick={doSend} disabled={!!busy}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 inline-flex items-center gap-1.5 disabled:opacity-50">
                    {busy === 'send' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send for signature
                  </button>
                )}
                {canSendAgain && (
                  // Clones into a NEW draft — the decline stays on the record.
                  <button onClick={doSendAgain} disabled={!!busy}
                    className="px-3 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 inline-flex items-center gap-1.5 disabled:opacity-50">
                    {busy === 'again' ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Send again
                  </button>
                )}
                {(live || request.status === 'signed') && (
                  <button onClick={() => setConfirm('regenerate')}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5">
                    <RefreshCw size={14} /> Regenerate link
                  </button>
                )}
                {(live || request.status === 'draft') && (
                  <button onClick={() => setConfirm('cancel')}
                    className="px-3 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-50 inline-flex items-center gap-1.5">
                    <Ban size={14} /> Withdraw
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1 text-sm border-b border-slate-100 last:border-0">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-900 text-right min-w-0 truncate">{value || '—'}</span>
    </div>
  );
}
