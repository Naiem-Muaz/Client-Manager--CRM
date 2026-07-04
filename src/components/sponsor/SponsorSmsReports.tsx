import React, { useState } from 'react';
import { Plus, Send } from 'lucide-react';
import { createSmsReport, patchSmsReport } from '../../hooks/useSponsorCompliance';
import { Modal, Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, chipBase, daysUntil, addWorkingDays, prettify } from './format';
import { EmptyState, TableCard, th, td, btnPrimary } from './ui';

const REPORT_TYPES = ['change_of_circumstances', 'migrant_activity', 'salary_change', 'role_change', 'absence', 'early_termination', 'other'];

function Countdown({ deadline, status }: { deadline?: string; status?: string }) {
  if (status === 'submitted') return <span className={`${chipBase} bg-emerald-100 text-emerald-700 border-emerald-200`}>Submitted</span>;
  const d = daysUntil(deadline);
  if (d == null) return <span className="text-slate-400">—</span>;
  if (d < 0) return <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}>{-d} day(s) OVERDUE</span>;
  if (d <= 3) return <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}>{d} day(s) left</span>;
  if (d <= 7) return <span className={`${chipBase} bg-amber-100 text-amber-700 border-amber-200`}>{d} days left</span>;
  return <span className="text-slate-600 text-xs">{d} days left</span>;
}

export function SponsorSmsReports({ worker, onChanged }: { worker: any; onChanged: () => void }) {
  const reports = worker.smsReports || [];
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-[#0F1E3A]">SMS reports</h4>
          <p className="text-xs text-slate-500">Sponsor Management System reporting — 10/20 working-day deadlines.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}><Plus size={16} /> New report</button>
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={Send} title="No SMS reports logged" hint="Log reportable changes to track the 10/20 working-day SMS deadlines." />
      ) : (
        <TableCard head={<tr><th className={th}>What</th><th className={th}>Tier</th><th className={th}>Deadline</th><th className={th}>Status</th><th className={th}></th></tr>}>
          {reports.map((r: any) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className={`${td} text-[#0F1E3A]`}>{prettify(r.reportType)}{r.description ? <span className="text-slate-400 text-xs"> · {r.description}</span> : ''}</td>
              <td className={`${td} text-slate-500`}>{r.tier === '10_day' ? '10-day' : '20-day'}</td>
              <td className={`${td} text-slate-600 tabular-nums`}>{fmtDate(r.deadline)}</td>
              <td className={td}><Countdown deadline={r.deadline} status={r.status} /></td>
              <td className={`${td} text-right`}>
                {r.status !== 'submitted' && <button onClick={() => setSubmitting(r)} className="text-blue-600 hover:text-blue-800 text-xs font-medium">Mark submitted</button>}
              </td>
            </tr>
          ))}
        </TableCard>
      )}

      {showAdd && <AddReport worker={worker} onClose={() => setShowAdd(false)} onDone={() => { setShowAdd(false); onChanged(); }} />}
      {submitting && <MarkSubmitted worker={worker} report={submitting} onClose={() => setSubmitting(null)} onDone={() => { setSubmitting(null); onChanged(); }} />}
    </div>
  );
}

function AddReport({ worker, onClose, onDone }: { worker: any; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<any>({ reportType: 'change_of_circumstances', tier: '10_day' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  // deadline auto-computed from event date + tier working days (editable).
  const autoDeadline = form.eventDate ? addWorkingDays(form.eventDate, form.tier === '10_day' ? 10 : 20) : '';
  const deadline = form.deadline || autoDeadline;

  const submit = async () => {
    if (!form.eventDate) { setError('Event date is required (it sets the deadline)'); return; }
    if (!deadline) { setError('Deadline could not be computed'); return; }
    setSaving(true); setError(null);
    try { await createSmsReport({ workerId: worker.id, reportType: form.reportType, description: form.description, tier: form.tier, eventDate: form.eventDate, deadline }); onDone(); }
    catch (e: any) { setError(errMsg(e, 'Could not create report')); setSaving(false); }
  };
  return (
    <Modal title="New SMS report" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Create" error={error}>
      <Labeled label="Report type">
        <select value={form.reportType} onChange={e => set('reportType', e.target.value)} className={inputCls}>{REPORT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}</select>
      </Labeled>
      <Labeled label="Description"><input value={form.description || ''} onChange={e => set('description', e.target.value)} className={inputCls} placeholder="What changed" /></Labeled>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Reporting tier">
          <select value={form.tier} onChange={e => set('tier', e.target.value)} className={inputCls}><option value="10_day">10 working days</option><option value="20_day">20 working days</option></select>
        </Labeled>
        <Labeled label="Event date"><input type="date" value={form.eventDate || ''} onChange={e => set('eventDate', e.target.value)} className={inputCls} /></Labeled>
      </div>
      <Labeled label="Deadline (auto-computed — editable)">
        <input type="date" value={deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} />
      </Labeled>
      <p className="text-xs text-slate-400">Deadline = event date + {form.tier === '10_day' ? '10' : '20'} working days (Mon–Fri; excludes weekends only — adjust for bank holidays).</p>
    </Modal>
  );
}

function MarkSubmitted({ worker, report, onClose, onDone }: { worker: any; report: any; onClose: () => void; onDone: () => void }) {
  const [ref, setRef] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setSaving(true); setError(null);
    try { await patchSmsReport(report.id, { status: 'submitted', smsReference: ref || undefined }, worker.id); onDone(); }
    catch (e: any) { setError(errMsg(e, 'Could not mark submitted')); setSaving(false); }
  };
  return (
    <Modal title="Mark report submitted" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Mark submitted" error={error}>
      <p className="text-sm text-slate-600">Record the SMS confirmation reference (optional). Submission date is stamped as today.</p>
      <Labeled label="SMS reference"><input autoFocus value={ref} onChange={e => setRef(e.target.value)} className={inputCls} placeholder="e.g. SMS-2026-…" /></Labeled>
    </Modal>
  );
}
