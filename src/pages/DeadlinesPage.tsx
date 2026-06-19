import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, ChevronDown, ChevronRight, List as ListIcon,
  CalendarDays, Loader2, ArrowRight, Building2, Landmark,
} from 'lucide-react';
import { usePracticeDeadlines, useCoverageRollup, PracticeFilters, CoverageRollup } from '../hooks/useDeadlineEngine';
import { useTeamMembers } from '../hooks/useTeam';
import {
  Deadline, formatDateOnly, daysPill, STATUS_LABELS, STATUS_ORDER, DeadlineStatus,
  AUTHORITY_LABELS, AUTHORITY_ORDER, Authority, weekStartISO, reasonMeta,
} from '../lib/deadlines';

type GroupBy = 'week' | 'assignee' | 'client';
type ViewMode = 'list' | 'calendar';

export function DeadlinesPage() {
  const [authority, setAuthority] = useState<string>('');
  const [statuses, setStatuses] = useState<DeadlineStatus[]>([]);
  const [assignee, setAssignee] = useState<string>('');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('week');   // default Week (capacity view)
  const [view, setView] = useState<ViewMode>('list');        // default List (denser)

  const filters: PracticeFilters = {
    authority: authority || undefined,
    status: statuses,
    assignee: assignee || undefined,
    overdue: overdueOnly,
    from: from || undefined,
    to: to || undefined,
    pageSize: 500,
  };
  const { rows, total, isLoading, isError } = usePracticeDeadlines(filters);
  const { rollup } = useCoverageRollup();
  const { members } = useTeamMembers();

  const groups = useMemo(() => groupRows(rows, groupBy), [rows, groupBy]);
  const clearFilters = () => { setAuthority(''); setStatuses([]); setAssignee(''); setOverdueOnly(false); setFrom(''); setTo(''); };
  const hasFilters = authority || statuses.length || assignee || overdueOnly || from || to;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <CalendarClock className="text-blue-600" /> Deadlines
        </h1>
        <span className="text-sm text-slate-500">{total} deadline{total === 1 ? '' : 's'}</span>
      </div>

      {/* Region 1 — Needs attention (always present) */}
      <NeedsAttention rollup={rollup} />

      {/* Region 2 — the work */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Toggle label="Group" value={groupBy} onChange={(v) => setGroupBy(v as GroupBy)} options={[['week', 'Week'], ['assignee', 'Assignee'], ['client', 'Client']]} />
            <div className="ml-auto flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button onClick={() => setView('list')} className={`px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1 ${view === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}><ListIcon size={14} /> List</button>
              <button onClick={() => setView('calendar')} className={`px-3 py-1 rounded-md text-sm font-medium flex items-center gap-1 ${view === 'calendar' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}><CalendarDays size={14} /> Calendar</button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={authority} onChange={(e) => setAuthority(e.target.value)} className={selCls}>
              <option value="">All authorities</option>
              {AUTHORITY_ORDER.map((a) => <option key={a} value={a}>{AUTHORITY_LABELS[a]}</option>)}
            </select>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={selCls}>
              <option value="">All assignees</option>
              {members.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selCls} title="From" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selCls} title="To" />
            <label className="flex items-center gap-1.5 text-sm text-slate-600 px-2">
              <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} className="w-4 h-4 text-red-600 rounded" /> Overdue only
            </label>
            {hasFilters && <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">Clear</button>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((s) => {
              const on = statuses.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => setStatuses((prev) => on ? prev.filter((x) => x !== s) : [...prev, s])}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
                >{STATUS_LABELS[s]}</button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">Loading deadlines…</div>
        ) : isError ? (
          <div className="p-12 text-center text-red-500">Couldn't load deadlines.</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No deadlines match these filters.</div>
        ) : view === 'list' ? (
          <ListView groups={groups} groupBy={groupBy} />
        ) : (
          <CalendarView rows={rows} />
        )}
      </div>
    </div>
  );
}

const selCls = 'border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

function Toggle({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-400 uppercase">{label}</span>
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {options.map(([v, lbl]) => (
          <button key={v} onClick={() => onChange(v)} className={`px-3 py-1 rounded-md text-sm font-medium ${value === v ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>{lbl}</button>
        ))}
      </div>
    </div>
  );
}

// ── Region 1: Needs Attention ────────────────────────────────────────────────
function NeedsAttention({ rollup }: { rollup: CoverageRollup | undefined }) {
  const [openU, setOpenU] = useState(true);
  const [openUM, setOpenUM] = useState(false);
  if (!rollup) return <div className="h-24 bg-slate-100 rounded-xl animate-pulse" />;

  const { counts, unmonitored, under_monitored } = rollup;
  const byReason = useMemo(() => {
    const m = new Map<string, typeof unmonitored>();
    for (const c of unmonitored) {
      const code = c.reason_codes[0] ?? 'unknown';
      if (!m.has(code)) m.set(code, []);
      m.get(code)!.push(c);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [unmonitored]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-2">
        <AlertTriangle size={18} className="text-amber-500" />
        <h3 className="font-bold text-slate-900 text-sm uppercase tracking-tight">Needs attention</h3>
        <span className="ml-auto text-sm font-semibold text-slate-600">
          <span className="text-red-600">{counts.unmonitored} unmonitored</span> · <span className="text-amber-600">{counts.under_monitored} under-monitored</span>
        </span>
      </div>

      {/* Unmonitored */}
      <Section open={openU} onToggle={() => setOpenU((o) => !o)} title={`Unmonitored (${counts.unmonitored})`} accent="red">
        {byReason.map(([code, clients]) => {
          const meta = reasonMeta(code);
          return (
            <div key={code} className="px-5 py-3 border-t border-slate-100">
              <div className="text-xs font-semibold text-slate-500 mb-2">{meta.message} · {clients.length}</div>
              <div className="flex flex-wrap gap-2">
                {clients.map((c) => (
                  <Link key={c.client_id} to={`/clients/${c.client_id}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 border border-red-200 text-sm text-slate-700 hover:bg-red-100">
                    {c.client_name} <span className="text-red-600 font-medium">· {meta.action}</span> <ArrowRight size={12} className="text-red-400" />
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </Section>

      {/* Under-monitored (kept visible even when empty) */}
      <Section open={openUM} onToggle={() => setOpenUM((o) => !o)} title={`Under-monitored (${counts.under_monitored})`} accent="amber">
        {under_monitored.length === 0 ? (
          <div className="px-5 py-4 border-t border-slate-100 text-sm text-slate-400">None — clients with a flagged duty missing its deadlines will appear here.</div>
        ) : (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2">
            {under_monitored.map((c) => {
              const meta = reasonMeta(c.reason_codes[0] ?? '');
              return (
                <Link key={c.client_id} to={`/clients/${c.client_id}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-sm text-slate-700 hover:bg-amber-100">
                  {c.client_name} <span className="text-amber-600 font-medium">· {meta.action}</span> <ArrowRight size={12} className="text-amber-400" />
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ open, onToggle, title, accent, children }: { open: boolean; onToggle: () => void; title: string; accent: 'red' | 'amber'; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={onToggle} className="w-full px-5 py-3 flex items-center gap-2 hover:bg-slate-50 text-left">
        {open ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <span className={`text-sm font-bold ${accent === 'red' ? 'text-red-700' : 'text-amber-700'}`}>{title}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// ── Region 2: List view ──────────────────────────────────────────────────────
const AUTH_ICON: Record<string, React.ReactNode> = {
  companies_house: <Building2 size={13} className="text-indigo-500" />,
  hmrc: <Landmark size={13} className="text-blue-500" />,
};

function ListView({ groups, groupBy }: { groups: Group[]; groupBy: GroupBy }) {
  return (
    <div className="divide-y divide-slate-200">
      {groups.map((g) => (
        <div key={g.key}>
          <div className="px-5 py-2.5 bg-slate-50/60 flex items-center gap-2 sticky top-0">
            <span className="font-bold text-slate-700 text-sm">{g.label}</span>
            <span className="text-xs text-slate-400">· {g.rows.length}</span>
          </div>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {g.rows.map((d) => {
                const pill = daysPill(d);
                return (
                  <tr key={d.id} className={`hover:bg-slate-50 ${d.overdue ? 'bg-red-50/40' : ''}`}>
                    {groupBy !== 'client' && (
                      <td className="px-5 py-3 w-1/4">
                        <Link to={`/clients/${d.client_id}`} className="font-semibold text-slate-900 hover:text-blue-600">{d.client_name ?? '—'}</Link>
                      </td>
                    )}
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        {AUTH_ICON[d.deadline_type.authority]} {d.deadline_type.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-900 font-medium whitespace-nowrap">{formatDateOnly(d.statutory_due_date)}</td>
                    <td className="px-5 py-3 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${pill.className}`}>{pill.text}</span></td>
                    <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{STATUS_LABELS[d.status]}</td>
                    {groupBy !== 'assignee' && <td className="px-5 py-3 text-slate-500 text-xs whitespace-nowrap">{d.assignee_name ?? '—'}</td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ── Region 2: Calendar view (month grid) ─────────────────────────────────────
function CalendarView({ rows }: { rows: Deadline[] }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getUTCFullYear(), m: d.getUTCMonth() }; });
  const byDate = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    for (const d of rows) {
      if (!map.has(d.statutory_due_date)) map.set(d.statutory_due_date, []);
      map.get(d.statutory_due_date)!.push(d);
    }
    return map;
  }, [rows]);

  const first = new Date(Date.UTC(month.y, month.m, 1));
  const startDow = (first.getUTCDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${month.y}-${String(month.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  const todayStr = new Date().toISOString().slice(0, 10);
  const label = new Date(Date.UTC(month.y, month.m, 1)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const shift = (n: number) => setMonth((c) => { const t = c.m + n; return { y: c.y + Math.floor(t / 12), m: ((t % 12) + 12) % 12 }; });

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => shift(-1)} className="px-3 py-1 text-sm text-slate-500 hover:text-slate-800">‹ Prev</button>
        <span className="font-bold text-slate-900">{label}</span>
        <button onClick={() => shift(1)} className="px-3 py-1 text-sm text-slate-500 hover:text-slate-800">Next ›</button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d} className="bg-slate-50 text-center text-xs font-bold text-slate-500 py-1.5">{d}</div>
        ))}
        {cells.map((date, i) => (
          <div key={i} className={`bg-white min-h-[88px] p-1.5 ${date === todayStr ? 'ring-2 ring-inset ring-blue-300' : ''}`}>
            {date && (
              <>
                <div className="text-[11px] text-slate-400 mb-1">{Number(date.slice(8, 10))}</div>
                <div className="space-y-1">
                  {(byDate.get(date) ?? []).map((d) => (
                    <Link key={d.id} to={`/clients/${d.client_id}`} title={`${d.client_name} — ${d.deadline_type.name}`}
                      className={`block truncate text-[10px] px-1 py-0.5 rounded ${d.overdue ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'} hover:opacity-80`}>
                      {d.client_name}: {d.deadline_type.code}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── grouping ─────────────────────────────────────────────────────────────────
interface Group { key: string; label: string; rows: Deadline[]; }
function groupRows(rows: Deadline[], groupBy: GroupBy): Group[] {
  const map = new Map<string, Group>();
  for (const d of rows) {
    let key: string, label: string;
    if (groupBy === 'week') { key = weekStartISO(d.statutory_due_date); label = `Week of ${formatDateOnly(key)}`; }
    else if (groupBy === 'assignee') { key = d.assignee_name ?? '~unassigned'; label = d.assignee_name ?? 'Unassigned'; }
    else { key = d.client_id; label = d.client_name ?? 'Unknown client'; }
    if (!map.has(key)) map.set(key, { key, label, rows: [] });
    map.get(key)!.rows.push(d);
  }
  const arr = [...map.values()];
  arr.forEach((g) => g.rows.sort((a, b) => a.statutory_due_date.localeCompare(b.statutory_due_date)));
  if (groupBy === 'week') arr.sort((a, b) => a.key.localeCompare(b.key));
  else arr.sort((a, b) => a.label.localeCompare(b.label));
  return arr;
}
