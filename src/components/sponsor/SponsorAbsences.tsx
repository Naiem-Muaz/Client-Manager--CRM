import React, { useState } from 'react';
import { Plus, AlertTriangle, Loader2, CalendarX } from 'lucide-react';
import { addAbsence, patchAbsence } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, chipBase } from './format';
import { EmptyState, TableCard, th, td, btnPrimary } from './ui';

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
        <div className="flex items-start gap-3 bg-rose-50 border-2 border-rose-300 rounded-xl p-4 text-rose-800 shadow-sm">
          <span className="w-9 h-9 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0"><AlertTriangle size={20} /></span>
          <div>
            <p className="font-bold">Reportable to UKVI — {streak.maxStreak} consecutive rostered days of unauthorised absence (&gt;10).</p>
            <p className="text-sm mt-0.5">A migrant absent without permission for more than 10 consecutive working days must be reported via the SMS within 10 working days.</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${streak?.breaches ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
          <CalendarX size={16} className={streak?.breaches ? 'text-rose-600' : 'text-slate-400'} />
          <div className="text-sm text-slate-600">
            Longest unauthorised streak: <strong className={`tabular-nums ${streak?.breaches ? 'text-rose-700' : 'text-[#0F1E3A]'}`}>{streak?.maxStreak || 0}</strong> rostered day(s)
            {streak?.currentStreak ? <span className="text-slate-400"> · currently {streak.currentStreak} ongoing</span> : null}
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus size={16} /> Add absence</button>
      </div>

      {absences.length === 0 ? (
        <EmptyState icon={CalendarX} title="No absences recorded" hint="Log authorised and unauthorised absences to track the consecutive-day count." />
      ) : (
        <TableCard head={<tr><th className={th}>From</th><th className={th}>To</th><th className={th}>Type</th><th className={th}>Reason</th><th className={th}></th></tr>}>
          {absences.map((a: any) => (
            <tr key={a.id} className="hover:bg-slate-50">
              <td className={`${td} text-slate-700 tabular-nums`}>{fmtDate(a.startDate)}</td>
              <td className={`${td} text-slate-700 tabular-nums`}>{a.endDate ? fmtDate(a.endDate) : <span className="text-amber-600 font-medium">Ongoing</span>}</td>
              <td className={td}>
                <span className={`${chipBase} ${a.isAuthorised ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>{a.isAuthorised ? 'Authorised' : 'Unauthorised'}</span>
              </td>
              <td className={`${td} text-slate-500`}>{a.reason || '—'}</td>
              <td className={`${td} text-right`}>
                {!a.endDate && (
                  <button onClick={() => endAbsence(a.id, new Date().toISOString().slice(0, 10))} disabled={endingId === a.id}
                    className="text-blue-600 hover:text-blue-800 text-xs font-medium inline-flex items-center gap-1">
                    {endingId === a.id ? <Loader2 size={13} className="animate-spin" /> : null} End today
                  </button>
                )}
              </td>
            </tr>
          ))}
        </TableCard>
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
