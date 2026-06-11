import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar, ChevronLeft, ChevronRight, AlertTriangle, Clock, CheckCircle,
  Plus, X, Zap, Loader2, RefreshCw, ExternalLink, Check,
} from 'lucide-react';
import { useDeadlines, createDeadline, updateDeadline, Deadline } from '../hooks/useDeadlines';
import { useClients } from '../hooks/useClients';

const DEADLINE_TYPES = [
  'Self Assessment Return', 'Payment on Account 1', 'Payment on Account 2',
  'CT600 Filing', 'Corporation Tax Payment', 'Companies House Accounts',
  'Confirmation Statement', 'VAT Return', 'PAYE', 'Other',
];

const monthParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (d: Date) => d.toLocaleString('default', { month: 'long', year: 'numeric' });

// red = overdue or ≤7d, amber = 8–30d, green = >30d
function riskClasses(d: Deadline): { bar: string; chip: string; text: string } {
  if (d.status === 'completed') return { bar: 'bg-slate-300', chip: 'bg-slate-100 text-slate-500', text: 'text-slate-400' };
  if (d.status === 'overdue' || d.daysUntil <= 7) return { bar: 'bg-red-500', chip: 'bg-red-100 text-red-700', text: 'text-red-600' };
  if (d.daysUntil <= 30) return { bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', text: 'text-amber-600' };
  return { bar: 'bg-emerald-500', chip: 'bg-emerald-100 text-emerald-700', text: 'text-emerald-600' };
}

function daysLabel(d: Deadline): string {
  if (d.status === 'completed') return 'Completed';
  if (d.daysUntil < 0) return `${Math.abs(d.daysUntil)}d overdue`;
  if (d.daysUntil === 0) return 'Due today';
  return `${d.daysUntil}d left`;
}

export function DeadlinesPage() {
  const [monthDate, setMonthDate] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const { deadlines, isLoading, isError, mutate } = useDeadlines(monthParam(monthDate));
  const [selected, setSelected] = useState<Deadline | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Items shown in the timeline = those due in the selected month.
  const monthItems = useMemo(
    () => deadlines.filter(d => d.dueDate.startsWith(monthParam(monthDate))).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [deadlines, monthDate]
  );

  // Firm-wide summary from the same response.
  const summary = useMemo(() => ({
    overdue: deadlines.filter(d => d.status === 'overdue').length,
    thisWeek: deadlines.filter(d => d.status !== 'completed' && d.daysUntil >= 0 && d.daysUntil <= 7).length,
    thisMonth: monthItems.filter(d => d.status !== 'completed').length,
  }), [deadlines, monthItems]);

  const handleComplete = async (d: Deadline) => {
    const prev = deadlines;
    mutate(deadlines.map(x => x.id === d.id ? { ...x, status: 'completed' as const } : x), { revalidate: false });
    setSelected(s => s ? { ...s, status: 'completed' } : s);
    try {
      await updateDeadline(d.id, { status: 'completed' });
      showToast('Deadline marked complete', 'success');
      mutate();
    } catch {
      mutate(prev, { revalidate: false });
      showToast('Could not update deadline', 'error');
    }
  };

  const handleSaveNotes = async (d: Deadline, notes: string) => {
    try {
      await updateDeadline(d.id, { notes });
      showToast('Notes saved', 'success');
      mutate();
    } catch {
      showToast('Could not save notes', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Timeline</h1>
          <p className="text-slate-500 mt-1">Track upcoming HMRC obligations and statutory deadlines.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm text-sm"
        >
          <Plus size={16} /> Add deadline
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-4">
        <SummaryPill label="Overdue" value={summary.overdue} cls="border-red-200 bg-red-50 text-red-700" />
        <SummaryPill label="Due this week" value={summary.thisWeek} cls="border-amber-200 bg-amber-50 text-amber-700" />
        <SummaryPill label={`Due in ${monthDate.toLocaleString('default', { month: 'short' })}`} value={summary.thisMonth} cls="border-slate-200 bg-white text-slate-700" />
      </div>

      {/* Month nav */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Calendar size={20} className="text-blue-500" />
            {monthLabel(monthDate)}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setMonthDate(m => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n; })}
              aria-label="Previous month" className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setMonthDate(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n; })}
              aria-label="Next month" className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <ChevronRight size={16} />
            </button>
            <button onClick={() => { const d = new Date(); d.setDate(1); setMonthDate(d); }}
              className="ml-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2">Today</button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          {isError ? (
            <div className="py-16 text-center">
              <AlertTriangle size={36} className="mx-auto text-red-400 mb-3" />
              <p className="font-medium text-slate-700 mb-3">Could not load deadlines</p>
              <button onClick={() => mutate()} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700">
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
            </div>
          ) : monthItems.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="font-medium text-slate-700 mb-1">No deadlines in {monthLabel(monthDate)}</p>
              <p className="text-sm text-slate-400 mb-4">Nothing is due this month.</p>
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                Add deadline
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {monthItems.map(d => {
                const c = riskClasses(d);
                return (
                  <button
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className="w-full text-left flex items-center gap-4 p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all relative overflow-hidden"
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1 ${c.bar}`} />
                    <div className="w-12 text-center shrink-0 pl-1">
                      <div className="text-lg font-bold text-slate-900">{new Date(d.dueDate).getUTCDate()}</div>
                      <div className="text-[10px] uppercase text-slate-400">{new Date(d.dueDate).toLocaleString('default', { month: 'short', timeZone: 'UTC' })}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 truncate">{d.clientName}</span>
                        {d.source === 'hmrc_live' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 shrink-0">
                            <Zap size={10} /> Live from HMRC
                          </span>
                        )}
                        {d.status === 'completed' && <Check size={14} className="text-emerald-500 shrink-0" />}
                      </div>
                      <div className="text-sm text-slate-500 truncate">{d.deadlineType}{d.taxYear ? ` · ${d.taxYear}` : ''}</div>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${c.chip}`}>{daysLabel(d)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selected && (
        <DeadlineDrawer
          deadline={selected}
          onClose={() => setSelected(null)}
          onComplete={handleComplete}
          onSaveNotes={handleSaveNotes}
        />
      )}

      {showAdd && (
        <AddDeadlineModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); mutate(); showToast('Deadline added', 'success'); }}
        />
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function SummaryPill({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className={`p-4 rounded-xl border ${cls}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function DeadlineDrawer({ deadline, onClose, onComplete, onSaveNotes }: {
  deadline: Deadline;
  onClose: () => void;
  onComplete: (d: Deadline) => void;
  onSaveNotes: (d: Deadline, notes: string) => void;
}) {
  const [notes, setNotes] = useState(deadline.notes || '');
  const c = riskClasses(deadline);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Deadline detail</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.chip}`}>{daysLabel(deadline)}</span>
            {deadline.source === 'hmrc_live' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Zap size={10} /> Live from HMRC
              </span>
            )}
            {deadline.source === 'calculated' && <span className="text-[10px] text-slate-400 uppercase font-bold">Calculated</span>}
            {deadline.source === 'manual' && <span className="text-[10px] text-slate-400 uppercase font-bold">Manual</span>}
          </div>

          <Field label="Client">
            {deadline.clientId
              ? <Link to={`/clients/${deadline.clientId}`} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">{deadline.clientName} <ExternalLink size={12} /></Link>
              : <span className="text-slate-700">{deadline.clientName}</span>}
          </Field>
          <Field label="Deadline type"><span className="text-slate-700">{deadline.deadlineType}</span></Field>
          <Field label="Due date"><span className="text-slate-700">{new Date(deadline.dueDate).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}</span></Field>
          <Field label="Days remaining"><span className={`font-semibold ${c.text}`}>{daysLabel(deadline)}</span></Field>
          <Field label="Assigned staff"><span className="text-slate-700">{deadline.assignedStaff || '—'}</span></Field>
          {deadline.taxYear && <Field label="Tax year"><span className="text-slate-700">{deadline.taxYear}</span></Field>}

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
              placeholder="Add a note..."
            />
            <button onClick={() => onSaveNotes(deadline, notes)} className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800">Save notes</button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
          {deadline.clientId && (
            <Link to={`/clients/${deadline.clientId}`} className="flex-1 text-center px-4 py-2 border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm">
              View client
            </Link>
          )}
          {deadline.status !== 'completed' && (
            <button onClick={() => onComplete(deadline)} className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm flex items-center justify-center gap-2">
              <Check size={16} /> Mark complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  );
}

// ── Add modal ─────────────────────────────────────────────────────────────────

function AddDeadlineModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { clients: rawClients } = useClients();
  const clients = Array.isArray(rawClients) ? rawClients : (rawClients as any)?.data || [];

  const [query, setQuery] = useState('');
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [deadlineType, setDeadlineType] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matches = useMemo(() => {
    if (!query.trim() || client) return [];
    const t = query.toLowerCase();
    return clients.filter((c: any) => (c.legalName || '').toLowerCase().includes(t)).slice(0, 6);
  }, [query, clients, client]);

  const canSave = deadlineType && dueDate && !saving;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await createDeadline({
        clientId: client?.id || null,
        clientName: client?.name || query || undefined,
        deadlineType,
        dueDate,
        assignedStaff: assignee || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to create deadline');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900">Add deadline</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Client typeahead */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Client</label>
            {client ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-sm font-medium text-slate-800">{client.name}</span>
                <button onClick={() => { setClient(null); setQuery(''); }} className="text-xs text-blue-600 hover:underline">Change</button>
              </div>
            ) : (
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search client (optional)..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            )}
            {matches.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {matches.map((c: any) => (
                  <button key={c.id} onClick={() => { setClient({ id: c.id, name: c.legalName }); setQuery(''); }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">
                    {c.legalName}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Deadline type</label>
            <select value={deadlineType} onChange={e => setDeadlineType(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
              <option value="">Select type...</option>
              {DEADLINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Assignee</label>
              <input value={assignee} onChange={e => setAssignee(e.target.value)} placeholder="Optional"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" placeholder="Optional" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm">Cancel</button>
          <button onClick={submit} disabled={!canSave}
            className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add deadline'}
          </button>
        </div>
      </div>
    </div>
  );
}
