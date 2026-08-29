import React, { useState } from 'react';
import {
  Building2,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { lookupCompany, lookupOfficers, OfficerRow, CompanyInfo } from '../../api/companiesHouse';
import { updateClient, patchClient } from '../../hooks/useClients';

interface Props {
  client: {
    id: string;
    legalName?: string;
    companyNumber?: string;
    entityType?: string;
    chData?: CHSnapshot | null;
  };
  onUpdated?: () => void;
}

export interface CHSnapshot {
  company_number: string;
  company_name: string;
  company_status: string | null;
  company_type: string | null;
  registered_address: string | null;
  date_of_creation: string | null;
  sic_codes: string[];
  fetched_at: string;
  /**
   * ⚠️ THE STORED ch_data IS THE RAW COMPANIES HOUSE PAYLOAD, which carries more
   * than lookupCompany() maps. These are optional because a snapshot written
   * before this release has none of them — the card renders what is there and
   * says nothing about what is not.
   */
  accounts?: { next_due?: string | null; next_made_up_to?: string | null;
               accounting_reference_date?: { day?: string; month?: string } | null } | null;
  confirmation_statement?: { next_due?: string | null; next_made_up_to?: string | null } | null;
  officers?: OfficerRow[];
  officers_fetched_at?: string;
  officers_error?: string;
}

type PanelState = 'idle' | 'loading' | 'preview' | 'saving' | 'success' | 'error_not_found' | 'error_api' | 'error_save';

// Companies House returns a single registered-address string. Best-effort split into
// the canonical address columns (postcode detected via UK postcode pattern).
function parseAddress(addr: string | null | undefined): { line1: string | null; line2: string | null; city: string | null; postcode: string | null } {
  if (!addr) return { line1: null, line2: null, city: null, postcode: null };
  const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
  const ukPostcode = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  let postcode: string | null = null;
  if (parts.length && ukPostcode.test(parts[parts.length - 1])) postcode = parts.pop() as string;
  const city = parts.length ? parts.pop() as string : null;
  const line1 = parts.length ? parts.shift() as string : null;
  const line2 = parts.length ? parts.join(', ') : null;
  return { line1, line2, city, postcode };
}

function FieldDiff({ label, stored, fresh }: { label: string; stored?: string | null; fresh?: string | null }) {
  const changed = stored !== fresh && fresh !== undefined && fresh !== null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      {changed ? (
        <div className="space-y-1">
          {stored && (
            <p className="text-xs text-slate-400 line-through">{stored}</p>
          )}
          <p className="text-sm font-medium text-emerald-700">{fresh ?? '—'}</p>
        </div>
      ) : (
        <p className="text-sm text-slate-700">{stored ?? fresh ?? '—'}</p>
      )}
    </div>
  );
}

export function CompaniesHousePanel({ client, onUpdated }: Props) {
  const [state, setState] = useState<PanelState>('idle');
  const [freshData, setFreshData] = useState<CompanyInfo | null>(null);
  const [expanded, setExpanded] = useState(false);

  const stored = client.chData ?? null;
  const hasStored = !!stored;
  const companyNumber = client.companyNumber ?? '';
  const isDissolved = freshData?.company_status?.toLowerCase() === 'dissolved';

  const handleRefresh = async () => {
    if (!companyNumber) return;
    setState('loading');
    setFreshData(null);

    try {
      const info = await lookupCompany(companyNumber);
      if (!info) {
        setState('error_not_found');
        return;
      }
      setFreshData(info);
      setState('preview');
    } catch {
      setState('error_api');
    }
  };

  const handleConfirm = async () => {
    if (!freshData) return;
    setState('saving');

    /**
     * Officers come from a SECOND Companies House call, and it is allowed to
     * fail. Letting it abort the save would discard a good company profile
     * because a director list timed out — so the result is merged either way and
     * a failure is RECORDED as officers_error rather than shown as an empty
     * list. Same boundary the backend enrichment path draws.
     */
    const off = await lookupOfficers(freshData.company_number);
    const snapshot: CHSnapshot = {
      ...freshData,
      ...(off.officers ? { officers: off.officers, officers_fetched_at: new Date().toISOString() } : {}),
      ...(off.error ? { officers_error: off.error } : {}),
      fetched_at: new Date().toISOString(),
    };

    try {
      // Keep the display name fresh via the profile agent…
      await updateClient(client.id, { legalName: freshData.company_name });

      // …and persist Companies House data to the canonical client columns.
      const addr = parseAddress(freshData.registered_address);
      await patchClient(client.id, {
        company_number: freshData.company_number,
        incorporation_date: freshData.date_of_creation || null,
        company_status: freshData.company_status,
        company_type: freshData.company_type,
        sic_codes: freshData.sic_codes,
        address_line1: addr.line1,
        address_line2: addr.line2,
        city: addr.city,
        postcode: addr.postcode,
        ch_data: snapshot,
      });
      setState('success');
      setFreshData(null);
      onUpdated?.();
      setTimeout(() => setState('idle'), 3000);
    } catch {
      setState('error_save');
    }
  };

  const handleCancel = () => {
    setState('idle');
    setFreshData(null);
  };

  /**
   * ⛔ THE GATE THAT USED TO BE HERE NEVER PASSED.
   *
   *   if (entityType !== 'Company' && entityType !== 'Ltd' && entityType !== 'LLP') return null;
   *
   * The database stores `limited_company` — the CHECK on client_manager.clients
   * allows limited_company / sole_trader / partnership / llp / individual, and
   * 'Company' and 'Ltd' are not among them. All 36 clients with a company
   * number are stored as `limited_company`, so this component returned null for
   * every one of them and the panel has never rendered on production data.
   *
   * Removed rather than corrected: the caller already decides. ClientDetailsSection
   * switches on entityKey() and only mounts this for CH-registered entities, so a
   * second gate here could only ever disagree with the first.
   */

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 text-left hover:text-slate-900 transition-colors group"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
            <Building2 size={16} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Companies House</h3>
            {hasStored && stored ? (
              <p className="text-xs text-slate-400 mt-0.5">
                Last synced {new Date(stored.fetched_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-0.5">No sync yet</p>
            )}
          </div>
          {expanded ? <ChevronUp size={16} className="ml-2 text-slate-400" /> : <ChevronDown size={16} className="ml-2 text-slate-400" />}
        </button>

        <div className="flex items-center gap-2">
          {state === 'success' && (
            <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
              <Check size={14} /> Saved
            </span>
          )}
          {!companyNumber && (
            <span className="text-xs text-slate-400 italic">No company number on record</span>
          )}
          <button
            onClick={handleRefresh}
            disabled={!companyNumber || state === 'loading' || state === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw size={12} className={state === 'loading' ? 'animate-spin' : ''} />
            {state === 'loading' ? 'Fetching…' : 'Refresh from CH'}
          </button>
        </div>
      </div>

      {/* Collapsible stored data */}
      {expanded && (
        <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-3 gap-5 border-b border-slate-100 bg-slate-50/40">
          {hasStored && stored ? (
            <>
              <FieldDiff label="Registered Name"    stored={stored.company_name} />
              <FieldDiff label="Company Number"     stored={stored.company_number} />
              <FieldDiff label="Company Status"     stored={stored.company_status} />
              <FieldDiff label="Company Type"       stored={stored.company_type} />
              <FieldDiff label="Incorporation Date" stored={stored.date_of_creation} />
              <FieldDiff label="Registered Address" stored={stored.registered_address} />
              {stored.sic_codes?.length > 0 && (
                <div className="col-span-2 md:col-span-3 space-y-0.5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SIC Codes</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stored.sic_codes.map(code => (
                      <span key={code} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-xs font-mono text-slate-600">{code}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* ── Statutory dates. THE SAME VALUES THE DEADLINE ENGINE USES —
                   accounts.next_due and confirmation_statement.next_due are what
                   deriveAndGenerate reads to build CH_ACCOUNTS and
                   CH_CONFIRMATION. If this card and the Deadlines tab ever
                   disagree, one of them is reading a stale snapshot, and the
                   footer below says when this one was taken. */}
              {(stored.accounts || stored.confirmation_statement) && (
                <>
                  <FieldDiff label="Accounting Reference Date"
                    stored={stored.accounts?.accounting_reference_date
                      ? `${stored.accounts.accounting_reference_date.day} / ${stored.accounts.accounting_reference_date.month}`
                      : null} />
                  <FieldDiff label="Next Accounts Due"     stored={stored.accounts?.next_due ?? null} />
                  <FieldDiff label="Next Confirmation Due" stored={stored.confirmation_statement?.next_due ?? null} />
                </>
              )}
            </>
          ) : (
            <div className="col-span-3 text-sm text-slate-400 italic py-2">
              {companyNumber
                ? 'No Companies House data yet — use Refresh to pull it.'
                : 'Add a company number to enable Companies House lookup.'}
            </div>
          )}
        </div>
      )}

      {/* ── Officers ─────────────────────────────────────────────────────── */}
      {expanded && hasStored && stored && (
        <OfficersBlock
          officers={stored.officers}
          fetchedAt={stored.officers_fetched_at}
          error={stored.officers_error}
        />
      )}

      {/* ── Provenance. A snapshot with no date on it is a claim about now. ── */}
      {expanded && hasStored && stored && (
        <div className="px-6 py-3 border-t border-slate-100 bg-white flex items-center gap-2 text-[11px] text-slate-400">
          <Building2 size={11} />
          <span>
            From Companies House · fetched{' '}
            {new Date(stored.fetched_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            . Not editable here — correct it at Companies House, then Refresh.
          </span>
        </div>
      )}

      {/* Error states */}
      {state === 'error_not_found' && (
        <div className="mx-6 my-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Company not found</p>
            <p className="text-xs text-amber-700 mt-0.5">
              No result for company number <span className="font-mono">{companyNumber}</span>. Verify the CRN on the client record.
            </p>
            <button onClick={handleCancel} className="text-xs text-amber-700 underline mt-2 hover:text-amber-900 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {state === 'error_api' && (
        <div className="mx-6 my-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Companies House unreachable</p>
            <p className="text-xs text-red-700 mt-0.5">Check the backend proxy or network connectivity and try again.</p>
            <button onClick={handleCancel} className="text-xs text-red-700 underline mt-2 hover:text-red-900 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {state === 'error_save' && (
        <div className="mx-6 my-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Failed to save</p>
            <p className="text-xs text-red-700 mt-0.5">The update could not be saved to the backend. Please try again.</p>
            <button onClick={handleCancel} className="text-xs text-red-700 underline mt-2 hover:text-red-900 transition-colors">Dismiss</button>
          </div>
        </div>
      )}

      {/* Confirmation preview */}
      {(state === 'preview' || state === 'saving') && freshData && (
        <div className="mx-6 my-4 border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-blue-600" />
              <span className="text-sm font-bold text-slate-900">Confirm update from Companies House</span>
            </div>
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${freshData.company_number}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
            >
              View on CH <ExternalLink size={11} />
            </a>
          </div>

          {/* Dissolved warning */}
          {isDissolved && (
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 font-medium">
                This company is <strong>dissolved</strong>. You can still save the data, but check whether this client record should be archived.
              </p>
            </div>
          )}

          {/* Field diffs */}
          <div className="px-4 py-4 grid grid-cols-2 md:grid-cols-3 gap-5">
            <FieldDiff label="Registered Name"    stored={stored?.company_name}       fresh={freshData.company_name} />
            <FieldDiff label="Company Number"     stored={stored?.company_number}     fresh={freshData.company_number} />
            <FieldDiff label="Company Status"     stored={stored?.company_status}     fresh={freshData.company_status} />
            <FieldDiff label="Company Type"       stored={stored?.company_type}       fresh={freshData.company_type} />
            <FieldDiff label="Incorporation Date" stored={stored?.date_of_creation}   fresh={freshData.date_of_creation} />
            <FieldDiff label="Registered Address" stored={stored?.registered_address} fresh={freshData.registered_address} />
            {freshData.sic_codes?.length > 0 && (
              <div className="col-span-2 md:col-span-3 space-y-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SIC Codes</p>
                <div className="flex flex-wrap gap-1.5">
                  {freshData.sic_codes.map(code => (
                    <span key={code} className="px-2 py-0.5 bg-slate-100 rounded text-xs font-mono text-slate-600">{code}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="px-4 pb-3 text-xs text-slate-400">
            Green values will overwrite stored data. You can override any field on the client record after saving.
          </p>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={state === 'saving'}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={state === 'saving'}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
            >
              {state === 'saving'
                ? <><RefreshCw size={14} className="animate-spin" /> Saving…</>
                : <><Check size={14} /> Save to client record</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/**
 * ── OFFICERS ────────────────────────────────────────────────────────────────
 *
 * ⚠️ RESIGNED OFFICERS ARE COLLAPSED, NOT OMITTED. A company's former directors
 * are part of its record — the reason a client's history reads the way it does —
 * so they stay one click away rather than disappearing.
 *
 * ⛔ AND AN ERROR IS NOT AN EMPTY LIST. If the officers call failed, this says
 * so. Rendering "no officers" for a company that certainly has some is the
 * report-your-own-intent defect: the app would be describing its own failed
 * request as a fact about the world.
 */
function OfficersBlock({ officers, fetchedAt, error }: {
  officers?: OfficerRow[]; fetchedAt?: string; error?: string;
}) {
  const [showResigned, setShowResigned] = useState(false);
  if (error) {
    return (
      <div className="px-6 py-3 border-t border-slate-100 text-xs text-amber-700 flex items-center gap-2">
        <AlertTriangle size={13} /> Officers could not be fetched ({error}). Refresh to try again.
      </div>
    );
  }
  if (!officers) {
    return (
      <div className="px-6 py-3 border-t border-slate-100 text-xs text-slate-400">
        Officers not in this snapshot — Refresh to pull them.
      </div>
    );
  }
  const active = officers.filter((o) => !o.resigned_on);
  const resigned = officers.filter((o) => o.resigned_on);
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="px-6 py-4 border-t border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
        Officers {fetchedAt && <span className="font-normal normal-case text-slate-400">· {active.length} current</span>}
      </p>
      {active.length === 0 && <p className="text-sm text-slate-400 italic">No current officers listed.</p>}
      <ul className="space-y-1.5">
        {active.map((o, i) => (
          <li key={`${o.name}-${i}`} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="text-slate-800">{o.name}</span>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              {o.role || '—'} · appointed {fmt(o.appointed_on)}
            </span>
          </li>
        ))}
      </ul>
      {resigned.length > 0 && (
        <>
          <button
            onClick={() => setShowResigned((v) => !v)}
            className="mt-3 text-xs font-medium text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
          >
            {showResigned ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {resigned.length} resigned officer{resigned.length === 1 ? '' : 's'}
          </button>
          {showResigned && (
            <ul className="mt-2 space-y-1.5 pl-1 border-l-2 border-slate-100">
              {resigned.map((o, i) => (
                <li key={`${o.name}-r-${i}`} className="flex items-baseline justify-between gap-4 text-sm pl-3">
                  <span className="text-slate-500">{o.name}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {o.role || '—'} · resigned {fmt(o.resigned_on)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
