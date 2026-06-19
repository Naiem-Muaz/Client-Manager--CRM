import { CalendarClock, ArrowRight } from 'lucide-react';
import { useClientDeadlines } from '../../hooks/useDeadlineEngine';
import { formatDateOnly, daysPill, COMPLETED_STATUSES } from '../../lib/deadlines';

/**
 * Overview card: the next upcoming statutory deadlines (engine-derived). Separate
 * from the tasks-based "Active Work" card — they're different work streams.
 * Shares the SWR key with the Deadlines tab + Alerts, so this adds no extra fetch.
 */
export function ClientUpcomingDeadlinesCard({ clientId, onViewAll }: { clientId?: string; onViewAll?: () => void }) {
  const { deadlines, isLoading } = useClientDeadlines(clientId);
  const upcoming = deadlines
    .filter((d) => !COMPLETED_STATUSES.includes(d.status))
    .sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date))
    .slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <CalendarClock size={18} className="text-slate-400" /> Upcoming Deadlines
        </h3>
        {onViewAll && (
          <button onClick={onViewAll} className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1">
            View all <ArrowRight size={13} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        </div>
      ) : upcoming.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No upcoming deadlines.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {upcoming.map((d) => {
            const pill = daysPill(d);
            return (
              <div key={d.id} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-sm truncate">{d.deadline_type.name}</div>
                  <div className="text-xs text-slate-500">Due {formatDateOnly(d.statutory_due_date)}</div>
                </div>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${pill.className}`}>{pill.text}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
