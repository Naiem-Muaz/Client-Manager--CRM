import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2, Send, X, Mail, AlertTriangle, Pencil, Check, CheckCircle2 } from 'lucide-react';
import {
  useReminders, useReminderSummary, approveReminder, bulkApproveReminders,
  skipReminder, editReminder, addReminderEmail, ReminderRow,
} from '../hooks/useReminders';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtSentAt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const kindBadge = (k: string) =>
  k === 'payment'
    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">Payment</span>
    : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">Filing</span>;
// Threshold badge — the key signal that two reminders for one client are DIFFERENT
// (e.g. the 14-day notice vs the 7-day notice), not a duplicate that failed to send.
const thresholdBadge = (days: number) =>
  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 tabular-nums">{days}-day notice</span>;

interface ClientGroup { client_id: string; client_name: string; rows: ReminderRow[] }
type Tab = 'pending' | 'no_email' | 'sent';
type GroupMode = 'client' | 'date';

export function ReminderQueuePage() {
  const { summary } = useReminderSummary();
  const [tab, setTab] = useState<Tab>('pending');
  const [groupMode, setGroupMode] = useState<GroupMode>('client');
  const { reminders, isLoading, refresh } = useReminders(tab);
  const [preview, setPreview] = useState<ReminderRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  // By CLIENT — name shown once; a client's reminders (possibly different thresholds/
  // due dates) list underneath, so siblings read as distinct, not a repeated name.
  const clientGroups = useMemo(() => {
    const g: Record<string, ClientGroup> = {};
    for (const r of reminders) (g[r.client_id] ||= { client_id: r.client_id, client_name: r.client_name, rows: [] }).rows.push(r);
    for (const k in g) g[k].rows.sort((a, b) => b.threshold_days - a.threshold_days || a.due_date.localeCompare(b.due_date));
    return Object.values(g).sort((a, b) => a.client_name.localeCompare(b.client_name));
  }, [reminders]);

  // By DUE DATE — clusters many clients sharing a send date (e.g. SA payment-on-account)
  // so they can be approved in a single click.
  const dateGroups = useMemo(() => {
    const g: Record<string, ReminderRow[]> = {};
    for (const r of reminders) (g[r.due_date] ||= []).push(r);
    for (const k in g) g[k].sort((a, b) => a.client_name.localeCompare(b.client_name) || b.threshold_days - a.threshold_days);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [reminders]);

  // Hold a "Sent ✓" state on the just-sent rows for a beat, THEN revalidate so they
  // exit the queue — clear visual confirmation the action worked, not just a toast.
  const flashSentThenRefresh = (ids: string[]) => {
    setJustSent((prev) => { const n = { ...prev }; ids.forEach((id) => { n[id] = true; }); return n; });
    setTimeout(() => {
      setJustSent((prev) => { const n = { ...prev }; ids.forEach((id) => { delete n[id]; }); return n; });
      refresh();
    }, 2000);
  };

  const doApprove = async (id: string) => {
    setBusy(id);
    try { await approveReminder(id, { refresh: false }); notify('Reminder sent.'); flashSentThenRefresh([id]); }
    catch { notify('Send failed.'); }
    finally { setBusy(null); }
  };
  const doSkip = async (id: string) => { setBusy(id); try { await skipReminder(id); } finally { setBusy(null); } };
  // Generic bulk — sends every still-pending row in the set under one busy key.
  const doBulk = async (key: string, rows: ReminderRow[]) => {
    const ids = rows.filter((r) => r.status === 'pending' && !justSent[r.id]).map((r) => r.id);
    if (!ids.length) return;
    setBusy(key);
    try { const r = await bulkApproveReminders(ids, { refresh: false }); notify(`Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ''}.`); flashSentThenRefresh(ids); }
    catch { notify('Send failed.'); }
    finally { setBusy(null); }
  };
  const pendingIn = (rows: ReminderRow[]) => rows.filter((r) => r.status === 'pending' && !justSent[r.id]).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1"><Bell className="text-blue-600" size={22} /><h1 className="text-xl font-bold text-slate-900">Deadline Reminders</h1></div>
      <p className="text-slate-500 text-sm mb-5">Review and send reminder emails to clients ahead of their deadlines. Nothing sends until you approve it.</p>

      {/* Top-of-queue headline — ready vs blocked (the contact-data gap made visible) */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-black text-slate-900">{summary?.ready ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">ready to send</div>
        </div>
        <div className="flex-1 min-w-[180px] bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-black text-amber-700">{summary?.blocked ?? '—'}</div>
          <div className="text-xs font-medium text-amber-700">blocked — no contact email</div>
        </div>
        <button onClick={() => setTab('sent')} className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-emerald-300 transition-colors">
          <div className="text-2xl font-black text-emerald-600">{summary?.sent ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">sent · view history</div>
        </button>
      </div>

      {/* Ready / Blocked / Sent toggle + Group-by switch */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-medium">
          <button onClick={() => setTab('pending')} className={`px-4 py-1.5 rounded ${tab === 'pending' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Ready to send</button>
          <button onClick={() => setTab('no_email')} className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${tab === 'no_email' ? 'bg-white text-amber-700 shadow' : 'text-slate-500'}`}>
            <AlertTriangle size={13} /> Blocked ({summary?.blocked ?? 0})
          </button>
          <button onClick={() => setTab('sent')} className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${tab === 'sent' ? 'bg-white text-emerald-700 shadow' : 'text-slate-500'}`}>
            <CheckCircle2 size={13} /> Sent
          </button>
        </div>
        {tab !== 'sent' && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium">Group by</span>
            <div className="flex bg-slate-100 p-1 rounded-lg font-medium">
              <button onClick={() => setGroupMode('client')} className={`px-3 py-1 rounded ${groupMode === 'client' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Client</button>
              <button onClick={() => setGroupMode('date')} className={`px-3 py-1 rounded ${groupMode === 'date' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Due date</button>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : !reminders.length ? (
        <p className="text-slate-400 text-sm text-center py-12">{tab === 'pending' ? 'No reminders waiting to send.' : tab === 'sent' ? 'No reminders sent yet.' : 'No blocked reminders — every client here has an email. 🎉'}</p>
      ) : tab === 'sent' ? (
        /* ── Sent history: chronological (most recent first), read-only ── */
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {reminders.map((r) => (
            <div key={r.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link to={`/clients/${r.client_id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate">{r.client_name}</Link>
                  {thresholdBadge(r.threshold_days)}
                  {kindBadge(r.template_kind)}
                </div>
                <div className="text-sm text-slate-600 truncate mt-0.5">{r.deadline_name}</div>
                {r.to_email && <div className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1"><Mail size={12} /> {r.to_email}</div>}
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> Sent {fmtSentAt(r.sent_at)}</div>
                {r.reviewed_by_name && <div className="text-[11px] text-slate-400 mt-0.5">by {r.reviewed_by_name}</div>}
              </div>
              <button onClick={() => setPreview(r)} className="text-slate-400 hover:text-slate-700 p-1.5 shrink-0" title="View sent email"><Pencil size={15} /></button>
            </div>
          ))}
        </div>
      ) : groupMode === 'client' ? (
        /* ── Grouped by client: name once, reminders (thresholds) underneath ── */
        <div className="space-y-4">
          {clientGroups.map((group) => {
            const pendingCount = pendingIn(group.rows);
            const key = `bulk-client-${group.client_id}`;
            return (
              <div key={group.client_id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <Link to={`/clients/${group.client_id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate">
                    {group.client_name}
                    <span className="text-slate-400 font-normal"> · {group.rows.length} reminder{group.rows.length === 1 ? '' : 's'}</span>
                  </Link>
                  {tab === 'pending' && pendingCount > 1 && (
                    <button onClick={() => doBulk(key, group.rows)} disabled={busy === key} className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0">
                      {busy === key ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send all ({pendingCount})
                    </button>
                  )}
                </div>
                <div className="divide-y divide-slate-100">
                  {group.rows.map((r) => (
                    <ReminderItem
                      key={r.id} r={r} busy={busy === r.id} sent={!!justSent[r.id]}
                      onPreview={() => setPreview(r)} onApprove={() => doApprove(r.id)} onSkip={() => doSkip(r.id)}
                      onAddedEmail={() => { refresh(); notify('Email added — reminder unblocked.'); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── Grouped by due date: one-click "send all due {date}" for the cluster ── */
        <div className="space-y-6">
          {dateGroups.map(([due, rows]) => {
            const pendingCount = pendingIn(rows);
            const key = `bulk-date-${due}`;
            return (
              <div key={due}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-700">Due {fmtDate(due)} <span className="text-slate-400 font-normal">· {rows.length}</span></h3>
                  {tab === 'pending' && pendingCount > 1 && (
                    <button onClick={() => doBulk(key, rows)} disabled={busy === key} className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1.5 disabled:opacity-40 shrink-0">
                      {busy === key ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send all due {fmtDate(due)} ({pendingCount})
                    </button>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                  {rows.map((r) => (
                    <ReminderItem
                      key={r.id} r={r} showClient busy={busy === r.id} sent={!!justSent[r.id]}
                      onPreview={() => setPreview(r)} onApprove={() => doApprove(r.id)} onSkip={() => doSkip(r.id)}
                      onAddedEmail={() => { refresh(); notify('Email added — reminder unblocked.'); }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && <PreviewModal r={preview} onClose={() => setPreview(null)} onSaved={() => { refresh(); notify('Draft updated.'); }} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-slate-900 text-white">{toast}</div>}
    </div>
  );
}

function ReminderItem({ r, busy, sent, showClient, onPreview, onApprove, onSkip, onAddedEmail }:
  { r: ReminderRow; busy: boolean; sent: boolean; showClient?: boolean; onPreview: () => void; onApprove: () => void; onSkip: () => void; onAddedEmail: () => void }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const addEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setSaving(true); try { await addReminderEmail(r.id, email.trim()); onAddedEmail(); } finally { setSaving(false); }
  };
  return (
    <div className={`px-4 py-3 flex items-center gap-3 transition-colors ${sent ? 'bg-emerald-50' : ''}`}>
      <div className="flex-1 min-w-0">
        {/* Client name (date-mode only) + threshold + kind — siblings read as distinct */}
        <div className="flex items-center gap-2 flex-wrap">
          {showClient && <Link to={`/clients/${r.client_id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate mr-1">{r.client_name}</Link>}
          {thresholdBadge(r.threshold_days)}
          {kindBadge(r.template_kind)}
          <span className="text-xs text-slate-400">due {fmtDate(r.due_date)} · {r.days_out} day{r.days_out === 1 ? '' : 's'} out</span>
        </div>
        <div className="text-sm text-slate-600 truncate mt-0.5">{r.deadline_name}</div>
        {r.status === 'no_email' ? (
          <div className="mt-2 flex items-center gap-1.5">
            <Mail size={14} className="text-amber-600 shrink-0" />
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="add client email…" className="text-sm px-2 py-1 border border-amber-300 rounded w-56 focus:outline-none focus:ring-2 focus:ring-amber-100" />
            <button onClick={addEmail} disabled={saving} className="text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 px-2.5 py-1 rounded disabled:opacity-40 inline-flex items-center gap-1">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Add & unblock
            </button>
            <Link to={`/clients/${r.client_id}`} className="text-xs text-slate-400 hover:text-slate-600 underline ml-1">or open client</Link>
          </div>
        ) : (
          <div className="text-xs text-slate-400 mt-0.5 inline-flex items-center gap-1"><Mail size={12} /> {r.to_email}</div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {sent ? (
          // Brief per-row confirmation before the row drops out of the queue.
          <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1.5 px-2 py-1.5"><CheckCircle2 size={15} /> Sent</span>
        ) : (
          <>
            <button onClick={onPreview} className="text-slate-400 hover:text-slate-700 p-1.5" title="Preview / edit"><Pencil size={15} /></button>
            {r.status === 'pending' && (
              <button onClick={onApprove} disabled={busy} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1.5">
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
              </button>
            )}
            <button onClick={onSkip} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 disabled:opacity-40">Skip</button>
          </>
        )}
      </div>
    </div>
  );
}

function PreviewModal({ r, onClose, onSaved }: { r: ReminderRow; onClose: () => void; onSaved: () => void }) {
  const alreadySent = r.status === 'sent';
  const [subject, setSubject] = useState(r.subject);
  const [body, setBody] = useState(r.body_html);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await editReminder(r.id, { subject, body_html: body }); onSaved(); setEditing(false); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div><h3 className="font-bold text-slate-900">{alreadySent ? 'Sent reminder' : 'Reminder preview'}</h3><p className="text-xs text-slate-500">{r.client_name} · {r.deadline_name}{alreadySent && r.sent_at ? ` · sent ${new Date(r.sent_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}</p></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
        </div>
        <div className="p-5 overflow-y-auto space-y-3">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Subject</label>
            {editing
              ? <input value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              : <div className="text-sm text-slate-900 mt-1">{subject}</div>}
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase">Body</label>
            {editing
              ? <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono" />
              : <div className="mt-1 border border-slate-200 rounded-lg p-3 bg-slate-50 max-h-80 overflow-y-auto" dangerouslySetInnerHTML={{ __html: body }} />}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
          {alreadySent
            ? <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50">Close</button>
            : editing
              ? <><button onClick={() => { setEditing(false); setSubject(r.subject); setBody(r.body_html); }} className="px-3 py-2 text-slate-600 text-sm font-medium">Cancel</button>
                <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">{saving ? <Loader2 size={14} className="animate-spin" /> : null} Save draft</button></>
              : <button onClick={() => setEditing(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 inline-flex items-center gap-2"><Pencil size={14} /> Edit before send</button>}
        </div>
      </div>
    </div>
  );
}
