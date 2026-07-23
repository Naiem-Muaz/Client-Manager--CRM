import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Loader2, Send, X, Mail, AlertTriangle, Pencil, Check } from 'lucide-react';
import {
  useReminders, useReminderSummary, approveReminder, bulkApproveReminders,
  skipReminder, editReminder, addReminderEmail, ReminderRow,
} from '../hooks/useReminders';

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const kindBadge = (k: string) =>
  k === 'payment'
    ? <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-700">Payment</span>
    : <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">Filing</span>;

export function ReminderQueuePage() {
  const { summary } = useReminderSummary();
  const [tab, setTab] = useState<'pending' | 'no_email'>('pending');
  const { reminders, isLoading, refresh } = useReminders(tab);
  const [preview, setPreview] = useState<ReminderRow | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3500); };

  // Group by due date (many clients share a due date — bulk-approve per group).
  const groups = useMemo(() => {
    const g: Record<string, ReminderRow[]> = {};
    for (const r of reminders) (g[r.due_date] ||= []).push(r);
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [reminders]);

  const doApprove = async (id: string) => { setBusy(id); try { await approveReminder(id); notify('Reminder sent.'); } catch { notify('Send failed.'); } finally { setBusy(null); } };
  const doSkip = async (id: string) => { setBusy(id); try { await skipReminder(id); } finally { setBusy(null); } };
  const doBulk = async (rows: ReminderRow[]) => {
    const ids = rows.filter((r) => r.status === 'pending').map((r) => r.id);
    if (!ids.length) return;
    setBusy('bulk'); try { const r = await bulkApproveReminders(ids); notify(`Sent ${r.sent}${r.failed ? `, ${r.failed} failed` : ''}.`); } finally { setBusy(null); }
  };

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
        <div className="flex-1 min-w-[180px] bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-black text-emerald-600">{summary?.sent ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">sent</div>
        </div>
      </div>

      {/* Ready / Blocked toggle */}
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-medium mb-4">
        <button onClick={() => setTab('pending')} className={`px-4 py-1.5 rounded ${tab === 'pending' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>Ready to send</button>
        <button onClick={() => setTab('no_email')} className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${tab === 'no_email' ? 'bg-white text-amber-700 shadow' : 'text-slate-500'}`}>
          <AlertTriangle size={13} /> Blocked ({summary?.blocked ?? 0})
        </button>
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : !reminders.length ? (
        <p className="text-slate-400 text-sm text-center py-12">{tab === 'pending' ? 'No reminders waiting to send.' : 'No blocked reminders — every client here has an email. 🎉'}</p>
      ) : (
        <div className="space-y-6">
          {groups.map(([due, rows]) => (
            <div key={due}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-slate-700">Due {fmtDate(due)} <span className="text-slate-400 font-normal">· {rows.length}</span></h3>
                {tab === 'pending' && (
                  <button onClick={() => doBulk(rows)} disabled={busy === 'bulk'} className="text-xs font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1.5 disabled:opacity-40">
                    {busy === 'bulk' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Approve & send all ({rows.length})
                  </button>
                )}
              </div>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {rows.map((r) => (
                  <ReminderItem key={r.id} r={r} busy={busy === r.id} onPreview={() => setPreview(r)} onApprove={() => doApprove(r.id)} onSkip={() => doSkip(r.id)} onAddedEmail={() => { refresh(); notify('Email added — reminder unblocked.'); }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && <PreviewModal r={preview} onClose={() => setPreview(null)} onSaved={() => { refresh(); notify('Draft updated.'); }} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium bg-slate-900 text-white">{toast}</div>}
    </div>
  );
}

function ReminderItem({ r, busy, onPreview, onApprove, onSkip, onAddedEmail }:
  { r: ReminderRow; busy: boolean; onPreview: () => void; onApprove: () => void; onSkip: () => void; onAddedEmail: () => void }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const addEmail = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return;
    setSaving(true); try { await addReminderEmail(r.id, email.trim()); onAddedEmail(); } finally { setSaving(false); }
  };
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/clients/${r.client_id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate">{r.client_name}</Link>
          {kindBadge(r.template_kind)}
          <span className="text-xs text-slate-400">{r.days_out} day{r.days_out === 1 ? '' : 's'} out</span>
        </div>
        <div className="text-sm text-slate-500 truncate">{r.deadline_name}</div>
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
        <button onClick={onPreview} className="text-slate-400 hover:text-slate-700 p-1.5" title="Preview / edit"><Pencil size={15} /></button>
        {r.status === 'pending' && (
          <button onClick={onApprove} disabled={busy} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1.5">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />} Send
          </button>
        )}
        <button onClick={onSkip} disabled={busy} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 disabled:opacity-40">Skip</button>
      </div>
    </div>
  );
}

function PreviewModal({ r, onClose, onSaved }: { r: ReminderRow; onClose: () => void; onSaved: () => void }) {
  const [subject, setSubject] = useState(r.subject);
  const [body, setBody] = useState(r.body_html);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const save = async () => { setSaving(true); try { await editReminder(r.id, { subject, body_html: body }); onSaved(); setEditing(false); } finally { setSaving(false); } };
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div><h3 className="font-bold text-slate-900">Reminder preview</h3><p className="text-xs text-slate-500">{r.client_name} · {r.deadline_name}</p></div>
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
          {editing
            ? <><button onClick={() => { setEditing(false); setSubject(r.subject); setBody(r.body_html); }} className="px-3 py-2 text-slate-600 text-sm font-medium">Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">{saving ? <Loader2 size={14} className="animate-spin" /> : null} Save draft</button></>
            : <button onClick={() => setEditing(true)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 inline-flex items-center gap-2"><Pencil size={14} /> Edit before send</button>}
        </div>
      </div>
    </div>
  );
}
