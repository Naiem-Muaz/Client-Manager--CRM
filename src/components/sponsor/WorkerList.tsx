import React, { useState } from 'react';
import { Plus, Loader2, Users, AlertTriangle, ChevronRight } from 'lucide-react';
import { useSponsorWorkers, createWorker, Worker } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, dateBand, DATE_BAND_CLS, salaryChip, chipBase, prettify, VISA_ROUTES, PAY_FREQUENCIES } from './format';

function AlertBadge({ worker }: { worker: Worker }) {
  const alerts = worker.computed?.alerts || [];
  if (!alerts.length) return <span className="text-xs text-slate-400">—</span>;
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Sponsored workers</h3>
          <p className="text-slate-500 text-sm">Appendix D records and at-a-glance compliance.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={16} /> Add worker
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
      ) : workers.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><Users size={26} /></div>
          <h4 className="text-base font-semibold text-slate-900">No sponsored workers yet</h4>
          <p className="text-slate-500 text-sm mt-1">Add a worker to start tracking their compliance.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-5 py-3">Worker</th>
                <th className="px-5 py-3">Visa expiry</th>
                <th className="px-5 py-3">Salary</th>
                <th className="px-5 py-3">Absence</th>
                <th className="px-5 py-3">Alerts</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workers.map(w => {
                const sc = salaryChip(w.computed?.salary?.status);
                const abs = w.computed?.unauthorisedAbsence;
                return (
                  <tr key={w.id} onClick={() => onSelect(w.id)} className="group hover:bg-slate-50 cursor-pointer">
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-900">{w.fullName}</div>
                      <div className="text-xs text-slate-400">{prettify(w.visaRoute)}{w.nationality ? ` · ${w.nationality}` : ''}</div>
                    </td>
                    <td className={`px-5 py-3.5 ${DATE_BAND_CLS[dateBand(w.visaExpiryDate)]}`}>{fmtDate(w.visaExpiryDate)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`${chipBase} ${sc.cls}`}>{sc.label}</span>
                      {w.computed?.requiredSalary != null && <div className="text-xs text-slate-400 mt-0.5">req. {fmtMoney(w.computed.requiredSalary)}</div>}
                    </td>
                    <td className="px-5 py-3.5">
                      {abs?.breaches
                        ? <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}>{abs.maxStreak}d streak</span>
                        : <span className="text-xs text-slate-500">{abs?.maxStreak ? `${abs.maxStreak}d` : 'None'}</span>}
                    </td>
                    <td className="px-5 py-3.5"><AlertBadge worker={w} /></td>
                    <td className="px-5 py-3.5 text-right text-slate-300 group-hover:text-slate-500"><ChevronRight size={18} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateWorkerModal onClose={() => setShowCreate(false)} onDone={id => { setShowCreate(false); mutate(); if (id) onSelect(id); }} />}
    </div>
  );
}

function CreateWorkerModal({ onClose, onDone }: { onClose: () => void; onDone: (id?: string) => void }) {
  const [form, setForm] = useState<Record<string, any>>({ visaRoute: 'skilled_worker', rosterType: 'fixed' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.fullName?.trim()) { setError('Full name is required'); return; }
    setSaving(true); setError(null);
    try {
      const created = await createWorker(form);
      onDone(created?.id);
    } catch (e: any) { setError(errMsg(e, 'Could not create worker')); setSaving(false); }
  };

  return (
    <Modal title="Add sponsored worker" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Create" error={error}>
      <Labeled label="Full name (legal)"><input autoFocus value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} className={inputCls} /></Labeled>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Nationality"><input value={form.nationality || ''} onChange={e => set('nationality', e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="Date of birth"><input type="date" value={form.dateOfBirth || ''} onChange={e => set('dateOfBirth', e.target.value)} className={inputCls} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Visa route">
          <select value={form.visaRoute} onChange={e => set('visaRoute', e.target.value)} className={inputCls}>
            {VISA_ROUTES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </Labeled>
        <Labeled label="Pay frequency">
          <select value={form.payFrequency || ''} onChange={e => set('payFrequency', e.target.value || undefined)} className={inputCls}>
            <option value="">—</option>
            {PAY_FREQUENCIES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
        </Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Visa expiry"><input type="date" value={form.visaExpiryDate || ''} onChange={e => set('visaExpiryDate', e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="CoS reference"><input value={form.cosReference || ''} onChange={e => set('cosReference', e.target.value)} className={inputCls} /></Labeled>
      </div>
      <p className="text-xs text-slate-400">You can complete the full record after creating the worker.</p>
    </Modal>
  );
}
