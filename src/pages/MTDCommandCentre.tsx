import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Zap,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  Minus,
  ExternalLink,
  WifiOff,
  Filter,
  Building2,
  User,
} from 'lucide-react';
import { useMTDClients, MTDClientRow } from '../hooks/useMTD';

type SortField = keyof MTDClientRow;
type SortDir = 'asc' | 'desc';
type ObligationFilter = 'all' | 'open' | 'fulfilled' | 'overdue';

// ─── Badge helpers ────────────────────────────────────────────────────────────

function ObligationBadge({ status }: { status: MTDClientRow['obligation_status'] }) {
  const map: Record<typeof status, { label: string; cls: string; icon: React.ReactNode }> = {
    open:          { label: 'Open',         cls: 'bg-amber-100  text-amber-700  border-amber-200',   icon: <Clock size={12} /> },
    fulfilled:     { label: 'Fulfilled',    cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={12} /> },
    overdue:       { label: 'Overdue',      cls: 'bg-red-100    text-red-700    border-red-200',      icon: <AlertCircle size={12} /> },
    no_obligation: { label: 'N/A',          cls: 'bg-slate-100  text-slate-500  border-slate-200',   icon: <Minus size={12} /> },
  };
  const { label, cls, icon } = map[status] ?? map.no_obligation;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}>
      {icon}{label}
    </span>
  );
}

function AuthBadge({ status, clientId }: { status: MTDClientRow['agent_auth_status']; clientId: string }) {
  if (status === 'authorized') {
    return (
      <span className="inline-flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
        <CheckCircle2 size={14} /> Active
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 text-amber-600 text-sm font-medium">
        <Clock size={14} /> Pending
      </span>
    );
  }
  return (
    <Link
      to={`/clients/${clientId}`}
      className="inline-flex items-center gap-1.5 text-slate-400 hover:text-blue-600 text-sm font-medium transition-colors group"
      onClick={e => e.stopPropagation()}
    >
      <WifiOff size={14} />
      Not connected
      <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

/**
 * ── ALL FOUR STATUSES, NOT TWO ──────────────────────────────────────────────
 *
 * ⛔ THIS RENDERED ONLY 'mandated' AND 'voluntary'. Everything else fell through
 * to an em dash — so `exempt` and `not-enrolled`, which are RECORDED DECISIONS,
 * displayed identically to NULL, which is the absence of one. Eight clients
 * looked statusless on the board while the database held an answer for each.
 *
 * The distinction matters in opposite directions: "exempt" means someone
 * established this client is out of scope, "not enrolled" means someone
 * established they are in scope but not signed up, and "—" means nobody has
 * looked. Only the last is a job to do.
 *
 * The four values are the CHECK on client_manager.clients.mtd_status:
 * mandated · voluntary · not-enrolled · exempt.
 */
/**
 * ── WHERE A DUE DATE CAME FROM ──────────────────────────────────────────────
 *
 * Every row is 'calculated' today: derived from the ITSA calendar by this
 * platform, not fetched from HMRC. The badge exists so the day an HMRC-sourced
 * row appears, the difference is visible on the row rather than implied by a
 * page-level sentence that may have scrolled away.
 */
function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return <span className="text-slate-300 text-xs">—</span>;
  const hmrc = source === 'hmrc';
  return (
    <span
      title={hmrc ? 'Fetched from HMRC' : 'Calculated by this platform from the ITSA calendar — not from HMRC'}
      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wide ${
        hmrc ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
             : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
      {hmrc ? 'HMRC' : 'Calculated'}
    </span>
  );
}

const MTD_STATUS_META: Record<string, { label: string; cls: string }> = {
  mandated:       { label: 'Mandated',     cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  voluntary:      { label: 'Voluntary',    cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  'not-enrolled': { label: 'Not enrolled', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  exempt:         { label: 'Exempt',       cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

function MTDStatusBadge({ status }: { status: MTDClientRow['mtd_status'] }) {
  const meta = status ? MTD_STATUS_META[status] : undefined;
  if (!meta) {
    // Genuinely unrecorded — nobody has decided. Distinct from all four above.
    return <span className="text-slate-400 text-xs" title="No MTD status recorded">Not set</span>;
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-bold border uppercase tracking-wide ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

function DeadlineDays({ days }: { days: number | null }) {
  if (days === null) return <span className="text-slate-400 text-sm">—</span>;
  if (days < 0)  return <span className="font-bold text-red-600 text-sm">{Math.abs(days)}d overdue</span>;
  if (days <= 7) return <span className="font-bold text-red-500 text-sm">{days}d</span>;
  if (days <= 30) return <span className="font-bold text-amber-600 text-sm">{days}d</span>;
  return <span className="text-slate-600 text-sm">{days}d</span>;
}

// ─── Sortable column header ───────────────────────────────────────────────────

function SortableHeader({
  label,
  field,
  sortField,
  sortDir,
  onSort,
}: {
  label: string;
  field: SortField;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <th
      className="px-5 py-4 font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap group"
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center gap-1.5 hover:text-slate-800 transition-colors">
        {label}
        {active ? (
          sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-600" /> : <ChevronDown size={14} className="text-blue-600" />
        ) : (
          <ChevronsUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
        )}
      </span>
    </th>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-slate-100">
      {Array.from({ length: 9 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="h-4 bg-slate-100 rounded w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MTDCommandCentre() {
  const { clients, isLoading, isError, refresh } = useMTDClients();
  const navigate = useNavigate();

  const [sortField, setSortField] = useState<SortField>('days_until_deadline');
  const [sortDir, setSortDir]     = useState<SortDir>('asc');
  const [filterStatus, setFilterStatus] = useState<ObligationFilter>('all');
  const [filterStaff, setFilterStaff]   = useState<string>('all');
  const [filterDays, setFilterDays]     = useState<string>('all');
  const [refreshing, setRefreshing]     = useState(false);

  // Build unique staff list
  const staffOptions = useMemo(() => {
    const names = new Set(clients.map(c => c.assigned_staff).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }, [clients]);

  // Filter
  const filtered = useMemo(() => {
    return clients.filter(c => {
      if (filterStatus !== 'all' && c.obligation_status !== filterStatus) return false;
      if (filterStaff !== 'all' && c.assigned_staff !== filterStaff) return false;
      if (filterDays !== 'all') {
        const maxDays = parseInt(filterDays, 10);
        if (c.days_until_deadline === null) return false;
        if (c.days_until_deadline > maxDays) return false;
      }
      return true;
    });
  }, [clients, filterStatus, filterStaff, filterDays]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av = a[sortField] as any;
      let bv = b[sortField] as any;

      // Nulls always go last
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();

      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Summary counts
  const counts = useMemo(() => ({
    total:     clients.length,
    overdue:   clients.filter(c => c.obligation_status === 'overdue').length,
    open:      clients.filter(c => c.obligation_status === 'open').length,
    fulfilled: clients.filter(c => c.obligation_status === 'fulfilled').length,
    notLinked: clients.filter(c => c.agent_auth_status === 'not_connected').length,
  }), [clients]);

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-xl border border-red-200">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle size={20} />
          <strong>Failed to load MTD data</strong>
        </div>
        <p className="text-sm">Ensure the NextGen ORCHESTRATOR is running and the <code className="bg-red-100 px-1 rounded">/brain/mtd/clients</code> endpoint is deployed.</p>
        <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Zap size={24} className="text-brand-accent" />
            MTD Compliance Command Centre
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Quarterly obligation dates for individuals and sole traders, derived from the ITSA calendar and tracked by the practice.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-medium shadow-sm disabled:opacity-50 whitespace-nowrap self-start"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* ⛔ THE PLATFORM-LEVEL STATE, SAID ONCE AND VISIBLY.
          The "No Auth Link" tile counted 153 of 153 and nobody read it as
          "this platform has never been connected to HMRC" — a number in a tile
          reads as a workload, not a system state. This banner says it in
          words, and disappears on its own the moment any client has a link. */}
      {counts.total > 0 && counts.notLinked === counts.total && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
          <WifiOff size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">Not connected to HMRC</p>
            <p className="text-amber-800 mt-0.5">
              No client has an HMRC authorisation link, so nothing on this page comes from HMRC.
              Due dates are calculated from the ITSA calendar; filed status is whatever the practice has recorded.
            </p>
          </div>
        </div>
      )}

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Individuals & Sole Traders', value: counts.total, cls: 'border-slate-200' },
          { label: 'Overdue',        value: counts.overdue,   cls: 'border-red-200 bg-red-50' },
          { label: 'Open',           value: counts.open,      cls: 'border-amber-200 bg-amber-50' },
          { label: 'No Auth Link',   value: counts.notLinked, cls: 'border-slate-200 bg-slate-50' },
        ].map(({ label, value, cls }) => (
          <div key={label} className={`p-5 rounded-xl border bg-white ${cls}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter size={15} />
          <span className="text-sm font-medium">Filter:</span>
        </div>

        {/* Obligation status pills */}
        <div className="flex gap-2">
          {(['all', 'open', 'overdue', 'fulfilled'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                filterStatus === s
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'all' ? 'All statuses' : s}
            </button>
          ))}
        </div>

        {/* Staff select */}
        {staffOptions.length > 0 && (
          <select
            value={filterStaff}
            onChange={e => setFilterStaff(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All staff</option>
            {staffOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        )}

        {/* Deadline window */}
        <select
          value={filterDays}
          onChange={e => setFilterDays(e.target.value)}
          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="all">Any deadline</option>
          <option value="7">Due within 7 days</option>
          <option value="14">Due within 14 days</option>
          <option value="30">Due within 30 days</option>
        </select>

        {(filterStatus !== 'all' || filterStaff !== 'all' || filterDays !== 'all') && (
          <button
            onClick={() => { setFilterStatus('all'); setFilterStaff('all'); setFilterDays('all'); }}
            className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider">
              <tr>
                <SortableHeader label="Client Name"       field="client_name"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Entity Type"       field="entity_type"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Income Band"       field="income_band"       sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="MTD Status"        field="mtd_status"        sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Next Due"          field="next_obligation_due" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Obligation"        field="obligation_status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Submission Stage"  field="submission_stage"  sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Agent Auth"        field="agent_auth_status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                <SortableHeader label="Days Until Due"    field="days_until_deadline" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                : sorted.length === 0
                ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                          <Zap size={28} className="text-slate-300" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">
                            {clients.length === 0
                              ? 'No MTD-enrolled clients found'
                              : 'No clients match the current filters'}
                          </p>
                          <p className="text-sm text-slate-400">
                            {clients.length === 0
                              ? 'Clients with a stored HMRC authorisation token will appear here automatically.'
                              : 'Try clearing the filters above.'}
                          </p>
                        </div>
                        {clients.length === 0 && (
                          <Link
                            to="/clients"
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Go to Clients →
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
                : sorted.map(client => (
                  <tr
                    key={client.client_id}
                    onClick={() => navigate(`/clients/${client.client_id}`)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    {/* Client name */}
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {client.client_name}
                      </span>
                      {client.assigned_staff && (
                        <p className="text-xs text-slate-400 mt-0.5">{client.assigned_staff}</p>
                      )}
                    </td>

                    {/* Entity type */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        {client.entity_type === 'Company'
                          ? <Building2 size={14} className="text-slate-400" />
                          : <User size={14} className="text-slate-400" />}
                        {client.entity_type || '—'}
                      </span>
                    </td>

                    {/* Income band */}
                    <td className="px-5 py-4 text-slate-600">
                      {client.income_band ?? '—'}
                    </td>

                    {/* MTD status */}
                    <td className="px-5 py-4">
                      <MTDStatusBadge status={client.mtd_status} />
                    </td>

                    {/* Next obligation due */}
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                      {client.next_obligation_due
                        ? new Date(client.next_obligation_due).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Obligation status */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <ObligationBadge status={client.obligation_status} />
                        {/* The provenance of the date beside it — see SourceBadge. */}
                        <SourceBadge source={client.obligation_source} />
                      </div>
                    </td>

                    {/* Submission stage */}
                    <td className="px-5 py-4 text-slate-600">
                      {client.submission_stage || '—'}
                    </td>

                    {/* Agent auth */}
                    <td className="px-5 py-4">
                      <AuthBadge status={client.agent_auth_status} clientId={client.client_id} />
                    </td>

                    {/* Days until deadline */}
                    <td className="px-5 py-4 text-right pr-6">
                      <DeadlineDays days={client.days_until_deadline} />
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {!isLoading && sorted.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between items-center">
            <span>Showing {sorted.length} of {clients.length} clients</span>
            <span>Last updated: {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
