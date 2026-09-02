import React, { useState } from 'react';
import { CalendarCheck, Check, X, Loader2, CalendarDays } from 'lucide-react';
import { useLeaveRequests, approveLeave, rejectLeave, LeaveRequest } from '../../hooks/useHr';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, prettify, staffName, staffSubtitle } from './format';
import { ViewHeader, EmptyState, TableCard, th, td, Avatar } from '../sponsor/ui';
import { leaveStatusChip } from './MyLeave';

const chip = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border';

export function TeamLeave() {
  const { requests: pending, isLoading: loadingP, mutate: mutateP } = useLeaveRequests('requested');
  const { requests: approved, mutate: mutateA } = useLeaveRequests('approved');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const act = async (id: string, kind: 'approve' | 'reject') => {
    setBusyId(id); setError(null);
    try { await (kind === 'approve' ? approveLeave(id) : rejectLeave(id)); await Promise.all([mutateP(), mutateA()]); }
    catch (e: any) { setError(errMsg(e, `Could not ${kind}`)); }
    finally { setBusyId(null); }
  };

  return (
    <div className="space-y-5">
      <ViewHeader title="Leave" subtitle="Approve requests and see who's off, to plan around it." />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      {/* pending approvals */}
      <div>
        <h3 className="text-sm font-semibold text-[#0F1E3A] mb-2 flex items-center gap-2">
          Pending approval <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-[11px] tabular-nums">{pending.length}</span>
        </h3>
        {loadingP ? <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          : pending.length === 0 ? <EmptyState icon={CalendarCheck} title="No requests waiting" hint="Team leave requests will appear here to approve or reject." />
          : (
            <div className="space-y-2">
              {pending.map((r: LeaveRequest) => (
                <div key={r.id} className="flex items-center gap-3 flex-wrap bg-white border border-slate-200 rounded-xl px-4 py-3">
                  <Avatar name={staffName(r)} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-[#0F1E3A] truncate">{staffName(r)}</div>
                    {staffSubtitle(r) && <div className="text-xs text-slate-400 truncate">{staffSubtitle(r)}</div>}
                    <div className="text-xs text-slate-500 tabular-nums">{fmtDate(r.start_date)} – {fmtDate(r.end_date)}{r.half_day ? ' · ½ day' : ''} · {prettify(r.leave_type)}{r.reason ? ` · ${r.reason}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <button onClick={() => act(r.id, 'reject')} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-slate-600 text-xs font-medium hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50"><X size={13} /> Reject</button>
                    <button onClick={() => act(r.id, 'approve')} disabled={busyId === r.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 shadow-sm">{busyId === r.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* approved / upcoming */}
      <div>
        <h3 className="text-sm font-semibold text-[#0F1E3A] mb-2">Approved leave</h3>
        {approved.length === 0 ? <p className="text-sm text-slate-400">No approved leave.</p> : (
          <TableCard head={<tr><th className={th}>Staff</th><th className={th}>Dates</th><th className={th}>Type</th><th className={th}>Status</th></tr>}>
            {approved.map((r: LeaveRequest) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className={td}><div className="flex items-center gap-3"><Avatar name={staffName(r)} size={30} />
                  <div className="min-w-0"><div className="text-sm font-medium text-[#0F1E3A] truncate">{staffName(r)}</div>
                    {staffSubtitle(r) && <div className="text-xs text-slate-400 truncate">{staffSubtitle(r)}</div>}</div></div></td>
                <td className={`${td} tabular-nums text-slate-700`}>{fmtDate(r.start_date)} – {fmtDate(r.end_date)}{r.half_day ? ' · ½' : ''}</td>
                <td className={`${td} text-slate-600`}>{prettify(r.leave_type)}</td>
                <td className={td}><span className={`${chip} ${leaveStatusChip(r.status)}`}>{prettify(r.status)}</span></td>
              </tr>
            ))}
          </TableCard>
        )}
      </div>
    </div>
  );
}
