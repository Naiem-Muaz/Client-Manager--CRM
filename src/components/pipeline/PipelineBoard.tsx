import React from 'react';

/**
 * Shared pipeline board — extracted from the incorporations tracker
 * (2026-07-10) so proposals and incorporations render the same board:
 * slate column shells with dot-labelled headers + count, white cards,
 * an attention-first banner slot above. Markup/classes are byte-for-byte
 * the incorporations originals; both pages now consume this.
 */

export interface PipelineColumn {
  key: string;
  label: string;
  dotClass: string;   // e.g. 'bg-blue-500'
}

export function PipelineBoard<T>({ columns, groups, cardKey, renderCard, colsClass }: {
  columns: PipelineColumn[];
  groups: Record<string, T[]>;
  cardKey: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  /** Grid columns per breakpoint — defaults to the incorporations 5-column layout. */
  colsClass?: string;
}) {
  return (
    <div className={`grid grid-cols-1 ${colsClass || 'md:grid-cols-3 xl:grid-cols-5'} gap-3 items-start`}>
      {columns.map(col => {
        const items = groups[col.key] || [];
        return (
          <div key={col.key} className="bg-slate-50/80 border border-slate-200 rounded-xl">
            <header className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200/70">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F1E3A]">
                <span className={`w-1.5 h-1.5 rounded-full ${col.dotClass}`} />{col.label}
              </span>
              <span className="text-[11px] font-semibold text-slate-400 tabular-nums">{items.length}</span>
            </header>
            <div className="p-2 space-y-2 min-h-[72px]">
              {items.map(item => <React.Fragment key={cardKey(item)}>{renderCard(item)}</React.Fragment>)}
              {!items.length && <p className="text-[11px] text-slate-300 text-center py-4">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The attention-first banner (rejected/declined/etc. lead the page). */
export function AttentionBanner({ icon: Icon, title, tone = 'rose', children }: {
  icon: any; title: string; tone?: 'rose' | 'amber'; children: React.ReactNode;
}) {
  const cls = tone === 'rose'
    ? { box: 'border-rose-200 bg-rose-50/70', icon: 'text-rose-600', title: 'text-rose-800' }
    : { box: 'border-amber-200 bg-amber-50/70', icon: 'text-amber-600', title: 'text-amber-800' };
  return (
    <div className={`border rounded-xl p-4 ${cls.box}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <Icon size={16} className={cls.icon} />
        <h4 className={`text-sm font-semibold ${cls.title}`}>{title}</h4>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
