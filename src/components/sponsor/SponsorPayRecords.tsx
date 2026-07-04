import React, { useState } from 'react';
import { Plus, PoundSterling } from 'lucide-react';
import { addPayRecord } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, salaryChip, chipBase, PAY_FREQUENCIES, prettify } from './format';
import { EmptyState, TableCard, th, td, btnPrimary, MoneyInput } from './ui';

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
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${salary.status === 'breach' ? 'bg-rose-100 text-rose-600' : salary.status === 'meets' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}><PoundSterling size={13} /></span>
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
          {salary.failing?.length ? <p className="text-xs text-rose-700 mt-1 font-medium">{salary.failing.length} window(s)/period(s) below the threshold.</p> : null}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[#0F1E3A]">Pay records</h4>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus size={16} /> Add pay record</button>
      </div>

      {records.length === 0 ? (
        <EmptyState icon={PoundSterling} title="No pay records yet" hint="Add each pay period's gross to assess the salary threshold over the rolling window." />
      ) : (
        <TableCard head={<tr><th className={th}>Period</th><th className={th}>Frequency</th><th className={`${th} text-right`}>Gross paid</th></tr>}>
          {records.map((p: any) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className={`${td} text-slate-700 tabular-nums`}>{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</td>
              <td className={`${td} text-slate-500`}>{prettify(p.payFrequency || worker.payFrequency)}</td>
              <td className={`${td} text-right tabular-nums font-medium text-[#0F1E3A]`}>{fmtMoney(Number(p.grossPaid))}</td>
            </tr>
          ))}
        </TableCard>
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
        <Labeled label="Gross paid"><MoneyInput value={form.grossPaid} onChange={v => set('grossPaid', v)} /></Labeled>
        <Labeled label="Pay frequency">
          <select value={form.payFrequency || ''} onChange={e => set('payFrequency', e.target.value || undefined)} className={inputCls}>
            <option value="">—</option>{PAY_FREQUENCIES.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
          </select>
        </Labeled>
      </div>
    </Modal>
  );
}
