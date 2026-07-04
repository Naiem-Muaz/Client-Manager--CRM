import React from 'react';

/**
 * Shared UI primitives for the Sponsor Compliance tab — so the list, sub-tabs,
 * alert dashboard and org record all match the worker create/detail design
 * language: navy (#0F1E3A) headings on Inter, soft-grey header bars, rounded-xl
 * white cards, semantic colour reserved for compliance state.
 */

export const btnPrimary = 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm transition-colors';
export const btnGhost = 'inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors';
export const th = 'px-5 py-3';
export const td = 'px-5 py-3.5';

export const initials = (n?: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function Avatar({ name, size = 40 }: { name?: string; size?: number }) {
  return (
    <div className="rounded-xl bg-gradient-to-br from-[#0F1E3A] to-[#2F4A7D] text-white flex items-center justify-center font-bold shadow-sm flex-shrink-0"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}>{initials(name)}</div>
  );
}

export function ViewHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-[#0F1E3A]">{title}</h3>
        {subtitle && <p className="text-slate-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export function SectionCard({ icon: Icon, title, subtitle, action, children, bodyClass = 'p-5' }: {
  icon?: any; title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; bodyClass?: string;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
        {Icon && <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0"><Icon size={15} /></span>}
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[#0F1E3A] leading-none">{title}</h4>
          {subtitle && <p className="text-[11px] text-slate-400 mt-1 leading-none">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

export function EmptyState({ icon: Icon, title, hint }: { icon: any; title: string; hint?: string }) {
  return (
    <div className="bg-white border border-dashed border-slate-200 rounded-xl p-10 text-center">
      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400"><Icon size={22} /></div>
      <h4 className="text-sm font-semibold text-[#0F1E3A]">{title}</h4>
      {hint && <p className="text-slate-500 text-sm mt-1">{hint}</p>}
    </div>
  );
}

export function TableCard({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">{head}</thead>
          <tbody className="divide-y divide-slate-100">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

/** £-prefixed text input — no spinner, no forced ".00" (matches the worker form). */
export function MoneyInput({ value, onChange, autoFocus }: { value: any; onChange: (v: string) => void; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">£</span>
      <input type="text" inputMode="decimal" autoFocus={autoFocus} value={value ?? ''} placeholder="0"
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, '').replace(/(\.\d*)\./g, '$1'))}
        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
    </div>
  );
}
