import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { addPayRecord } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, salaryChip, chipBase, PAY_FREQUENCIES } from './format';

export function SponsorPayRecords({ worker, onChanged }: { worker: any; onChanged: () => void }) {
  const records = worker.payRecords || [];
  const salary = worker.computed?.salary;
  const sc = salaryChip(salary?.status);
  const [showAdd, setShowAdd] = useState(false);

  const worstSum = salary?.worst?.sum ?? salary?.worst?.grossPaid;
  const meets = salary?.status === 'meets';

  return (
    <div className="space-y-4">
      {/* Rolling-window compliance panel */}
      {salary && (
        <div className={`rounded-xl border p-4 ${salary.status === 'breach' ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`${chipBase} ${sc.cls}`}>{sc.label}</span>
            <span className="text-sm text-slate-500">{salary.window}</span>
          </div>
          {salary.threshold != null && worstSum != null ? (
            <p className="text-sm text-slate-700">
              Lowest window: <strong className="tabular-nums">{fmtMoney(worstSum)}</strong> {meets ? '≥' : '<'} threshold <strong className="tabular-nums">{fmtMoney(salary.threshold)}</strong> {meets ? '✓' : '✗'}
            </p>
          ) : salary.status === 'no_data' ? <p className="text-sm text-slate-500">Add pay records to assess against the {salary.window}.</p>
            : salary.status === 'insufficient_data' ? <p className="text-sm text-slate-500">Not enough periods yet for a full {salary.window} window.</p>
            : <p className="text-sm text-slate-500">Threshold {fmtMoney(salary.threshold)} ({salary.window}).</p>}
          {salary.failing?.length ? <p className="text-xs text-rose-700 mt-1">{salary.failing.length} window(s)/period(s) below the threshold.</p> : null}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Pay records</h4>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><Plus size={16} /> Add pay record</button>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No pay records yet.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr><th className="px-4 py-2.5">Period</th><th className="px-4 py-2.5">Frequency</th><th className="px-4 py-2.5 text-right">Gross paid</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((p: any) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</td>
                  <td className="px-4 py-3 text-slate-500 capitalize">{(p.payFrequency || worker.payFrequency || '').replace(/_/g, ' ') || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{fmtMoney(Number(p.grossPaid))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddPay workerId={worker.id} defaultFreq={worker.payFrequency} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); onChanged(); }} />}
    </div>
  );
}

function AddPay({ workerId, defaultFreq, onClose, onDone }: { workerId: string; defaultFreq?: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<any>({ payFrequency: defaultFreq || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.periodStart || !form.periodEnd || form.grossPaid === undefined || form.grossPaid === '') { setError('Period start, end and gross paid are required'); return; }
    setSaving(true); setError(null);
    try { await addPayRecord(workerId, form); onDone(); }
    catch (e: any) { setError(errMsg(e, 'Could not add pay record')); setSaving(false); }
  };
  return (
    <Modal title="Add pay record" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Add" error={error}>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Period start"><input type="date" autoFocus value={form.periodStart || ''} onChange={e => set('periodStart', e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="Period end"><input type="date" value={form.periodEnd || ''} onChange={e => set('periodEnd', e.target.value)} className={inputCls} /></Labeled>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Gross paid (£)"><input type="number" step="0.01" value={form.grossPaid ?? ''} onChange={e => set('grossPaid', e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="Pay frequency">
          <select value={form.payFrequency || ''} onChange={e => set('payFrequency', e.target.value || undefined)} className={inputCls}>
            <option value="">—</option>{PAY_FREQUENCIES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
        </Labeled>
      </div>
    </Modal>
  );
}
