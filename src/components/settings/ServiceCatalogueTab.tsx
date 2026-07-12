import React, { useState } from 'react';
import { AlertTriangle, BookOpen, Loader2, Pencil, Plus, PoundSterling, Sparkles, Trash2, X } from 'lucide-react';
import {
  CatalogueService, createCatalogueService, deactivateCatalogueService,
  seedStandardServices, updateCatalogueService, useCatalogue, useServiceLibrary,
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

/**
 * Suggested scope copy for common services — this text becomes each service's
 * own "Scope of work" section on the proposal, so it should read like a
 * promise, not a label. Matched loosely on the service name/code.
 */
const SCOPE_SUGGESTIONS: Array<{ match: RegExp; text: string }> = [
  { match: /account/i, text: 'We prepare your statutory year-end accounts from your records, walk you through the numbers in plain English before anything is filed, and submit them to Companies House and HMRC on time. You get a clear picture of how the business performed — not just a compliance document.' },
  { match: /bookkeep/i, text: 'We keep your books current so you always know where you stand: transactions processed and categorised, bank accounts reconciled monthly, and queries chased while they\'re still fresh. Clean books mean faster year-ends, better decisions and no January surprises.' },
  { match: /payroll/i, text: 'We run your payroll end to end: payslips, RTI submissions to HMRC, pension auto-enrolment, starters and leavers, and year-end P60s. Your team is paid correctly and on time, every time — you just approve the run.' },
  { match: /vat/i, text: 'We prepare and file your VAT returns under Making Tax Digital, check you\'re on the best scheme for the business, and review the numbers for anything unusual before submission — so the return is right first time and there\'s nothing waiting to unwind later.' },
  { match: /corporation tax|ct600|\bct\b/i, text: 'We prepare your corporation tax computation and CT600, claim every relief and allowance you\'re entitled to, and file with HMRC ahead of the deadline. You\'ll know your liability months before it\'s due — with time to plan for it.' },
  { match: /self.?assessment|personal tax|\bsa\b/i, text: 'We prepare and file your personal Self Assessment return, make sure every allowable expense and relief is claimed, and tell you exactly what to pay and when. No forms, no HMRC portal wrestling — just a summary you can read in five minutes.' },
  { match: /secretarial|confirmation/i, text: 'We keep your company\'s statutory records straight: the annual confirmation statement, register updates, share and officer changes filed correctly and on time — the housekeeping that keeps Companies House happy without you thinking about it.' },
  { match: /management account/i, text: 'Monthly or quarterly management accounts that tell you what\'s actually happening: profit, cash, and the trends behind them, with a short commentary in plain English. The numbers you\'d want before making your next decision.' },
];
const suggestScopeFor = (name?: string, code?: string): string | null =>
  SCOPE_SUGGESTIONS.find(s => s.match.test(`${name || ''} ${code || ''}`))?.text || null;

export function ServiceCatalogueTab() {
  const { services, isLoading, mutate } = useCatalogue(false);
  const { library } = useServiceLibrary();
  const [editing, setEditing] = useState<Partial<CatalogueService> | null>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const seed = async () => {
    if (seeding || !window.confirm('Add the standard UK accountancy services to your catalogue? Existing services are left untouched; prices are left for you to set.')) return;
    setSeeding(true); setError(null);
    try { const r = await seedStandardServices(); await mutate(); setError(null); window.alert(`Added ${r.added} service${r.added === 1 ? '' : 's'}${r.skipped ? ` (${r.skipped} already present)` : ''}. Set their prices next.`); }
    catch (e: any) { setError(errMsg(e)); }
    finally { setSeeding(false); }
  };

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

  // Match a catalogue row to a library entry by code OR normalised name (so a
  // pre-library row like code "101" name "Bookkeeping" still matches).
  const norm = (s?: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const libMatch = (svc: CatalogueService) => library.find(l => l.code === svc.code || norm(l.name) === norm(svc.name));
  const fillFromLibrary = async (svc: CatalogueService) => {
    const lib = libMatch(svc); if (!lib) return;
    try { await updateCatalogueService(svc.id, { default_scope_text: lib.description }); await mutate(); }
    catch (e: any) { setError(errMsg(e)); }
  };

  if (isLoading) return <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading catalogue…</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">Service catalogue</h3>
          <p className="text-sm text-slate-500">Your pricing matrix — consistent prices across every proposal.</p>
        </div>
        <div className="flex items-center gap-2">
          {!services.length && (
            <button onClick={seed} disabled={seeding} className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50">
              {seeding ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}Seed standard services
            </button>
          )}
          <button onClick={() => setEditing({ ...EMPTY })} className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
            <Plus size={15} />Add service
          </button>
        </div>
      </div>
      {!!services.length && (
        <button onClick={seed} disabled={seeding} className="text-xs font-medium text-blue-700 hover:underline inline-flex items-center gap-1.5">
          {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}Add any missing standard services
        </button>
      )}
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
              {!svc.default_scope_text?.trim() && (
                <p className="mt-1 text-[11px] text-amber-600 inline-flex items-center gap-1.5">
                  <AlertTriangle size={11} />No description — this service renders without scope copy on proposals.
                  {libMatch(svc) && <button onClick={() => fillFromLibrary(svc)} className="text-blue-700 font-medium hover:underline">Fill from library</button>}
                </p>
              )}
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
              {!editing.id && !!library.length && (
                <L label="Start from library" help="Pre-fills the name, frequency and a professional description. You set the price.">
                  <div className="relative">
                    <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <select className={`${field} pl-9`} value=""
                      onChange={e => { const lib = library.find(l => l.code === e.target.value); if (lib) setEditing({ ...editing, code: lib.code, name: lib.name, frequency: lib.frequency, default_scope_text: lib.description }); }}>
                      <option value="">— choose a standard service —</option>
                      {library.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                    </select>
                  </div>
                </L>
              )}
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
                <L label="VAT rate %" help="Blank = your firm's default rate.">
                  <input type="number" min={0} max={100} step="0.5" value={editing.vat_rate == null ? '' : String(editing.vat_rate)}
                    onChange={e => setEditing({ ...editing, vat_rate: e.target.value === '' ? null : Number(e.target.value) })}
                    placeholder="default" className={`${field} tabular-nums`} />
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

              <L label="Default scope text" help="Becomes this service's own 'Scope of work' section on every proposal — write it like a promise (what we do, what's included, what we need from you).">
                <textarea value={editing.default_scope_text || ''} onChange={e => setEditing({ ...editing, default_scope_text: e.target.value })} rows={4} className={`${field} resize-none`} />
                {!editing.default_scope_text && suggestScopeFor(editing.name, editing.code) && (
                  <button type="button" onClick={() => setEditing({ ...editing, default_scope_text: suggestScopeFor(editing.name, editing.code)! })}
                    className="mt-1.5 text-xs font-medium text-blue-700 hover:underline">
                    Insert suggested scope for “{editing.name}”
                  </button>
                )}
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
