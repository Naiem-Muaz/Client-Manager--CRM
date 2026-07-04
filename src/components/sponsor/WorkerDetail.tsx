import React, { useState } from 'react';
import { ArrowLeft, Loader2, Pencil, X, Check, AlertTriangle } from 'lucide-react';
import { useSponsorWorker, updateWorker } from '../../hooks/useSponsorCompliance';
import { Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, tierChipCls, salaryChip, chipBase, prettify, VISA_ROUTES, PAY_FREQUENCIES } from './format';
import { SponsorDocuments } from './SponsorDocuments';
import { SponsorAbsences } from './SponsorAbsences';
import { SponsorPayRecords } from './SponsorPayRecords';
import { SponsorRoster } from './SponsorRoster';
import { SponsorSmsReports } from './SponsorSmsReports';

const WEEKDAYS = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]] as const;

// key overrides where prettify() isn't quite right
const LABELS: Record<string, string> = {
  niNumber: 'NI number', niExempt: 'NI exempt', cosReference: 'CoS reference', cosAssignedDate: 'CoS assigned', cosJobTitle: 'CoS job title', cosSalary: 'CoS salary',
  socCode: 'SOC code', socGoingRate: 'SOC going rate', rtwCheckType: 'RTW check type', rtwCheckDate: 'RTW check date', rtwShareCode: 'RTW share code',
  in3cLeave: 'In 3C leave', lastEcsPvnDate: 'Last ECS PVN date', nextEcsCheckDue: 'Next ECS check due', extensionAppliedBeforeExpiry: 'In-time extension filed',
  irregularPatternDeclared: 'Irregular pattern declared (contract + CoS)', worksBankHolidays: 'Works bank holidays', smsLeftReportDate: 'SMS "left" report date',
};
const label = (k: string) => LABELS[k] || prettify(k);

type F = { k: string; type?: 'text' | 'date' | 'number' | 'bool' | 'select' | 'weekdays'; opts?: readonly string[] };
const GROUPS: { title: string; fields: F[] }[] = [
  { title: 'Identity', fields: [{ k: 'nationality' }, { k: 'dateOfBirth', type: 'date' }, { k: 'niNumber' }, { k: 'niExempt', type: 'bool' }, { k: 'passportNumber' }, { k: 'passportCountry' }, { k: 'passportExpiry', type: 'date' }] },
  { title: 'Right to work', fields: [{ k: 'rtwCheckType', type: 'select', opts: ['online_share_code', 'physical_or_idvt', 'ecs_pvn'] }, { k: 'rtwCheckDate', type: 'date' }, { k: 'rtwShareCode' }, { k: 'visaStartDate', type: 'date' }, { k: 'visaExpiryDate', type: 'date' }, { k: 'extensionAppliedBeforeExpiry', type: 'bool' }, { k: 'in3cLeave', type: 'bool' }, { k: 'lastEcsPvnDate', type: 'date' }, { k: 'nextEcsCheckDue', type: 'date' }] },
  { title: 'Certificate of Sponsorship', fields: [{ k: 'cosReference' }, { k: 'cosAssignedDate', type: 'date' }, { k: 'socCode' }, { k: 'cosJobTitle' }, { k: 'cosSalary', type: 'number' }] },
  { title: 'Employment & salary', fields: [{ k: 'contractType', type: 'select', opts: ['permanent', 'fixed_term', 'temporary', 'other'] }, { k: 'actualJobTitle' }, { k: 'weeklyHours', type: 'number' }, { k: 'actualSalary', type: 'number' }, { k: 'payFrequency', type: 'select', opts: PAY_FREQUENCIES }, { k: 'generalThreshold', type: 'number' }, { k: 'socGoingRate', type: 'number' }, { k: 'irregularPatternDeclared', type: 'bool' }] },
  { title: 'Work pattern', fields: [{ k: 'rosterType', type: 'select', opts: ['fixed', 'variable'] }, { k: 'contractedWeekdays', type: 'weekdays' }, { k: 'worksBankHolidays', type: 'bool' }] },
  { title: 'Location & contact', fields: [{ k: 'homeAddressLine1' }, { k: 'homeAddressLine2' }, { k: 'homeCity' }, { k: 'homePostcode' }, { k: 'workLocation' }, { k: 'personalEmail' }, { k: 'personalPhone' }] },
  { title: 'Rights informed', fields: [{ k: 'rightsInformedDate', type: 'date' }, { k: 'rightsInformedEvidence' }] },
  { title: 'Sponsorship & retention', fields: [{ k: 'visaRoute', type: 'select', opts: VISA_ROUTES }, { k: 'sponsorshipStartDate', type: 'date' }, { k: 'sponsorshipEndDate', type: 'date' }, { k: 'smsLeftReportDate', type: 'date' }, { k: 'status', type: 'select', opts: ['active', 'left', 'transferred', 'withdrawn', 'pre_employment'] }, { k: 'retentionHold', type: 'bool' }] },
];
const EDITABLE = GROUPS.flatMap(g => g.fields.map(f => f.k)).concat('fullName');

const SUB_TABS = ['Documents', 'Absences', 'Pay records', 'Roster', 'SMS reports'];

export function WorkerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { worker: w, isLoading, mutate } = useSponsorWorker(id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState('Documents');

  if (isLoading || !w) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading…</div>;

  const startEdit = () => { const f: any = { fullName: w.fullName }; for (const k of EDITABLE) f[k] = w[k] ?? (k === 'contractedWeekdays' ? [] : ''); setForm(f); setError(null); setEditing(true); };
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    setSaving(true); setError(null);
    try {
      const payload: any = {};
      for (const k of EDITABLE) payload[k] = form[k] === '' ? null : form[k];
      await updateWorker(id, payload); mutate(); setEditing(false);
    } catch (e: any) { setError(errMsg(e, 'Could not save')); }
    finally { setSaving(false); }
  };

  const c = w.computed;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium"><ArrowLeft size={16} /> All workers</button>
        {editing
          ? <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-3 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg inline-flex items-center gap-1"><X size={15} /> Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save</button>
            </div>
          : <button onClick={startEdit} className="px-4 py-2 text-blue-600 text-sm font-medium hover:bg-blue-50 rounded-lg inline-flex items-center gap-1"><Pencil size={15} /> Edit record</button>}
      </div>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">{w.fullName}</h2>
        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
          <span className="capitalize">{prettify(w.visaRoute)}</span>
          <span>·</span>
          <span className={`${chipBase} bg-slate-100 text-slate-600 border-slate-200`}>{prettify(w.status)}</span>
        </div>
      </div>
      {error && !editing && <p className="text-sm text-red-600">{error}</p>}

      {/* Alerts */}
      {c?.alerts?.length ? (
        <div className="flex flex-wrap gap-2">
          {c.alerts.map((a, i) => (
            <span key={i} className={`${chipBase} ${tierChipCls(a.tier)}`}><AlertTriangle size={12} /> {a.message}</span>
          ))}
        </div>
      ) : <div className="text-sm text-emerald-600">No active compliance alerts.</div>}

      {/* Computed compliance panel */}
      {c && <CompliancePanel w={w} />}

      {/* Field groups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {editing && (
          <div className="lg:col-span-2">
            <Labeled label={label('fullName')}><input value={form.fullName || ''} onChange={e => set('fullName', e.target.value)} className={inputCls} /></Labeled>
          </div>
        )}
        {GROUPS.map(g => (
          <div key={g.title} className="bg-white border border-slate-200 rounded-xl p-5">
            <h4 className="text-sm font-semibold text-slate-900 mb-3">{g.title}</h4>
            <div className="space-y-3">
              {g.fields.map(f => (
                <div key={f.k} className="grid grid-cols-[minmax(120px,40%)_1fr] gap-3 items-center">
                  <span className="text-xs font-medium text-slate-500">{label(f.k)}</span>
                  {editing ? <FieldInput f={f} value={form[f.k]} onChange={v => set(f.k, v)} /> : <FieldValue f={f} value={w[f.k]} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && editing && <p className="text-sm text-red-600">{error}</p>}

      {/* Sub-sections (built in the next chunks) */}
      <div>
        <div className="flex gap-1 border-b border-slate-200 mb-4">
          {SUB_TABS.map(t => (
            <button key={t} onClick={() => setSub(t)} className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${sub === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t}</button>
          ))}
        </div>
        {sub === 'Documents' && <SponsorDocuments workerId={id} />}
        {sub === 'Absences' && <SponsorAbsences worker={w} onChanged={mutate} />}
        {sub === 'Pay records' && <SponsorPayRecords worker={w} onChanged={mutate} />}
        {sub === 'Roster' && <SponsorRoster worker={w} onChanged={mutate} />}
        {sub === 'SMS reports' && <SponsorSmsReports worker={w} onChanged={mutate} />}
      </div>
    </div>
  );
}

// ── computed compliance panel (shows the derivation) ─────────────────────────
function CompliancePanel({ w }: { w: any }) {
  const c = w.computed;
  const sc = salaryChip(c.salary?.status);
  const gt = Number(w.generalThreshold) || null, gr = Number(w.socGoingRate) || null, h = Number(w.weeklyHours) || null;
  const prorated = gr != null && h ? Math.round(gr * (Math.min(h, 48) / 37.5)) : gr;
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
      <h4 className="text-sm font-semibold text-slate-900">Computed compliance</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        {/* Salary */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Salary</div>
          <div className="flex items-center gap-2"><span className={`${chipBase} ${sc.cls}`}>{sc.label}</span>{c.salary?.window && <span className="text-xs text-slate-400">{c.salary.window}</span>}</div>
          {c.requiredSalary != null && (
            <p className="text-xs text-slate-500 mt-1.5">
              Required <strong className="text-slate-700">{fmtMoney(c.requiredSalary)}</strong> = higher of general threshold {fmtMoney(gt)}
              {gr != null && <> and going rate {fmtMoney(gr)}{h ? ` prorated to ${fmtMoney(prorated)} (${fmtMoney(gr)} × ${h}/37.5)` : ''}</>}.
            </p>
          )}
          {c.salary?.worst && <p className="text-xs text-slate-400 mt-1">Lowest window/period: {fmtMoney(c.salary.worst.sum ?? c.salary.worst.grossPaid)} (threshold {fmtMoney(c.salary.threshold)}).</p>}
        </div>
        {/* Absence */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Unauthorised absence</div>
          {c.unauthorisedAbsence?.breaches
            ? <span className={`${chipBase} bg-rose-100 text-rose-700 border-rose-200`}>{c.unauthorisedAbsence.maxStreak} consecutive rostered days — reportable</span>
            : <span className="text-slate-700">{c.unauthorisedAbsence?.maxStreak || 0} consecutive rostered day(s)</span>}
          <p className="text-xs text-slate-400 mt-1">{prettify(c.unauthorisedAbsence?.rosterType)} roster · breach at &gt;10.</p>
        </div>
        {/* ECS */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Employer Checking Service</div>
          <p className="text-slate-700">Next recheck: <strong>{fmtDate(c.nextEcsCheckDue)}</strong></p>
          {c.ecsGraceDeadline && <p className="text-xs text-amber-700 mt-0.5">28-day grace to initiate ECS: {fmtDate(c.ecsGraceDeadline)}</p>}
        </div>
        {/* Retention */}
        <div>
          <div className="text-xs font-medium text-slate-500 mb-1">Retention</div>
          {c.retention?.anchor
            ? <p className="text-slate-700 text-xs">Anchor {fmtDate(c.retention.anchor)} · keep until <strong>{fmtDate(c.retention.retainUntil)}</strong> · GDPR purge {fmtDate(c.retention.purgeDue)}{c.retention.retentionHold ? ' · HOLD' : ''}</p>
            : <p className="text-slate-500 text-xs">Active — retention clock not started.</p>}
        </div>
      </div>
    </div>
  );
}

// ── generic field renderers ──────────────────────────────────────────────────
function FieldValue({ f, value }: { f: F; value: any }) {
  if (f.type === 'bool') return <span className="text-sm text-slate-800">{value ? 'Yes' : 'No'}</span>;
  if (f.type === 'weekdays') return <span className="text-sm text-slate-800">{Array.isArray(value) && value.length ? WEEKDAYS.filter(([, n]) => value.includes(n)).map(([d]) => d).join(', ') : '—'}</span>;
  if (f.type === 'date') return <span className="text-sm text-slate-800">{fmtDate(value)}</span>;
  if (f.type === 'number') return <span className="text-sm text-slate-800 tabular-nums">{value == null || value === '' ? '—' : (['cosSalary', 'actualSalary', 'generalThreshold', 'socGoingRate'].includes(f.k) ? fmtMoney(Number(value)) : String(value))}</span>;
  return <span className="text-sm text-slate-800">{value || '—'}</span>;
}
function FieldInput({ f, value, onChange }: { f: F; value: any; onChange: (v: any) => void }) {
  if (f.type === 'bool') return <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />;
  if (f.type === 'weekdays') {
    const arr: number[] = Array.isArray(value) ? value : [];
    return <div className="flex flex-wrap gap-1">{WEEKDAYS.map(([d, n]) => (
      <button key={n} type="button" onClick={() => onChange(arr.includes(n) ? arr.filter(x => x !== n) : [...arr, n].sort())}
        className={`px-2 py-1 rounded text-xs border ${arr.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>{d}</button>
    ))}</div>;
  }
  if (f.type === 'select') return <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={inputCls}><option value="">—</option>{f.opts!.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}</select>;
  return <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} className={inputCls} />;
}
