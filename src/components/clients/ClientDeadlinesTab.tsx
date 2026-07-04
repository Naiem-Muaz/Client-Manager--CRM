import React, { useMemo, useState } from 'react';
import {
  CalendarClock, AlertTriangle, Info, Pin, Loader2, ArrowRight, CheckCircle2, Building2, Landmark,
} from 'lucide-react';
import { useClientDeadlines, patchDeadline } from '../../hooks/useDeadlineEngine';
import {
  Deadline, DeadlineStatus, formatDateOnly, formatPeriod, daysPill, groupByAuthority,
  AUTHORITY_LABELS, STATUS_LABELS, STATUS_ORDER, COMPLETED_STATUSES, reasonMeta, reasonNavTab,
} from '../../lib/deadlines';

const AUTHORITY_ICON: Record<string, React.ReactNode> = {
  companies_house: <Building2 size={16} className="text-indigo-500" />,
  hmrc: <Landmark size={16} className="text-blue-500" />,
};

export function ClientDeadlinesTab({ clientId, onNavigate }: { clientId: string; onNavigate?: (tab: string) => void }) {
  const { deadlines, coverage, isLoading, isError, mutate } = useClientDeadlines(clientId);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    window.setTimeout(() => setToast(null), 3500);
  };

  const groups = useMemo(() => groupByAuthority(deadlines), [deadlines]);
  const nextDeadline = useMemo(
    () => deadlines.filter((d) => !COMPLETED_STATUSES.includes(d.status)).sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date))[0],
    [deadlines],
  );

  async function changeStatus(d: Deadline, status: DeadlineStatus) {
    if (status === d.status) return;
    setSavingId(d.id);
    const optimistic = {
      deadlines: deadlines.map((x) => (x.id === d.id ? { ...x, status } : x)),
      coverage,
    };
    try {
      await mutate(
        (async () => {
          await patchDeadline(d.id, { status });
          return undefined; // force revalidate from server
        })() as any,
        { optimisticData: optimistic as any, rollbackOnError: true, revalidate: true },
      );
      if (status === 'filed' || status === 'confirmed') {
        showToast('Marked filed — next period generated', 'success');
        mutate(); // pull in the newly auto-rolled period
      } else {
        // Intermediate statuses (submitted, in_progress, …) persist too — give
        // visible confirmation so the change doesn't read as "nothing happened".
        showToast(`Status updated to ${STATUS_LABELS[status] ?? status}`, 'success');
      }
    } catch {
      showToast('Could not update status — reverted', 'error');
    } finally {
      setSavingId(null);
    }
  }

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading deadlines…</div>;
  if (isError) {
    return (
      <div className="bg-white rounded-xl border border-red-200 p-8 text-center">
        <AlertTriangle className="mx-auto mb-2 text-red-500" />
        <p className="text-slate-700 font-medium">Couldn't load deadlines.</p>
        <button onClick={() => mutate()} className="mt-3 text-sm text-blue-600 hover:underline">Retry</button>
      </div>
    );
  }

  const showBanner = coverage && coverage.status !== 'ok' && coverage.reason_codes.length > 0;

  return (
    <div className="space-y-6">
      {/* Coverage banner — the honesty signal */}
      {showBanner && <CoverageBanner reasonCodes={coverage!.reason_codes} status={coverage!.status} onNavigate={onNavigate} />}

      {/* Next-deadline summary chip */}
      {nextDeadline && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarClock size={16} className="text-slate-400" />
          Next: <span className="font-semibold text-slate-900">{nextDeadline.deadline_type.name}</span>
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold ${daysPill(nextDeadline).className}`}>
            {daysPill(nextDeadline).text}
          </span>
        </div>
      )}

      {/* Empty state: explain WHY (coverage reason), never a bare "no deadlines" */}
      {deadlines.length === 0 ? (
        <EmptyState coverage={coverage} onNavigate={onNavigate} />
      ) : (
        groups.map(({ authority, rows }) => (
          <div key={authority} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
              {AUTHORITY_ICON[authority] ?? <CalendarClock size={16} className="text-slate-400" />}
              <h4 className="font-bold text-slate-900 uppercase tracking-tighter text-sm">{AUTHORITY_LABELS[authority]}</h4>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{rows.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/20">
                    <th className="px-6 py-3 font-bold">Obligation</th>
                    <th className="px-6 py-3 font-bold">Period</th>
                    <th className="px-6 py-3 font-bold">Statutory due</th>
                    <th className="px-6 py-3 font-bold">Internal target</th>
                    <th className="px-6 py-3 font-bold">Status</th>
                    <th className="px-6 py-3 font-bold">Assignee</th>
                    <th className="px-6 py-3 font-bold text-right">Days</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((d) => {
                    const pill = daysPill(d);
                    return (
                      <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${d.overdue ? 'bg-red-50/40' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{d.deadline_type.name}</span>
                            {d.deadline_type.penalty_info?.summary && (
                              <span title={d.deadline_type.penalty_info.summary} className="cursor-help text-slate-400 hover:text-slate-600">
                                <Info size={14} />
                              </span>
                            )}
                            {d.is_manual_override && (
                              <span title="Pinned — won't auto-correct from Companies House / HMRC" className="inline-flex items-center gap-0.5 text-amber-600 text-[10px] font-bold uppercase">
                                <Pin size={11} /> pinned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{formatPeriod(d.period_start, d.period_end)}</td>
                        <td className="px-6 py-4 text-slate-900 font-medium">{formatDateOnly(d.statutory_due_date)}</td>
                        <td className="px-6 py-4 text-slate-500">{formatDateOnly(d.internal_due_date)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={d.status}
                              disabled={savingId === d.id}
                              onChange={(e) => changeStatus(d, e.target.value as DeadlineStatus)}
                              className="border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                            </select>
                            {savingId === d.id && <Loader2 size={13} className="animate-spin text-slate-400" />}
                            {COMPLETED_STATUSES.includes(d.status) && savingId !== d.id && <CheckCircle2 size={14} className="text-emerald-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-600">{d.assignee_name ?? '—'}</td>
                        <td className="px-6 py-4 text-right">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${pill.className}`}>{pill.text}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {/* Inline toast (no new dependency) */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function CoverageBanner({ reasonCodes, status, onNavigate }: { reasonCodes: string[]; status: string; onNavigate?: (tab: string) => void }) {
  const red = status === 'unmonitored';
  const wrap = red ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const icon = red ? 'text-red-500' : 'text-amber-500';
  const head = red ? 'text-red-800' : 'text-amber-800';
  return (
    <div className={`rounded-xl border p-4 ${wrap}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className={`mt-0.5 ${icon}`} />
        <div className="flex-1 space-y-1.5">
          <p className={`font-bold text-sm ${head}`}>{red ? 'This client is unmonitored' : 'This client is under-monitored'}</p>
          {reasonCodes.map((code) => {
            const m = reasonMeta(code);
            const navTab = reasonNavTab(code);
            // Action rendered as a button ONLY when its editable field has a
            // destination reachable from here; otherwise message-only (no dead button).
            return (
              <div key={code} className="flex items-center justify-between gap-3 text-sm text-slate-700">
                <span>{m.message}</span>
                {navTab && onNavigate && (
                  <button
                    onClick={() => onNavigate(navTab)}
                    className="inline-flex items-center gap-1 text-blue-600 font-semibold whitespace-nowrap hover:underline"
                  >
                    {m.action} <ArrowRight size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ coverage, onNavigate }: { coverage: { status: string; reason_codes: string[] } | null; onNavigate?: (tab: string) => void }) {
  const code = coverage?.reason_codes?.[0];
  const m = code ? reasonMeta(code) : null;
  const navTab = code ? reasonNavTab(code) : null;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
      <CalendarClock size={40} className="mx-auto mb-3 text-slate-200" />
      {m ? (
        <>
          <p className="text-slate-700 font-medium">{m.message}</p>
          {navTab && onNavigate ? (
            <button onClick={() => onNavigate(navTab)} className="mt-1 text-sm text-blue-600 font-semibold inline-flex items-center gap-1 hover:underline">
              {m.action} <ArrowRight size={13} />
            </button>
          ) : (
            <p className="mt-1 text-sm text-slate-500">{m.action}</p>
          )}
        </>
      ) : (
        <p className="text-slate-500">No deadlines for this client.</p>
      )}
    </div>
  );
}
