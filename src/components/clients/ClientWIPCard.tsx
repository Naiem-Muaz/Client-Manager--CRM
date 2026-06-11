import React, { useMemo } from 'react';
import { Timer } from 'lucide-react';
import { useJobs } from '../../hooks/useJobs';

/**
 * WIP snapshot. Time is the cumulative time_logged_mins across the client's jobs.
 * There is no job↔invoice linkage yet, so "unbilled" mirrors total logged, and value uses
 * an org default hourly rate of £0 until one is configured.
 */
export function ClientWIPCard({ clientId }: { clientId: string }) {
  const { jobs, isLoading } = useJobs({ clientId });
  const DEFAULT_RATE = 0; // no org rate configured

  const { totalMins } = useMemo(() => {
    const totalMins = (jobs || []).reduce((s, j) => s + (j.timeLoggedMins || 0), 0);
    return { totalMins };
  }, [jobs]);

  const hours = totalMins / 60;
  const fmt = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <Timer size={18} className="text-slate-400" /> Work in Progress
      </h3>
      {isLoading ? (
        <div className="h-16 bg-slate-100 rounded animate-pulse" />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Metric label="Time logged" value={fmt(totalMins)} />
          <Metric label="Unbilled" value={fmt(totalMins)} hint="No invoice link yet" />
          <Metric label="Value" value={`£${(hours * DEFAULT_RATE).toFixed(0)}`} hint={DEFAULT_RATE === 0 ? 'No rate set' : undefined} />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
      {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
    </div>
  );
}
