import React, { useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Plus, Search, ShieldAlert, Trash2, X,
} from 'lucide-react';
import { btnGhost, btnPrimary } from '../sponsor/ui';
import { field } from '../sponsor/fields';
import { SIC_CODES } from '../../data/sicCodes';
import type { NameCheckResult } from '../../hooks/useIncorporations';
import {
  Allotment, DEFAULT_SHARE_CLASS, IDV_META, Officer, ShareClass, Subscriber, WizardData, emptyOfficer,
} from './model';
import { AddressFields, Labelled, TextField, Toggle } from './bits';

/** Section editors for the incorporation wizard. Each edits one top-level key
 *  of wizard_data via the parent's patch(); the parent owns save/dirty state. */

type Patch = (updates: Partial<WizardData>) => void;

const officerDisplay = (o: Officer, i: number) =>
  o.kind === 'corporate'
    ? (o.name?.corporate_name || `Officer ${i + 1}`)
    : [o.name?.forenames, o.name?.surname].filter(Boolean).join(' ') || `Officer ${i + 1}`;

export function subscriberDisplay(wd: WizardData, ref?: number): string {
  const s = ref != null ? wd.subscribers?.[ref] : undefined;
  if (!s) return `Subscriber ${ref ?? '?'}`;
  if (s.officer_ref != null && wd.officers?.[s.officer_ref]) return officerDisplay(wd.officers[s.officer_ref], s.officer_ref);
  return s.name?.corporate_name || [s.name?.forenames, s.name?.surname].filter(Boolean).join(' ') || `Subscriber ${(ref ?? 0) + 1}`;
}

// ── 1. Company name + live availability check ────────────────────────────────
export function NameSection({ proposedName, onNameChange, nameCheck, nameStale, onRunCheck, checking }: {
  proposedName: string; onNameChange: (v: string) => void;
  nameCheck: NameCheckResult | null; nameStale: boolean;
  onRunCheck: () => void; checking: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Labelled label="Proposed company name" required help="Include the ending (Ltd / Limited).">
            <TextField value={proposedName} onChange={onNameChange} placeholder="Example Trading Ltd" />
          </Labelled>
        </div>
        <button type="button" onClick={onRunCheck} disabled={checking || !proposedName.trim()} className={btnPrimary}>
          {checking ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}Check availability
        </button>
      </div>

      {nameCheck && !nameStale && (
        nameCheck.result === 'available' ? (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 size={17} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-emerald-800">No "same as" match on the register.</p>
              <p className="text-xs text-emerald-700 mt-0.5">Indicative only — Companies House decides at filing; this is not a reservation.</p>
            </div>
          </div>
        ) : nameCheck.result === 'same_as_existing' ? (
          <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-rose-800"><X size={16} />Name is the "same as" an existing company — filing would be rejected.</div>
            <ul className="mt-1.5 text-xs text-rose-700 space-y-0.5">
              {(nameCheck.same_as || []).map(m => <li key={m.company_number}>{m.company_name} ({m.company_number}, {m.company_status || 'active'})</li>)}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <AlertTriangle size={16} />The check did not complete — try again.
          </div>
        )
      )}
      {nameCheck && nameStale && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} />The name changed since the last check — re-run it.
        </div>
      )}

      {nameCheck && !nameStale && !!nameCheck.warnings?.length && (
        <div className="px-4 py-3 bg-amber-50/70 border border-amber-200 rounded-xl">
          <p className="text-xs font-semibold text-amber-800 mb-1">Sensitive words</p>
          <ul className="text-xs text-amber-700 space-y-0.5">{nameCheck.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {nameCheck && !nameStale && nameCheck.result === 'available' && !!nameCheck.close_matches?.length && (
        <details className="text-xs text-slate-500">
          <summary className="cursor-pointer font-medium hover:text-slate-700">Similar names on the register ({nameCheck.close_matches.length})</summary>
          <ul className="mt-1.5 space-y-0.5 pl-4">
            {nameCheck.close_matches.map(m => <li key={m.company_number}>{m.company_name} ({m.company_number})</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── 2. Company details ────────────────────────────────────────────────────────
export function CompanySection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const c = wd.company || {};
  const set = (k: string, v: any) => patch({ company: { ...c, [k]: v } });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
      <Labelled label="Company type" help="Private company limited by shares — the only type supported in v1.">
        <input value="Private limited by shares" disabled className={`${field} bg-slate-50 text-slate-500`} />
      </Labelled>
      <Labelled label="Registered email" required help="Required by Companies House (ECCTA). Not published on the register.">
        <TextField type="email" value={c.registered_email} onChange={v => set('registered_email', v)} placeholder="company@example.co.uk" />
      </Labelled>
      <div className="sm:col-span-2 flex items-start justify-between gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-700">Lawful purpose statement</p>
          <p className="text-xs text-slate-400 mt-0.5">I confirm the company is formed for lawful purposes (required, ECCTA).</p>
        </div>
        <Toggle value={!!c.lawful_purpose_confirmed} onChange={v => set('lawful_purpose_confirmed', v)} />
      </div>
    </div>
  );
}

// ── 3. Registered office ──────────────────────────────────────────────────────
export function OfficeSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const c = wd.company || {};
  return (
    <div className="space-y-3">
      <AddressFields value={c.registered_office} onChange={a => patch({ company: { ...c, registered_office: a } })} />
      <p className="text-[11px] text-slate-400">Must be an "appropriate address" (ECCTA): documents delivered here must come to the company's attention — a PO box alone is not acceptable.</p>
    </div>
  );
}

// ── 4. Officers ───────────────────────────────────────────────────────────────
export function OfficersSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const officers = wd.officers || [];
  const [open, setOpen] = useState<number | null>(officers.length ? 0 : null);
  const setOfficers = (next: Officer[]) => patch({ officers: next });
  const update = (i: number, o: Officer) => setOfficers(officers.map((x, n) => (n === i ? o : x)));
  const add = (role: Officer['role']) => { setOfficers([...officers, emptyOfficer(role)]); setOpen(officers.length); };
  const remove = (i: number) => {
    setOfficers(officers.filter((_x, n) => n !== i));
    setOpen(null);
  };

  return (
    <div className="space-y-3">
      {!officers.length && (
        <p className="text-sm text-slate-400">No officers yet — a private company needs at least one person director.</p>
      )}
      {officers.map((o, i) => {
        const isOpen = open === i;
        const idv = o.role === 'director' && o.kind === 'person' ? (o.idv?.status || 'unverified') : null;
        return (
          <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
            <button type="button" onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/70 transition-colors">
              <span className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-[#0F1E3A]">{officerDisplay(o, i)}</span>
                <span className="text-xs text-slate-400 ml-2 capitalize">{o.role}{o.kind === 'corporate' ? ' (corporate)' : ''}</span>
              </span>
              {idv && (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${IDV_META[idv].cls}`}>
                  {idv !== 'verified' && <ShieldAlert size={11} />}{IDV_META[idv].label}
                </span>
              )}
              {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-100 space-y-4">
                {idv && idv !== 'verified' && (
                  <div className="flex items-start gap-2.5 px-3.5 py-2.5 bg-rose-50 border border-rose-200 rounded-lg">
                    <ShieldAlert size={15} className="text-rose-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700"><span className="font-semibold">Identity verification incomplete — this blocks filing.</span> Companies House rejects incorporations whose directors are not verified (ECCTA). The director verifies via GOV.UK One Login and receives a Companies House personal code.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                  <Labelled label="Role">
                    <select value={o.role} onChange={e => update(i, { ...o, role: e.target.value as Officer['role'] })} className={field}>
                      <option value="director">Director</option><option value="secretary">Secretary</option>
                    </select>
                  </Labelled>
                  <Labelled label="Type">
                    <select value={o.kind} onChange={e => update(i, { ...o, kind: e.target.value as Officer['kind'] })} className={field}>
                      <option value="person">Person</option><option value="corporate">Corporate</option>
                    </select>
                  </Labelled>
                  {o.kind === 'corporate' ? (
                    <Labelled label="Corporate name" required span2>
                      <TextField value={o.name?.corporate_name} onChange={v => update(i, { ...o, name: { ...o.name, corporate_name: v } })} />
                    </Labelled>
                  ) : (
                    <>
                      <Labelled label="Forenames" required><TextField value={o.name?.forenames} onChange={v => update(i, { ...o, name: { ...o.name, forenames: v } })} /></Labelled>
                      <Labelled label="Surname" required><TextField value={o.name?.surname} onChange={v => update(i, { ...o, name: { ...o.name, surname: v } })} /></Labelled>
                      <Labelled label="Date of birth" required={o.role === 'director'}><TextField type="date" value={o.dob} onChange={v => update(i, { ...o, dob: v })} /></Labelled>
                      <Labelled label="Nationality"><TextField value={o.nationality} onChange={v => update(i, { ...o, nationality: v })} /></Labelled>
                      <Labelled label="Occupation"><TextField value={o.occupation} onChange={v => update(i, { ...o, occupation: v })} /></Labelled>
                      <Labelled label="Country of residence"><TextField value={o.country_of_residence} onChange={v => update(i, { ...o, country_of_residence: v })} /></Labelled>
                    </>
                  )}
                  <Labelled label="Email" help="Used for the client record after incorporation."><TextField type="email" value={o.email} onChange={v => update(i, { ...o, email: v })} /></Labelled>
                  <Labelled label="Phone"><TextField value={o.phone} onChange={v => update(i, { ...o, phone: v })} /></Labelled>
                </div>

                {o.role === 'director' && o.kind === 'person' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <Labelled label="Identity verification (ECCTA)" required>
                      <select value={o.idv?.status || 'unverified'} onChange={e => update(i, { ...o, idv: { ...(o.idv || {}), status: e.target.value as any } })} className={field}>
                        <option value="unverified">Not verified</option>
                        <option value="pending">Verification in progress</option>
                        <option value="verified">Verified</option>
                      </select>
                    </Labelled>
                    <Labelled label="Companies House personal code" help="Issued to the director on completing IDV.">
                      <TextField value={o.idv?.ch_personal_code} onChange={v => update(i, { ...o, idv: { status: o.idv?.status || 'unverified', ch_personal_code: v } })} />
                    </Labelled>
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold text-slate-500 mb-2">Service address (public register)</p>
                  <AddressFields value={o.service_address} onChange={a => update(i, { ...o, service_address: a })} />
                </div>

                {o.kind === 'person' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-slate-500">Residential address (never published)</p>
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        Same as service address
                        <Toggle value={!!o.residential_same_as_service} onChange={v => update(i, { ...o, residential_same_as_service: v })} />
                      </label>
                    </div>
                    {!o.residential_same_as_service && (
                      <AddressFields value={o.residential_address} onChange={a => update(i, { ...o, residential_address: a })} />
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2.5 text-sm text-slate-700">
                    <Toggle value={!!o.consent_to_act} onChange={v => update(i, { ...o, consent_to_act: v })} />
                    Consents to act as {o.role}
                  </label>
                  <button type="button" onClick={() => remove(i)} className="inline-flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 font-medium">
                    <Trash2 size={13} />Remove officer
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <button type="button" onClick={() => add('director')} className={btnGhost}><Plus size={15} />Add director</button>
        <button type="button" onClick={() => add('secretary')} className={btnGhost}><Plus size={15} />Add secretary</button>
      </div>
    </div>
  );
}

// ── 5. Shares & subscribers ───────────────────────────────────────────────────
export function SharesSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const classes = wd.share_capital?.classes || [];
  const allotments = wd.share_capital?.allotments || [];
  const subscribers = wd.subscribers || [];
  const officers = wd.officers || [];
  const setCapital = (next: { classes?: ShareClass[]; allotments?: Allotment[] }) =>
    patch({ share_capital: { classes, allotments, ...next } });

  const totalShares = allotments.reduce((s, a) => s + (Number(a.num_shares) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Share classes */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Share classes</p>
        <div className="space-y-2">
          {classes.map((c, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_2fr_auto] gap-2 items-start">
              <TextField value={c.class} onChange={v => setCapital({ classes: classes.map((x, n) => n === i ? { ...x, class: v } : x) })} placeholder="Ordinary" />
              <TextField value={c.currency} onChange={v => setCapital({ classes: classes.map((x, n) => n === i ? { ...x, currency: v.toUpperCase() } : x) })} placeholder="GBP" />
              <TextField value={c.nominal_value} onChange={v => setCapital({ classes: classes.map((x, n) => n === i ? { ...x, nominal_value: v } : x) })} placeholder="1.00" />
              <TextField value={c.prescribed_particulars} onChange={v => setCapital({ classes: classes.map((x, n) => n === i ? { ...x, prescribed_particulars: v } : x) })} placeholder="Prescribed particulars (rights)" />
              <button type="button" onClick={() => setCapital({ classes: classes.filter((_x, n) => n !== i) })} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCapital({ classes: [...classes, { ...DEFAULT_SHARE_CLASS }] })} className={`${btnGhost} mt-2`}><Plus size={15} />Add share class{!classes.length && ' (Ordinary £1.00 default)'}</button>
      </div>

      {/* Subscribers */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Subscribers (the first members)</p>
        <div className="space-y-2">
          {subscribers.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={s.officer_ref != null ? `officer:${s.officer_ref}` : 'standalone'}
                onChange={e => {
                  const v = e.target.value;
                  const next: Subscriber = v.startsWith('officer:') ? { officer_ref: Number(v.split(':')[1]) } : { name: s.name || {} };
                  patch({ subscribers: subscribers.map((x, n) => (n === i ? next : x)) });
                }}
                className={field}>
                {officers.map((o, n) => <option key={n} value={`officer:${n}`}>{officerDisplay(o, n)} (officer)</option>)}
                <option value="standalone">Someone else…</option>
              </select>
              {s.officer_ref == null && (
                <>
                  <TextField value={s.name?.forenames} onChange={v => patch({ subscribers: subscribers.map((x, n) => n === i ? { ...x, name: { ...x.name, forenames: v } } : x) })} placeholder="Forenames" />
                  <TextField value={s.name?.surname} onChange={v => patch({ subscribers: subscribers.map((x, n) => n === i ? { ...x, name: { ...x.name, surname: v } } : x) })} placeholder="Surname" />
                </>
              )}
              <button type="button" onClick={() => patch({ subscribers: subscribers.filter((_x, n) => n !== i), share_capital: { classes, allotments: allotments.filter(a => a.subscriber_ref !== i).map(a => a.subscriber_ref > i ? { ...a, subscriber_ref: a.subscriber_ref - 1 } : a) } })}
                className="p-2 text-slate-400 hover:text-rose-600 flex-shrink-0"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => patch({ subscribers: [...subscribers, officers.length ? { officer_ref: 0 } : { name: {} }] })} className={`${btnGhost} mt-2`}><Plus size={15} />Add subscriber</button>
      </div>

      {/* Allotments */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">Allotments {totalShares > 0 && <span className="font-normal text-slate-400">— {totalShares} shares total</span>}</p>
        <div className="space-y-2">
          {allotments.map((a, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_120px_140px_auto] gap-2 items-center">
              <select value={a.subscriber_ref} onChange={e => setCapital({ allotments: allotments.map((x, n) => n === i ? { ...x, subscriber_ref: Number(e.target.value) } : x) })} className={field}>
                {subscribers.map((_s, n) => <option key={n} value={n}>{subscriberDisplay(wd, n)}</option>)}
              </select>
              <select value={a.class} onChange={e => setCapital({ allotments: allotments.map((x, n) => n === i ? { ...x, class: e.target.value } : x) })} className={field}>
                {classes.map(c => <option key={c.class} value={c.class}>{c.class}</option>)}
              </select>
              <input type="number" min={1} value={a.num_shares || ''} placeholder="Shares"
                onChange={e => setCapital({ allotments: allotments.map((x, n) => n === i ? { ...x, num_shares: Number(e.target.value) } : x) })}
                className={`${field} tabular-nums`} />
              <TextField value={a.amount_paid_per_share} onChange={v => setCapital({ allotments: allotments.map((x, n) => n === i ? { ...x, amount_paid_per_share: v } : x) })} placeholder="Paid / share" />
              <button type="button" onClick={() => setCapital({ allotments: allotments.filter((_x, n) => n !== i) })} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button type="button" disabled={!subscribers.length || !classes.length}
          onClick={() => setCapital({ allotments: [...allotments, { subscriber_ref: 0, class: classes[0]?.class || 'Ordinary', num_shares: 100, amount_paid_per_share: classes[0]?.nominal_value || '1.00' }] })}
          className={`${btnGhost} mt-2`}><Plus size={15} />Add allotment</button>
        {(!subscribers.length || !classes.length) && <p className="text-[11px] text-slate-400 mt-1.5">Add a share class and a subscriber first.</p>}
      </div>
    </div>
  );
}

// ── 6. PSCs ───────────────────────────────────────────────────────────────────
const NATURE_LABEL: Record<string, string> = {
  'ownership-of-shares-25-to-50-percent': 'Owns 25–50% of shares',
  'ownership-of-shares-50-to-75-percent': 'Owns 50–75% of shares',
  'ownership-of-shares-75-to-100-percent': 'Owns 75–100% of shares',
  'voting-rights-25-to-50-percent': '25–50% of voting rights',
  'voting-rights-50-to-75-percent': '50–75% of voting rights',
  'voting-rights-75-to-100-percent': '75–100% of voting rights',
  'right-to-appoint-and-remove-directors': 'Right to appoint/remove directors',
  'significant-influence-or-control': 'Significant influence or control',
};

export function PscSection({ wd, patch, suggestions }: {
  wd: WizardData; patch: Patch;
  suggestions: Array<{ subscriber_ref: number; percent: number; natures_of_control: string[] }>;
}) {
  const pscs = wd.pscs || [];
  const active = pscs.filter(p => !p.dismissed);
  const accepted = new Set(active.filter(p => p.subscriber_ref != null).map(p => p.subscriber_ref));
  const pending = suggestions.filter(s => !accepted.has(s.subscriber_ref) && !pscs.some(p => p.dismissed && p.subscriber_ref === s.subscriber_ref));

  const accept = (s: { subscriber_ref: number; natures_of_control: string[] }) =>
    patch({ pscs: [...pscs, { source: 'derived' as const, subscriber_ref: s.subscriber_ref, natures_of_control: s.natures_of_control }], no_psc_statement: false });
  const dismissSuggestion = (s: { subscriber_ref: number; natures_of_control: string[] }) =>
    patch({ pscs: [...pscs, { source: 'derived' as const, subscriber_ref: s.subscriber_ref, natures_of_control: s.natures_of_control, dismissed: true }] });

  return (
    <div className="space-y-4">
      {!!pending.length && (
        <div className="border border-blue-200 bg-blue-50/60 rounded-xl p-4 space-y-2.5">
          <p className="text-xs font-semibold text-blue-800">Suggested from the shareholdings (&gt;25%)</p>
          {pending.map(s => (
            <div key={s.subscriber_ref} className="flex items-center justify-between gap-3 bg-white border border-blue-100 rounded-lg px-3.5 py-2.5">
              <div className="text-sm text-slate-800">
                <span className="font-medium">{subscriberDisplay(wd, s.subscriber_ref)}</span>
                <span className="text-xs text-slate-400 ml-2">{s.percent}% — {s.natures_of_control.map(n => NATURE_LABEL[n] || n).join('; ')}</span>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <button type="button" onClick={() => accept(s)} className="px-2.5 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Add as PSC</button>
                <button type="button" onClick={() => dismissSuggestion(s)} className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 rounded-lg">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {active.length ? (
        <ul className="space-y-2">
          {active.map((p, i) => (
            <li key={i} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3.5 py-2.5">
              <div className="text-sm text-slate-800">
                <span className="font-medium">{p.subscriber_ref != null ? subscriberDisplay(wd, p.subscriber_ref) : (p.name || 'PSC')}</span>
                <span className="text-xs text-slate-400 ml-2">{p.natures_of_control.map(n => NATURE_LABEL[n] || n).join('; ') || 'No nature of control selected'}</span>
                <span className="text-[10px] uppercase tracking-wide text-slate-300 ml-2">{p.source}</span>
              </div>
              <button type="button" onClick={() => patch({ pscs: pscs.filter(x => x !== p) })} className="p-1.5 text-slate-400 hover:text-rose-600 flex-shrink-0"><Trash2 size={14} /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">No PSCs recorded.</p>
      )}

      <ManualPscAdd wd={wd} patch={patch} />

      <div className="flex items-start justify-between gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-700">No-PSC statement</p>
          <p className="text-xs text-slate-400 mt-0.5">The company has no person with significant control (rare — usually someone holds &gt;25%).</p>
        </div>
        <Toggle value={!!wd.no_psc_statement} onChange={v => patch({ no_psc_statement: v })} />
      </div>
    </div>
  );
}

function ManualPscAdd({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [natures, setNatures] = useState<string[]>([]);
  if (!adding) return <button type="button" onClick={() => setAdding(true)} className={btnGhost}><Plus size={15} />Add PSC manually</button>;
  return (
    <div className="border border-slate-200 rounded-xl p-4 space-y-3">
      <Labelled label="PSC name" required><TextField value={name} onChange={setName} /></Labelled>
      <div>
        <p className="text-xs font-medium text-slate-500 mb-1.5">Natures of control</p>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(NATURE_LABEL).map(([k, label]) => (
            <button key={k} type="button" onClick={() => setNatures(natures.includes(k) ? natures.filter(x => x !== k) : [...natures, k])}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${natures.includes(k) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={!name.trim() || !natures.length} className={btnPrimary}
          onClick={() => { patch({ pscs: [...(wd.pscs || []), { source: 'manual' as const, name: name.trim(), natures_of_control: natures }], no_psc_statement: false }); setAdding(false); setName(''); setNatures([]); }}>
          Add PSC
        </button>
        <button type="button" onClick={() => setAdding(false)} className={btnGhost}>Cancel</button>
      </div>
    </div>
  );
}

// ── 7. Articles ───────────────────────────────────────────────────────────────
export function ArticlesSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const c = wd.company || {};
  const kind = c.articles?.kind;
  const choose = (k: 'model' | 'bespoke') => patch({ company: { ...c, articles: { ...(c.articles || {}), kind: k } } });
  return (
    <div className="space-y-3">
      {([
        ['model', 'Model articles', 'The statutory model articles for private companies limited by shares, adopted without amendment. Generated verbatim in the incorporation pack.'],
        ['bespoke', 'Bespoke articles', 'Upload the company’s own articles — included in the pack and filed as-is.'],
      ] as const).map(([k, title, blurb]) => (
        <button key={k} type="button" onClick={() => choose(k)}
          className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors ${kind === k ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-500/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
          <p className="text-sm font-semibold text-[#0F1E3A]">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{blurb}</p>
        </button>
      ))}
      {kind === 'bespoke' && !c.articles?.document_id && (
        <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <AlertTriangle size={16} className="flex-shrink-0" />Upload the bespoke articles in the Documents area (PDF or Word) — until then this blocks filing.
        </div>
      )}
    </div>
  );
}

// ── 8. SIC picker ─────────────────────────────────────────────────────────────
export function SicSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  const c = wd.company || {};
  const chosen = c.sic_codes || [];
  const [q, setQ] = useState('');
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return SIC_CODES.filter(s => s.code.startsWith(needle) || s.label.toLowerCase().includes(needle)).slice(0, 12);
  }, [q]);
  const set = (codes: string[]) => patch({ company: { ...c, sic_codes: codes } });
  const labelOf = (code: string) => SIC_CODES.find(s => s.code === code)?.label || code;

  return (
    <div className="space-y-3">
      {!!chosen.length && (
        <div className="flex flex-wrap gap-1.5">
          {chosen.map(code => (
            <span key={code} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 bg-blue-50 text-blue-800 border border-blue-100 rounded-lg text-xs">
              <span className="font-mono font-semibold">{code}</span>
              <span className="max-w-[280px] truncate">{labelOf(code)}</span>
              <button type="button" onClick={() => set(chosen.filter(x => x !== code))} className="p-0.5 hover:bg-blue-100 rounded"><X size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by code or activity — e.g. 62020 or 'software'"
          className={`${field} pl-9`} />
      </div>
      {!!results.length && (
        <ul className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white max-h-64 overflow-y-auto">
          {results.map(s => {
            const on = chosen.includes(s.code);
            return (
              <li key={s.code}>
                <button type="button" disabled={on || chosen.length >= 4}
                  onClick={() => { set([...chosen, s.code]); setQ(''); }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-40">
                  <span className="font-mono text-xs font-semibold text-slate-500 flex-shrink-0">{s.code}</span>
                  <span className="text-slate-800">{s.label}</span>
                  {on && <CheckCircle2 size={14} className="text-emerald-500 ml-auto flex-shrink-0" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-slate-400">Up to 4 SIC codes (Companies House limit). {chosen.length >= 4 && 'Limit reached.'}</p>
    </div>
  );
}

// ── 9. Declarations ───────────────────────────────────────────────────────────
export function DeclarationsSection({ wd, patch }: { wd: WizardData; patch: Patch }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <p className="text-sm font-medium text-slate-700">Statement of compliance</p>
          <p className="text-xs text-slate-400 mt-0.5">The requirements of the Companies Act 2006 as to registration have been complied with.</p>
        </div>
        <Toggle value={!!wd.statement_of_compliance} onChange={v => patch({ statement_of_compliance: v })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
        <Labelled label="Presenter name" help="Who is filing (your practice)."><TextField value={wd.presenter?.name} onChange={v => patch({ presenter: { ...(wd.presenter || {}), name: v } })} /></Labelled>
        <Labelled label="Presenter reference"><TextField value={wd.presenter?.reference} onChange={v => patch({ presenter: { ...(wd.presenter || {}), reference: v } })} /></Labelled>
      </div>
    </div>
  );
}
