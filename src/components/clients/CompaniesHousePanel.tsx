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
import { lookupCompany, CompanyInfo } from '../../api/companiesHouse';
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
}

type PanelState = 'idle' | 'loading' | 'preview' | 'saving' | 'success' | 'error_not_found' | 'error_api' | 'error_save';

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

    const snapshot: CHSnapshot = {
      ...freshData,
      fetched_at: new Date().toISOString(),
    };

    try {
      await updateClient(client.id, {
        legalName: freshData.company_name,
        registeredAddress: freshData.registered_address,
        incorporationDate: freshData.date_of_creation,
        companyStatus: freshData.company_status,
        companyType: freshData.company_type,
        sicCodes: freshData.sic_codes,
        chData: snapshot,
      });
      // Persist incorporation_date to the canonical column the deadline engine reads.
      if (freshData.date_of_creation) {
        await patchClient(client.id, { incorporation_date: freshData.date_of_creation }).catch(() => {});
      }
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

  // Only render for company-type clients with a company number
  if (client.entityType !== 'Company' && client.entityType !== 'Ltd' && client.entityType !== 'LLP') {
    return null;
  }

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
            </>
          ) : (
            <div className="col-span-3 text-sm text-slate-400 italic py-2">
              No data synced yet. Click "Refresh from CH" to pull the latest from Companies House.
            </div>
          )}
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
