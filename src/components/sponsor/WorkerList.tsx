import React, { useState } from 'react';
import { Plus, Loader2, Users, AlertTriangle, ChevronRight, X, Check } from 'lucide-react';
import { useSponsorWorkers, createWorker, Worker } from '../../hooks/useSponsorCompliance';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, dateBand, DATE_BAND_CLS, salaryChip, chipBase, prettify } from './format';
import { WorkerForm } from './WorkerForm';
import { useTeamMembers } from '../../hooks/useTeam';
import { Avatar, ViewHeader, EmptyState, TableCard, th, td, btnPrimary } from './ui';

function AlertBadge({ worker }: { worker: Worker }) {
  const alerts = worker.computed?.alerts || [];
  if (!alerts.length) return <span className="text-xs text-emerald-600 font-medium">Clear</span>;
  const esc = alerts.filter(a => a.tier === 'escalate').length;
  const warn = alerts.filter(a => a.tier === 'warning').length;
  return (
    <div className="flex items-center gap-1.5">
      {esc > 0 && <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}><AlertTriangle size={11} /> {esc}</span>}
      {warn > 0 && <span className={`${chipBase} bg-amber-100 text-amber-700 border-amber-200`}>{warn}</span>}
    </div>
  );
}

export function WorkerList({ onSelect }: { onSelect: (id: string) => void }) {
  const { workers, isLoading, mutate } = useSponsorWorkers();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-5">
      <ViewHeader title="Sponsored workers" subtitle="Appendix D records and at-a-glance compliance."
        action={<button onClick={() => setShowCreate(true)} className={btnPrimary}><Plus size={16} /> Add worker</button>} />

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : workers.length === 0 ? (
        <EmptyState icon={Users} title="No sponsored workers yet" hint="Add a worker to start tracking their compliance." />
      ) : (
        <TableCard head={
          <tr>
            <th className={th}>Worker</th>
            <th className={th}>Visa expiry</th>
            <th className={th}>Salary</th>
            <th className={th}>Absence</th>
            <th className={th}>Alerts</th>
            <th className={th}></th>
          </tr>
        }>
          {workers.map(w => {
            const sc = salaryChip(w.computed?.salary?.status);
            const abs = w.computed?.unauthorisedAbsence;
            return (
              <tr key={w.id} onClick={() => onSelect(w.id)} className="group hover:bg-slate-50 cursor-pointer">
                <td className={td}>
                  <div className="flex items-center gap-3">
                    <Avatar name={w.fullName} size={38} />
                    <div className="min-w-0">
                      <div className="font-medium text-[#0F1E3A] truncate">{w.fullName}</div>
                      <div className="text-xs text-slate-400 truncate">{prettify(w.visaRoute)}{w.nationality ? ` · ${w.nationality}` : ''}</div>
                    </div>
                  </div>
                </td>
                <td className={`${td} tabular-nums ${DATE_BAND_CLS[dateBand(w.visaExpiryDate)]}`}>{fmtDate(w.visaExpiryDate)}</td>
                <td className={td}>
                  <span className={`${chipBase} ${sc.cls}`}>{sc.label}</span>
                  {w.computed?.requiredSalary != null && <div className="text-xs text-slate-400 mt-0.5 tabular-nums">req. {fmtMoney(w.computed.requiredSalary)}</div>}
                </td>
                <td className={td}>
                  {abs?.breaches
                    ? <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}><AlertTriangle size={11} /> {abs.maxStreak}d streak</span>
                    : <span className="text-xs text-slate-500 tabular-nums">{abs?.maxStreak ? `${abs.maxStreak}d` : 'None'}</span>}
                </td>
                <td className={td}><AlertBadge worker={w} /></td>
                <td className={`${td} text-right text-slate-300 group-hover:text-slate-500`}><ChevronRight size={18} /></td>
              </tr>
            );
          })}
        </TableCard>
      )}

      {showCreate && <CreateWorkerModal onClose={() => setShowCreate(false)} onDone={id => { setShowCreate(false); mutate(); if (id) onSelect(id); }} />}
    </div>
  );
}

function CreateWorkerModal({ onClose, onDone }: { onClose: () => void; onDone: (id?: string) => void }) {
  const { members } = useTeamMembers();
  const staffOptions = members.filter(m => m.status !== 'pending').map(m => ({ id: m.id, name: m.name, email: m.email }));
  const [form, setForm] = useState<Record<string, any>>({ visaRoute: 'skilled_worker', status: 'active', rosterType: 'fixed', contractedWeekdays: [1, 2, 3, 4, 5] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!String(form.fullName || '').trim()) { setError('Full name is required'); return; }
    setSaving(true); setError(null);
    try {
      const payload: any = { ...form };
      for (const k of Object.keys(payload)) if (payload[k] === '') payload[k] = null;
      const created = await createWorker(payload);
      onDone(created?.id);
    } catch (e: any) { setError(errMsg(e, 'Could not create worker')); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-50 w-full max-w-4xl rounded-2xl shadow-2xl my-2 flex flex-col max-h-[92vh]">
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white rounded-t-2xl">
          <div>
            <h3 className="text-lg font-bold text-[#0F1E3A]">Add sponsored worker</h3>
            <p className="text-xs text-slate-400 mt-0.5">Only the full legal name is required — capture as much of the record as you have now.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <WorkerForm value={form} onChange={set} staffOptions={staffOptions} />
        </div>
        <footer className="flex items-center gap-3 px-6 py-4 border-t border-slate-200 bg-white rounded-b-2xl">
          {error && <span className="text-sm text-rose-600">{error}</span>}
          <div className="flex gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg">Cancel</button>
            <button onClick={submit} disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Create worker</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
