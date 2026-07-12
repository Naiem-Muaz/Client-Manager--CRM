import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Ban, BellRing, CheckCircle2, Eye, Loader2, Plus, Save, Search, Send, Trash2, X, XCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { btnGhost, btnPrimary, SectionCard } from '../components/sponsor/ui';
import { field } from '../components/sponsor/fields';
import {
  CatalogueService, Prospect, createProspect, remindProposal, sendProposal, updateProposal,
  useCatalogue, useProposal, useProspects, withdrawProposal,
} from '../hooks/useProposals';
import { searchCompanies, CompanySearchResult } from '../api/companiesHouse';
import { useFirmSettings } from '../hooks/useFirmSettings';
import { ProposalContent } from './ProposalPage';
import { errMsg } from '../lib/errMsg';

/**
 * Proposal builder — /proposals/:id (and /proposals/new via NewProposalPage).
 * Catalogue picker with per-model driver inputs, ad-hoc lines, live totals
 * MIRRORING services/proposals/pricing.ts (display only — the server is
 * authoritative and recomputes on save), intro/scope, valid-until, a
 * faithful preview (the SAME ProposalContent the prospect sees), then Send.
 * State machine respected: draft editable; sent/viewed read-only with
 * Remind/Withdraw; withdrawn editable (reopens to draft); accepted/declined
 * locked with the evidence + outcome.
 */

// ── local pricing mirror (display only; matches services/proposals/pricing.ts) ──
type Freq = 'monthly' | 'quarterly' | 'annual' | 'one_off';
const ANNUALISE: Record<Freq, number> = { monthly: 12, quarterly: 4, annual: 1, one_off: 0 };
const money = (pence: number) => '£' + (pence / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FREQ_SHORT: Record<Freq, string> = { monthly: '/mo', quarterly: '/qtr', annual: '/yr', one_off: 'one-off' };

interface DraftItem {
  catalogueServiceId: string | null;
  code: string; name: string; scopeText: string;
  pricingModel: 'fixed' | 'per_unit' | 'turnover_band';
  frequency: Freq;
  quantity: number;          // per_unit driver
  turnoverPence: number;     // turnover_band driver
  unitPricePence: number;    // ad-hoc price / display for catalogue lines
  unitLabel?: string | null;
  bands?: CatalogueService['bands'];
}

function lineTotal(it: DraftItem): number {
  if (it.pricingModel === 'per_unit') return Math.round(Number(it.unitPricePence) * (Number(it.quantity) || 0));
  if (it.pricingModel === 'turnover_band') {
    const band = (it.bands || []).find(b => it.turnoverPence >= (b.min_pence ?? 0) && (b.max_pence == null || it.turnoverPence <= b.max_pence));
    return band ? Number(band.price_pence) : 0;
  }
  return Math.round(Number(it.unitPricePence) || 0);
}
const applyDiscount = (pence: number, d: number | null) =>
  d && d > 0 ? (d >= 100 ? 0 : Math.round(pence * (100 - d) / 100)) : pence;

export function ProposalBuilderPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { proposal, isLoading, mutate } = useProposal(id);
  const { services } = useCatalogue(true);
  const { firm } = useFirmSettings();

  const [title, setTitle] = useState('');
  const [intro, setIntro] = useState('');
  const [scope, setScope] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [discount, setDiscount] = useState<string>('');
  const [items, setItems] = useState<DraftItem[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [preview, setPreview] = useState(false);
  const [sentInfo, setSentInfo] = useState<{ url: string; emailSent: boolean } | null>(null);

  useEffect(() => {
    if (proposal && !dirty) {
      setTitle(proposal.title || '');
      setIntro(proposal.introMd || '');
      setScope(proposal.scopeMd || '');
      setValidUntil(proposal.validUntil ? String(proposal.validUntil).slice(0, 10) : '');
      setDiscount(proposal.discountPercent != null ? String(proposal.discountPercent) : '');
      setItems((proposal.items || []).map((i: any) => ({
        catalogueServiceId: i.catalogue_service_id,
        code: i.code, name: i.name, scopeText: i.scope_text || '',
        pricingModel: i.pricing_model, frequency: i.frequency,
        quantity: Number(i.quantity) || 1,
        turnoverPence: 0, // band lines re-resolve on edit; stored price shown below
        unitPricePence: Number(i.unit_price_pence) || 0,
        bands: services.find(s => s.id === i.catalogue_service_id)?.bands || undefined,
      })));
    }
  }, [proposal]); // eslint-disable-line react-hooks/exhaustive-deps

  if (user && user.role === 'client') return <Navigate to="/" replace />;

  const status = proposal?.status || 'draft';
  const editable = ['draft', 'withdrawn'].includes(proposal?.storedStatus || 'draft');
  const discountNum = discount === '' ? null : Number(discount);

  const totals = useMemo(() => {
    let monthly = 0, annual = 0, oneoff = 0;
    for (const it of items) {
      const line = lineTotal(it);
      if (it.frequency === 'one_off') oneoff += line;
      else { if (it.frequency === 'monthly') monthly += line; annual += line * ANNUALISE[it.frequency]; }
    }
    return {
      monthly: applyDiscount(monthly, discountNum),
      annual: applyDiscount(annual, discountNum),
      oneoff: applyDiscount(oneoff, discountNum),
    };
  }, [items, discountNum]);

  const say = (kind: 'ok' | 'err', text: string) => { setFlash({ kind, text }); setTimeout(() => setFlash(null), 4500); };
  const touch = () => setDirty(true);

  const save = async (): Promise<boolean> => {
    if (!id) return false;
    setBusy('save');
    try {
      await updateProposal(id, {
        title: title.trim(), introMd: intro, scopeMd: scope,
        validUntil: validUntil || null,
        discountPercent: discount === '' ? null : Number(discount),
        items: items.map(it => it.catalogueServiceId
          ? { catalogueServiceId: it.catalogueServiceId, quantity: it.quantity, turnoverPence: it.turnoverPence || undefined, scopeText: it.scopeText || undefined }
          : { code: it.code, name: it.name, unitPricePence: it.unitPricePence, quantity: it.quantity, frequency: it.frequency, scopeText: it.scopeText || undefined }),
      });
      setDirty(false);
      await mutate();
      return true;
    } catch (e: any) { say('err', errMsg(e)); return false; }
    finally { setBusy(null); }
  };

  const send = async () => {
    if (!id || busy) return;
    if (dirty && !(await save())) return;
    if (!window.confirm('Send this proposal to the prospect now?')) return;
    setBusy('send');
    try {
      const r = await sendProposal(id);
      setSentInfo({ url: r.url, emailSent: r.emailSent });
      await mutate();
      say('ok', r.emailSent ? 'Sent — the prospect has the link.' : 'Marked sent — email failed, share the link manually.');
    } catch (e: any) { say('err', errMsg(e)); }
    finally { setBusy(null); }
  };

  const doWithdraw = async () => {
    if (!id || !window.confirm('Withdraw this proposal? The public link stops rendering until you edit and re-send.')) return;
    setBusy('withdraw');
    try { await withdrawProposal(id); await mutate(); say('ok', 'Withdrawn.'); }
    catch (e: any) { say('err', errMsg(e)); }
    finally { setBusy(null); }
  };

  const doRemind = async () => {
    if (!id) return;
    setBusy('remind');
    try { const r = await remindProposal(id); say('ok', r.emailSent ? 'Reminder sent.' : 'Reminder email failed — share the link manually.'); }
    catch (e: any) { say('err', errMsg(e)); }
    finally { setBusy(null); }
  };

  if (isLoading || !proposal) {
    return <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">{isLoading ? <><Loader2 size={16} className="animate-spin" />Loading…</> : 'Proposal not found.'}</div>;
  }

  // Faithful preview payload — the exact shape the public page receives.
  // VAT mirrors the server: firm-default rate applied when the firm is
  // registered (the server resolves per-item; a flat firm rate is the preview
  // approximation). pv() = VAT on a discounted-net bucket.
  const previewVatRate = (firm as any)?.vat_registered === false ? 0 : Number((firm as any)?.default_vat_rate ?? 20);
  const pv = (net: number) => Math.round(net * previewVatRate / 100);
  const previewPayload: any = {
    status: 'viewed',
    title, introMd: intro, scopeMd: scope,
    items: items.map(it => ({
      name: it.name, scope_text: it.scopeText, pricing_model: it.pricingModel,
      quantity: it.quantity, unit_price_pence: it.unitPricePence, line_total_pence: lineTotal(it), frequency: it.frequency,
      vat_rate: previewVatRate,
    })),
    discountPercent: discountNum,
    monthlyTotalPence: totals.monthly, annualTotalPence: totals.annual, oneoffTotalPence: totals.oneoff,
    monthlyVatPence: pv(totals.monthly), monthlyGrossPence: totals.monthly + pv(totals.monthly),
    annualVatPence: pv(totals.annual), annualGrossPence: totals.annual + pv(totals.annual),
    oneoffVatPence: pv(totals.oneoff), oneoffGrossPence: totals.oneoff + pv(totals.oneoff),
    validUntil: validUntil || null,
    prospect: { name: proposal.prospect?.contact_name || null, company: proposal.prospect?.company_name || null },
    firm: { name: firm?.name || 'Your practice', logoUrl: (firm as any)?.logo_url || null, accentColor: (firm as any)?.brand_accent_color || null, phone: (firm as any)?.phone || null },
  };
  const accent = (firm as any)?.brand_accent_color && /^#[0-9a-fA-F]{6}$/.test((firm as any).brand_accent_color)
    ? (firm as any).brand_accent_color : '#1a365d';

  return (
    <div className="p-6 max-w-[1100px] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button onClick={() => navigate('/proposals')} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-1">
            <ArrowLeft size={13} />Proposals
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-[#0F1E3A] truncate">{title || proposal.title}</h3>
            <StatusChip status={status} />
          </div>
          <p className="text-sm text-slate-400 mt-0.5">
            {proposal.prospect?.contact_name}{proposal.prospect?.company_name ? ` — ${proposal.prospect.company_name}` : ''} · {proposal.prospect?.email}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {flash && <span className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${flash.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{flash.text}</span>}
          <button onClick={() => setPreview(true)} className={btnGhost}><Eye size={15} />Preview</button>
          {editable && (
            <>
              <button onClick={save} disabled={!dirty || busy === 'save'} className={btnGhost}>
                {busy === 'save' ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{dirty ? 'Save' : 'Saved'}
              </button>
              <button onClick={send} disabled={!!busy || !items.length} className={btnPrimary}>
                {busy === 'send' ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Send proposal
              </button>
            </>
          )}
          {['sent', 'viewed'].includes(proposal.storedStatus) && (
            <>
              <button onClick={doRemind} disabled={!!busy} className={btnGhost}><BellRing size={15} />Remind</button>
              <button onClick={doWithdraw} disabled={!!busy} className={btnGhost}><Ban size={15} />Withdraw</button>
            </>
          )}
        </div>
      </div>

      {sentInfo && (
        <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          Sent. Public link: <a className="underline font-medium break-all" href={sentInfo.url} target="_blank" rel="noreferrer">{sentInfo.url}</a>
          {!sentInfo.emailSent && <span className="text-amber-700 font-medium"> — the email failed; share this link manually.</span>}
        </div>
      )}

      {/* Locked outcome view */}
      {proposal.locked && (
        <div className={`px-4 py-3.5 rounded-xl border ${status === 'accepted' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          {status === 'accepted' ? (
            <div className="text-sm text-emerald-900">
              <p className="font-semibold flex items-center gap-1.5"><CheckCircle2 size={15} />Accepted by {proposal.acceptedByName}</p>
              <div className="mt-1.5 text-emerald-800 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {proposal.clientId && <a className="underline font-medium" href={`/clients/${proposal.clientId}`}>Open the client record →</a>}
                {proposal.engagementId && <span>Engagement letter sent ✓</span>}
                {proposal.gcMandateStatus && <span>Direct debit: {proposal.gcMandateStatus}</span>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-rose-800 flex items-center gap-1.5"><XCircle size={15} />Declined{(proposal as any).declineReason ? ` — “${(proposal as any).declineReason}”` : ''}. Locked with the acceptance-evidence standard; duplicate it to re-propose.</p>
          )}
        </div>
      )}
      {!editable && !proposal.locked && (
        <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          This proposal is <span className="font-semibold">{status}</span> — read-only. Withdraw it to edit and re-send.
        </div>
      )}

      <fieldset disabled={!editable} className={editable ? '' : 'opacity-70 pointer-events-none'}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            <SectionCard title="Proposal" subtitle="Title, intro and validity">
              <div className="space-y-4">
                <Labelled label="Title"><input value={title} onChange={e => { setTitle(e.target.value); touch(); }} className={field} /></Labelled>
                <Labelled label="Intro" help="The opening the prospect reads first — warm, specific, short.">
                  <textarea value={intro} onChange={e => { setIntro(e.target.value); touch(); }} rows={3} className={`${field} resize-none`} />
                </Labelled>
                <div className="grid grid-cols-2 gap-4">
                  <Labelled label="Valid until" help={validUntil && !/^20\d{2}-/.test(validUntil) ? 'Check the year — enter it in full (e.g. 2027).' : undefined}>
                    {/* min today + max +20y: an <input type=date> otherwise accepts a
                        2-digit year (26 → 0026) that reads as instantly expired. */}
                    <input type="date" value={validUntil}
                      min={new Date().toISOString().slice(0, 10)}
                      max={`${new Date().getUTCFullYear() + 20}-12-31`}
                      onChange={e => { setValidUntil(e.target.value); touch(); }}
                      className={`${field} ${validUntil && !/^20\d{2}-/.test(validUntil) ? 'border-amber-400 ring-1 ring-amber-200' : ''}`} />
                  </Labelled>
                  <Labelled label="Discount %"><input type="number" min={0} max={100} step="0.01" value={discount} onChange={e => { setDiscount(e.target.value); touch(); }} placeholder="none" className={`${field} tabular-nums`} /></Labelled>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Services" subtitle="Each service's scope text becomes its own 'Scope of work' section on the proposal — 2–3 sentences per service reads best">
              <ItemsEditor items={items} setItems={(next) => { setItems(next); touch(); }} services={services} />
            </SectionCard>

            <SectionCard title="Scope & notes" subtitle="Assumptions, exclusions, review terms">
              <textarea value={scope} onChange={e => { setScope(e.target.value); touch(); }} rows={4} className={`${field} resize-none`} />
            </SectionCard>
          </div>

          {/* Live totals rail */}
          <div className="sticky top-2 space-y-3">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <header className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <h4 className="text-sm font-semibold text-[#0F1E3A]">Live totals</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Mirror only — the server reprices on save.</p>
              </header>
              <div className="p-4 space-y-2.5 text-sm">
                <div className="flex justify-between"><span className="text-slate-500">Monthly</span><span className="font-bold tabular-nums" style={{ color: accent }}>{money(totals.monthly)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Annual</span><span className="font-semibold tabular-nums text-slate-800">{money(totals.annual)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">One-off</span><span className="font-semibold tabular-nums text-slate-800">{money(totals.oneoff)}</span></div>
                {discountNum ? <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-100">Includes {discountNum}% discount.</p> : null}
              </div>
            </div>
          </div>
        </div>
      </fieldset>

      {preview && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 overflow-y-auto" onClick={() => setPreview(false)}>
          <div className="min-h-screen py-6 px-4">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-end mb-2">
                <button onClick={() => setPreview(false)} className="px-3 py-1.5 rounded-lg bg-white/90 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 shadow"><X size={13} />Close preview</button>
              </div>
              <div className="bg-slate-50 rounded-2xl shadow-2xl overflow-hidden" style={{ borderTop: `4px solid ${accent}` }} onClick={e => e.stopPropagation()}>
                <div className="px-5 sm:px-8 pb-10">
                  <ProposalContent d={previewPayload} accent={accent} showValidity showNextSteps />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const META: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-50 text-blue-700', viewed: 'bg-indigo-50 text-indigo-700',
    accepted: 'bg-emerald-50 text-emerald-700', declined: 'bg-rose-50 text-rose-700',
    expired: 'bg-amber-50 text-amber-700', withdrawn: 'bg-slate-100 text-slate-400',
  };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${META[status] || META.draft}`}>{status.replace(/_/g, ' ')}</span>;
}

function Labelled({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
      {help && <p className="text-[11px] text-slate-400 mt-1">{help}</p>}
    </div>
  );
}

// ── items editor ──────────────────────────────────────────────────────────────
function ItemsEditor({ items, setItems, services }: {
  items: DraftItem[]; setItems: (next: DraftItem[]) => void; services: CatalogueService[];
}) {
  const [adding, setAdding] = useState(false);
  const update = (i: number, next: Partial<DraftItem>) => setItems(items.map((x, n) => (n === i ? { ...x, ...next } : x)));

  const addFromCatalogue = (svc: CatalogueService) => {
    setItems([...items, {
      catalogueServiceId: svc.id, code: svc.code, name: svc.name, scopeText: svc.default_scope_text || '',
      pricingModel: svc.pricing_model, frequency: svc.frequency,
      quantity: 1, turnoverPence: 0,
      unitPricePence: Number(svc.pricing_model === 'fixed' ? svc.fixed_price_pence : svc.unit_price_pence) || 0,
      unitLabel: svc.unit_label, bands: svc.bands || undefined,
    }]);
    setAdding(false);
  };
  const addAdHoc = () => {
    setItems([...items, {
      catalogueServiceId: null, code: 'ad_hoc', name: '', scopeText: '',
      pricingModel: 'fixed', frequency: 'monthly', quantity: 1, turnoverPence: 0, unitPricePence: 0,
    }]);
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="border border-slate-200 rounded-xl px-4 py-3 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {it.catalogueServiceId
                ? <p className="text-sm font-semibold text-[#0F1E3A]">{it.name} <span className="text-[11px] text-slate-400 font-normal">({it.pricingModel.replace('_', ' ')}, {FREQ_SHORT[it.frequency]})</span></p>
                : <input value={it.name} onChange={e => update(i, { name: e.target.value })} placeholder="Ad-hoc line name" className={field} />}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold tabular-nums text-slate-800">{money(lineTotal(it))}</p>
              <p className="text-[10px] text-slate-400">{FREQ_SHORT[it.frequency]}</p>
            </div>
            <button onClick={() => setItems(items.filter((_x, n) => n !== i))} className="p-1.5 text-slate-400 hover:text-rose-600 flex-shrink-0"><Trash2 size={14} /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {it.pricingModel === 'per_unit' && (
              <Labelled label={it.unitLabel || 'Quantity'}>
                <input type="number" min={0.01} step="0.01" value={it.quantity} onChange={e => update(i, { quantity: Number(e.target.value) })} className={`${field} tabular-nums`} />
              </Labelled>
            )}
            {it.pricingModel === 'turnover_band' && (
              <Labelled label="Annual turnover (£)" help="The band resolves automatically.">
                <input type="number" min={0} value={it.turnoverPence / 100 || ''} onChange={e => update(i, { turnoverPence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
              </Labelled>
            )}
            {!it.catalogueServiceId && (
              <>
                <Labelled label="Price (£)">
                  <input type="number" min={0} step="0.01" value={it.unitPricePence / 100 || ''} onChange={e => update(i, { unitPricePence: Math.round(Number(e.target.value) * 100) })} className={`${field} tabular-nums`} />
                </Labelled>
                <Labelled label="Frequency">
                  <select value={it.frequency} onChange={e => update(i, { frequency: e.target.value as Freq })} className={field}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option><option value="one_off">One-off</option>
                  </select>
                </Labelled>
              </>
            )}
            <div className={it.catalogueServiceId && it.pricingModel === 'fixed' ? 'sm:col-span-3' : 'sm:col-span-2'}>
              <Labelled label="Scope shown to the prospect">
                <input value={it.scopeText} onChange={e => update(i, { scopeText: e.target.value })} className={field} />
              </Labelled>
            </div>
          </div>
        </div>
      ))}

      {!adding ? (
        <button onClick={() => setAdding(true)} className={btnGhost}><Plus size={15} />Add service</button>
      ) : (
        <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-600">From your catalogue</p>
            <button onClick={() => setAdding(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={13} /></button>
          </div>
          {services.length ? services.map(svc => (
            <button key={svc.id} onClick={() => addFromCatalogue(svc)}
              className="w-full flex items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 text-left text-sm hover:border-blue-300">
              <span className="font-medium text-slate-800">{svc.name} <span className="text-[11px] text-slate-400 font-normal">({svc.pricing_model.replace('_', ' ')}, {FREQ_SHORT[svc.frequency]})</span></span>
              <span className="text-xs text-slate-500 tabular-nums">
                {svc.pricing_model === 'fixed' ? money(Number(svc.fixed_price_pence) || 0)
                  : svc.pricing_model === 'per_unit' ? `${money(Number(svc.unit_price_pence) || 0)}/${svc.unit_label || 'unit'}`
                  : 'by turnover'}
              </span>
            </button>
          )) : <p className="text-xs text-slate-400 px-1 py-2">No catalogue services yet — add them in Practice Settings → Service Catalogue.</p>}
          <button onClick={addAdHoc} className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-500 hover:bg-white border border-dashed border-slate-300">+ Ad-hoc line (name your own price)</button>
        </div>
      )}
    </div>
  );
}

// ── /proposals/new — prospect pick-or-create + title ─────────────────────────
export function NewProposalPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { prospects } = useProspects('open');
  const [mode, setMode] = useState<'pick' | 'create'>('pick');
  const [prospectId, setProspectId] = useState('');
  const [title, setTitle] = useState('Your accounting proposal');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [chResults, setChResults] = useState<CompanySearchResult[]>([]);
  const [chQuery, setChQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (chQuery.trim().length < 2) { setChResults([]); return; }
    const t = setTimeout(async () => {
      try { setChResults(await searchCompanies(chQuery.trim())); } catch { setChResults([]); }
    }, 400);
    return () => clearTimeout(t);
  }, [chQuery]);

  if (user && user.role === 'client') return <Navigate to="/" replace />;

  const go = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      let pid = prospectId;
      if (mode === 'create') {
        const created = await createProspect({
          contactName: contactName.trim(), email: email.trim(), phone: phone.trim() || undefined,
          companyName: companyName.trim() || undefined, companyNumber: companyNumber.trim() || undefined,
        });
        pid = created.id;
      }
      if (!pid) { setError('Pick or create a prospect first.'); return; }
      const { createProposal } = await import('../hooks/useProposals');
      const prop = await createProposal(pid, title.trim() || 'Your proposal');
      navigate(`/proposals/${prop.id}`);
    } catch (e: any) { setError(errMsg(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="p-6 max-w-xl space-y-5">
      <div>
        <button onClick={() => navigate('/proposals')} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-1"><ArrowLeft size={13} />Proposals</button>
        <h3 className="text-lg font-bold text-[#0F1E3A]">New proposal</h3>
        <p className="text-sm text-slate-400">Who is this for?</p>
      </div>

      <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm font-medium w-fit">
        {(['pick', 'create'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} className={`px-4 py-2 rounded-md transition-colors ${mode === m ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            {m === 'pick' ? 'Existing prospect' : 'New prospect'}
          </button>
        ))}
      </div>

      {mode === 'pick' ? (
        <Labelled label="Prospect">
          <select value={prospectId} onChange={e => setProspectId(e.target.value)} className={field}>
            <option value="">— choose —</option>
            {prospects.map(p => <option key={p.id} value={p.id}>{p.contact_name}{p.company_name ? ` — ${p.company_name}` : ''} ({p.email})</option>)}
          </select>
        </Labelled>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Labelled label="Contact name"><input value={contactName} onChange={e => setContactName(e.target.value)} className={field} /></Labelled>
            <Labelled label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></Labelled>
            <Labelled label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className={field} /></Labelled>
            <Labelled label="Company name"><input value={companyName} onChange={e => setCompanyName(e.target.value)} className={field} /></Labelled>
          </div>
          <Labelled label="Find the company (Companies House)" help="Picking a result prefills the company details on the prospect record.">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={chQuery} onChange={e => setChQuery(e.target.value)} placeholder="Search by name…" className={`${field} pl-8`} />
            </div>
            {!!chResults.length && (
              <ul className="mt-1.5 border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white max-h-52 overflow-y-auto">
                {chResults.map(r => (
                  <li key={r.company_number}>
                    <button onClick={() => { setCompanyName(r.company_name); setCompanyNumber(r.company_number); setChQuery(''); setChResults([]); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex justify-between gap-2">
                      <span className="text-slate-800">{r.company_name}</span>
                      <span className="font-mono text-xs text-slate-400">{r.company_number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {companyNumber && <p className="text-[11px] text-emerald-600 mt-1">Linked to company {companyNumber} — CH details prefill on create.</p>}
          </Labelled>
        </div>
      )}

      <Labelled label="Proposal title"><input value={title} onChange={e => setTitle(e.target.value)} className={field} /></Labelled>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <button onClick={go} disabled={busy || (mode === 'pick' ? !prospectId : !contactName.trim() || !email.trim())} className={btnPrimary}>
        {busy && <Loader2 size={15} className="animate-spin" />}Create draft
      </button>
    </div>
  );
}
