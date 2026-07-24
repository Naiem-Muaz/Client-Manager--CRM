import React from 'react';
import { CalendarDays } from 'lucide-react';
import { useMyRoster } from '../../hooks/useHr';
import { fmtDate } from './format';
import { SectionCard } from '../sponsor/ui';

export function MyRoster() {
  const today = new Date().toISOString().slice(0, 10);
  const { roster, isLoading, isError } = useMyRoster(today);
  // 403 (not clocking staff) — stay quiet; MyAttendance already shows the notice.
  if (isError && (isError?.response?.status === 403 || /enrolled|clocking/i.test(isError?.error || isError?.message || ''))) return null;

  const upcoming = (roster || []).filter((r: any) => r.is_rostered).sort((a: any, b: any) => String(a.roster_date).localeCompare(String(b.roster_date)));

  return (
    <SectionCard icon={CalendarDays} title="My roster" subtitle="Your scheduled working days from today.">
      {isLoading ? <div className="h-10 bg-slate-100 rounded-lg animate-pulse" />
        : upcoming.length === 0 ? <p className="text-sm text-slate-400">No upcoming rostered days set. If you work a fixed pattern, your schedule may not need day-by-day entries.</p>
        : (
          <div className="flex flex-wrap gap-1.5">
            {upcoming.map((r: any) => (
              <span key={r.id} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 tabular-nums">
                {fmtDate(String(r.roster_date).slice(0, 10))}{r.shift_start ? ` · ${String(r.shift_start).slice(0, 5)}` : ''}
              </span>
            ))}
          </div>
        )}
    </SectionCard>
  );
}
