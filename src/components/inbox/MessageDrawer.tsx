import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, Check, Loader2, Paperclip, Mail, AlarmClock, CheckCircle2, RotateCcw, Send, Briefcase, Link2, Unlink } from 'lucide-react';
import { useInboxMessage, updateInboxMessage, addInboxComment, linkInboxClient, convertInboxMessage, InboxStatus, InboxComment, InboxMessageDetail } from '../../hooks/useInbox';
import { useTeamMembers } from '../../hooks/useTeam';
import { useClients } from '../../hooks/useClients';
import { useJobTemplates } from '../../hooks/useJobs';
import { errMsg } from '../../lib/errMsg';

const initials = (name?: string | null) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

// Highlight each mentioned "@Display Name" inside the body. Only names resolved
// from the comment's mentions ids are highlighted; anything else (including an
// @ for someone no longer on the roster) stays plain text.
function CommentBody({ body, mentionNames }: { body: string; mentionNames: string[] }) {
  const parts = useMemo(() => {
    const names = mentionNames.filter(Boolean);
    if (!names.length) return [body];
    const escaped = names.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return body.split(new RegExp(`(@(?:${escaped.join('|')}))`, 'g'));
  }, [body, mentionNames]);
  return (
    <p className="text-sm text-slate-600 whitespace-pre-wrap">
      {parts.map((p, i) =>
        p.startsWith('@') && mentionNames.includes(p.slice(1))
          ? <span key={i} className="text-blue-700 bg-blue-50 rounded px-0.5 font-medium">{p}</span>
          : <React.Fragment key={i}>{p}</React.Fragment>
      )}
    </p>
  );
}

export const INBOX_STATUS_META: Record<InboxStatus, { label: string; dot: string }> = {
  open: { label: 'Open', dot: 'bg-blue-500' },
  done: { label: 'Done', dot: 'bg-emerald-500' },
};

const fmtSize = (b: number) => b >= 1024 * 1024 ? `${(b / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

// Snooze presets. "Tomorrow" and "next week" land at 09:00 local — the start of
// a working day, not 24h drift.
function snoozePreset(kind: 'tomorrow' | 'next-week'): string {
  const d = new Date();
  d.setDate(d.getDate() + (kind === 'tomorrow' ? 1 : 7));
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

export function MessageDrawer({ id, onClose, onChanged }: { id: string; onClose: () => void; onChanged?: () => void }) {
  const { message, isLoading, mutate } = useInboxMessage(id);
  const { members } = useTeamMembers();

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const pendingRef = useRef<Record<string, any>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customSnooze, setCustomSnooze] = useState('');

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const changes = pendingRef.current;
    if (Object.keys(changes).length === 0) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateInboxMessage(id, changes);
      setSaveState('saved');
      setSaveError(null);
      mutate();
      onChanged?.();
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      setSaveState('idle');
      setSaveError(errMsg(e, 'Save failed'));
    }
  }, [id, mutate, onChanged]);

  // Debounced field updates (800ms, TaskDetailModal pattern).
  const update = (field: string, value: any) => {
    pendingRef.current[field] = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 800);
  };

  // Immediate actions (buttons should not feel debounced).
  const apply = async (patch: Record<string, any>) => {
    setSaveState('saving');
    try {
      await updateInboxMessage(id, patch);
      setSaveState('saved');
      setSaveError(null);
      mutate();
      onChanged?.();
      setTimeout(() => setSaveState('idle'), 1500);
    } catch (e) {
      setSaveState('idle');
      setSaveError(errMsg(e, 'Save failed'));
    }
  };

  const close = useCallback(() => { flush(); onClose(); }, [flush, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';
  const m = message;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {saveState === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving…</>}
            {saveState === 'saved' && <><Check size={12} className="text-emerald-500" /> Saved</>}
            {saveError && <span className="text-red-500">{saveError}</span>}
          </div>
          <button onClick={close} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {isLoading || !m ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm"><Loader2 className="animate-spin mr-2" size={16} /> Loading…</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* From / subject / received */}
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium text-slate-800">{m.fromName || m.fromEmail}</span>
                  {m.fromName && <span className="text-xs text-slate-400">{m.fromEmail}</span>}
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">{m.subject || '(no subject)'}</h2>
                <p className="text-xs text-slate-400 mt-0.5">Received {new Date(m.receivedAt).toLocaleString('en-GB')}</p>
              </div>

              {/* Triage controls */}
              <div className="grid grid-cols-2 gap-4">
                <Row label="Assignee">
                  <select value={m.assigneeId || ''} onChange={e => update('assigneeId', e.target.value || null)} className={field}>
                    <option value="">Unassigned</option>
                    {/* Only active staff — a pending invitee's id isn't a user_profiles row. */}
                    {members.filter(mb => mb.status !== 'pending').map(mb => <option key={mb.id} value={mb.id}>{mb.name}</option>)}
                  </select>
                </Row>
                <Row label="Due date">
                  <input type="date" value={m.dueDate || ''} onChange={e => update('dueDate', e.target.value || null)} className={field} />
                </Row>
              </div>

              {/* Status + snooze actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {m.status === 'open' ? (
                  <button onClick={() => apply({ status: 'done' })} className="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 inline-flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Mark done
                  </button>
                ) : (
                  <button onClick={() => apply({ status: 'open' })} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 inline-flex items-center gap-1.5">
                    <RotateCcw size={14} /> Reopen
                  </button>
                )}
                <div className="relative">
                  <button onClick={() => setSnoozeOpen(v => !v)} className="px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 inline-flex items-center gap-1.5">
                    <AlarmClock size={14} /> {m.snoozedUntil && new Date(m.snoozedUntil) > new Date() ? `Snoozed until ${new Date(m.snoozedUntil).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : 'Snooze'}
                  </button>
                  {snoozeOpen && (
                    <div className="absolute z-10 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-56 space-y-1">
                      <button onClick={() => { apply({ snoozedUntil: snoozePreset('tomorrow') }); setSnoozeOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50">Tomorrow 9am</button>
                      <button onClick={() => { apply({ snoozedUntil: snoozePreset('next-week') }); setSnoozeOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50">Next week</button>
                      <div className="flex gap-1 items-center px-2 py-1">
                        <input type="datetime-local" value={customSnooze} onChange={e => setCustomSnooze(e.target.value)} className="flex-1 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs" />
                        <button disabled={!customSnooze} onClick={() => { apply({ snoozedUntil: new Date(customSnooze).toISOString() }); setSnoozeOpen(false); setCustomSnooze(''); }} className="text-xs font-medium text-blue-600 disabled:opacity-40">Set</button>
                      </div>
                      {m.snoozedUntil && (
                        <button onClick={() => { apply({ snoozedUntil: null }); setSnoozeOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-slate-50 text-slate-500">Clear snooze</button>
                      )}
                    </div>
                  )}
                </div>
                {/* Every dead end says what to do instead: replies happen in the mailbox. */}
                <a href={`mailto:${m.fromEmail}?subject=${encodeURIComponent(`Re: ${m.subject || ''}`)}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5">
                  <Mail size={14} /> Reply in your mailbox
                </a>
              </div>

              {/* Linked client — link / unlink / suggestions */}
              <Row label="Client">
                <ClientSection m={m} onApply={async (clientId) => {
                  try { await linkInboxClient(m.id, clientId); mutate(); onChanged?.(); }
                  catch (e) { setSaveError(errMsg(e, 'Link failed')); }
                }} onNavigate={close} />
              </Row>

              {/* Convert to job */}
              <Row label="Job">
                <ConvertSection m={m} onConverted={() => { mutate(); onChanged?.(); }} />
              </Row>

              {/* Body — text only, by design (HTML is stored but never rendered in v1) */}
              <Row label="Message">
                {m.bodyText
                  ? <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3 max-h-96 overflow-y-auto">{m.bodyText}</div>
                  : <div className="text-sm text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
                      This email has no plain-text version to display. Open it in your mailbox to read the original.
                    </div>}
              </Row>

              {/* Attachments */}
              {m.attachments.length > 0 && (
                <Row label={`Attachments (${m.attachments.length})`}>
                  <div className="space-y-1">
                    {m.attachments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 text-sm py-1">
                        <Paperclip size={13} className="text-slate-400 shrink-0" />
                        {a.signedUrl ? (
                          <a href={a.signedUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 truncate">{a.fileName}</a>
                        ) : (
                          <span className="text-slate-400 truncate">{a.fileName}</span>
                        )}
                        <span className="text-xs text-slate-400 shrink-0">{fmtSize(a.sizeBytes)}</span>
                        {!a.signedUrl && <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 shrink-0">not stored</span>}
                      </div>
                    ))}
                  </div>
                </Row>
              )}

              {/* Comments + @mentions — internal-only by design (no client visibility). */}
              <Row label="Comments">
                <div className="space-y-3 mb-3">
                  {m.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
                  {m.comments.map((c: InboxComment) => {
                    const names = c.mentions.map(id => members.find(mb => mb.id === id)?.name).filter(Boolean) as string[];
                    return (
                      <div key={c.id} className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{initials(c.authorName)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-800">{c.authorName}</span>
                            <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString('en-GB')}</span>
                          </div>
                          <CommentBody body={c.body} mentionNames={names} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <MentionComposer messageId={m.id} onPosted={() => { mutate(); onChanged?.(); }} />
              </Row>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-400 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${INBOX_STATUS_META[m.status].dot}`} />
              {INBOX_STATUS_META[m.status].label}
              {m.convertedJobId && <span>· converted to a job</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}

/** Link / unlink / one-click suggestions + a search picker over the existing
 *  useClients() list (no new endpoint — client-side name filter). */
function ClientSection({ m, onApply, onNavigate }: {
  m: InboxMessageDetail;
  onApply: (clientId: string | null) => Promise<void>;
  onNavigate: () => void;
}) {
  const { clients } = useClients();
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const apply = async (id: string | null) => { setBusy(true); try { await onApply(id); setQuery(''); } finally { setBusy(false); } };

  if (m.clientId) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Link to={`/clients/${m.clientId}`} onClick={onNavigate} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">
          {m.clientName || 'View'} <ExternalLink size={12} />
        </Link>
        <button onClick={() => apply(null)} disabled={busy}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50">
          <Unlink size={11} /> Unlink
        </button>
      </div>
    );
  }

  const matches = query.trim().length >= 2
    ? (clients || []).filter((c: any) => (c.name || '').toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : [];

  return (
    <div className="space-y-2">
      {(m.suggestedClients?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400">Suggested:</span>
          {m.suggestedClients!.map(s => (
            <button key={s.id} onClick={() => apply(s.id)} disabled={busy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50">
              <Link2 size={11} /> {s.name}
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search clients to link…"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
        {matches.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-10">
            {matches.map((c: any) => (
              <button key={c.id} onClick={() => apply(c.id)} disabled={busy}
                className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50">{c.name}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Convert-to-job: inline form (title prefilled from subject, optional template +
 *  assignee). 409 surfaces the existing job, never an error wall. */
function ConvertSection({ m, onConverted }: { m: InboxMessageDetail; onConverted: () => void }) {
  const { members } = useTeamMembers();
  const { templates } = useJobTemplates();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (m.convertedJobId) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
          <Briefcase size={11} /> Converted
        </span>
        <Link to="/work" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center gap-1">
          View on the work board <ExternalLink size={12} />
        </Link>
      </div>
    );
  }

  const convert = async () => {
    setBusy(true);
    setError(null);
    try {
      await convertInboxMessage(m.id, {
        jobTitle: title.trim() || undefined,
        templateId: templateId || undefined,
        assigneeId: assigneeId || undefined,
        // Without a template the API needs a jobType — a plain triage job.
        ...(templateId ? {} : { jobType: 'ad-hoc' }),
      });
      setOpen(false);
      onConverted();
    } catch (e: any) {
      if (e?.response?.status === 409) { onConverted(); return; } // someone beat us to it — show their job
      setError(errMsg(e?.response?.data ?? e, 'Convert failed'));
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  if (!open) {
    return (
      <button onClick={() => { setTitle(m.subject || ''); setOpen(true); }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200">
        <Briefcase size={14} /> Convert to job
      </button>
    );
  }

  return (
    <div className="space-y-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Job title" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <select value={templateId} onChange={e => setTemplateId(e.target.value)} className={field}>
          <option value="">No template</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={field}>
          <option value="">Unassigned</option>
          {members.filter(mb => mb.status !== 'pending').map(mb => <option key={mb.id} value={mb.id}>{mb.name}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={convert} disabled={busy || (!title.trim() && !templateId)}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {busy ? <Loader2 size={14} className="animate-spin" /> : 'Create job'}
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

/**
 * Composer with a lightweight @ trigger. Typing `@word` opens a picker of active
 * staff; selecting inserts `@Display Name ` and tracks the id. The backend
 * treats the ID ARRAY as the source of truth — deleting the text afterwards
 * doesn't need to un-track the id (it validates + stores ids, not names).
 */
function MentionComposer({ messageId, onPosted }: { messageId: string; onPosted: () => void }) {
  const { members } = useTeamMembers();
  const [body, setBody] = useState('');
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An unterminated trailing "@query" (no whitespace after @) opens the picker.
  const query = useMemo(() => {
    const match = body.match(/@([^\s@]*)$/);
    return match ? match[1].toLowerCase() : null;
  }, [body]);
  const candidates = useMemo(() => {
    if (query === null) return [];
    return members
      .filter(mb => mb.status !== 'pending') // pending invitees can't be mentioned
      .filter(mb => mb.name.toLowerCase().includes(query))
      .slice(0, 6);
  }, [members, query]);

  const pick = (id: string, name: string) => {
    setBody(prev => prev.replace(/@[^\s@]*$/, `@${name} `));
    setMentionIds(prev => (prev.includes(id) ? prev : [...prev, id]));
  };

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await addInboxComment(messageId, { body: body.trim(), mentions: mentionIds });
      setBody('');
      setMentionIds([]);
      onPosted();
    } catch (e) {
      setError(errMsg(e, 'Comment failed'));
    } finally {
      setSending(false);
    }
  };

  const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="relative">
      {candidates.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-lg shadow-lg w-64 py-1 z-10">
          {candidates.map(c => (
            <button key={c.id} onClick={() => pick(c.id, c.name)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">{initials(c.name)}</span>
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={1}
          placeholder="Add an internal comment… type @ to mention" className={`${field} resize-none flex-1`} />
        <button onClick={send} disabled={!body.trim() || sending}
          className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 self-end">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
