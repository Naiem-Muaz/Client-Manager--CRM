import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, Loader2, Copy, Check, RefreshCw, Ban, Mail, AlertTriangle, FileText,
  Download, CheckCircle2, MinusCircle, Clock, Bell, BellOff,
} from 'lucide-react';
import {
  useDocumentRequest, regenerateRequestLink, updateDocumentRequest, waiveRequestItem,
  RequestDetail, RequestItem,
} from '../../hooks/useDocumentRequests';
import { errMsg } from '../../lib/errMsg';

const fmtDate = (iso?: string | null) => iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  : '—';
const fmtWhen = (iso?: string | null) => iso
  ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '';
const fmtSize = (b?: number | null) => (b == null ? '' : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

// Plain English for each event type — the trail is read by staff, not by us.
const EVENT_LABEL: Record<string, string> = {
  created: 'Request created',
  sent: 'Sent to client',
  viewed: 'Client opened the link',
  item_uploaded: 'Client uploaded a file',
  item_waived: 'Item waived',
  completed: 'All items received',
  cancelled: 'Request cancelled',
  link_regenerated: 'Link regenerated',
  chase_sent: 'Chase email sent',
  chase_send_failed: 'Chase email failed',
};

const MAX_CHASES = 3;   // matches CHASE_OFFSETS_DAYS on the server

/**
 * One line describing where auto-chasing actually stands. The toggle says what
 * the SETTING is; staff need to know what has HAPPENED — "we've emailed them
 * twice already" is what decides whether you pick up the phone.
 *
 * `nextChaseAt` null with chasing on and chases already sent means the cadence
 * finished. Null with none sent means the cron stopped it — which today only
 * happens when the client has no email address, and that has its own banner
 * above, so this stays deliberately vague rather than guessing the reason.
 */
function chaseState(r: { status: string; chaseEnabled: boolean; chaseCount: number; nextChaseAt: string | null }): string {
  const sent = r.chaseCount > 0 ? `Chased ${r.chaseCount}×` : 'Not chased yet';
  if (r.status !== 'sent') return `${sent} · chasing has stopped`;
  if (!r.chaseEnabled) return `${sent} · chasing off for this request`;
  if (r.nextChaseAt) {
    const d = new Date(r.nextChaseAt);
    const when = Number.isNaN(d.getTime())
      ? ''
      : ` · next ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    return `${sent}${when}`;
  }
  return r.chaseCount >= MAX_CHASES
    ? `Chasing finished (${r.chaseCount} sent)`
    : `${sent} · no further chases scheduled`;
}

const ITEM_CHIP: Record<RequestItem['status'], { cls: string; icon: React.ReactNode; label: string }> = {
  pending:   { cls: 'bg-slate-100 text-slate-600', icon: <Clock size={11} />, label: 'Waiting' },
  fulfilled: { cls: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={11} />, label: 'Received' },
  waived:    { cls: 'bg-slate-100 text-slate-400', icon: <MinusCircle size={11} />, label: 'Waived' },
};

export function RequestDetailDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { request, isLoading } = useDocumentRequest(id);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [freshUrl, setFreshUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirm, setConfirm] = useState<'cancel' | 'regenerate' | null>(null);

  const run = async (key: string, fn: () => Promise<RequestDetail>) => {
    setBusy(key); setError(null);
    try { return await fn(); }
    catch (e) { setError(errMsg(e, 'That did not work.')); return null; }
    finally { setBusy(null); setConfirm(null); }
  };

  const doRegenerate = async () => {
    const r = await run('regen', () => regenerateRequestLink(id));
    if (r?.url) { setFreshUrl(r.url); setCopied(false); }
  };
  const doCancel = () => run('cancel', () => updateDocumentRequest(id, { cancel: true }));
  const doChase = (on: boolean) => run('chase', () => updateDocumentRequest(id, { chaseEnabled: on }));
  const doDue = (d: string) => run('due', () => updateDocumentRequest(id, { dueDate: d || null }));
  const doWaive = (itemId: string) => run(`waive-${itemId}`, () => waiveRequestItem(id, itemId));

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setError('Could not copy — select the link and copy it manually.'); }
  };

  const live = request?.status === 'sent';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col">
        {/* ── header ── */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 truncate">{request?.title || 'Document request'}</h3>
            {request && (
              <p className="text-xs text-slate-500 mt-0.5">
                <Link to={`/clients/${request.clientId}`} className="hover:text-blue-600 font-medium">{request.clientName || 'Client'}</Link>
                {' · '}{request.status}
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

            {/* ── no-email banner ──────────────────────────────────────────
                The reminders queue unblocks inline because its endpoint takes
                a reminder id. There is no client-scoped equivalent on this API,
                so this deep-links to the client instead of pretending to fix it
                here. Copying the link is the immediate way through. */}
            {live && !request.email && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-amber-800">
                    <strong>No email address for this client.</strong> The request is live and the link
                    works — it just hasn't been emailed to anyone.
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Link to={`/clients/${request.clientId}`}
                        className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded inline-flex items-center gap-1">
                        <Mail size={11} /> Add a primary contact
                      </Link>
                      <span className="text-xs text-amber-700">then regenerate the link and send it, or copy it below.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── freshly regenerated link ── */}
            {freshUrl && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-xs font-bold text-blue-800 uppercase mb-1.5">New link — shown once</div>
                <div className="flex gap-2">
                  <input readOnly value={freshUrl} onFocus={(e) => e.target.select()}
                    className="flex-1 px-2.5 py-1.5 border border-blue-200 rounded text-xs font-mono bg-white text-slate-600" />
                  <button onClick={() => copy(freshUrl)} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded hover:bg-blue-700 inline-flex items-center gap-1.5 shrink-0">
                    {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-blue-700 mt-1.5">The previous link stopped working the moment this one was made.</p>
              </div>
            )}

            {/* ── progress ── */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-bold text-slate-700">
                  {request.progress.fulfilled} of {request.progress.total} received
                </span>
                {request.chaseCount > 0 && <span className="text-xs text-slate-400">{request.chaseCount} chase{request.chaseCount === 1 ? '' : 's'} sent</span>}
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${request.progress.total ? (request.progress.fulfilled / request.progress.total) * 100 : 0}%` }} />
              </div>
            </div>

            {/* ── items ── */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Documents</div>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {request.items.map((it) => {
                  const chip = ITEM_CHIP[it.status];
                  return (
                    <div key={it.id} className="px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-medium text-sm ${it.status === 'waived' ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{it.name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${chip.cls}`}>{chip.icon} {chip.label}</span>
                          </div>
                          {it.description && <div className="text-xs text-slate-500 mt-0.5">{it.description}</div>}
                        </div>
                        {it.status === 'pending' && live && (
                          <button onClick={() => doWaive(it.id)} disabled={busy === `waive-${it.id}`}
                            className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded disabled:opacity-40 shrink-0 inline-flex items-center gap-1">
                            {busy === `waive-${it.id}` ? <Loader2 size={11} className="animate-spin" /> : <MinusCircle size={11} />} Waive
                          </button>
                        )}
                      </div>
                      {it.documents.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {it.documents.map((d) => (
                            <a key={d.id} href={d.fileUrl || '#'} target="_blank" rel="noreferrer"
                              className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600 bg-slate-50 rounded px-2 py-1.5">
                              <FileText size={12} className="shrink-0" />
                              <span className="truncate flex-1">{d.fileName}</span>
                              <span className="text-slate-400 shrink-0">{fmtSize(d.fileSize)}</span>
                              <Download size={12} className="shrink-0" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Files the client sent that no longer map to a live item. Shown
                  rather than dropped — their evidence must not disappear. */}
              {request.unmatchedDocuments.length > 0 && (
                <div className="mt-2">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Other files from this request</div>
                  <div className="space-y-1">
                    {request.unmatchedDocuments.map((d) => (
                      <a key={d.id} href={d.fileUrl || '#'} target="_blank" rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-slate-600 hover:text-blue-600 bg-slate-50 rounded px-2 py-1.5">
                        <FileText size={12} /><span className="truncate flex-1">{d.fileName}</span><Download size={12} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── settings ── */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Due</label>
                <input type="date" value={request.dueDate ? String(request.dueDate).slice(0, 10) : ''}
                  onChange={(e) => doDue(e.target.value)} disabled={!live || busy === 'due'}
                  className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm disabled:bg-slate-50 disabled:text-slate-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Auto-chase</label>
                <button onClick={() => doChase(!request.chaseEnabled)} disabled={!live || busy === 'chase'}
                  className={`w-full mt-1 px-2.5 py-1.5 border rounded-lg text-sm font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${
                    request.chaseEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500'}`}>
                  {request.chaseEnabled ? <Bell size={13} /> : <BellOff size={13} />} {request.chaseEnabled ? 'On' : 'Off'}
                </button>
              </div>
            </div>
            {/* What the cron has actually done, and what it will do next. A
                toggle alone says the setting; this says the state. */}
            <div className="text-xs text-slate-500 -mt-2">{chaseState(request)}</div>
            {request.email && <div className="text-xs text-slate-400 inline-flex items-center gap-1"><Mail size={12} /> {request.email}</div>}

            {/* ── events ── */}
            <div>
              <div className="text-xs font-bold text-slate-500 uppercase mb-2">Activity</div>
              <div className="space-y-2">
                {request.events.map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-slate-700 font-medium">{EVENT_LABEL[e.type] || e.type}</span>
                      {/* actorName null = the client via the magic link, or the cron. */}
                      <span className="text-slate-400"> · {e.actorName || 'Client'} · {fmtWhen(e.createdAt)}</span>
                      {e.metadata?.reason && <span className="text-amber-600"> · {e.metadata.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── actions ── */}
        {request && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50">
            {confirm ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-slate-700">
                  {confirm === 'cancel'
                    ? 'Cancel this request? The client\'s link stops working.'
                    : 'Regenerate the link? The old link stops working immediately.'}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setConfirm(null)} className="px-3 py-2 text-slate-600 text-sm font-medium">Keep it</button>
                  <button onClick={confirm === 'cancel' ? doCancel : doRegenerate} disabled={!!busy}
                    className={`px-4 py-2 text-white text-sm font-semibold rounded-lg inline-flex items-center gap-2 disabled:opacity-50 ${
                      confirm === 'cancel' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {busy ? <Loader2 size={14} className="animate-spin" /> : null}
                    {confirm === 'cancel' ? 'Cancel request' : 'Regenerate'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-end gap-2">
                {(request.status === 'sent' || request.status === 'complete') && (
                  <button onClick={() => setConfirm('regenerate')}
                    className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5">
                    <RefreshCw size={14} /> Regenerate link
                  </button>
                )}
                {live && (
                  <button onClick={() => setConfirm('cancel')}
                    className="px-3 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-50 inline-flex items-center gap-1.5">
                    <Ban size={14} /> Cancel
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
