import React, { useState } from 'react';
import { SECTIONS, FieldInput, labelFor, StaffOption } from './fields';

/**
 * Shared sectioned worker form — used by both "Add worker" (empty) and the detail
 * Edit view (prefilled). One config, so create and edit never drift.
 */
export function WorkerForm({ value, onChange, staffOptions }: { value: Record<string, any>; onChange: (k: string, v: any) => void; staffOptions?: StaffOption[] }) {
  const [active, setActive] = useState(SECTIONS[0].id);
  const jump = (id: string) => { setActive(id); document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      {/* Section nav */}
      <nav className="hidden md:block sticky top-2 self-start">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">Sections</p>
        <div className="space-y-0.5">
          {SECTIONS.map(s => {
            const on = active === s.id;
            const Icon = s.icon;
            return (
              <button key={s.id} type="button" onClick={() => jump(s.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors ${on ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                <Icon size={15} className={on ? 'text-blue-600' : 'text-slate-400'} />
                <span className="truncate">{s.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Section cards */}
      <div className="space-y-5 min-w-0">
        {SECTIONS.map(s => {
          const Icon = s.icon;
          return (
            <section key={s.id} id={`sec-${s.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-4">
              <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"><Icon size={15} /></span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-[#0F1E3A] leading-none">{s.title}</h4>
                  {s.blurb && <p className="text-[11px] text-slate-400 mt-1 leading-none">{s.blurb}</p>}
                </div>
              </header>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                {s.fields.map(f => (
                  <div key={f.k} className={f.span === 2 ? 'sm:col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">{labelFor(f)}{f.k === 'fullName' && <span className="text-rose-500"> *</span>}</label>
                    <FieldInput f={f} value={value[f.k]} onChange={v => onChange(f.k, v)} staffOptions={staffOptions} />
                    {f.help && <p className="text-[11px] text-slate-400 mt-1">{f.help}</p>}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
