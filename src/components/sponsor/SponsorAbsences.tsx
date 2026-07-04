import React, { useState } from 'react';
import { Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { addAbsence, patchAbsence } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, chipBase } from './format';

export function SponsorAbsences({ worker, onChanged }: { worker: any; onChanged: () => void }) {
  const workerId = worker.id;
  const absences = worker.absences || [];
  const streak = worker.computed?.unauthorisedAbsence;
  const [showAdd, setShowAdd] = useState(false);
  const [endingId, setEndingId] = useState<string | null>(null);

  const endAbsence = async (id: string, date: string) => {
    setEndingId(id);
    try { await patchAbsence(workerId, id, { endDate: date }); onChanged(); }
    finally { setEndingId(null); }
  };

  return (
    <div className="space-y-4">
      {/* Loud breach banner — this is a reportable event */}
      {streak?.breaches && (
        <div className="flex items-start gap-3 bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-800">
          <AlertTriangle size={22} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Reportable to UKVI — {streak.maxStreak} consecutive rostered days of unauthorised absence (&gt;10).</p>
            <p className="text-sm mt-0.5">A migrant absent without permission for more than 10 consecutive working days must be reported via the SMS within 10 working days.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600">
          Longest unauthorised streak: <strong className={streak?.breaches ? 'text-rose-700' : 'text-slate-800'}>{streak?.maxStreak || 0}</strong> rostered day(s)
          {streak?.currentStreak ? <span className="text-slate-400"> · currently {streak.currentStreak} ongoing</span> : null}
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><Plus size={16} /> Add absence</button>
      </div>

      {absences.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No absences recorded.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr><th className="px-4 py-2.5">From</th><th className="px-4 py-2.5">To</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Reason</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {absences.map((a: any) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">{fmtDate(a.startDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{a.endDate ? fmtDate(a.endDate) : <span className="text-amber-600 font-medium">Ongoing</span>}</td>
                  <td className="px-4 py-3">
                    <span className={`${chipBase} ${a.isAuthorised ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{a.isAuthorised ? 'Authorised' : 'Unauthorised'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{a.reason || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {!a.endDate && (
                      <button onClick={() => endAbsence(a.id, new Date().toISOString().slice(0, 10))} disabled={endingId === a.id}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1">
                        {endingId === a.id ? <Loader2 size={13} className="animate-spin" /> : null} End today
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddAbsence workerId={workerId} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); onChanged(); }} />}
    </div>
  );
}

function AddAbsence({ workerId, onClose, onDone }: { workerId: string; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<any>({ isAuthorised: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const submit = async () => {
    if (!form.startDate) { setError('Start date is required'); return; }
    setSaving(true); setError(null);
    try { await addAbsence(workerId, form); onDone(); }
    catch (e: any) { setError(errMsg(e, 'Could not add absence')); setSaving(false); }
  };
  return (
    <Modal title="Add absence" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Add" error={error}>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Start date"><input type="date" autoFocus value={form.startDate || ''} onChange={e => set('startDate', e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="End date (blank = ongoing)"><input type="date" value={form.endDate || ''} onChange={e => set('endDate', e.target.value || undefined)} className={inputCls} /></Labeled>
      </div>
      <Labeled label="Authorisation">
        <div className="flex gap-2">
          <button type="button" onClick={() => set('isAuthorised', true)} className={`flex-1 py-2 rounded-lg text-sm border ${form.isAuthorised ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}>Authorised</button>
          <button type="button" onClick={() => set('isAuthorised', false)} className={`flex-1 py-2 rounded-lg text-sm border ${!form.isAuthorised ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-slate-600 border-slate-200'}`}>Unauthorised</button>
        </div>
      </Labeled>
      <Labeled label="Reason"><input value={form.reason || ''} onChange={e => set('reason', e.target.value)} className={inputCls} placeholder="e.g. sickness, AWOL" /></Labeled>
    </Modal>
  );
}
