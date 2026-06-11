import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable, DragStartEvent, DragEndEvent,
} from '@dnd-kit/core';
import {
  Calendar, AlertCircle, Loader2, Plus, LayoutGrid, List as ListIcon,
  Filter, X, ChevronUp, ChevronDown, CheckCircle2,
} from 'lucide-react';
import { useJobs, updateJob, Job, JobStatus, JobPriority, JobFilters } from '../hooks/useJobs';
import { useTeamMembers } from '../hooks/useTeam';
import { useClients } from '../hooks/useClients';
import { TaskDetailModal, STATUS_META, PRIORITY_META } from '../components/work/TaskDetailModal';
import { CreateFromTemplateModal } from '../components/work/CreateFromTemplateModal';

const COLUMNS: JobStatus[] = ['not-started', 'in-progress', 'review', 'blocked', 'complete'];
const VIEW_KEY = 'work_view_mode';

function dueClasses(due: string | null, status: JobStatus): string {
  if (!due || status === 'complete') return 'text-slate-500';
  const days = Math.ceil((new Date(due + 'T00:00:00Z').getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000);
  if (days < 0 || days <= 7) return 'text-red-600 font-semibold';
  if (days <= 30) return 'text-amber-600 font-medium';
  return 'text-emerald-600';
}

const initials = (name?: string | null) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

// ── Card ──────────────────────────────────────────────────────────────────────
function JobCard({ job, onOpen, dragging }: { job: Job; onOpen: (j: Job) => void; dragging?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: job.id, data: { job } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(job)}
      style={{ opacity: isDragging ? 0.4 : 1 }}
      className={`bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-grab active:cursor-grabbing group ${dragging ? 'scale-[1.02] shadow-lg' : ''}`}
    >
      <div className="flex justify-between items-start mb-2 gap-2">
        <h4 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm">{job.title}</h4>
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${PRIORITY_META[job.priority].cls}`}>{PRIORITY_META[job.priority].label}</span>
      </div>
      {job.clientId
        ? <Link to={`/clients/${job.clientId}`} onClick={e => e.stopPropagation()} className="text-xs text-blue-600 hover:underline">{job.clientName || 'Client'}</Link>
        : <span className="text-xs text-slate-400">No client</span>}
      <div className="flex items-center justify-between mt-3">
        <div className={`flex items-center gap-1 text-xs ${dueClasses(job.dueDate, job.status)}`}>
          {job.dueDate && <><Calendar size={12} /> {new Date(job.dueDate).toLocaleDateString('en-GB')}</>}
        </div>
        {job.assigneeName && <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold" title={job.assigneeName}>{initials(job.assigneeName)}</div>}
      </div>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ status, jobs, onOpen, onAdd }: { status: JobStatus; jobs: Job[]; onOpen: (j: Job) => void; onAdd: (s: JobStatus) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];
  return (
    <div className="flex-1 min-w-[280px] flex flex-col bg-slate-50/50 rounded-xl border border-slate-200/60">
      <div className="p-3 border-b border-slate-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
          <h3 className="font-semibold text-slate-800 text-sm">{meta.label}</h3>
        </div>
        <span className="bg-white px-2 py-0.5 rounded text-xs font-bold text-slate-600 shadow-sm">{jobs.length}</span>
      </div>
      <div ref={setNodeRef} className={`p-3 flex-1 overflow-y-auto space-y-3 transition-colors ${isOver ? 'bg-blue-50/60' : ''}`}>
        {jobs.map(job => <JobCard key={job.id} job={job} onOpen={onOpen} />)}
        {jobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
            <CheckCircle2 size={24} className="mb-2 opacity-40" />
            <p className="text-xs mb-2">No {meta.label.toLowerCase()} tasks</p>
            <button onClick={() => onAdd(status)} className="text-xs font-medium text-blue-600 hover:text-blue-800">+ Add</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function WorkPage() {
  const [view, setView] = useState<'kanban' | 'list'>(() => (localStorage.getItem(VIEW_KEY) as any) || 'kanban');
  const [filters, setFilters] = useState<JobFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { jobs, isLoading, isError, mutate } = useJobs(filters);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const [createStatus, setCreateStatus] = useState<JobStatus | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const setViewPersist = (v: 'kanban' | 'list') => { setView(v); localStorage.setItem(VIEW_KEY, v); };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const activeFilterCount =
    (filters.assigneeId ? 1 : 0) + (filters.status?.length || 0) + (filters.priority?.length || 0) +
    (filters.clientId ? 1 : 0) + (filters.dueFrom || filters.dueTo ? 1 : 0);

  const byStatus = useMemo(() => {
    const m: Record<string, Job[]> = {}; COLUMNS.forEach(c => (m[c] = []));
    jobs.forEach(j => { (m[j.status] = m[j.status] || []).push(j); });
    return m;
  }, [jobs]);

  const onDragStart = (e: DragStartEvent) => setActiveJob((e.active.data.current as any)?.job || null);
  const onDragEnd = async (e: DragEndEvent) => {
    const job = (e.active.data.current as any)?.job as Job | undefined;
    const target = e.over?.id as JobStatus | undefined;
    setActiveJob(null);
    if (!job || !target || target === job.status) return;
    // optimistic move
    mutate(jobs.map(j => j.id === job.id ? { ...j, status: target } : j), { revalidate: false });
    try {
      await updateJob(job.id, { status: target });
      mutate();
    } catch {
      mutate();
      setToast('Could not move task');
      setTimeout(() => setToast(null), 3000);
    }
  };

  const openCreate = (status?: JobStatus) => { setCreateStatus(status || null); setShowCreate(true); };
  const onCreated = (job: Job) => { setShowCreate(false); mutate(); setOpenJob(job); };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Pipeline</h1>
          <p className="text-slate-500 mt-1 text-sm">Jobs across all clients.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFilters(v => !v)} className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${showFilters || activeFilterCount ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
            <Filter size={15} /> Filters
            {activeFilterCount > 0 && <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>}
          </button>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button onClick={() => setViewPersist('kanban')} className={`px-2.5 py-1.5 rounded ${view === 'kanban' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}><LayoutGrid size={16} /></button>
            <button onClick={() => setViewPersist('list')} className={`px-2.5 py-1.5 rounded ${view === 'list' ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}><ListIcon size={16} /></button>
          </div>
          <button onClick={() => openCreate()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm text-sm">
            <Plus size={16} /> Create from template
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {showFilters && <FilterSidebar filters={filters} setFilters={setFilters} onClear={() => setFilters({})} />}

        <div className="flex-1 overflow-hidden flex flex-col">
          {isError ? (
            <div className="p-8 bg-red-50 text-red-700 rounded-lg border border-red-200">Could not load jobs. Is the backend running?</div>
          ) : isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2" /> Loading jobs…</div>
          ) : view === 'kanban' ? (
            <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
              <div className="flex-1 flex gap-4 overflow-x-auto pb-2">
                {COLUMNS.map(status => (
                  <Column key={status} status={status} jobs={byStatus[status] || []} onOpen={setOpenJob} onAdd={openCreate} />
                ))}
              </div>
              <DragOverlay>{activeJob ? <div className="w-[260px]"><JobCard job={activeJob} onOpen={() => {}} dragging /></div> : null}</DragOverlay>
            </DndContext>
          ) : (
            <ListView jobs={jobs} onOpen={setOpenJob} />
          )}
        </div>
      </div>

      {openJob && <TaskDetailModal job={openJob} onClose={() => setOpenJob(null)} onChanged={mutate} />}
      {showCreate && <CreateFromTemplateModal initialStatus={createStatus || undefined} onClose={() => setShowCreate(false)} onCreated={onCreated} />}
      {toast && <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white bg-red-600 flex items-center gap-2"><AlertCircle size={16} /> {toast}</div>}
    </div>
  );
}

// ── List view ───────────────────────────────────────────────────────────────
type SortKey = 'title' | 'clientName' | 'assigneeName' | 'dueDate' | 'priority' | 'status';
const PRIORITY_ORDER: Record<JobPriority, number> = { low: 0, medium: 1, high: 2, urgent: 3 };

function ListView({ jobs, onOpen }: { jobs: Job[]; onOpen: (j: Job) => void }) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');

  const sorted = useMemo(() => {
    return [...jobs].sort((a, b) => {
      let av: any = a[sortKey], bv: any = b[sortKey];
      if (sortKey === 'priority') { av = PRIORITY_ORDER[a.priority]; bv = PRIORITY_ORDER[b.priority]; }
      if (av == null && bv == null) return 0;
      if (av == null) return 1; if (bv == null) return -1;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      return av < bv ? (dir === 'asc' ? -1 : 1) : av > bv ? (dir === 'asc' ? 1 : -1) : 0;
    });
  }, [jobs, sortKey, dir]);

  const sort = (k: SortKey) => { if (k === sortKey) setDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setDir('asc'); } };
  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th onClick={() => sort(k)} className="px-4 py-3 font-semibold text-slate-500 cursor-pointer select-none whitespace-nowrap">
      <span className="inline-flex items-center gap-1 hover:text-slate-800">{label}{sortKey === k && (dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}</span>
    </th>
  );

  if (jobs.length === 0) return <div className="flex-1 flex items-center justify-center text-slate-400">No jobs match the current filters.</div>;

  return (
    <div className="flex-1 overflow-auto bg-white rounded-xl border border-slate-200">
      <table className="w-full text-sm text-left">
        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider sticky top-0">
          <tr>
            <Th k="title" label="Task" /><Th k="clientName" label="Client" /><Th k="assigneeName" label="Assignee" />
            <Th k="dueDate" label="Due" /><Th k="priority" label="Priority" /><Th k="status" label="Status" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map(job => (
            <tr key={job.id} onClick={() => onOpen(job)} className="hover:bg-slate-50 cursor-pointer">
              <td className="px-4 py-3 font-medium text-slate-900">{job.title}</td>
              <td className="px-4 py-3">{job.clientId ? <Link to={`/clients/${job.clientId}`} onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline">{job.clientName || 'Client'}</Link> : <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-3">{job.assigneeName ? <span className="inline-flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">{initials(job.assigneeName)}</span>{job.assigneeName}</span> : <span className="text-slate-400">Unassigned</span>}</td>
              <td className={`px-4 py-3 ${dueClasses(job.dueDate, job.status)}`}>{job.dueDate ? new Date(job.dueDate).toLocaleDateString('en-GB') : '—'}</td>
              <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${PRIORITY_META[job.priority].cls}`}>{PRIORITY_META[job.priority].label}</span></td>
              <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600"><span className={`w-2 h-2 rounded-full ${STATUS_META[job.status].dot}`} />{STATUS_META[job.status].label}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Filter sidebar ────────────────────────────────────────────────────────────
function FilterSidebar({ filters, setFilters, onClear }: { filters: JobFilters; setFilters: (f: JobFilters) => void; onClear: () => void }) {
  const { members } = useTeamMembers();
  const { clients: rawClients } = useClients();
  const clients = Array.isArray(rawClients) ? rawClients : (rawClients as any)?.data || [];
  const [clientQuery, setClientQuery] = useState('');

  const toggle = (key: 'status' | 'priority', val: string) => {
    const cur = filters[key] || [];
    setFilters({ ...filters, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] });
  };

  const clientMatches = clientQuery.trim() && !filters.clientId
    ? clients.filter((c: any) => (c.legalName || '').toLowerCase().includes(clientQuery.toLowerCase())).slice(0, 5) : [];
  const selectedClient = clients.find((c: any) => c.id === filters.clientId);

  return (
    <div className="w-60 shrink-0 bg-white rounded-xl border border-slate-200 p-4 overflow-y-auto space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 text-sm">Filters</h3>
        <button onClick={onClear} className="text-xs text-blue-600 hover:text-blue-800">Clear all</button>
      </div>

      <FilterGroup title="Status">
        {COLUMNS.map(s => (
          <Check key={s} label={STATUS_META[s].label} checked={(filters.status || []).includes(s)} onChange={() => toggle('status', s)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Priority">
        {(Object.keys(PRIORITY_META) as JobPriority[]).map(p => (
          <Check key={p} label={PRIORITY_META[p].label} checked={(filters.priority || []).includes(p)} onChange={() => toggle('priority', p)} />
        ))}
      </FilterGroup>

      <FilterGroup title="Assignee">
        <select value={filters.assigneeId || ''} onChange={e => setFilters({ ...filters, assigneeId: e.target.value || undefined })} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm">
          <option value="">Anyone</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </FilterGroup>

      <FilterGroup title="Client">
        {selectedClient ? (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-700 truncate">{selectedClient.legalName}</span>
            <button onClick={() => setFilters({ ...filters, clientId: undefined })} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
          </div>
        ) : (
          <div className="relative">
            <input value={clientQuery} onChange={e => setClientQuery(e.target.value)} placeholder="Search…" className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
            {clientMatches.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {clientMatches.map((c: any) => <button key={c.id} onClick={() => { setFilters({ ...filters, clientId: c.id }); setClientQuery(''); }} className="w-full text-left px-2 py-1.5 text-sm hover:bg-blue-50 truncate">{c.legalName}</button>)}
              </div>
            )}
          </div>
        )}
      </FilterGroup>

      <FilterGroup title="Due date">
        <label className="text-xs text-slate-400">From</label>
        <input type="date" value={filters.dueFrom || ''} onChange={e => setFilters({ ...filters, dueFrom: e.target.value || undefined })} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm mb-2" />
        <label className="text-xs text-slate-400">To</label>
        <input type="date" value={filters.dueTo || ''} onChange={e => setFilters({ ...filters, dueTo: e.target.value || undefined })} className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm" />
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{title}</p>{children}</div>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4 text-blue-600 rounded" />{label}
    </label>
  );
}
