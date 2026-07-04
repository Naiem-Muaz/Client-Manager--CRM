import React from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { useSponsorWorkers } from '../../hooks/useSponsorCompliance';
import { fmtDate } from './format';

interface Row { workerId: string; workerName: string; kind: string; tier: 'warning' | 'escalate'; dueDate: string | null; daysUntil: number | null; message: string; }

// nulls (breaches — no date) first, then most overdue / most imminent.
const byUrgency = (a: Row, b: Row) => {
  const av = a.daysUntil == null ? -1e9 : a.daysUntil;
  const bv = b.daysUntil == null ? -1e9 : b.daysUntil;
  return av - bv;
};

function AlertRow({ r, onSelect }: { r: Row; onSelect: (id: string) => void }) {
  const rose = r.tier === 'escalate';
  return (
    <button onClick={() => onSelect(r.workerId)}
      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${rose ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' : 'bg-amber-50 border-amber-200 hover:bg-amber-100'}`}>
      <AlertTriangle size={16} className={rose ? 'text-rose-600 flex-shrink-0' : 'text-amber-600 flex-shrink-0'} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-slate-900">{r.workerName}</div>
        <div className={`text-sm ${rose ? 'text-rose-800' : 'text-amber-800'}`}>{r.message}</div>
      </div>
      {r.dueDate && <div className="text-xs text-slate-500 whitespace-nowrap">{fmtDate(r.dueDate)}</div>}
      <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
    </button>
  );
}

export function SponsorAlertDashboard({ onSelect }: { onSelect: (id: string) => void }) {
  const { workers, isLoading } = useSponsorWorkers();
  const all: Row[] = workers.flatMap(w => (w.computed?.alerts || []).map(a => ({ ...a, workerId: w.id, workerName: w.fullName })));
  const escalate = all.filter(a => a.tier === 'escalate').sort(byUrgency);
  const warning = all.filter(a => a.tier === 'warning').sort(byUrgency);

  if (isLoading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading alerts…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">What needs attention</h3>
        <p className="text-slate-500 text-sm">Current compliance alerts across all sponsored workers — most urgent first.</p>
      </div>

      {all.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-10 text-center">
          <CheckCircle2 size={30} className="text-emerald-500 mx-auto mb-2" />
          <p className="font-semibold text-emerald-800">All clear</p>
          <p className="text-sm text-emerald-700 mt-0.5">No visa/RTW/ECS/salary/absence/reporting alerts are active.</p>
        </div>
      ) : (
        <>
          {escalate.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wide flex items-center gap-2">Needs action now <span className="bg-rose-100 text-rose-700 rounded-full px-2 py-0.5 text-xs">{escalate.length}</span></h4>
              <div className="space-y-2">{escalate.map((r, i) => <AlertRow key={i} r={r} onSelect={onSelect} />)}</div>
            </section>
          )}
          {warning.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-sm font-bold text-amber-700 uppercase tracking-wide flex items-center gap-2">Upcoming <span className="bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 text-xs">{warning.length}</span></h4>
              <div className="space-y-2">{warning.map((r, i) => <AlertRow key={i} r={r} onSelect={onSelect} />)}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
