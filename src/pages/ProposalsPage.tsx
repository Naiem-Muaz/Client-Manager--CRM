import React, { useMemo } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FileSignature, Loader2, Plus, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ViewHeader, EmptyState, btnPrimary } from '../components/sponsor/ui';
import { AttentionBanner, PipelineBoard, PipelineColumn } from '../components/pipeline/PipelineBoard';
import { ProposalListItem, useProposals } from '../hooks/useProposals';

/**
 * Proposals — the pipeline tracker. Attention-first: declined leads loudly,
 * expiring-soon flagged on cards; columns draft → sent → viewed → accepted →
 * closed (declined/expired/withdrawn). Accepted cards show the onboarding
 * outcome (letter ✓ / deadlines / mandate) from the adapter's {steps}.
 */

const COLUMNS: PipelineColumn[] = [
  { key: 'draft', label: 'Draft', dotClass: 'bg-slate-400' },
  { key: 'sent', label: 'Sent', dotClass: 'bg-blue-500' },
  { key: 'viewed', label: 'Viewed', dotClass: 'bg-indigo-500' },
  { key: 'accepted', label: 'Accepted', dotClass: 'bg-emerald-500' },
  { key: 'closed', label: 'Closed', dotClass: 'bg-slate-300' },
];
const CLOSED = new Set(['declined', 'expired', 'withdrawn']);

const money = (pence: any) => '£' + (Number(pence) / 100).toLocaleString('en-GB', { maximumFractionDigits: 0 });
const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return Number.isFinite(d) ? Math.max(0, d) : null;
};
const daysUntil = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Number.isFinite(d) ? d : null;
};

export function ProposalsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { proposals, isLoading, isError } = useProposals();

  if (user && user.role === 'client') return <Navigate to="/" replace />;

  const groups = useMemo(() => {
    const m: Record<string, ProposalListItem[]> = {};
    for (const p of proposals) (m[CLOSED.has(p.status) ? 'closed' : p.status] ||= []).push(p);
    return m;
  }, [proposals]);
  const declined = useMemo(() => proposals.filter(p => p.status === 'declined'), [proposals]);

  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <ViewHeader
        title="Proposals"
        subtitle="Priced proposals for prospects — accepted ones auto-onboard as clients"
        action={<button onClick={() => navigate('/proposals/new')} className={btnPrimary}><Plus size={15} />New proposal</button>}
      />

      {isLoading && <div className="flex items-center gap-2 text-slate-400 text-sm py-10 justify-center"><Loader2 size={16} className="animate-spin" />Loading…</div>}
      {isError && <div className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">Could not load proposals.</div>}

      {!!declined.length && (
        <AttentionBanner icon={XCircle} title="Declined — worth a follow-up" tone="rose">
          {declined.map(p => (
            <button key={p.id} onClick={() => navigate(`/proposals/${p.id}`)}
              className="w-full flex items-center justify-between gap-3 bg-white border border-rose-100 rounded-lg px-3.5 py-2.5 text-left hover:border-rose-300 transition-colors">
              <span className="text-sm font-medium text-slate-800">{p.prospectName}{p.prospectCompany ? ` — ${p.prospectCompany}` : ''}</span>
              <span className="text-xs text-rose-600 font-medium">See the reason →</span>
            </button>
          ))}
        </AttentionBanner>
      )}

      {!isLoading && !proposals.length ? (
        <EmptyState icon={FileSignature} title="No proposals yet"
          hint="Build a priced proposal from your service catalogue and send it — acceptance onboards the client automatically." />
      ) : (
        <PipelineBoard
          columns={COLUMNS}
          groups={groups}
          cardKey={(p: ProposalListItem) => p.id}
          renderCard={(p: ProposalListItem) => <ProposalCard p={p} onOpen={() => navigate(`/proposals/${p.id}`)} />}
        />
      )}
    </div>
  );
}

function ProposalCard({ p, onOpen }: { p: ProposalListItem; onOpen: () => void }) {
  const days = daysSince(p.updatedAt);
  const expiresIn = ['sent', 'viewed'].includes(p.status) ? daysUntil(p.validUntil) : null;
  const s = p.onboardSteps;
  return (
    <button onClick={onOpen}
      className="w-full text-left bg-white border border-slate-200 rounded-lg px-3 py-2.5 hover:border-blue-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#0F1E3A] leading-snug min-w-0">
          {p.prospectName}{p.prospectCompany && <span className="text-slate-400 font-normal"> — {p.prospectCompany}</span>}
        </p>
        <span className="text-xs font-bold text-slate-700 tabular-nums flex-shrink-0">
          {Number(p.monthlyTotalPence) > 0 ? `${money(p.monthlyTotalPence)}/mo` : `${money(p.annualTotalPence)}/yr`}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400 flex-wrap">
        {days != null && <span>{days === 0 ? 'today' : `${days}d in stage`}</span>}
        {p.status === 'expired' && <span className="text-slate-500 font-medium">expired</span>}
        {p.status === 'withdrawn' && <span>withdrawn</span>}
        {p.status === 'declined' && <span className="text-rose-600 font-medium">declined</span>}
        {expiresIn != null && expiresIn <= 7 && expiresIn >= 0 && (
          <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><Clock size={11} />expires in {expiresIn}d</span>
        )}
      </div>
      {p.status === 'accepted' && (
        <div className="flex items-center gap-2.5 mt-2 pt-2 border-t border-slate-100 text-[11px] flex-wrap">
          {p.clientId
            ? <span className="inline-flex items-center gap-1 text-emerald-600 font-medium"><CheckCircle2 size={11} />client</span>
            : <span className="inline-flex items-center gap-1 text-amber-600 font-medium"><AlertTriangle size={11} />onboarding pending</span>}
          {p.engagementId && <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} />letter sent</span>}
          {s?.deadlines?.startsWith('seeded') && <span className="text-slate-500">{s.deadlines.split(' across')[0]} deadlines</span>}
          {p.gcMandateStatus === 'active'
            ? <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 size={11} />mandate active</span>
            : p.gcMandateStatus === 'pending'
              ? <span className="text-slate-500">mandate pending</span>
              : null}
        </div>
      )}
    </button>
  );
}
