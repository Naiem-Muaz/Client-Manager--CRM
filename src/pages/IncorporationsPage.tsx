import React, { useMemo, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertTriangle, Building2, Loader2, Plus, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ViewHeader, EmptyState, btnPrimary, btnGhost } from '../components/sponsor/ui';
import { field } from '../components/sponsor/fields';
import { Incorporation, createIncorporation, useIncorporations } from '../hooks/useIncorporations';
import { PIPELINE, STATUS_META, daysSince } from '../components/incorporations/model';
import { AttentionBanner, PipelineBoard } from '../components/pipeline/PipelineBoard';
import { errMsg } from '../lib/errMsg';

/**
 * Incorporations — the pipeline tracker (landing view). Attention-first, like
 * the sponsor tab: rejected incorporations lead loudly, then the pipeline
 * columns draft → ready to file → submitted → accepted → onboarded.
 */
export function IncorporationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { incorporations, isLoading, isError } = useIncorporations();
  const [creating, setCreating] = useState(false);

  // Backend already 403s client-portal users; don't render the shell either.
  if (user && user.role === 'client') return <Navigate to="/" replace />;

  const byStatus = useMemo(() => {
    const m: Record<string, Incorporation[]> = {};
    for (const i of incorporations) (m[i.status] ||= []).push(i);
    return m;
  }, [incorporations]);
  const rejected = byStatus['rejected'] || [];

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <ViewHeader
        title="Incorporations"
        subtitle="New company setups — from name check to a fully-onboarded client"
        action={<button onClick={() => setCreating(true)} className={btnPrimary}><Plus size={15} />New incorporation</button>}
      />

      {isLoading && <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 size={16} className="animate-spin" />Loading…</div>}
      {isError && <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">Could not load incorporations.</div>}

      {/* Rejected — loud, first (shared AttentionBanner) */}
      {!!rejected.length && (
        <AttentionBanner icon={AlertTriangle} title="Rejected by Companies House — needs attention" tone="rose">
          {rejected.map(i => (
            <button key={i.id} onClick={() => navigate(`/incorporations/${i.id}`)}
              className="w-full flex items-center justify-between gap-3 bg-white border border-rose-100 rounded-lg px-3.5 py-2.5 text-left hover:border-rose-300 transition-colors">
              <span className="text-sm font-medium text-slate-800">{i.proposedName}</span>
              <span className="text-xs text-rose-600 font-medium">Edit to fix &amp; refile →</span>
            </button>
          ))}
        </AttentionBanner>
      )}

      {/* Pipeline board (shared PipelineBoard — markup identical to the original) */}
      {!isLoading && !incorporations.length ? (
        <EmptyState icon={Building2} title="No incorporations yet" hint="Start a new company setup — name check, wizard, filing pack, and one-click client onboarding." />
      ) : (
        <PipelineBoard
          columns={PIPELINE.map(status => ({ key: status, label: STATUS_META[status].label, dotClass: STATUS_META[status].dot }))}
          groups={byStatus}
          cardKey={(i: Incorporation) => i.id}
          renderCard={(i: Incorporation) => {
            const days = daysSince(i.updatedAt);
            const blockers = i.blockingCount ?? (i.blockingIssues?.length || 0);
            return (
              <button onClick={() => navigate(`/incorporations/${i.id}`)}
                className="w-full text-left bg-white border border-slate-200 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:shadow-sm transition-all">
                <p className="text-sm font-medium text-[#0F1E3A] leading-snug">{i.proposedName}</p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                  {i.companyNumber && <span className="font-mono">{i.companyNumber}</span>}
                  {days != null && <span>{days === 0 ? 'today' : `${days}d in stage`}</span>}
                  {i.status === 'draft' && blockers > 0 && (
                    <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle size={11} />{blockers} to fix</span>
                  )}
                  {i.assignedName && <span className="truncate">· {i.assignedName}</span>}
                </div>
              </button>
            );
          }}
        />
      )}

      {creating && <NewIncorporationModal onClose={() => setCreating(false)} onCreated={id => navigate(`/incorporations/${id}`)} />}
    </div>
  );
}

function NewIncorporationModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || busy) return;
    setBusy(true); setError(null);
    try {
      const created = await createIncorporation(name.trim());
      onCreated(created.id);
    } catch (e: any) {
      setError(errMsg(e));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-[#0F1E3A]">New incorporation</h3>
            <p className="text-xs text-slate-400 mt-0.5">Start with the proposed name — everything else comes in the wizard.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"><X size={16} /></button>
        </div>
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Proposed company name <span className="text-rose-500">*</span></label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Example Trading Ltd" className={field} />
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className={btnGhost}>Cancel</button>
          <button onClick={submit} disabled={!name.trim() || busy} className={btnPrimary}>
            {busy && <Loader2 size={14} className="animate-spin" />}Create draft
          </button>
        </div>
      </div>
    </div>
  );
}
