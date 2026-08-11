import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  usePracticeDeadlines, useCoverageRollup, patchDeadline,
  PracticeFilters, CoverageRollup,
} from '../hooks/useDeadlineEngine';
import { useTeamMembers } from '../hooks/useTeam';
import { clientTypeOf, ClientType, CLIENT_TYPE_META, CLIENT_TYPE_ORDER } from '../lib/entityType';
import {
  Deadline, formatDateOnly, formatPeriod, STATUS_LABELS, STATUS_ORDER, DeadlineStatus,
  DONE_STATUSES, AUTHORITY_LABELS, Authority, weekStartISO, reasonMeta, daysPill,
} from '../lib/deadlines';

// ─────────────────────────────────────────────────────────────────────────────
// Deadlines — triage-first redesign (Modernist design system).
// Renders inside AppLayout (which owns the app sidebar + top bar), so the mock's
// left nav is intentionally dropped; this is the "main column" as a framed panel.
//
// DATA NOTES (design ↔ Deadline model reconciliation):
//  • Fee is intentionally omitted (not needed on this page; no fee on the model).
//  • No CRN field → client meta shows client-type (+ external_ref when present);
//    search covers client name, obligation name and external_ref.
//  • overdue is driven by the SQL-derived `overdue` boolean (never days_remaining).
// ─────────────────────────────────────────────────────────────────────────────

type Tile = 'all' | 'overdue' | 'week' | 'fortnight' | 'unassigned';
type GroupBy = 'week' | 'assignee' | 'clienttype';

const NARROW = "font-['Archivo_Narrow']";
// ONE class for every toolbar filter — the two native selects AND the custom
// client-type trigger — so the row reads as a single set of controls rather than
// a bespoke one bolted next to two natives (identical height, border, type).
const FILTER_CTL = 'h-[30px] border bg-white px-2 text-[12px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-2';
const BAND = 'min-w-[1218px]';
const GRID = 'grid-cols-[40px_minmax(210px,1.7fr)_minmax(200px,1.5fr)_118px_128px_150px_156px_76px]';

// A group bigger than this starts COLLAPSED — see collapsedByDefault().
const BIG_GROUP = 25;

const STATUS_FLOW: DeadlineStatus[] = ['not_started', 'in_progress', 'awaiting_client', 'ready_to_file', 'submitted'];
const CHIP_STATUSES: DeadlineStatus[] = ['not_started', 'in_progress', 'awaiting_client', 'ready_to_file'];
const STATUS_DOT: Record<DeadlineStatus, string> = {
  not_started: 'bg-[#bab6b6]', in_progress: 'bg-[#ec3013]', awaiting_client: 'bg-[#c98a1a]',
  ready_to_file: 'bg-[#3f7048]', submitted: 'bg-[#605d5d]', filed: 'bg-[#605d5d]',
  confirmed: 'bg-[#605d5d]', not_applicable: 'bg-[#605d5d]',
};
const AUTH_SHORT: Record<Authority, string> = {
  companies_house: 'CH', hmrc: 'HMRC', pension_regulator: 'TPR', internal: 'INT',
};

// A stroked V, matching the chevron the native <select>s draw beside these
// controls — a filled ▾ glyph read heavier and made the custom controls the odd
// ones out. Not a lucide icon: the page's no-icon rule is about the authority
// tags and status dot, and a select needs its affordance.
function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"
      className={`w-[11px] h-[11px] shrink-0 ${className}`}>
      <path d="M2.5 4.5L6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function nextStatus(s: DeadlineStatus): DeadlineStatus {
  const i = STATUS_FLOW.indexOf(s);
  return i === -1 ? s : STATUS_FLOW[Math.min(i + 1, STATUS_FLOW.length - 1)];
}

interface Group { key: string; label: string; rows: Deadline[]; overdue: number; }

// Big groups start collapsed so EVERY group header is reachable without scrolling
// past hundreds of rows (client-type grouping is 693 / 78 / 759 in production —
// the first group alone buried the other two). A lone group is always expanded:
// there is nothing to jump to, so collapsing it would only hide the work.
function collapsedByDefault(g: Group, groupCount: number): boolean {
  return groupCount > 1 && g.rows.length > BIG_GROUP;
}

function buildGroups(list: Deadline[], by: GroupBy): Group[] {
  const map = new Map<string, Group>();
  const push = (key: string, label: string, d: Deadline) => {
    let g = map.get(key);
    if (!g) { g = { key, label, rows: [], overdue: 0 }; map.set(key, g); }
    g.rows.push(d);
    if (d.overdue) g.overdue++;
  };
  for (const d of list) {
    if (by === 'week') { const wk = weekStartISO(d.statutory_due_date); push(wk, `Week of ${formatDateOnly(wk)}`, d); }
    else if (by === 'assignee') { push(d.assignee_name ?? '~unassigned', d.assignee_name ?? 'Unassigned', d); }
    else { const ct = clientTypeOf({ entity_type: d.client_entity_type, mtd_status: d.client_mtd_status }); push(ct, CLIENT_TYPE_META[ct].label, d); }
  }
  const arr = [...map.values()];
  // Within a group: statutory due date ascending, client name as tiebreak.
  arr.forEach((g) => g.rows.sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date) || (a.client_name ?? '').localeCompare(b.client_name ?? '')));
  if (by === 'week') {
    // Earlier-than-this-week groups sort to the TOP (ascending — overdue first),
    // then the current week and later (ascending).
    const cw = weekStartISO(new Date().toISOString().slice(0, 10));
    const past = arr.filter((g) => g.key < cw).sort((a, b) => a.key.localeCompare(b.key));
    const rest = arr.filter((g) => g.key >= cw).sort((a, b) => a.key.localeCompare(b.key));
    return [...past, ...rest];
  }
  if (by === 'assignee') {
    const sortKey = (g: Group) => (g.key === '~unassigned' ? '0' : '1' + g.label);
    return arr.sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  }
  return arr.sort((a, b) => CLIENT_TYPE_ORDER.indexOf(a.key as ClientType) - CLIENT_TYPE_ORDER.indexOf(b.key as ClientType));
}

export function DeadlinesPage() {
  const [tile, setTile] = useState<Tile>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('week');
  const [statuses, setStatuses] = useState<DeadlineStatus[]>([]);
  const [clientTypes, setClientTypes] = useState<ClientType[]>([]);   // client-side
  const [authority, setAuthority] = useState<string>('');             // server-side
  const [assignee, setAssignee] = useState<string>('');               // server-side
  const [query, setQuery] = useState('');                             // client-side
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  // Explicit collapse choices, keyed `${groupBy}:${groupKey}` so switching the
  // grouping naturally falls back to the defaults rather than carrying stale keys.
  const [collapseOverrides, setCollapseOverrides] = useState<Record<string, boolean>>({});
  // Optimistic status overlay: id → status, cleared on revalidate or rollback.
  const [pendingStatus, setPendingStatus] = useState<Record<string, DeadlineStatus>>({});
  const [showCoverage, setShowCoverage] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 3000); };

  const filters: PracticeFilters = { authority: authority || undefined, assignee: assignee || undefined, pageSize: 500 };
  const { rows, total, isLoading, isError, mutate } = usePracticeDeadlines(filters);
  const { rollup } = useCoverageRollup();
  const { members } = useTeamMembers();

  const active = useMemo(() => rows.filter((d) => !DONE_STATUSES.includes(d.status)), [rows]);

  // Tile counts over the FULL active partition (ignoring chips/search/tile) so
  // they stay accurate while you narrow the list.
  const counts = useMemo(() => {
    let overdue = 0, week = 0, fortnight = 0, unassigned = 0;
    for (const d of active) {
      if (d.overdue) overdue++;
      if (d.days_remaining >= 0 && d.days_remaining <= 6) week++;
      if (d.days_remaining >= 0 && d.days_remaining <= 14) fortnight++;
      if (d.assigned_to === null) unassigned++;
    }
    return { overdue, week, fortnight, unassigned, all: active.length };
  }, [active]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return active.filter((d) => {
      if (statuses.length && !statuses.includes(d.status)) return false;
      if (clientTypes.length && !clientTypes.includes(clientTypeOf({ entity_type: d.client_entity_type, mtd_status: d.client_mtd_status }))) return false;
      if (q) {
        const hay = `${d.client_name ?? ''} ${d.deadline_type.name} ${d.external_ref ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tile === 'overdue' && !d.overdue) return false;
      if (tile === 'week' && !(d.days_remaining >= 0 && d.days_remaining <= 6)) return false;
      if (tile === 'fortnight' && !(d.days_remaining >= 0 && d.days_remaining <= 14)) return false;
      if (tile === 'unassigned' && d.assigned_to !== null) return false;
      return true;
    });
  }, [active, statuses, clientTypes, query, tile]);

  const groups = useMemo(() => buildGroups(shown, groupBy), [shown, groupBy]);

  const isCollapsed = (g: Group) => collapseOverrides[`${groupBy}:${g.key}`] ?? collapsedByDefault(g, groups.length);
  const toggleGroup = (g: Group) =>
    setCollapseOverrides((p) => ({ ...p, [`${groupBy}:${g.key}`]: !isCollapsed(g) }));
  const setAllCollapsed = (v: boolean) =>
    setCollapseOverrides((p) => { const n = { ...p }; groups.forEach((g) => { n[`${groupBy}:${g.key}`] = v; }); return n; });

  const shownIds = shown.map((d) => d.id);
  const selectedCount = shownIds.filter((id) => selected.has(id)).length;
  const allChecked = shown.length > 0 && shownIds.every((id) => selected.has(id));

  const toggleRow = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((prev) => {
    const n = new Set(prev);
    const allSel = shownIds.every((id) => n.has(id));
    shownIds.forEach((id) => (allSel ? n.delete(id) : n.add(id)));
    return n;
  });
  const clearSelection = () => setSelected(new Set());

  // Displayed status = optimistic overlay when one is in flight, else server truth.
  const effStatus = (d: Deadline): DeadlineStatus => pendingStatus[d.id] ?? d.status;
  const clearPending = (id: string) => setPendingStatus((p) => { const n = { ...p }; delete n[id]; return n; });

  const setStatus = async (d: Deadline, status: DeadlineStatus) => {
    if (status === effStatus(d)) return;
    setPendingStatus((p) => ({ ...p, [d.id]: status }));          // optimistic
    try {
      await patchDeadline(d.id, { status });
      await mutate();                                              // settle to server truth
      clearPending(d.id);
    } catch {
      clearPending(d.id);                                          // rollback
      notify('Could not update status.');
    }
  };

  const targets = () => shown.filter((d) => selected.has(d.id));
  // Client-side fan-out (no bulk endpoint yet). Atomic from the user's side: the
  // list is revalidated to true server state, and on ANY row failure a SINGLE
  // error is shown and the selection is KEPT.
  const runBulk = async (body: (d: Deadline) => Parameters<typeof patchDeadline>[1], label: string) => {
    const items = targets();
    if (!items.length) return;
    setBusy(true);
    const results = await Promise.allSettled(items.map((d) => patchDeadline(d.id, body(d))));
    await mutate();
    setBusy(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed) notify(`${label} failed for ${failed} of ${items.length} — selection kept; the list shows the current state.`);
    else { clearSelection(); notify(`${label}: ${items.length} updated.`); }
  };
  const bulkAdvance = () => runBulk((d) => ({ status: nextStatus(d.status) }), 'Advance status');
  const bulkAssign = (memberId: string, name: string) => { setAssignOpen(false); return runBulk(() => ({ assigned_to: memberId }), `Assign to ${name}`); };

  const clearFilters = () => { setAuthority(''); setAssignee(''); setStatuses([]); setClientTypes([]); setQuery(''); setTile('all'); };

  const exportCsv = () => {
    const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const head = ['Client', 'Obligation', 'Authority', 'Due', 'Status', 'Assignee', 'Remaining'];
    const body = shown.map((d) => [
      d.client_name ?? '', d.deadline_type.name, AUTHORITY_LABELS[d.deadline_type.authority],
      d.statutory_due_date, STATUS_LABELS[effStatus(d)], d.assignee_name ?? '',
      d.overdue ? `${Math.abs(d.days_remaining)} overdue` : `${d.days_remaining}`,
    ].map(cell).join(','));
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'deadlines.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const cov = rollup?.counts;
  const clientTotal = cov ? cov.ok + cov.unmonitored + cov.under_monitored : 0;
  const attention = cov ? cov.unmonitored + cov.under_monitored : 0;
  const clientsTracked = useMemo(() => new Set(rows.map((d) => d.client_id)).size, [rows]);
  const lastSync = useMemo(() => rows.reduce<string | null>((mx, d) => (d.last_synced_at && (!mx || d.last_synced_at > mx) ? d.last_synced_at : mx), null), [rows]);

  const tileDefs: { id: Tile; count: number; unit: string; label: string; num: string; rule: string }[] = [
    { id: 'overdue', count: counts.overdue, unit: 'items', label: 'Overdue — statutory date passed', num: 'text-[#ec3013]', rule: 'bg-[#ec3013]' },
    { id: 'week', count: counts.week, unit: 'items', label: 'Due this week', num: 'text-[#201e1d]', rule: 'bg-[#c98a1a]' },
    { id: 'fortnight', count: counts.fortnight, unit: 'items', label: 'Due within 14 days', num: 'text-[#201e1d]', rule: 'bg-[#3f7048]' },
    { id: 'unassigned', count: counts.unassigned, unit: 'items', label: 'Unassigned work', num: 'text-[#201e1d]', rule: 'bg-[#7d7979]' },
    { id: 'all', count: counts.all, unit: 'total', label: 'All active deadlines', num: 'text-[#201e1d]', rule: 'bg-[#d7d3d3]' },
  ];

  const kicker = `${NARROW} text-[11px] font-bold uppercase tracking-[0.12em]`;
  const collapsedCount = groups.filter(isCollapsed).length;

  return (
    <div className={`font-['Archivo'] text-[#201e1d] antialiased`}>
      <div className="overflow-x-auto border-2 border-[#201e1d] bg-[#f3f2f2]">

        {/* App bar */}
        <div className={`${BAND} flex items-center gap-4 py-[14px] px-7 border-b-2 border-[#201e1d]`}>
          <div className={`${NARROW} text-[11px] uppercase tracking-[0.12em] text-[#605d5d]`}>Clients / Practice</div>
          <input
            type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, obligation, ref"
            className="ml-auto w-[300px] border border-[#bab6b6] bg-white px-2.5 py-[7px] text-[13px] text-[#201e1d] focus:outline-none focus:ring-2 focus:ring-[#ffc4b8]"
          />
          <button onClick={exportCsv} className="border border-[#bab6b6] bg-white px-3 py-[7px] text-[12px] font-semibold hover:border-[#201e1d]">Export CSV</button>
          <button title="New deadline — coming soon" onClick={() => notify('New-deadline creation is not wired up yet.')} className="border border-[#ec3013] bg-[#ec3013] text-white px-3.5 py-[7px] text-[12px] font-bold hover:bg-[#dd2b0f] hover:border-[#dd2b0f]">New deadline</button>
        </div>

        {/* Page header */}
        <header className={`${BAND} pt-[26px] px-7 pb-5 border-b-2 border-[#201e1d]`}>
          <div className="flex items-end gap-5 flex-wrap">
            <h1 className="m-0 text-[34px] font-extrabold tracking-[-0.03em] leading-none">Deadlines</h1>
            <div className="text-[13px] text-[#605d5d] pb-[3px]">{total.toLocaleString('en-GB')} deadline{total === 1 ? '' : 's'} tracked across {clientsTracked.toLocaleString('en-GB')} client{clientsTracked === 1 ? '' : 's'}</div>
            {lastSync && <div className={`ml-auto ${NARROW} text-[11px] uppercase tracking-[0.1em] text-[#605d5d]`}>Synced {formatDateOnly(lastSync)}</div>}
          </div>
        </header>

        {/* Coverage strip */}
        {attention > 0 && (
          <div className={`${BAND} flex items-center gap-3.5 py-[10px] px-7 border-b-2 border-[#201e1d] bg-[#ffe0d9]`}>
            <span className={`${kicker} text-[#7c1405]`}>Coverage</span>
            <span className="text-[13px] text-[#201e1d]">
              {cov!.ok.toLocaleString('en-GB')} of {clientTotal.toLocaleString('en-GB')} clients fully monitored — {cov!.unmonitored} unmonitored, {cov!.under_monitored} under-monitored
            </span>
            <button onClick={() => setShowCoverage((o) => !o)} className="ml-auto border border-[#7c1405] bg-transparent text-[#7c1405] px-3 py-1 text-[12px] font-bold hover:bg-[#7c1405] hover:text-[#ffe0d9]">
              {showCoverage ? 'Hide breakdown' : `Review ${attention} client${attention === 1 ? '' : 's'}`}
            </button>
          </div>
        )}
        {showCoverage && rollup && <CoverageDrawer rollup={rollup} />}

        {/* Triage tiles */}
        <div className={`${BAND} grid grid-cols-5 border-b-2 border-[#201e1d]`}>
          {tileDefs.map((t) => (
            <button
              key={t.id} onClick={() => setTile(t.id)}
              className={`text-left border-0 border-r border-[#d7d3d3] pt-4 px-5 pb-[14px] block hover:bg-[#eae9e9] ${tile === t.id ? 'bg-[#eae9e9]' : 'bg-transparent'}`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`text-[30px] font-extrabold tracking-[-0.03em] leading-none ${t.num}`}>{t.count.toLocaleString('en-GB')}</span>
                <span className={`${NARROW} text-[11px] uppercase tracking-[0.1em] text-[#605d5d]`}>{t.unit}</span>
              </div>
              <div className="mt-1.5 text-[12.5px] font-semibold text-[#444141]">{t.label}</div>
              <div className={`mt-2 h-[3px] w-full ${t.rule}`} />
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className={`${BAND} flex items-center gap-2 flex-wrap py-3 px-7 border-b border-[#d7d3d3] bg-[#eae9e9]`}>
          <span className={`${NARROW} text-[10px] font-bold uppercase tracking-[0.12em] text-[#605d5d]`}>Group</span>
          <div className="flex border border-[#201e1d]">
            {([['week', 'Week'], ['assignee', 'Assignee'], ['clienttype', 'Client type']] as [GroupBy, string][]).map(([v, lbl]) => (
              <button key={v} onClick={() => setGroupBy(v)} className={`border-0 border-r border-[#d7d3d3] last:border-r-0 px-3 py-1.5 text-[12px] font-semibold ${groupBy === v ? 'bg-[#f3f2f2] text-[#201e1d]' : 'bg-white text-[#444141]'}`}>{lbl}</button>
            ))}
          </div>
          {groups.length > 1 && (
            <button
              onClick={() => setAllCollapsed(collapsedCount !== groups.length)}
              className="border border-[#bab6b6] bg-white px-2.5 py-1.5 text-[12px] font-semibold hover:border-[#201e1d]"
            >{collapsedCount === groups.length ? 'Expand all' : 'Collapse all'}</button>
          )}

          <span className="w-3" />
          <span className={`${NARROW} text-[10px] font-bold uppercase tracking-[0.12em] text-[#605d5d]`}>Status</span>
          <div className="flex gap-1.5 flex-wrap">
            {CHIP_STATUSES.map((s) => {
              const on = statuses.includes(s);
              return (
                <button key={s} onClick={() => setStatuses((prev) => on ? prev.filter((x) => x !== s) : [...prev, s])}
                  className={`px-2.5 py-[5px] text-[12px] font-semibold border ${on ? 'bg-[#201e1d] text-[#f3f2f2] border-[#201e1d]' : 'bg-white text-[#605d5d] border-[#bab6b6]'}`}>{STATUS_LABELS[s]}</button>
              );
            })}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <ClientTypeFilter value={clientTypes} onChange={setClientTypes} />
            <select value={authority} onChange={(e) => setAuthority(e.target.value)} className={`${FILTER_CTL} ${authority ? 'border-[#201e1d] text-[#201e1d]' : 'border-[#bab6b6] text-[#444141]'}`}>
              <option value="">All authorities</option>
              <option value="companies_house">Companies House</option>
              <option value="hmrc">HMRC</option>
              <option value="pension_regulator">Pension Regulator</option>
            </select>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${FILTER_CTL} ${assignee ? 'border-[#201e1d] text-[#201e1d]' : 'border-[#bab6b6] text-[#444141]'}`}>
              <option value="">All assignees</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={clearFilters} className="border border-transparent bg-transparent px-1 py-1.5 text-[12px] font-semibold text-[#ae1800] underline">Clear</button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedCount > 0 && (
          <div className={`${BAND} flex items-center gap-3 py-[10px] px-7 bg-[#201e1d] text-[#f3f2f2] sticky top-0 z-30`}>
            <span className="text-[13px] font-bold">{selectedCount} deadline{selectedCount === 1 ? '' : 's'} selected</span>
            <span className="w-px h-[18px] bg-[#605d5d]" />
            <div className="relative">
              <button onClick={() => setAssignOpen((o) => !o)} disabled={busy} className="border border-[#7d7979] bg-transparent text-[#f3f2f2] px-3 py-[5px] text-[12px] font-semibold hover:bg-[#ec3013] hover:border-[#ec3013] disabled:opacity-40">Assign to…</button>
              {assignOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setAssignOpen(false)} />
                  <div className="absolute left-0 mt-1 w-56 max-h-64 overflow-y-auto bg-white border border-[#201e1d] z-50 text-[#201e1d]">
                    {members.map((m) => (
                      <button key={m.id} onClick={() => bulkAssign(m.id, m.name)} className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#eae9e9]">{m.name}</button>
                    ))}
                    {members.length === 0 && <div className="px-3 py-2 text-[12px] text-[#605d5d]">No team members</div>}
                  </div>
                </>
              )}
            </div>
            <button onClick={bulkAdvance} disabled={busy} className="border border-[#7d7979] bg-transparent text-[#f3f2f2] px-3 py-[5px] text-[12px] font-semibold hover:bg-[#ec3013] hover:border-[#ec3013] disabled:opacity-40">Advance status</button>
            <button onClick={() => notify("Client chase isn't wired up yet.")} disabled={busy} className="border border-[#7d7979] bg-transparent text-[#f3f2f2] px-3 py-[5px] text-[12px] font-semibold hover:bg-[#ec3013] hover:border-[#ec3013] disabled:opacity-40">Send client chase</button>
            <button onClick={() => runBulk(() => ({ status: 'not_applicable' }), 'Mark not applicable')} disabled={busy} className="border border-[#7d7979] bg-transparent text-[#f3f2f2] px-3 py-[5px] text-[12px] font-semibold hover:bg-[#ec3013] hover:border-[#ec3013] disabled:opacity-40">Mark not applicable</button>
            <button onClick={clearSelection} className="ml-auto border-0 bg-transparent text-[#bab6b6] text-[12px] font-semibold underline">Deselect</button>
          </div>
        )}

        {/* Table header */}
        <div className={`${BAND} ${GRID} grid items-center px-7 h-[34px] bg-[#201e1d] text-[#f3f2f2] sticky top-0 z-20 ${NARROW} text-[10.5px] font-semibold uppercase tracking-[0.12em]`}>
          <div><input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-[#ec3013] cursor-pointer" /></div>
          <div>Client</div><div>Obligation</div><div>Due</div><div>Remaining</div>
          <div>Status</div><div>Assignee</div><div />
        </div>

        {/* Body */}
        <div>
          {isLoading ? (
            <div className={`${BAND} py-16 px-7 text-[#605d5d] text-[14px]`}>Loading deadlines…</div>
          ) : isError ? (
            <div className={`${BAND} py-16 px-7 text-[#ae1800] text-[14px]`}>Couldn't load deadlines.</div>
          ) : shown.length === 0 ? (
            <div className={`${BAND} py-16 px-7 border-b border-[#d7d3d3]`}>
              <div className="text-[18px] font-bold">Nothing matches these filters.</div>
              <div className="mt-1.5 text-[13px] text-[#605d5d]">Clear the status chips or widen the authority filter.</div>
            </div>
          ) : (
            groups.map((g) => {
              const collapsed = isCollapsed(g);
              // Tint only when the group holds MORE THAN ONE item: with 51 single-item
              // week groups in production every header went red and the signal flattened.
              // A lone overdue row still carries the 4px red edge marker.
              const tinted = g.overdue > 0 && g.rows.length >= 2;
              return (
                <section key={g.key}>
                  <button
                    onClick={() => toggleGroup(g)} aria-expanded={!collapsed}
                    className={`${BAND} w-full text-left flex items-center gap-3 py-[11px] px-7 border-t-2 border-[#201e1d] border-b border-[#d7d3d3] hover:brightness-[0.98] ${tinted ? 'bg-[#ffe0d9]' : 'bg-[#eae9e9]'}`}
                  >
                    <span className={`${NARROW} text-[11px] w-3 shrink-0 ${tinted ? 'text-[#7c1405]' : 'text-[#605d5d]'}`}>{collapsed ? '▸' : '▾'}</span>
                    <span className={`text-[14px] font-extrabold tracking-[-0.01em] ${tinted ? 'text-[#7c1405]' : 'text-[#201e1d]'}`}>{g.label}</span>
                    <span className={`${NARROW} text-[11px] uppercase tracking-[0.1em] ${tinted ? 'text-[#9e3526]' : 'text-[#605d5d]'}`}>
                      {g.rows.length.toLocaleString('en-GB')} {g.rows.length === 1 ? 'item' : 'items'}{g.overdue ? ` · ${g.overdue} overdue` : ''}
                    </span>
                    {collapsed && <span className={`ml-auto ${NARROW} text-[11px] uppercase tracking-[0.1em] ${tinted ? 'text-[#9e3526]' : 'text-[#605d5d]'}`}>Show</span>}
                  </button>
                  {!collapsed && g.rows.map((d) => (
                    <DeadlineRow
                      key={d.id} d={d} status={effStatus(d)} pending={pendingStatus[d.id] !== undefined}
                      checked={selected.has(d.id)} onCheck={() => toggleRow(d.id)} onSetStatus={(s) => setStatus(d, s)}
                    />
                  ))}
                </section>
              );
            })
          )}
        </div>

        {/* Footer */}
        <footer className={`${BAND} flex items-center gap-4 pt-4 px-7 pb-10 border-t-2 border-[#201e1d]`}>
          <span className="text-[12.5px] text-[#605d5d]">Showing {shown.length.toLocaleString('en-GB')} of {total.toLocaleString('en-GB')} · ordered by statutory due date · overdue weeks first</span>
        </footer>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-[#201e1d] text-[#f3f2f2] text-[13px] font-medium shadow-lg">{toast}</div>}
    </div>
  );
}

function DeadlineRow({ d, status, pending, checked, onCheck, onSetStatus }: {
  d: Deadline; status: DeadlineStatus; pending: boolean; checked: boolean;
  onCheck: () => void; onSetStatus: (s: DeadlineStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const p = daysPill(d);
  const period = formatPeriod(d.period_start, d.period_end);
  const rowBg = checked ? 'bg-[#ffe0d9]' : d.overdue ? 'bg-[#fff2ef]' : 'bg-[#f3f2f2]';
  const edge = d.overdue ? 'shadow-[inset_4px_0_0_0_#ec3013]' : '';
  const ctype = CLIENT_TYPE_META[clientTypeOf({ entity_type: d.client_entity_type, mtd_status: d.client_mtd_status })].label;
  return (
    <div className={`${BAND} ${GRID} grid items-center py-[9px] px-7 border-b border-[#d7d3d3] hover:bg-[#eae9e9] ${rowBg} ${edge}`}>
      <div><input type="checkbox" checked={checked} onChange={onCheck} className="w-3.5 h-3.5 accent-[#ec3013] cursor-pointer" /></div>

      <div className="pr-4 min-w-0">
        <Link to={`/clients/${d.client_id}`} className="block text-[14.5px] font-bold tracking-[-0.01em] text-[#201e1d] no-underline truncate hover:text-[#ec3013]">{d.client_name ?? '—'}</Link>
        <div className={`mt-[2px] ${NARROW} text-[11px] uppercase tracking-[0.06em] text-[#605d5d] truncate`}>{ctype}{d.external_ref ? ` · ${d.external_ref}` : ''}</div>
      </div>

      <div className="pr-4 min-w-0">
        <div className="text-[13.5px] font-medium text-[#201e1d] truncate">{d.deadline_type.name}</div>
        <div className="mt-[2px] flex items-center gap-1.5">
          <span className={`${NARROW} text-[10px] font-bold tracking-[0.1em] px-[5px] py-px border border-[#bab6b6] text-[#605d5d]`}>{AUTH_SHORT[d.deadline_type.authority]}</span>
          {period !== '—' && <span className={`${NARROW} text-[11px] uppercase tracking-[0.06em] text-[#605d5d] truncate`}>{period}</span>}
        </div>
      </div>

      <div className="text-[13.5px] font-semibold tabular-nums whitespace-nowrap">{formatDateOnly(d.statutory_due_date)}</div>

      <div><span className={`inline-block px-[9px] py-[3px] text-[12px] font-bold whitespace-nowrap ${p.className}`}>{p.text}</span></div>

      {/* Status — a deliberate select-style control: fixed width so the chevrons
          line up down the column, a rule separating the chevron the way a native
          select does, and a border solid enough to read as interactive at rest.
          Secondary by design: neutral chrome, the dot carries the only colour. */}
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)} disabled={pending} title="Click to change status"
          className={`inline-flex items-center w-[142px] h-[26px] pl-2 pr-0 border bg-white text-[12px] font-semibold text-[#201e1d] whitespace-nowrap
            ${open ? 'border-[#201e1d] bg-[#eae9e9]' : 'border-[#bab6b6]'} hover:border-[#201e1d] hover:bg-[#eae9e9]
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#ec3013] focus-visible:outline-offset-2
            ${pending ? 'opacity-50' : ''}`}
        >
          <span className={`w-2 h-2 shrink-0 ${STATUS_DOT[status]}`} />
          <span className="flex-1 text-left truncate pl-2">{STATUS_LABELS[status]}</span>
          <span className="flex items-center justify-center w-[22px] h-full shrink-0 border-l border-[#d7d3d3] text-[#605d5d]"><Chevron /></span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 mt-1 w-[190px] bg-white border border-[#201e1d] z-50 py-1">
              {STATUS_ORDER.map((s) => (
                <button
                  key={s}
                  onClick={() => { setOpen(false); onSetStatus(s); }}
                  className={`w-full text-left px-3 py-[7px] text-[12.5px] inline-flex items-center gap-2.5 hover:bg-[#eae9e9] ${s === status ? 'bg-[#f3f2f2] font-bold' : 'font-medium'}`}
                >
                  <span className={`w-2 h-2 shrink-0 ${STATUS_DOT[s]}`} />
                  <span className="flex-1">{STATUS_LABELS[s]}</span>
                  {s === status && <span className="text-[11px] text-[#7c1405]">✓</span>}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="min-w-0 pr-3 text-[13px] font-medium text-[#444141] truncate">{d.assignee_name ?? 'Unassigned'}</div>

      <div className="text-right">
        <Link to={`/clients/${d.client_id}`} className={`${NARROW} text-[11px] font-bold uppercase tracking-[0.1em] text-[#ae1800] no-underline hover:text-[#ec3013] hover:underline`}>Open</Link>
      </div>
    </div>
  );
}

// Multi-select client-type filter (restored from the pre-redesign page, restyled).
// Ticked types combine (OR) and compose with the other filters. Empty = all.
function ClientTypeFilter({ value, onChange }: { value: ClientType[]; onChange: (v: ClientType[]) => void }) {
  const [open, setOpen] = useState(false);
  const toggle = (t: ClientType) => onChange(value.includes(t) ? value.filter((x) => x !== t) : [...value, t]);
  const label = value.length === 0 ? 'All client types' : value.length === 1 ? CLIENT_TYPE_META[value[0]].label : `${value.length} client types`;
  return (
    <div className="relative">
      {/* Same FILTER_CTL as the two native selects beside it; the chevron is sized
          and coloured to sit at the same visual weight as their native ones. */}
      <button
        type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`${FILTER_CTL} inline-flex items-center gap-2 ${value.length || open ? 'border-[#201e1d] text-[#201e1d]' : 'border-[#bab6b6] text-[#444141]'}`}
      >
        {label}
        <Chevron className="text-[#605d5d]" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1 w-[224px] bg-white border border-[#201e1d] z-50">
            <div className={`${NARROW} text-[10px] font-bold uppercase tracking-[0.12em] text-[#605d5d] px-3 pt-2.5 pb-1.5`}>Client type</div>
            {CLIENT_TYPE_ORDER.map((t) => {
              const on = value.includes(t);
              return (
                <label key={t} className={`flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer hover:bg-[#eae9e9] ${on ? 'bg-[#f3f2f2] font-semibold text-[#201e1d]' : 'text-[#444141]'}`}>
                  <input type="checkbox" checked={on} onChange={() => toggle(t)} className="w-4 h-4 accent-[#ec3013]" />
                  {CLIENT_TYPE_META[t].label}
                </label>
              );
            })}
            <button
              onClick={() => onChange([])} disabled={value.length === 0}
              className="w-full text-left px-3 py-2 text-[12px] font-semibold text-[#ae1800] hover:bg-[#eae9e9] border-t border-[#d7d3d3] disabled:text-[#bab6b6] disabled:hover:bg-transparent"
            >Clear client types</button>
          </div>
        </>
      )}
    </div>
  );
}

// The old "Needs attention" breakdown, reachable from the coverage strip. Groups
// unmonitored clients by their first reason code; under-monitored listed flat.
function CoverageDrawer({ rollup }: { rollup: CoverageRollup }) {
  const byReason = useMemo(() => {
    const m = new Map<string, CoverageRollup['unmonitored']>();
    for (const c of rollup.unmonitored) {
      const code = c.reason_codes[0] ?? 'unknown';
      if (!m.has(code)) m.set(code, []);
      m.get(code)!.push(c);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [rollup]);

  return (
    <div className={`${BAND} border-b-2 border-[#201e1d] bg-[#f3f2f2]`}>
      {byReason.map(([code, clients]) => {
        const meta = reasonMeta(code);
        return (
          <div key={code} className="px-7 py-3 border-b border-[#d7d3d3]">
            <div className="text-[12px] font-semibold text-[#605d5d] mb-2">{meta.message} · {clients.length}</div>
            <div className="flex flex-wrap gap-2">
              {clients.map((c) => (
                <Link key={c.client_id} to={`/clients/${c.client_id}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#ffe0d9] border border-[#ffc4b8] text-[13px] text-[#201e1d] no-underline hover:bg-[#ffc4b8]">
                  {c.client_name} <span className="text-[#7c1405] font-semibold">· {meta.action}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
      {rollup.under_monitored.length > 0 && (
        <div className="px-7 py-3">
          <div className={`${NARROW} text-[11px] font-bold uppercase tracking-[0.12em] text-[#605d5d] mb-2`}>Under-monitored</div>
          <div className="flex flex-wrap gap-2">
            {rollup.under_monitored.map((c) => {
              const meta = reasonMeta(c.reason_codes[0] ?? '');
              return (
                <Link key={c.client_id} to={`/clients/${c.client_id}`} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#f7e7c9] border border-[#e6cfa4] text-[13px] text-[#201e1d] no-underline hover:brightness-95">
                  {c.client_name} <span className="text-[#6b4410] font-semibold">· {meta.action}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
