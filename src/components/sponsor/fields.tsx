import React from 'react';
import { User, ShieldCheck, Award, PoundSterling, CalendarDays, MapPin, Info, Clock } from 'lucide-react';
import { fmtDate, fmtMoney, VISA_ROUTES, PAY_FREQUENCIES, WEEKDAY_LABELS, prettify } from './format';

/**
 * Single source of truth for the sponsored-worker record fields — shared by the
 * create form and the detail edit view so they never drift. Grouped into the
 * Appendix-D sections.
 */
export type FieldType = 'text' | 'date' | 'number' | 'money' | 'bool' | 'select' | 'weekdays' | 'textarea' | 'staff_user';
export interface StaffOption { id: string; name: string; email: string }
export interface FieldDef { k: string; label?: string; type?: FieldType; opts?: readonly string[]; span?: 1 | 2; placeholder?: string; help?: string }
export interface Section { id: string; title: string; icon: any; blurb?: string; fields: FieldDef[] }

/**
 * Fallback label generator — splits camelCase / snake_case into spaced words and
 * sentence-cases. Every field below carries an explicit `label` (acronyms like
 * RTW/CoS/SOC need hand-wording); this only guards a future field that forgets one,
 * so raw camelCase can NEVER surface in the UI.
 */
export function humanise(key: string): string {
  const s = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').toLowerCase().trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const labelFor = (f: FieldDef): string => f.label ?? humanise(f.k);

export const SECTIONS: Section[] = [
  { id: 'identity', title: 'Identity', icon: User, blurb: 'Who the worker is', fields: [
    { k: 'fullName', label: 'Full name', span: 2 },
    { k: 'staffUserId', label: 'Linked CRM user', type: 'staff_user', span: 2, help: 'Links to their CRM login so clock-in/out and approved leave feed compliance.' },
    { k: 'nationality', label: 'Nationality' },
    { k: 'dateOfBirth', label: 'Date of birth', type: 'date' },
    { k: 'niNumber', label: 'NI number' },
    { k: 'niExempt', label: 'NI exempt', type: 'bool' },
    { k: 'passportNumber', label: 'Passport number' },
    { k: 'passportCountry', label: 'Passport issuing country' },
    { k: 'passportExpiry', label: 'Passport expiry', type: 'date' },
  ] },
  { id: 'rtw', title: 'Right to work', icon: ShieldCheck, blurb: 'Visa & RTW status', fields: [
    { k: 'rtwCheckType', label: 'RTW check type', type: 'select', opts: ['online_share_code', 'physical_or_idvt', 'ecs_pvn'] },
    { k: 'rtwCheckDate', label: 'RTW check date', type: 'date' },
    { k: 'rtwShareCode', label: 'Share code' },
    { k: 'visaStartDate', label: 'Visa start date', type: 'date' },
    { k: 'visaExpiryDate', label: 'Visa expiry date', type: 'date' },
    { k: 'extensionAppliedBeforeExpiry', label: 'In-time extension filed', type: 'bool' },
    { k: 'in3cLeave', label: 'In 3C leave', type: 'bool' },
    { k: 'lastEcsPvnDate', label: 'Last ECS / PVN date', type: 'date' },
    { k: 'nextEcsCheckDue', label: 'Next ECS check due (override)', type: 'date' },
  ] },
  { id: 'cos', title: 'Certificate of Sponsorship', icon: Award, blurb: 'CoS details', fields: [
    { k: 'cosReference', label: 'CoS reference' },
    { k: 'cosAssignedDate', label: 'CoS assigned date', type: 'date' },
    { k: 'socCode', label: 'SOC code' },
    { k: 'cosJobTitle', label: 'CoS job title' },
    { k: 'cosSalary', label: 'CoS salary', type: 'money' },
  ] },
  { id: 'salary', title: 'Employment & salary', icon: PoundSterling, blurb: 'Drives the salary-threshold check', fields: [
    { k: 'contractType', label: 'Contract type', type: 'select', opts: ['permanent', 'fixed_term', 'temporary', 'other'] },
    { k: 'actualJobTitle', label: 'Job title' },
    { k: 'weeklyHours', label: 'Weekly hours', type: 'number' },
    { k: 'actualSalary', label: 'Annual salary', type: 'money' },
    { k: 'payFrequency', label: 'Pay frequency', type: 'select', opts: PAY_FREQUENCIES },
    { k: 'generalThreshold', label: 'General threshold', type: 'money' },
    { k: 'socGoingRate', label: 'SOC going rate', type: 'money' },
    { k: 'irregularPatternDeclared', label: 'Irregular hours pattern declared (contract + CoS)', type: 'bool', span: 2 },
  ] },
  { id: 'pattern', title: 'Work pattern', icon: CalendarDays, blurb: 'Drives the absence count', fields: [
    { k: 'rosterType', label: 'Roster type', type: 'select', opts: ['fixed', 'variable'] },
    { k: 'worksBankHolidays', label: 'Works bank holidays', type: 'bool' },
    { k: 'contractedWeekdays', label: 'Contracted days (fixed pattern)', type: 'weekdays', span: 2 },
  ] },
  { id: 'location', title: 'Location & contact', icon: MapPin, fields: [
    { k: 'homeAddressLine1', label: 'Home address line 1', span: 2 },
    { k: 'homeAddressLine2', label: 'Home address line 2', span: 2 },
    { k: 'homeCity', label: 'City' },
    { k: 'homePostcode', label: 'Postcode' },
    { k: 'workLocation', label: 'Work location', span: 2 },
    { k: 'personalEmail', label: 'Personal email' },
    { k: 'personalPhone', label: 'Personal phone' },
  ] },
  { id: 'rights', title: 'Rights informed', icon: Info, fields: [
    { k: 'rightsInformedDate', label: 'Date informed of conditions', type: 'date' },
    { k: 'rightsInformedEvidence', label: 'Evidence reference' },
  ] },
  { id: 'sponsorship', title: 'Sponsorship & retention', icon: Clock, fields: [
    { k: 'visaRoute', label: 'Visa route', type: 'select', opts: VISA_ROUTES },
    { k: 'status', label: 'Status', type: 'select', opts: ['active', 'left', 'transferred', 'withdrawn', 'pre_employment'] },
    { k: 'sponsorshipStartDate', label: 'Sponsorship start date', type: 'date' },
    { k: 'sponsorshipEndDate', label: 'Sponsorship / CoS end date', type: 'date' },
    { k: 'smsLeftReportDate', label: 'SMS "left" report date', type: 'date' },
    { k: 'notes', label: 'Notes', type: 'textarea', span: 2 },
    { k: 'retentionHold', label: 'Retention hold', type: 'bool' },
  ] },
];

export const EDITABLE_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.k));

// ── input surface (shared) ───────────────────────────────────────────────────
export const field = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-shadow';

export function FieldInput({ f, value, onChange, staffOptions }: { f: FieldDef; value: any; onChange: (v: any) => void; staffOptions?: StaffOption[] }) {
  if (f.type === 'staff_user') {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={field}>
        <option value="">— Not linked —</option>
        {(staffOptions || []).map(o => <option key={o.id} value={o.id}>{o.name} ({o.email})</option>)}
      </select>
    );
  }
  if (f.type === 'bool') {
    return (
      <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-200'}`}>
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
    );
  }
  if (f.type === 'weekdays') {
    const arr: number[] = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_LABELS.map(([d, n]) => (
          <button key={n} type="button" onClick={() => onChange(arr.includes(n) ? arr.filter(x => x !== n) : [...arr, n].sort())}
            className={`h-9 w-11 rounded-lg text-xs font-medium border transition-colors ${arr.includes(n) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>{d}</button>
        ))}
      </div>
    );
  }
  if (f.type === 'select') {
    return <select value={value ?? ''} onChange={e => onChange(e.target.value || null)} className={field}><option value="">—</option>{f.opts!.map(o => <option key={o} value={o}>{prettify(o)}</option>)}</select>;
  }
  if (f.type === 'textarea') {
    return <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} rows={3} placeholder={f.placeholder} className={`${field} resize-none`} />;
  }
  if (f.type === 'money') {
    // Text (not number): no spinner, no forced ".00" — the user types "45000",
    // it stays "45000". Strip anything but digits and a single decimal point.
    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">£</span>
        <input type="text" inputMode="decimal" value={value ?? ''} placeholder="0"
          onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\.\d*)\./g, '$1'))}
          className={`${field} pl-7 tabular-nums`} />
      </div>
    );
  }
  return <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} value={value ?? ''} placeholder={f.placeholder} onChange={e => onChange(e.target.value)} className={f.type === 'number' ? `${field} tabular-nums` : field} />;
}

export function FieldValue({ f, value, staffOptions }: { f: FieldDef; value: any; staffOptions?: StaffOption[] }) {
  const empty = <span className="text-slate-300">Not set</span>;
  if (f.type === 'staff_user') {
    if (!value) return <span className="text-slate-400 text-sm">Not linked</span>;
    const m = (staffOptions || []).find(o => o.id === value);
    return <span className="text-sm text-slate-900">{m ? `${m.name} (${m.email})` : String(value).slice(0, 8)}</span>;
  }
  if (f.type === 'bool') return <span className={`text-sm font-medium ${value ? 'text-slate-900' : 'text-slate-400'}`}>{value ? 'Yes' : 'No'}</span>;
  if (f.type === 'weekdays') return <span className="text-sm text-slate-900">{Array.isArray(value) && value.length ? WEEKDAY_LABELS.filter(([, n]) => value.includes(n)).map(([d]) => d).join(', ') : empty}</span>;
  if (f.type === 'date') return <span className="text-sm text-slate-900 tabular-nums">{value ? fmtDate(value) : empty}</span>;
  if (f.type === 'money') return <span className="text-sm text-slate-900 tabular-nums font-medium">{value == null || value === '' ? empty : fmtMoney(Number(value))}</span>;
  if (f.type === 'number') return <span className="text-sm text-slate-900 tabular-nums">{value == null || value === '' ? empty : String(value)}</span>;
  if (f.type === 'select') return <span className="text-sm text-slate-900">{value ? prettify(value) : empty}</span>;
  return <span className="text-sm text-slate-900">{value || empty}</span>;
}
