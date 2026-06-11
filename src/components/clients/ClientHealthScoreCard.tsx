import React from 'react';
import { HeartPulse } from 'lucide-react';
import { useClientHealth, GRADE_META, HealthBreakdown } from '../../hooks/useHealth';

const BARS: { key: keyof HealthBreakdown; label: string; max: number; tip: string; isCount?: boolean; isDays?: boolean }[] = [
  { key: 'deadlineCompliance', label: 'Deadline compliance', max: 40, tip: '% of obligations fulfilled on time over the last 12 months (neutral 30/40 if none).' },
  { key: 'documentCompleteness', label: 'Document completeness', max: 20, tip: 'Documents on file vs an expected minimum of 3.' },
  { key: 'openOverdueTasks', label: 'Overdue tasks', max: 20, tip: 'Open tasks past their due date (fewer is better). 20 − 5×count.', isCount: true },
  { key: 'mtdStatus', label: 'MTD status', max: 10, tip: 'Enrolled (mandated/voluntary/exempt) = 10, not enrolled = 5.' },
  { key: 'communicationRecency', label: 'Communication recency', max: 10, tip: 'Days since last communication: ≤30d = 10, 31–90d = 5, else 0.', isDays: true },
];

// Convert a raw breakdown value into its earned points (the breakdown stores some raw counts).
function pointsFor(key: keyof HealthBreakdown, raw: number | null): number {
  if (key === 'openOverdueTasks') return Math.max(0, 20 - (raw ?? 0) * 5);
  if (key === 'communicationRecency') return raw == null ? 0 : raw <= 30 ? 10 : raw <= 90 ? 5 : 0;
  return raw ?? 0; // deadlineCompliance / documentCompleteness / mtdStatus already in points
}

export function ClientHealthScoreCard({ clientId }: { clientId: string }) {
  const { health, isLoading } = useClientHealth(clientId);

  if (isLoading) return <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 h-40 animate-pulse" />;
  if (!health) return null;

  const meta = GRADE_META[health.grade];
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ * (1 - health.score / 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-5 flex items-center gap-2">
        <HeartPulse size={18} className="text-slate-400" /> Client Health Score
      </h3>
      <div className="flex items-center gap-8">
        {/* Circular progress */}
        <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
          <svg width="110" height="110" className="-rotate-90">
            <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="9" className="text-slate-100" />
            <circle cx="55" cy="55" r={r} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round"
              className={meta.ring} strokeDasharray={circ} strokeDashoffset={offset} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-slate-900">{health.score}</span>
            <span className="text-[10px] text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="flex-1">
          <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${meta.bg} ${meta.text} mb-3`}>{meta.label}</span>
          <div className="space-y-2.5">
            {BARS.map(b => {
              const raw = health.breakdown[b.key];
              const pts = pointsFor(b.key, raw);
              const pct = Math.round((pts / b.max) * 100);
              const detail = b.isCount ? `${raw} overdue` : b.isDays ? (raw == null ? 'never' : `${raw}d ago`) : `${pts}/${b.max}`;
              return (
                <div key={b.key} title={b.tip}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-slate-600">{b.label}</span>
                    <span className="text-slate-400">{detail}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${meta.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
