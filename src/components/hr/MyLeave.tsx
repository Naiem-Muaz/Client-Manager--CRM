import React, { useState } from 'react';
import { CalendarDays, Plus, Loader2, X } from 'lucide-react';
import { useMyLeave, requestLeave, cancelLeave, LeaveRequest } from '../../hooks/useHr';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, prettify } from './format';
import { SectionCard, EmptyState, btnPrimary } from '../sponsor/ui';

const LEAVE_TYPES = ['holiday', 'sick', 'unpaid', 'other'];

export function leaveStatusChip(status: string): string {
  switch (status) {
    case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'requested': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
    default: return 'bg-slate-100 text-slate-500 border-slate-200';   // cancelled
  }
}
const chip = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border';

export function MyLeave() {
  const { leave, isLoading, isError, mutate } = useMyLeave();
  const [form, setForm] = useState<any>({ leaveType: 'holiday', halfDay: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  // not-enrolled (403) — same calm state as attendance
  if (isError && (isError?.response?.status === 403 || /enrolled|clocking/i.test(isError?.error || isError?.message || '')))
    return null; // MyAttendance already shows the enrolment notice; don't double up

  const submit = async () => {
    if (!form.startDate || !form.endDate) { setError('Start and end dates are required'); return; }
    if (form.endDate < form.startDate) { setError('End date must be on or after the start date'); return; }
    setBusy(true); setError(null);
    try {
      await requestLeave({ startDate: form.startDate, endDate: form.endDate, leaveType: form.leaveType, halfDay: form.halfDay, reason: form.reason });
      setForm({ leaveType: 'holiday', halfDay: false }); await mutate();
    } catch (e: any) { setError(errMsg(e, 'Could not submit request')); }
    finally { setBusy(false); }
  };
  const doCancel = async (id: string) => {
    setCancelId(id); setError(null);
    try { await cancelLeave(id); await mutate(); }
    catch (e: any) { setError(errMsg(e, 'Could not cancel')); }
    finally { setCancelId(null); }
  };

  const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30';

  return (
    <div className="space-y-4">
      <SectionCard icon={CalendarDays} title="Request leave" subtitle="Book holiday or record sick / other leave.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Start date</label><input type="date" value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">End date</label><input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value)} className={inputCls} /></div>
          <div><label className="block text-xs font-medium text-slate-500 mb-1.5">Type</label>
            <select value={form.leaveType} onChange={e => set('leaveType', e.target.value)} className={inputCls}>{LEAVE_TYPES.map(x => <option key={x} value={x}>{prettify(x)}</option>)}</select></div>
          <div className="flex items-end gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={!!form.halfDay} onChange={e => set('halfDay', e.target.checked)} className="rounded text-blue-600" /> Half day</label>
          </div>
          <div className="sm:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1.5">Note (optional)</label><input value={form.reason || ''} onChange={e => set('reason', e.target.value)} className={inputCls} placeholder="e.g. family holiday" /></div>
        </div>
        {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
        <div className="flex justify-end mt-4"><button onClick={submit} disabled={busy} className={btnPrimary}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Request leave</button></div>
      </SectionCard>

      <div>
        <h4 className="text-sm font-semibold text-[#0F1E3A] mb-2">My requests</h4>
        {isLoading ? <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
          : leave.length === 0 ? <EmptyState icon={CalendarDays} title="No leave requests yet" hint="Request leave above — it goes to a practice admin to approve." />
          : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
              {leave.map((r: LeaveRequest) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#0F1E3A] tabular-nums">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}{r.half_day ? ' · ½ day' : ''}</div>
                    <div className="text-xs text-slate-400">{prettify(r.leave_type)}{r.reason ? ` · ${r.reason}` : ''}</div>
                  </div>
                  <span className={`${chip} ${leaveStatusChip(r.status)}`}>{prettify(r.status)}</span>
                  {(r.status === 'requested' || r.status === 'approved') && (
                    <button onClick={() => doCancel(r.id)} disabled={cancelId === r.id} className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-xs font-medium disabled:opacity-50">
                      {cancelId === r.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
