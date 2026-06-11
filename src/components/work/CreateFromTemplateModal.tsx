import React, { useState, useMemo } from 'react';
import { X, Search, Loader2, ChevronLeft, FileText } from 'lucide-react';
import { useJobTemplates, JobTemplate, createJob, Job, JobStatus } from '../../hooks/useJobs';
import { useClients } from '../../hooks/useClients';
import { useTeamMembers } from '../../hooks/useTeam';

function currentTaxYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const startYear = now.getMonth() >= 3 ? y : y - 1; // UK tax year starts 6 Apr
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

const RECURRENCE_CLS: Record<string, string> = {
  annual: 'bg-purple-100 text-purple-700',
  quarterly: 'bg-blue-100 text-blue-700',
  monthly: 'bg-emerald-100 text-emerald-700',
  'one-off': 'bg-slate-100 text-slate-600',
};

export function CreateFromTemplateModal({ initialStatus, onClose, onCreated }: {
  initialStatus?: JobStatus;
  onClose: () => void;
  onCreated: (job: Job) => void;
}) {
  const { templates, isLoading } = useJobTemplates();
  const { clients: rawClients } = useClients();
  const { members } = useTeamMembers();
  const clients = Array.isArray(rawClients) ? rawClients : (rawClients as any)?.data || [];

  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<JobTemplate | null>(null);
  const [search, setSearch] = useState('');

  const [clientQuery, setClientQuery] = useState('');
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [taxYear, setTaxYear] = useState(currentTaxYear());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredTemplates = useMemo(() => {
    const t = search.trim().toLowerCase();
    return templates.filter(tpl => !t || tpl.name.toLowerCase().includes(t) || tpl.jobType.toLowerCase().includes(t));
  }, [templates, search]);

  const clientMatches = useMemo(() => {
    if (!clientQuery.trim() || client) return [];
    const t = clientQuery.toLowerCase();
    return clients.filter((c: any) => (c.legalName || '').toLowerCase().includes(t)).slice(0, 6);
  }, [clientQuery, clients, client]);

  const submit = async () => {
    if (!selected) return;
    setSaving(true); setError(null);
    try {
      const job = await createJob({
        templateId: selected.id,
        clientId: client?.id || null,
        assigneeId: assigneeId || null,
        dueDate: dueDate || null,
        taxYear: taxYear || null,
        status: initialStatus || 'not-started',
      });
      onCreated(job);
    } catch (err: any) {
      setError(err?.error || err?.message || 'Failed to create job');
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            {step === 2 && <button onClick={() => setStep(1)} className="p-1 hover:bg-slate-200 rounded text-slate-500"><ChevronLeft size={18} /></button>}
            <h3 className="font-bold text-slate-900">{step === 1 ? 'Choose a template' : 'Configure job'}</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        {step === 1 ? (
          <div className="flex-1 overflow-y-auto p-5">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search templates…" className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </div>
            {isLoading ? (
              <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading templates…</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredTemplates.map(tpl => (
                  <button key={tpl.id} onClick={() => { setSelected(tpl); setStep(2); }}
                    className="text-left p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500"><FileText size={16} /></div>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${RECURRENCE_CLS[tpl.recurrence] || 'bg-slate-100 text-slate-600'}`}>{tpl.recurrence}</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{tpl.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{tpl.jobType}{tpl.isSystem ? ' · system' : ''}</p>
                  </button>
                ))}
                {filteredTemplates.length === 0 && <p className="col-span-2 text-center text-slate-400 py-8">No templates match.</p>}
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-semibold text-slate-900 text-sm">{selected?.name}</p>
              <p className="text-xs text-slate-400">{selected?.dueDateRule}</p>
            </div>

            <div className="relative">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Client</label>
              {client ? (
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-sm font-medium text-slate-800">{client.name}</span>
                  <button onClick={() => { setClient(null); setClientQuery(''); }} className="text-xs text-blue-600 hover:underline">Change</button>
                </div>
              ) : (
                <input value={clientQuery} onChange={e => setClientQuery(e.target.value)} placeholder="Search client…" className={field} />
              )}
              {clientMatches.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {clientMatches.map((c: any) => (
                    <button key={c.id} onClick={() => { setClient({ id: c.id, name: c.legalName }); setClientQuery(''); }} className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-blue-50">{c.legalName}</button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Due date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={field} />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Tax year</label>
                <input value={taxYear} onChange={e => setTaxYear(e.target.value)} className={field} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Assignee</label>
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)} className={field}>
                  <option value="">Unassigned</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        )}

        {step === 2 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm">Cancel</button>
            <button onClick={submit} disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
              {saving ? <><Loader2 size={14} className="animate-spin" /> Creating…</> : 'Create job'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
