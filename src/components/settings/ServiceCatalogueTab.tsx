import React, { useState } from 'react';
import { Loader2, Pencil, Plus, PoundSterling, Trash2, X } from 'lucide-react';
import {
  CatalogueService, createCatalogueService, deactivateCatalogueService, updateCatalogueService, useCatalogue,
} from '../../hooks/useProposals';
import { errMsg } from '../../lib/errMsg';

/**
 * Service Catalogue — the practice's Core Pricing Matrix (Practice Settings).
 * Fixed / per-unit / turnover-band pricing, frequency, the default scope text
 * that flows into proposals and engagement-letter schedules. Delete =
 * soft-deactivate (sent proposals keep their price snapshots).
 */

const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400';
const money = (pence: any) => '£' + (Number(pence || 0) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2 });
const FREQ_LABEL: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual', one_off: 'One-off' };

interface Band { min_pence: number; max_pence: number | null; price_pence: number }

const EMPTY = {
  code: '', name: '', description: '', pricing_model: 'fixed' as const,
  fixed_price_pence: 0, unit_label: '', unit_price_pence: 0,
  bands: [] as Band[], frequency: 'monthly' as const, default_scope_text: '',
};

export function ServiceCatalogueTab() {
  const { services, isLoading, mutate } = useCatalogue(false);
  const [editing, setEditing] = useState<Partial<CatalogueService> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!editing || busy) return;
    setBusy(true); setError(null);
    try {
      const payload = { ...editing, bands: editing.pricing_model === 'turnover_band' ? editing.bands : null };
      if (editing.id) await updateCatalogueService(editing.id, payload);
      else await createCatalogueService(payload);
      await mutate();
      setEditing(null);
    } catch (e: any) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  const deactivate = async (svc: CatalogueService) => {
    if (!window.confirm(`Deactivate "${svc.name}"? Existing proposals keep their snapshot; it just stops being offerable.`)) return;
    try { await deactivateCatalogueService(svc.id); await mutate(); } catch (e: any) { setError(errMsg(e)); }
  };

  if (isLoading) return <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading catalogue…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Service catalogue</h3>
          <p className="text-sm text-slate-500">Your pricing matrix — consistent prices across every proposal.</p>
        </div>
        <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
          <Plus size={15} />Add service
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
        {services.map(svc => (
          <div key={svc.id} className={`flex items-center gap-3 px-4 py-3 ${!svc.is_active ? 'opacity-50' : ''}`}>
            <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0"><PoundSterling size={14} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900">{svc.name} {!svc.is_active && <span className="text-[11px] font-normal text-slate-400">(inactive)</span>}</p>
              <p className="text-xs text-slate-400">
                <span className="font-mono">{svc.code}</span> · {FREQ_LABEL[svc.frequency]} ·{' '}
                {svc.pricing_model === 'fixed' && `${money(svc.fixed_price_pence)} fixed`}
                {svc.pricing_model === 'per_unit' && `${money(svc.unit_price_pence)} per ${svc.unit_label || 'unit'}`}
                {svc.pricing_model === 'turnover_band' && `${(svc.bands || []).length} turnover bands`}
              </p>
            </div>
            <button onClick={() => setEditing({ ...svc, bands: svc.bands || [] })} className="p-2 text-slate-400 hover:text-blue-600"><Pencil size={15} /></button>
            {svc.is_active && <button onClick={() => deactivate(svc)} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>}
          </div>
        ))}
        {!services.length && <p className="px-4 py-8 text-center text-sm text-slate-400">No services yet — add your first line item.</p>}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-base font-bold text-[#0F1E3A]">{editing.id ? 'Edit service' : 'New service'}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
            <div className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3.5">
                <L label="Name"><input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} className={field} /></L>
                <L label="Code" help="Stable id, e.g. annual_accounts">
                  <input value={editing.code || ''} onChange={e => setEditing({ ...editing, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') })} disabled={!!editing.id} className={`${field} font-mono ${editing.id ? 'opacity-60' : ''}`} />
                </L>
                <L label="Pricing model">
                  <select value={editing.pricing_model} onChange={e => setEditing({ ...editing, pricing_model: e.target.value as any })} className={field}>
                    <option value="fixed">Fixed price</option>
                    <option value="per_unit">Per unit</option>
                    <option value="turnover_band">Turnover bands</option>
                  </select>
                </L>
                <L label="Frequency">
                  <select value={editing.frequency} onChange={e => setEditing({ ...editing, frequency: e.target.value as any })} className={field}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option><option value="one_off">One-off</option>
                  </select>
                </L>
              </div>

              {editing.pricing_model === 'fixed' && (
                <L label="Price (£)">
                  <input type="number" min={0} step="0.01" value={Number(editing.fixed_price_pence || 0) / 100 || ''} onChange={e => setEditing({ ...editing, fixed_price_pence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
                </L>
              )}
              {editing.pricing_model === 'per_unit' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <L label="Unit label" help="e.g. transactions/month, employees">
                    <input value={editing.unit_label || ''} onChange={e => setEditing({ ...editing, unit_label: e.target.value })} className={field} />
                  </L>
                  <L label="Price per unit (£)">
                    <input type="number" min={0} step="0.01" value={Number(editing.unit_price_pence || 0) / 100 || ''} onChange={e => setEditing({ ...editing, unit_price_pence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
                  </L>
                </div>
              )}
              {editing.pricing_model === 'turnover_band' && (
                <BandsEditor bands={(editing.bands as Band[]) || []} onChange={bands => setEditing({ ...editing, bands })} />
              )}

              <L label="Default scope text" help="Shown on proposals and in the engagement letter's service schedule.">
                <textarea value={editing.default_scope_text || ''} onChange={e => setEditing({ ...editing, default_scope_text: e.target.value })} rows={2} className={`${field} resize-none`} />
              </L>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={save} disabled={busy || !editing.name?.trim() || !editing.code?.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2">
                  {busy && <Loader2 size={14} className="animate-spin" />}Save service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function L({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
      {help && <p className="text-[11px] text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

function BandsEditor({ bands, onChange }: { bands: Band[]; onChange: (b: Band[]) => void }) {
  const set = (i: number, next: Partial<Band>) => onChange(bands.map((b, n) => (n === i ? { ...b, ...next } : b)));
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 mb-1.5">Turnover bands (annual, £) <span className="text-slate-400 font-normal">— leave the last “to” empty for open-ended</span></p>
      <div className="space-y-2">
        {bands.map((b, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
            <input type="number" min={0} placeholder="from" value={b.min_pence / 100 || 0} onChange={e => set(i, { min_pence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
            <input type="number" min={0} placeholder="to (empty = ∞)" value={b.max_pence == null ? '' : b.max_pence / 100} onChange={e => set(i, { max_pence: e.target.value === '' ? null : Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
            <input type="number" min={0} step="0.01" placeholder="price £" value={b.price_pence / 100 || ''} onChange={e => set(i, { price_pence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
            <button onClick={() => onChange(bands.filter((_x, n) => n !== i))} className="p-1.5 text-slate-400 hover:text-rose-600"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <button onClick={() => onChange([...bands, { min_pence: bands.length ? (bands[bands.length - 1].max_pence ?? 0) + 1 : 0, max_pence: null, price_pence: 0 }])}
        className="mt-2 text-xs font-medium text-blue-700 hover:underline">+ Add band</button>
    </div>
  );
}
