import React, { useEffect, useState } from 'react';
import { Loader2, Check, Plus, ClipboardCheck } from 'lucide-react';
import { useOrgCompliance, upsertOrgCompliance } from '../../hooks/useSponsorCompliance';
import { useTeamMembers } from '../../hooks/useTeam';
import { Labeled, inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate } from './format';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
    {children}
  </div>
);

export function SponsorOrgRecord() {
  const { org, isLoading, mutate } = useOrgCompliance();
  const { members } = useTeamMembers();
  const staff = (members || []).filter((m: any) => m.status !== 'pending');
  const nameOf = (id?: string) => staff.find((m: any) => m.id === id)?.name || (id ? String(id).slice(0, 8) : '—');

  const [form, setForm] = useState<any>({ gdprAnonymiseAfterMonths: 24, level1UserIds: [], level2UserIds: [], smsMonthlyCheckLog: [] });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string, v: any) => { setForm((f: any) => ({ ...f, [k]: v })); setSaved(false); };

  useEffect(() => {
    if (org) setForm({ ...org, level1UserIds: org.level1UserIds || [], level2UserIds: org.level2UserIds || [], smsMonthlyCheckLog: org.smsMonthlyCheckLog || [], gdprAnonymiseAfterMonths: org.gdprAnonymiseAfterMonths ?? 24 });
  }, [org]);

  const toggleLevel = (key: 'level1UserIds' | 'level2UserIds', id: string) => {
    const cur: string[] = form[key] || [];
    set(key, cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]);
  };

  const save = async () => {
    setSaving(true); setError(null);
    try { await upsertOrgCompliance(form); mutate(); setSaved(true); }
    catch (e: any) { setError(errMsg(e, 'Could not save organisation record')); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading…</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h3 className="text-lg font-semibold text-slate-900">Organisation sponsor record</h3><p className="text-slate-500 text-sm">Licence, key personnel and the monthly SMS check log.</p></div>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : null} {saved ? 'Saved' : 'Save record'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section title="Sponsor licence">
          <Labeled label="Licence number"><input value={form.sponsorLicenceNumber || ''} onChange={e => set('sponsorLicenceNumber', e.target.value)} className={inputCls} /></Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Rating"><select value={form.licenceRating || ''} onChange={e => set('licenceRating', e.target.value || null)} className={inputCls}><option value="">—</option><option value="A">A-rating</option><option value="B">B-rating</option></select></Labeled>
            <Labeled label="Route"><input value={form.licenceRoute || ''} onChange={e => set('licenceRoute', e.target.value)} className={inputCls} placeholder="e.g. Worker" /></Labeled>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Granted"><input type="date" value={form.licenceGrantedDate || ''} onChange={e => set('licenceGrantedDate', e.target.value || null)} className={inputCls} /></Labeled>
            <Labeled label="Expiry"><input type="date" value={form.licenceExpiry || ''} onChange={e => set('licenceExpiry', e.target.value || null)} className={inputCls} /></Labeled>
          </div>
        </Section>

        <Section title="Key personnel">
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Authorising officer"><select value={form.authorisingOfficerUserId || ''} onChange={e => set('authorisingOfficerUserId', e.target.value || null)} className={inputCls}><option value="">—</option>{staff.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Labeled>
            <Labeled label="Key contact"><select value={form.keyContactUserId || ''} onChange={e => set('keyContactUserId', e.target.value || null)} className={inputCls}><option value="">—</option>{staff.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Labeled>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <LevelPicker label="Level 1 users" ids={form.level1UserIds} staff={staff} onToggle={id => toggleLevel('level1UserIds', id)} />
            <LevelPicker label="Level 2 users" ids={form.level2UserIds} staff={staff} onToggle={id => toggleLevel('level2UserIds', id)} />
          </div>
        </Section>

        <Section title="Trading address">
          <Labeled label="Address line 1"><input value={form.tradingAddressLine1 || ''} onChange={e => set('tradingAddressLine1', e.target.value)} className={inputCls} /></Labeled>
          <Labeled label="Address line 2"><input value={form.tradingAddressLine2 || ''} onChange={e => set('tradingAddressLine2', e.target.value)} className={inputCls} /></Labeled>
          <div className="grid grid-cols-2 gap-3">
            <Labeled label="City"><input value={form.tradingCity || ''} onChange={e => set('tradingCity', e.target.value)} className={inputCls} /></Labeled>
            <Labeled label="Postcode"><input value={form.tradingPostcode || ''} onChange={e => set('tradingPostcode', e.target.value)} className={inputCls} /></Labeled>
          </div>
        </Section>

        <Section title="Corporate structure & GDPR">
          <Labeled label="Corporate structure notes"><textarea value={form.corporateStructureNotes || ''} onChange={e => set('corporateStructureNotes', e.target.value)} rows={3} className={`${inputCls} resize-none`} /></Labeled>
          <Labeled label="Anonymise records after (months post-leaving)"><input type="number" min={12} value={form.gdprAnonymiseAfterMonths ?? 24} onChange={e => set('gdprAnonymiseAfterMonths', Number(e.target.value))} className={inputCls} /></Labeled>
        </Section>
      </div>

      <MonthlyChecks form={form} set={set} nameOf={nameOf} staff={staff} />
    </div>
  );
}

function LevelPicker({ label, ids, staff, onToggle }: { label: string; ids: string[]; staff: any[]; onToggle: (id: string) => void }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>
      <div className="border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
        {staff.length === 0 ? <p className="text-xs text-slate-400 px-1">No staff</p> : staff.map((m: any) => (
          <label key={m.id} className="flex items-center gap-2 text-sm text-slate-700 px-1 py-0.5 cursor-pointer">
            <input type="checkbox" checked={(ids || []).includes(m.id)} onChange={() => onToggle(m.id)} className="rounded text-blue-600" /> {m.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function MonthlyChecks({ form, set, nameOf, staff }: { form: any; set: (k: string, v: any) => void; nameOf: (id?: string) => string; staff: any[] }) {
  const [date, setDate] = useState('');
  const [by, setBy] = useState('');
  const log: any[] = form.smsMonthlyCheckLog || [];
  const add = () => {
    if (!date) return;
    const next = [...log, { date, by }].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    set('smsMonthlyCheckLog', next);
    set('lastSmsCheckDate', next[0]?.date || null);
    setDate(''); setBy('');
  };
  return (
    <Section title="Monthly SMS check log">
      <p className="text-xs text-slate-500 -mt-2">Records the routine SMS checks that drive the monthly-check reminder. Last check: <strong>{fmtDate(form.lastSmsCheckDate)}</strong>.</p>
      <div className="flex flex-wrap items-end gap-3">
        <Labeled label="Date checked"><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputCls} /></Labeled>
        <Labeled label="Checked by"><select value={by} onChange={e => setBy(e.target.value)} className={inputCls}><option value="">—</option>{staff.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Labeled>
        <button onClick={add} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-900"><Plus size={16} /> Log check</button>
      </div>
      {log.length > 0 && (
        <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
          {log.map((e: any, i: number) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 text-sm"><ClipboardCheck size={14} className="text-emerald-500" /> <span className="text-slate-700">{fmtDate(e.date)}</span> <span className="text-slate-400">· {nameOf(e.by)}</span></div>
          ))}
        </div>
      )}
    </Section>
  );
}
