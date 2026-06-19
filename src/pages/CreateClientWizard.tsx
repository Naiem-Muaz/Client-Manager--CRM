import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Building2, Users, ArrowLeft, ArrowRight, Check, AlertCircle,
  Search, Loader2, Pencil, X, FileText, Calculator, Receipt, BookOpen, Banknote,
  ClipboardList, Briefcase, Landmark,
} from 'lucide-react';
import { createClient, patchClient } from '../hooks/useClients';
import { useJobTemplates, createJob } from '../hooks/useJobs';
import { useTeamMembers } from '../hooks/useTeam';
import { searchCompanies, lookupCompany } from '../api/companiesHouse';
import { errMsg } from '../lib/errMsg';

// ── Static config ──────────────────────────────────────────────────────────────
type EntityType = 'sole-trader' | 'limited-company' | 'partnership' | 'llp' | 'trust' | 'charity';

// Trust & Charity are intentionally omitted: they aren't in the entity_type
// constraint or the deadline-engine seed yet, so selecting them errors on submit.
// Re-add once trust/charity deadline support is built (separate future scope).
const ENTITY_CARDS: { id: EntityType; label: string; icon: any; note: string }[] = [
  { id: 'sole-trader', label: 'Individual / Sole Trader', icon: User, note: 'MTD ITSA may apply if income > £50,000' },
  { id: 'limited-company', label: 'Limited Company', icon: Building2, note: 'Companies House lookup available in next step' },
  { id: 'partnership', label: 'Partnership', icon: Users, note: 'Partnership UTR required in next step' },
  { id: 'llp', label: 'LLP', icon: Briefcase, note: 'Companies House lookup available in next step' },
];

const SERVICES: { id: string; label: string; icon: any; jobTypes: string[] }[] = [
  { id: 'self-assessment', label: 'Self Assessment Return', icon: FileText, jobTypes: ['self-assessment'] },
  { id: 'corporation-tax', label: 'Corporation Tax CT600', icon: Calculator, jobTypes: ['corporation-tax'] },
  { id: 'vat', label: 'VAT Return', icon: Receipt, jobTypes: ['vat'] },
  { id: 'mtd-quarterly', label: 'MTD Quarterly Updates', icon: ClipboardList, jobTypes: ['mtd-quarterly'] },
  { id: 'eops', label: 'End of Period Statement', icon: ClipboardList, jobTypes: ['eops'] },
  { id: 'final-declaration', label: 'Final Declaration', icon: Check, jobTypes: ['final-declaration'] },
  { id: 'bookkeeping', label: 'Bookkeeping', icon: BookOpen, jobTypes: ['bookkeeping'] },
  { id: 'payroll', label: 'Payroll', icon: Banknote, jobTypes: ['payroll'] },
  { id: 'cis', label: 'CIS Returns', icon: Landmark, jobTypes: [] },
  { id: 'company-secretarial', label: 'Company Secretarial', icon: Building2, jobTypes: [] },
];

const STEP_LABELS = ['Entity type', 'Identity', 'Tax details', 'Services', 'Practice'];
const isCompanyLike = (e: EntityType) => e === 'limited-company' || e === 'llp';
const isOrg = (e: EntityType) => e === 'partnership' || e === 'trust' || e === 'charity';

const INCOME_BANDS = [
  { id: '0-20k', label: '£0–£20k', mtd: 'not-enrolled', badge: 'Not yet mandated', badgeCls: 'bg-slate-100 text-slate-600' },
  { id: '20-30k', label: '£20–30k', mtd: 'mandated', badge: 'Mandated from Apr 2028', badgeCls: 'bg-amber-100 text-amber-700' },
  { id: '30-50k', label: '£30–50k', mtd: 'mandated', badge: 'Mandated from Apr 2027', badgeCls: 'bg-amber-100 text-amber-700' },
  { id: '50k-plus', label: '£50k+', mtd: 'mandated', badge: 'Mandated from Apr 2026', badgeCls: 'bg-red-100 text-red-700' },
];

const regNumberLabel = (e: EntityType) => e === 'partnership' ? 'Partnership UTR' : e === 'trust' ? 'Trust registration number' : 'Charity registration number';

// CH-prefilled field styling
const chCls = 'w-full px-3 py-2 rounded-lg text-sm border outline-none transition-all';
const chFilled = { backgroundColor: '#E6F1FB', borderColor: '#B5D4F4' };
const fieldCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400';

// ── Validation ───────────────────────────────────────────────────────────────
const NI_RE = /^[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/i;
const UTR_RE = /^\d{10}$/;
const CRN_RE = /^[A-Z0-9]{8}$/i;
const VAT_RE = /^\d{9}$/;

export function CreateClientWizard() {
  const navigate = useNavigate();
  const { templates } = useJobTemplates();
  const { members } = useTeamMembers();

  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [d, setD] = useState<any>({
    entityType: '' as EntityType | '',
    // company / CH
    legalName: '', companyNumber: '', incorporationDate: '', addrLine1: '', addrLine2: '', city: '', postcode: '',
    sicCode: '', companyStatus: '', companyType: '', chData: null, chPrefilled: false, chEditable: false,
    tradingName: '', accountingPeriodEnd: '',
    // individual
    firstName: '', lastName: '', dob: '', nino: '',
    // org
    orgName: '', regNumber: '',
    // contact
    email: '', phone: '',
    // tax
    utr: '', saRegistered: true, vatRegistered: false, vatNumber: '', vatScheme: 'Standard', vatQuarterEnd: '',
    incomeBand: '', payeRef: '', ctPaymentGroup: 'small', cisRegistered: false,
    // services
    services: {} as Record<string, boolean>, bookkeepingFreq: 'Monthly', payrollEmployees: 1,
    // practice
    assignedPartnerId: '', assignedManagerId: '', clientSince: new Date().toISOString().split('T')[0],
    feeSchedule: '', foundUs: '', referralSource: '', tags: [] as string[], notes: '',
  });

  const set = (patch: any) => setD((prev: any) => ({ ...prev, ...patch }));
  const mark = (f: string) => setTouched(p => ({ ...p, [f]: true }));

  // Derived MTD status from income band
  const incomeBandMeta = INCOME_BANDS.find(b => b.id === d.incomeBand);

  // ── Field errors ──
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    const et = d.entityType as EntityType;
    if (step === 1) {
      if (isCompanyLike(et)) {
        if (!d.legalName?.trim()) e.legalName = 'Legal name is required';
        if (d.companyNumber && !CRN_RE.test(d.companyNumber.replace(/\s/g, ''))) e.companyNumber = 'Company number must be 8 characters';
        if (!d.email?.trim()) e.email = 'Email is required';
      } else if (et === 'sole-trader') {
        if (!d.firstName?.trim()) e.firstName = 'First name is required';
        if (!d.lastName?.trim()) e.lastName = 'Last name is required';
        if (!d.email?.trim()) e.email = 'Email is required';
        if (d.nino && !NI_RE.test(d.nino.trim())) e.nino = 'Format: XX 99 99 99 X';
      } else if (isOrg(et)) {
        if (!d.orgName?.trim()) e.orgName = 'Organisation name is required';
        if (!d.email?.trim()) e.email = 'Email is required';
      }
    }
    if (step === 2) {
      if (d.utr && !UTR_RE.test(d.utr.replace(/\s/g, ''))) e.utr = 'UTR must be 10 digits';
      if (d.vatRegistered && d.vatNumber && !VAT_RE.test(d.vatNumber.replace(/\s/g, ''))) e.vatNumber = 'VAT number must be 9 digits';
    }
    return e;
  }, [d, step]);

  const stepFields: Record<number, string[]> = {
    1: isCompanyLike(d.entityType) ? ['legalName', 'companyNumber', 'email']
      : d.entityType === 'sole-trader' ? ['firstName', 'lastName', 'email', 'nino']
      : ['orgName', 'email'],
    2: ['utr', 'vatNumber'],
  };

  const stepValid = (s: number): boolean => {
    if (s === 0) return !!d.entityType;
    if (s === 1 || s === 2) return (stepFields[s] || []).every(f => !errors[f]);
    if (s === 3) return Object.values(d.services).some(Boolean);
    if (s === 4) return !!d.assignedPartnerId;
    return true;
  };

  const goNext = () => {
    if (!stepValid(step)) { (stepFields[step] || []).forEach(mark); return; }
    const next = Math.min(step + 1, 4);
    setStep(next); setMaxStep(m => Math.max(m, next));
  };
  const goStep = (s: number) => { if (s <= maxStep) setStep(s); };

  // Pre-select services when leaving step 0 / based on entity + VAT
  const applyServiceDefaults = (et: EntityType) => {
    const svc: Record<string, boolean> = {};
    if (et === 'sole-trader') svc['self-assessment'] = true;
    if (et === 'limited-company') { svc['corporation-tax'] = true; svc['company-secretarial'] = true; }
    set({ services: svc });
  };

  const vatLocked = !!d.vatRegistered; // VAT service auto-on + locked when VAT registered
  const servicesResolved = useMemo(() => {
    const s = { ...d.services };
    if (vatLocked) s['vat'] = true;
    return s;
  }, [d.services, vatLocked]);

  const jobCount = useMemo(() => {
    let n = 0;
    for (const [id, on] of Object.entries(servicesResolved)) {
      if (!on) continue;
      const svc = SERVICES.find(x => x.id === id);
      if (!svc) continue;
      n += (templates || []).filter(t => svc.jobTypes.includes(t.jobType)).length;
    }
    return n;
  }, [servicesResolved, templates]);

  // ── CH search state ──
  const [chQuery, setChQuery] = useState('');
  const [chResults, setChResults] = useState<any[]>([]);
  const [chSearching, setChSearching] = useState(false);
  const chTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChSearch = (q: string) => {
    setChQuery(q);
    if (chTimer.current) clearTimeout(chTimer.current);
    if (q.trim().length < 2) { setChResults([]); return; }
    chTimer.current = setTimeout(async () => {
      setChSearching(true);
      const cleaned = q.replace(/\s/g, '');
      if (/^[A-Z0-9]{6,8}$/i.test(cleaned)) {
        const info = await lookupCompany(cleaned);
        setChSearching(false);
        setChResults(info ? [{ company_number: info.company_number, company_name: info.company_name, company_status: info.company_status, date_of_creation: info.date_of_creation, address_snippet: info.registered_address }] : []);
      } else {
        const res = await searchCompanies(q);
        setChSearching(false);
        setChResults(res.slice(0, 5));
      }
    }, 350);
  };

  const selectCompany = async (r: any) => {
    setChResults([]); setChQuery('');
    const info = await lookupCompany(r.company_number);
    const src = info || r;
    const addr = parseAddr(info?.registered_address || r.address_snippet || '');
    set({
      legalName: src.company_name, companyNumber: src.company_number,
      incorporationDate: src.date_of_creation || '', companyStatus: src.company_status || '',
      companyType: (info as any)?.company_type || '', sicCode: (info?.sic_codes || [])[0] || '',
      ...addr, chData: info || r, chPrefilled: true, chEditable: false,
    });
  };

  // ── Submit ──
  const submit = async () => {
    if (!stepValid(4)) { mark('assignedPartnerId'); return; }
    setSubmitting(true); setSubmitError(null);
    const et = d.entityType as EntityType;
    // Canonical snake_case entity_type (matches clients_entity_type_chk + the deadline
    // engine's seed applies_to). The human label is display-only; the API gets the
    // canonical value. NOTE: trust/charity aren't modelled by the engine and aren't in
    // the DB constraint — they'll still be rejected (flagged separately).
    const ENTITY_TYPE_API: Record<EntityType, string> = {
      'sole-trader': 'sole_trader',
      'limited-company': 'limited_company',
      'partnership': 'partnership',
      'llp': 'llp',
      'trust': 'trust',
      'charity': 'charity',
    };
    const entityTypeForApi = ENTITY_TYPE_API[et];
    const legalName = isCompanyLike(et) ? d.legalName : isOrg(et) ? d.orgName : `${d.firstName} ${d.lastName}`.trim();
    try {
      const created = await createClient({
        type: entityTypeForApi, entityType: entityTypeForApi, taxEntity: entityTypeForApi,
        legalName, companyName: d.legalName, name: legalName,
        firstName: d.firstName, lastName: d.lastName,
        email: d.email, companyNumber: d.companyNumber || undefined, crn: d.companyNumber || undefined,
        taxReference: d.utr || undefined,
      });
      // The create endpoint returns { success, data: { client_id, tax_year_id } }.
      // Read client_id first (with fallbacks) — reading data.id returned undefined
      // and threw "Client created but no id was returned" even though it saved.
      const newId = created?.data?.client_id || created?.data?.id || created?.id;
      if (!newId) throw new Error('Client created but no id was returned');

      // Persist the full canonical field set.
      const fields: Record<string, any> = {
        email: d.email || null, phone: d.phone || null,
        address_line1: d.addrLine1 || null, address_line2: d.addrLine2 || null, city: d.city || null, postcode: d.postcode || null,
        utr: (d.utr || '').replace(/\s/g, '') || null,
        vat_registered: !!d.vatRegistered,
        income_band: d.incomeBand || null,
        mtd_status: (et === 'sole-trader' ? (incomeBandMeta?.mtd || 'not-enrolled') : 'not-enrolled'),
        risk_level: 'low',
        tags: d.tags, notes: d.notes || null,
        assigned_staff_id: d.assignedPartnerId || null,
        assigned_manager_id: d.assignedManagerId || null,
      };
      if (isCompanyLike(et)) {
        fields.company_number = (d.companyNumber || '').replace(/\s/g, '') || null;
        if (d.incorporationDate) fields.incorporation_date = d.incorporationDate;
        if (d.accountingPeriodEnd) fields.accounting_period_end = d.accountingPeriodEnd;
        fields.company_status = d.companyStatus || null;
        fields.company_type = d.companyType || null;
        fields.sic_codes = d.sicCode ? [d.sicCode] : null;
        fields.ch_data = d.chData || null;
      }
      if (et === 'sole-trader' && d.nino) fields.nino = d.nino.toUpperCase().replace(/\s/g, '');
      if (d.vatRegistered) { fields.vat_number = (d.vatNumber || '').replace(/\s/g, '') || null; if (d.vatQuarterEnd) fields.vat_quarter_end = d.vatQuarterEnd; }
      await patchClient(newId, fields).catch(() => {});

      // Create jobs from selected service templates.
      const tplToCreate: string[] = [];
      for (const [id, on] of Object.entries(servicesResolved)) {
        if (!on) continue;
        const svc = SERVICES.find(x => x.id === id);
        if (!svc) continue;
        (templates || []).filter(t => svc.jobTypes.includes(t.jobType)).forEach(t => tplToCreate.push(t.id));
      }
      let jobsCreated = 0;
      await Promise.all(tplToCreate.map(tid => createJob({ templateId: tid, clientId: newId, assigneeId: d.assignedPartnerId || null })
        .then(() => { jobsCreated++; }).catch(() => {})));

      setToast(`Client created with ${jobsCreated} job${jobsCreated === 1 ? '' : 's'}`);
      setTimeout(() => navigate(`/clients/${newId}`), 800); // BUG FIX: redirect to the new client, not /mtd
    } catch (err: any) {
      setSubmitError(errMsg(err, 'Failed to create client'));
      setSubmitting(false);
    }
  };

  const partners = members.filter(m => (m.role || '').includes('partner') || m.role === 'super_admin');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-6 text-sm font-medium"><ArrowLeft size={18} /> Cancel & exit</button>

      {/* Progress dots */}
      <div className="flex items-center justify-between mb-10">
        {STEP_LABELS.map((label, i) => {
          const done = i < step && i <= maxStep;
          const active = i === step;
          return (
            <React.Fragment key={i}>
              <button onClick={() => goStep(i)} disabled={i > maxStep} className="flex flex-col items-center gap-2 disabled:cursor-not-allowed">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                  active ? 'bg-purple-600 border-purple-600 text-white scale-110 shadow-md shadow-purple-300' :
                  done ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  {done ? <Check size={16} strokeWidth={3} /> : i + 1}
                </div>
                <span className={`text-xs font-semibold ${active ? 'text-purple-700' : done ? 'text-emerald-600' : 'text-slate-400'}`}>{label}</span>
              </button>
              {i < STEP_LABELS.length - 1 && <div className={`flex-1 h-0.5 mx-2 ${i < step ? 'bg-emerald-400' : 'bg-slate-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[420px]">
        {step === 0 && <Step1 d={d} set={set} applyServiceDefaults={applyServiceDefaults} />}
        {step === 1 && <Step2 d={d} set={set} errors={errors} touched={touched} mark={mark}
          chQuery={chQuery} chResults={chResults} chSearching={chSearching} onChSearch={onChSearch} selectCompany={selectCompany} />}
        {step === 2 && <Step3 d={d} set={set} errors={errors} touched={touched} mark={mark} incomeBandMeta={incomeBandMeta} />}
        {step === 3 && <Step4 servicesResolved={servicesResolved} set={set} d={d} vatLocked={vatLocked} jobCount={jobCount} />}
        {step === 4 && <Step5 d={d} set={set} partners={partners} members={members} touched={touched} mark={mark} error={submitError} />}
      </div>

      {/* Nav */}
      <div className="flex justify-between items-center mt-6">
        <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="px-5 py-2.5 text-slate-600 font-medium rounded-lg hover:bg-slate-100 disabled:opacity-30">Back</button>
        {step < 4 ? (
          <button onClick={goNext} disabled={!stepValid(step)} className="flex items-center gap-2 px-7 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-40 shadow-md shadow-purple-200">
            Continue <ArrowRight size={18} />
          </button>
        ) : (
          <button onClick={submit} disabled={submitting || !stepValid(4)} className="flex items-center gap-2 px-7 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-40 shadow-md shadow-emerald-200">
            {submitting ? <><Loader2 size={18} className="animate-spin" /> Creating…</> : <>Create client <Check size={18} /></>}
          </button>
        )}
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-emerald-600">{toast}</div>}
    </div>
  );
}

// ── Shared bits ──
function FieldError({ name, errors, touched }: any) {
  if (!touched[name] || !errors[name]) return null;
  return <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={12} /> {errors[name]}</p>;
}
function Labeled({ label, children }: any) {
  return <div className="space-y-1"><label className="text-sm font-semibold text-slate-700">{label}</label>{children}</div>;
}
function parseAddr(addr: string) {
  const parts = (addr || '').split(',').map(s => s.trim()).filter(Boolean);
  const pc = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  let postcode = ''; if (parts.length && pc.test(parts[parts.length - 1])) postcode = parts.pop() as string;
  const city = parts.length ? parts.pop() as string : '';
  const addrLine1 = parts.shift() || '';
  const addrLine2 = parts.join(', ');
  return { addrLine1, addrLine2, city, postcode };
}

// ── Step 1 ──
function Step1({ d, set, applyServiceDefaults }: any) {
  const sel = ENTITY_CARDS.find(c => c.id === d.entityType);
  return (
    <div className="space-y-6 animate-fadeIn">
      <div><h2 className="text-2xl font-bold text-slate-900">What type of client is this?</h2><p className="text-slate-500 mt-1">Choose the entity type to tailor the rest of onboarding.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ENTITY_CARDS.map(c => {
          const active = d.entityType === c.id;
          return (
            <button key={c.id} onClick={() => { set({ entityType: c.id }); applyServiceDefaults(c.id); }}
              className={`p-5 rounded-xl border-2 text-left transition-all ${active ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200 bg-white'}`}>
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 ${active ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}><c.icon size={22} /></div>
              <div className={`font-bold ${active ? 'text-purple-700' : 'text-slate-900'}`}>{c.label}</div>
            </button>
          );
        })}
      </div>
      {sel && <div className="bg-blue-50 border border-blue-100 text-blue-800 text-sm rounded-lg px-4 py-3 flex items-center gap-2"><AlertCircle size={16} /> {sel.note}</div>}
    </div>
  );
}

// ── Step 2 ──
function Step2({ d, set, errors, touched, mark, chQuery, chResults, chSearching, onChSearch, selectCompany }: any) {
  const et = d.entityType as EntityType;
  return (
    <div className="space-y-6 animate-fadeIn">
      <div><h2 className="text-2xl font-bold text-slate-900">Identity</h2><p className="text-slate-500 mt-1">Core details for this client.</p></div>

      {isCompanyLike(et) && (
        <>
          <div className="relative">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2 mb-1"><Building2 size={14} className="text-purple-600" /> Companies House search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={chQuery} onChange={e => onChSearch(e.target.value)} placeholder='Company name or number (e.g. "Tesco" or "00445790")' className={`${fieldCls} pl-9`} />
              {chSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-purple-500" size={16} />}
            </div>
            {chResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                {chResults.map((r: any) => (
                  <button key={r.company_number} onClick={() => selectCompany(r)} className="w-full text-left px-4 py-3 hover:bg-purple-50 border-b border-slate-100 last:border-0">
                    <div className="font-semibold text-sm text-slate-900">{r.company_name}</div>
                    <div className="text-xs text-slate-400">{r.company_number} · {(r.company_status || '').toUpperCase()}{r.date_of_creation ? ` · inc. ${r.date_of_creation}` : ''}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* CH-prefilled fields */}
          <div className="grid grid-cols-2 gap-4">
            {[['legalName', 'Legal name', 'col-span-2'], ['companyNumber', 'Company number', ''], ['incorporationDate', 'Incorporation date', '']].map(([k, label, span]) => (
              <div key={k as string} className={`space-y-1 ${span}`}>
                <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">{label}
                  {d.chPrefilled && <button onClick={() => set({ chEditable: !d.chEditable })} className="text-xs text-blue-600 inline-flex items-center gap-1"><Pencil size={11} /> {d.chEditable ? 'Lock' : 'Edit'}</button>}</label>
                <input value={d[k as string]} onChange={e => set({ [k as string]: e.target.value })} onBlur={() => mark(k as string)}
                  readOnly={d.chPrefilled && !d.chEditable}
                  className={chCls} style={d.chPrefilled && !d.chEditable ? chFilled : { borderColor: errors[k as string] && touched[k as string] ? '#fca5a5' : '#e2e8f0' }} />
                <FieldError name={k as string} errors={errors} touched={touched} />
              </div>
            ))}
            <div className="col-span-2 grid grid-cols-2 gap-4">
              <input value={d.addrLine1} onChange={e => set({ addrLine1: e.target.value })} placeholder="Address line 1" className={chCls} style={d.chPrefilled && !d.chEditable ? chFilled : { borderColor: '#e2e8f0' }} readOnly={d.chPrefilled && !d.chEditable} />
              <input value={d.addrLine2} onChange={e => set({ addrLine2: e.target.value })} placeholder="Address line 2" className={chCls} style={d.chPrefilled && !d.chEditable ? chFilled : { borderColor: '#e2e8f0' }} readOnly={d.chPrefilled && !d.chEditable} />
              <input value={d.city} onChange={e => set({ city: e.target.value })} placeholder="City" className={chCls} style={d.chPrefilled && !d.chEditable ? chFilled : { borderColor: '#e2e8f0' }} readOnly={d.chPrefilled && !d.chEditable} />
              <input value={d.postcode} onChange={e => set({ postcode: e.target.value })} placeholder="Postcode" className={chCls} style={d.chPrefilled && !d.chEditable ? chFilled : { borderColor: '#e2e8f0' }} readOnly={d.chPrefilled && !d.chEditable} />
            </div>
            {d.companyStatus && <div className="col-span-2"><span className={`px-2 py-1 rounded-full text-xs font-bold ${d.companyStatus === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{d.companyStatus.toUpperCase()}</span>{d.sicCode && <span className="ml-2 text-xs text-slate-400">SIC {d.sicCode}</span>}</div>}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <Labeled label="Trading name (if different)"><input value={d.tradingName} onChange={e => set({ tradingName: e.target.value })} className={fieldCls} /></Labeled>
            <Labeled label="Accounting period end"><input type="date" value={d.accountingPeriodEnd} onChange={e => set({ accountingPeriodEnd: e.target.value })} className={fieldCls} /></Labeled>
            <Labeled label="Primary email"><input type="email" value={d.email} onChange={e => set({ email: e.target.value })} onBlur={() => mark('email')} className={fieldCls} /><FieldError name="email" errors={errors} touched={touched} /></Labeled>
            <Labeled label="Primary phone"><input value={d.phone} onChange={e => set({ phone: e.target.value })} className={fieldCls} /></Labeled>
          </div>
        </>
      )}

      {et === 'sole-trader' && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="First name"><input value={d.firstName} onChange={e => set({ firstName: e.target.value })} onBlur={() => mark('firstName')} className={fieldCls} /><FieldError name="firstName" errors={errors} touched={touched} /></Labeled>
          <Labeled label="Last name"><input value={d.lastName} onChange={e => set({ lastName: e.target.value })} onBlur={() => mark('lastName')} className={fieldCls} /><FieldError name="lastName" errors={errors} touched={touched} /></Labeled>
          <Labeled label="Date of birth"><input type="date" value={d.dob} onChange={e => set({ dob: e.target.value })} className={fieldCls} /></Labeled>
          <Labeled label="National Insurance number"><input value={d.nino} onChange={e => set({ nino: e.target.value })} onBlur={() => mark('nino')} placeholder="QQ 12 34 56 C" className={`${fieldCls} font-mono`} /><FieldError name="nino" errors={errors} touched={touched} /></Labeled>
          <Labeled label="Primary email"><input type="email" value={d.email} onChange={e => set({ email: e.target.value })} onBlur={() => mark('email')} className={fieldCls} /><FieldError name="email" errors={errors} touched={touched} /></Labeled>
          <Labeled label="Primary phone"><input value={d.phone} onChange={e => set({ phone: e.target.value })} className={fieldCls} /></Labeled>
          <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <input value={d.addrLine1} onChange={e => set({ addrLine1: e.target.value })} placeholder="Home address line 1" className={fieldCls} />
            <input value={d.addrLine2} onChange={e => set({ addrLine2: e.target.value })} placeholder="Address line 2" className={fieldCls} />
            <input value={d.city} onChange={e => set({ city: e.target.value })} placeholder="City" className={fieldCls} />
            <input value={d.postcode} onChange={e => set({ postcode: e.target.value })} placeholder="Postcode" className={fieldCls} />
          </div>
        </div>
      )}

      {isOrg(et) && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="Organisation name"><input value={d.orgName} onChange={e => set({ orgName: e.target.value })} onBlur={() => mark('orgName')} className={fieldCls} /><FieldError name="orgName" errors={errors} touched={touched} /></Labeled>
          <Labeled label={regNumberLabel(et)}><input value={d.regNumber} onChange={e => set({ regNumber: e.target.value })} className={`${fieldCls} font-mono`} /></Labeled>
          <Labeled label="Primary email"><input type="email" value={d.email} onChange={e => set({ email: e.target.value })} onBlur={() => mark('email')} className={fieldCls} /><FieldError name="email" errors={errors} touched={touched} /></Labeled>
          <Labeled label="Primary phone"><input value={d.phone} onChange={e => set({ phone: e.target.value })} className={fieldCls} /></Labeled>
          <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <input value={d.addrLine1} onChange={e => set({ addrLine1: e.target.value })} placeholder="Registered address line 1" className={fieldCls} />
            <input value={d.addrLine2} onChange={e => set({ addrLine2: e.target.value })} placeholder="Address line 2" className={fieldCls} />
            <input value={d.city} onChange={e => set({ city: e.target.value })} placeholder="City" className={fieldCls} />
            <input value={d.postcode} onChange={e => set({ postcode: e.target.value })} placeholder="Postcode" className={fieldCls} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 3 ──
function Toggle({ on, onChange, label }: any) {
  return (
    <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <button type="button" onClick={() => onChange(!on)} className={`w-11 h-6 rounded-full relative transition-colors ${on ? 'bg-purple-600' : 'bg-slate-300'}`}>
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${on ? 'left-6' : 'left-1'}`} /></button>
    </label>
  );
}
function Step3({ d, set, errors, touched, mark, incomeBandMeta }: any) {
  const et = d.entityType as EntityType;
  return (
    <div className="space-y-5 animate-fadeIn">
      <div><h2 className="text-2xl font-bold text-slate-900">Tax details</h2><p className="text-slate-500 mt-1">References and registrations.</p></div>

      {et === 'sole-trader' && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="UTR"><input value={d.utr} onChange={e => set({ utr: e.target.value })} onBlur={() => mark('utr')} placeholder="10 digits" className={`${fieldCls} font-mono`} /><FieldError name="utr" errors={errors} touched={touched} /></Labeled>
          <Labeled label="PAYE reference (optional)"><input value={d.payeRef} onChange={e => set({ payeRef: e.target.value })} className={`${fieldCls} font-mono`} /></Labeled>
          <div className="col-span-2"><Toggle on={d.saRegistered} onChange={(v: boolean) => set({ saRegistered: v })} label="Self Assessment registered" /></div>
          <div className="col-span-2"><Toggle on={d.vatRegistered} onChange={(v: boolean) => set({ vatRegistered: v })} label="VAT registered" /></div>
          {d.vatRegistered && <>
            <Labeled label="VAT number"><input value={d.vatNumber} onChange={e => set({ vatNumber: e.target.value })} onBlur={() => mark('vatNumber')} placeholder="9 digits" className={`${fieldCls} font-mono`} /><FieldError name="vatNumber" errors={errors} touched={touched} /></Labeled>
            <Labeled label="VAT quarter end"><input type="date" value={d.vatQuarterEnd} onChange={e => set({ vatQuarterEnd: e.target.value })} className={fieldCls} /></Labeled>
          </>}
          <div className="col-span-2">
            <label className="text-sm font-semibold text-slate-700">Income band</label>
            <div className="grid grid-cols-4 gap-2 mt-1">
              {INCOME_BANDS.map(b => (
                <button key={b.id} onClick={() => set({ incomeBand: b.id })} className={`px-2 py-2 rounded-lg border text-sm font-medium ${d.incomeBand === b.id ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-600'}`}>{b.label}</button>
              ))}
            </div>
            {incomeBandMeta && <div className="mt-2"><span className={`px-2.5 py-1 rounded-full text-xs font-bold ${incomeBandMeta.badgeCls}`}>MTD ITSA: {incomeBandMeta.badge}</span></div>}
          </div>
        </div>
      )}

      {isCompanyLike(et) && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="Corporation Tax UTR"><input value={d.utr} onChange={e => set({ utr: e.target.value })} onBlur={() => mark('utr')} placeholder="10 digits" className={`${fieldCls} font-mono`} /><FieldError name="utr" errors={errors} touched={touched} /></Labeled>
          <Labeled label="PAYE reference (optional)"><input value={d.payeRef} onChange={e => set({ payeRef: e.target.value })} className={`${fieldCls} font-mono`} /></Labeled>
          <Labeled label="CT payment group">
            <select value={d.ctPaymentGroup} onChange={e => set({ ctPaymentGroup: e.target.value })} className={fieldCls}><option value="small">Small company</option><option value="large">Large company</option></select>
          </Labeled>
          <div /><div className="col-span-2"><Toggle on={d.vatRegistered} onChange={(v: boolean) => set({ vatRegistered: v })} label="VAT registered" /></div>
          {d.vatRegistered && <>
            <Labeled label="VAT number"><input value={d.vatNumber} onChange={e => set({ vatNumber: e.target.value })} onBlur={() => mark('vatNumber')} placeholder="9 digits" className={`${fieldCls} font-mono`} /><FieldError name="vatNumber" errors={errors} touched={touched} /></Labeled>
            <Labeled label="VAT scheme"><select value={d.vatScheme} onChange={e => set({ vatScheme: e.target.value })} className={fieldCls}>{['Standard', 'Flat Rate', 'Cash Accounting', 'Annual Accounting'].map(s => <option key={s}>{s}</option>)}</select></Labeled>
            <Labeled label="VAT quarter end"><input type="date" value={d.vatQuarterEnd} onChange={e => set({ vatQuarterEnd: e.target.value })} className={fieldCls} /></Labeled>
          </>}
          <div className="col-span-2"><Toggle on={d.cisRegistered} onChange={(v: boolean) => set({ cisRegistered: v })} label="CIS registered" /></div>
        </div>
      )}

      {isOrg(et) && (
        <div className="grid grid-cols-2 gap-4">
          <Labeled label="UTR"><input value={d.utr} onChange={e => set({ utr: e.target.value })} onBlur={() => mark('utr')} placeholder="10 digits" className={`${fieldCls} font-mono`} /><FieldError name="utr" errors={errors} touched={touched} /></Labeled>
          <div className="col-span-2"><Toggle on={d.vatRegistered} onChange={(v: boolean) => set({ vatRegistered: v })} label="VAT registered" /></div>
          {d.vatRegistered && <Labeled label="VAT number"><input value={d.vatNumber} onChange={e => set({ vatNumber: e.target.value })} onBlur={() => mark('vatNumber')} placeholder="9 digits" className={`${fieldCls} font-mono`} /><FieldError name="vatNumber" errors={errors} touched={touched} /></Labeled>}
        </div>
      )}
    </div>
  );
}

// ── Step 4 ──
function Step4({ servicesResolved, set, d, vatLocked, jobCount }: any) {
  const toggle = (id: string) => { if (id === 'vat' && vatLocked) return; set({ services: { ...d.services, [id]: !d.services[id] } }); };
  return (
    <div className="space-y-5 animate-fadeIn">
      <div><h2 className="text-2xl font-bold text-slate-900">Services engaged</h2><p className="text-slate-500 mt-1">Select what your firm will handle. Job templates are created automatically.</p></div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SERVICES.map(s => {
          const on = !!servicesResolved[s.id];
          const locked = s.id === 'vat' && vatLocked;
          return (
            <button key={s.id} onClick={() => toggle(s.id)} disabled={locked}
              className={`p-3 rounded-xl border-2 text-left transition-all ${on ? 'border-purple-500 bg-purple-50' : 'border-slate-100 hover:border-purple-200'} ${locked ? 'cursor-not-allowed' : ''}`}>
              <div className="flex items-center gap-2 mb-1"><div className={`w-8 h-8 rounded-lg flex items-center justify-center ${on ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-400'}`}><s.icon size={16} /></div>
                {on && <Check size={14} className="text-purple-600 ml-auto" />}</div>
              <div className={`text-sm font-semibold ${on ? 'text-purple-700' : 'text-slate-700'}`}>{s.label}</div>
              {locked && <div className="text-[10px] text-purple-400 mt-0.5">Auto (VAT registered)</div>}
            </button>
          );
        })}
      </div>
      {servicesResolved['bookkeeping'] && (
        <Labeled label="Bookkeeping frequency"><select value={d.bookkeepingFreq} onChange={e => set({ bookkeepingFreq: e.target.value })} className={`${fieldCls} max-w-xs`}><option>Monthly</option><option>Quarterly</option></select></Labeled>
      )}
      {servicesResolved['payroll'] && (
        <Labeled label="Number of employees"><input type="number" min="1" value={d.payrollEmployees} onChange={e => set({ payrollEmployees: parseInt(e.target.value) || 1 })} className={`${fieldCls} max-w-[140px]`} /></Labeled>
      )}
      <div className="bg-purple-50 border border-purple-100 rounded-lg px-4 py-3 text-sm text-purple-800 font-medium">
        {jobCount} job template{jobCount === 1 ? '' : 's'} will be created automatically based on selected services
      </div>
    </div>
  );
}

// ── Step 5 ──
function Step5({ d, set, partners, members, touched, mark, error }: any) {
  const [tagInput, setTagInput] = useState('');
  const addTag = () => { const t = tagInput.trim(); if (t && !d.tags.includes(t)) set({ tags: [...d.tags, t] }); setTagInput(''); };
  return (
    <div className="space-y-5 animate-fadeIn">
      <div><h2 className="text-2xl font-bold text-slate-900">Practice details</h2><p className="text-slate-500 mt-1">Ownership, fees and how they found you.</p></div>
      <div className="grid grid-cols-2 gap-4">
        <Labeled label="Assigned partner">
          <select value={d.assignedPartnerId} onChange={e => { set({ assignedPartnerId: e.target.value }); mark('assignedPartnerId'); }} className={fieldCls}>
            <option value="">Select partner…</option>
            {partners.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {touched.assignedPartnerId && !d.assignedPartnerId && <p className="flex items-center gap-1 text-xs text-red-600 mt-1"><AlertCircle size={12} /> Assigned partner is required</p>}
        </Labeled>
        <Labeled label="Assigned manager">
          <select value={d.assignedManagerId} onChange={e => set({ assignedManagerId: e.target.value })} className={fieldCls}>
            <option value="">Select manager…</option>
            {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Labeled>
        <Labeled label="Client since"><input type="date" value={d.clientSince} onChange={e => set({ clientSince: e.target.value })} className={fieldCls} /></Labeled>
        <Labeled label="Fee schedule"><input value={d.feeSchedule} onChange={e => set({ feeSchedule: e.target.value })} placeholder="£1,200/year" className={fieldCls} /></Labeled>
        <Labeled label="How they found us">
          <select value={d.foundUs} onChange={e => set({ foundUs: e.target.value })} className={fieldCls}>
            <option value="">Select…</option>{['Referral', 'Website', 'Walk-in', 'LinkedIn', 'Other'].map(o => <option key={o}>{o}</option>)}
          </select>
        </Labeled>
        {d.foundUs === 'Referral' && <Labeled label="Referral source"><input value={d.referralSource} onChange={e => set({ referralSource: e.target.value })} className={fieldCls} /></Labeled>}
      </div>
      <Labeled label="Tags">
        <div className="flex flex-wrap gap-1.5 mb-2">{d.tags.map((t: string) => <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs">{t}<button onClick={() => set({ tags: d.tags.filter((x: string) => x !== t) })}><X size={11} /></button></span>)}</div>
        <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Type a tag, press Enter" className={fieldCls} />
      </Labeled>
      <Labeled label="Internal notes"><textarea value={d.notes} onChange={e => set({ notes: e.target.value })} rows={3} className={`${fieldCls} resize-none`} /></Labeled>
      {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle size={14} /> {error}</p>}
    </div>
  );
}
