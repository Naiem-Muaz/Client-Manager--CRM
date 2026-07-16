import { useNavigate } from 'react-router-dom';
import { CalendarClock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePracticeDeadlines } from '../../hooks/useDeadlineEngine';
import { formatDateOnly, daysPill, COMPLETED_STATUSES, type Deadline } from '../../lib/deadlines';

/**
 * Dashboard "what's urgent, what's next" panel. Reuses the practice-wide deadline
 * ENGINE hook (usePracticeDeadlines) — the SAME org-and-assignment-scoped endpoint
 * the Deadlines page uses — so it inherits assignment-scoping for free once
 * ASSIGNMENT_ENFORCEMENT flips (super_admin: all; staff: assigned clients).
 *
 * ONE fetch over a [today-7, today+14] window, split client-side by the engine's
 * London-pinned `overdue` boolean (the source of truth for red — never
 * days_remaining <= 0). NOT a notification/read-state system — a live snapshot.
 *   Overdue   = due in the last 7 days, not completed, most-overdue first.
 *   Coming up = due in the next 14 days, not completed, soonest first.
 */

const MAX_ROWS = 5;

/** YYYY-MM-DD `days` from today. Local clock is fine for a query bound (display never uses it). */
function isoOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DashboardDeadlinesPanel() {
  const navigate = useNavigate();
  const { rows, isLoading } = usePracticeDeadlines({ from: isoOffset(-7), to: isoOffset(14) });

  const active = rows.filter((d) => !COMPLETED_STATUSES.includes(d.status));
  const overdue = active
    .filter((d) => d.overdue)
    .sort((a, b) => a.days_remaining - b.days_remaining); // most days overdue (most negative) first
  const upcoming = active
    .filter((d) => !d.overdue)
    .sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date)); // soonest first

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarClock size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Deadlines</h2>
          {!isLoading && (
            <div className="flex items-center gap-1.5 ml-1">
              <Badge tone={overdue.length ? 'rose' : 'slate'}>{overdue.length} overdue</Badge>
              <Badge tone={upcoming.length ? 'amber' : 'slate'}>{upcoming.length} upcoming</Badge>
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/deadlines')}
          className="text-blue-600 text-sm font-medium hover:underline inline-flex items-center gap-1 whitespace-nowrap"
        >
          View all <ArrowRight size={13} />
        </button>
      </div>

      {isLoading ? (
        <div className="p-6 space-y-2.5">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
        </div>
      ) : overdue.length === 0 && upcoming.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <CheckCircle2 size={22} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-slate-600 font-medium">Nothing urgent</p>
          <p className="text-xs text-slate-400 mt-0.5">No overdue deadlines and nothing due in the next 14 days.</p>
        </div>
      ) : (
        <div>
          {overdue.length > 0 && (
            <Section
              label="Overdue"
              sublabel="due in the last 7 days"
              accent="rose"
              icon={<AlertTriangle size={13} className="text-rose-500" />}
              rows={overdue}
              extra={overdue.length - MAX_ROWS}
              onRow={(d) => d.client_id && navigate(`/clients/${d.client_id}`)}
              onMore={() => navigate('/deadlines')}
            />
          )}
          {upcoming.length > 0 && (
            <Section
              label="Coming up"
              sublabel="next 14 days"
              accent="amber"
              rows={upcoming}
              extra={upcoming.length - MAX_ROWS}
              onRow={(d) => d.client_id && navigate(`/clients/${d.client_id}`)}
              onMore={() => navigate('/deadlines')}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  label, sublabel, accent, icon, rows, extra, onRow, onMore,
}: {
  label: string; sublabel: string; accent: 'rose' | 'amber'; icon?: React.ReactNode;
  rows: Deadline[]; extra: number; onRow: (d: Deadline) => void; onMore: () => void;
}) {
  const shown = rows.slice(0, MAX_ROWS);
  const stripe = accent === 'rose' ? 'bg-rose-50/60' : 'bg-amber-50/40';
  return (
    <div>
      <div className={`px-6 py-2 flex items-center gap-1.5 ${stripe} border-b border-slate-100`}>
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
        <span className="text-[11px] text-slate-400">· {sublabel}</span>
      </div>
      <div className="divide-y divide-slate-100">
        {shown.map((d) => {
          const pill = daysPill(d);
          return (
            <button
              key={d.id}
              onClick={() => onRow(d)}
              className="w-full flex items-center justify-between gap-3 px-6 py-3 text-left hover:bg-slate-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 text-sm truncate">{d.client_name || 'Unassigned client'}</div>
                <div className="text-xs text-slate-500 truncate">
                  {d.deadline_type.name} · Due {formatDateOnly(d.statutory_due_date)}
                </div>
              </div>
              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${pill.className}`}>{pill.text}</span>
            </button>
          );
        })}
      </div>
      {extra > 0 && (
        <button onClick={onMore} className="w-full px-6 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 text-center border-t border-slate-100">
          + {extra} more {label.toLowerCase()} →
        </button>
      )}
    </div>
  );
}

function Badge({ tone, children }: { tone: 'rose' | 'amber' | 'slate'; children: React.ReactNode }) {
  const tones = {
    rose: 'bg-rose-100 text-rose-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-500',
  };
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${tones[tone]}`}>{children}</span>;
}
