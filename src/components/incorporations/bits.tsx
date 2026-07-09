import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { field } from '../sponsor/fields';
import type { BlockingIssue, IncorporationStatus } from '../../hooks/useIncorporations';
import { Address, STATUS_META, WIZARD_SECTIONS, issuesBySection } from './model';

/** Small shared pieces for the incorporation wizard + tracker — same design
 *  language as the sponsor tab (ui.tsx): navy headings, slate borders,
 *  semantic colour only for state. */

export function StatusChip({ status }: { status: IncorporationStatus }) {
  const m = STATUS_META[status] || STATUS_META.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${m.chip}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />{m.label}
    </span>
  );
}

export function Labelled({ label, required, help, children, span2 }: {
  label: string; required?: boolean; help?: string; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div className={span2 ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}{required && <span className="text-rose-500"> *</span>}</label>
      {children}
      {help && <p className="text-[11px] text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

export function TextField({ value, onChange, placeholder, type = 'text' }: {
  value: any; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return <input type={type} value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)} className={field} />;
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-200'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

/** UK-shaped address editor used for registered office + officer addresses. */
export function AddressFields({ value, onChange }: { value?: Address; onChange: (a: Address) => void }) {
  const a = value || {};
  const set = (k: keyof Address) => (v: string) => onChange({ ...a, [k]: v });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
      <Labelled label="Building name / number" required><TextField value={a.premises} onChange={set('premises')} placeholder="1" /></Labelled>
      <Labelled label="Street" required><TextField value={a.address_line_1} onChange={set('address_line_1')} placeholder="High Street" /></Labelled>
      <Labelled label="Address line 2"><TextField value={a.address_line_2} onChange={set('address_line_2')} /></Labelled>
      <Labelled label="Town / city" required><TextField value={a.locality} onChange={set('locality')} /></Labelled>
      <Labelled label="County / region"><TextField value={a.region} onChange={set('region')} /></Labelled>
      <Labelled label="Postcode" required><TextField value={a.postal_code} onChange={set('postal_code')} /></Labelled>
      <Labelled label="Country"><TextField value={a.country} onChange={set('country')} placeholder="England" /></Labelled>
    </div>
  );
}

/**
 * The readiness checklist — the /ready gate list rendered live. This IS the
 * wizard's progress indicator: every unresolved blocking issue appears here
 * under the section that fixes it; an empty list means "ready to file".
 */
export function ReadinessChecklist({ issues, onJump }: { issues: BlockingIssue[]; onJump: (sectionId: string) => void }) {
  if (!issues.length) {
    return (
      <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
        <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-800">Everything Companies House needs is in place.</p>
          <p className="text-xs text-emerald-700 mt-0.5">You can mark this incorporation ready to file.</p>
        </div>
      </div>
    );
  }
  const grouped = issuesBySection(issues);
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <header className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-amber-50/60">
        <AlertTriangle size={15} className="text-amber-600" />
        <h4 className="text-sm font-semibold text-[#0F1E3A]">Before you can file <span className="text-slate-400 font-normal">— {issues.length} item{issues.length === 1 ? '' : 's'}</span></h4>
      </header>
      <ul className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
        {WIZARD_SECTIONS.filter(s => grouped[s.id]?.length).map(s => (
          <li key={s.id} className="px-4 py-2.5">
            <button type="button" onClick={() => onJump(s.id)} className="text-xs font-semibold text-blue-700 hover:underline">{s.title}</button>
            <ul className="mt-1 space-y-1">
              {grouped[s.id].map((i, n) => (
                <li key={`${i.code}-${n}`} className="text-xs text-slate-600 flex gap-1.5">
                  <span className="text-amber-500 flex-shrink-0 mt-px">•</span>{i.message}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
