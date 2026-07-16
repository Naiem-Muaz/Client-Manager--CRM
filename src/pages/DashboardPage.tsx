import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Briefcase, AlertTriangle, FileSignature, ShieldCheck, Banknote, Activity } from 'lucide-react';
import { useDashboardSummary } from '../hooks/useDashboard';
import { DashboardDeadlinesPanel } from '../components/dashboard/DashboardDeadlinesPanel';
import { entityKey, ENTITY_META } from '../lib/entityType';

function KpiCard({ title, value, icon: Icon, isLoading, footer, tone = 'slate', onClick }: {
  title: string;
  value: React.ReactNode;
  icon: any;
  isLoading: boolean;
  footer?: React.ReactNode;
  tone?: 'slate' | 'red' | 'amber' | 'green' | 'blue';
  onClick?: () => void;
}) {
  const tones: Record<string, string> = {
    slate: 'text-slate-400', red: 'text-red-500', amber: 'text-amber-500', green: 'text-emerald-500', blue: 'text-blue-500',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 text-left w-full hover:border-blue-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
        <Icon size={18} className={tones[tone]} />
      </div>
      {isLoading ? (
        <div className="h-9 w-20 bg-slate-100 rounded animate-pulse mt-2" />
      ) : (
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      )}
      {!isLoading && footer ? <div className="text-sm font-medium mt-1.5">{footer}</div> : null}
    </button>
  );
}

const ACTIVITY_TEXT: Record<string, (e: any) => string> = {
  created: e => `created job "${e.jobTitle}"`,
  status_changed: e => `moved "${e.jobTitle}" ${e.fromValue} → ${e.toValue}`,
  assigned: e => `assigned "${e.jobTitle}"`,
  comment_added: e => `commented on "${e.jobTitle}"`,
};
const timeAgo = (d: string) => {
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
  return `${Math.floor(mins / 1440)}d ago`;
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { summary, isLoading } = useDashboardSummary();

  const money = (n: number) => `£${n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Partner Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <KpiCard
          title="Total Clients" icon={Users} tone="blue"
          value={summary?.totalClients ?? 0}
          isLoading={isLoading}
          onClick={() => navigate('/clients')}
          footer={
            <span className="flex flex-wrap gap-1.5">
              {(summary?.clientsByEntity || []).map(e => {
                const meta = ENTITY_META[entityKey(e.entity_type)];
                return <span key={String(e.entity_type)} className={`px-1.5 py-0.5 rounded text-xs font-medium ${meta.badge}`}>{meta.label}: {e.n}</span>;
              })}
            </span>
          }
        />
        <KpiCard
          title="Jobs Due This Week" icon={Briefcase} tone={summary?.jobsDueThisWeek ? 'amber' : 'green'}
          value={summary?.jobsDueThisWeek ?? 0}
          isLoading={isLoading}
          onClick={() => navigate('/work')}
          footer={<span className="text-slate-400">Open jobs due in the next 7 days</span>}
        />
        <KpiCard
          title="Overdue Deadlines" icon={AlertTriangle} tone={summary?.overdueDeadlines ? 'red' : 'green'}
          value={summary?.overdueDeadlines ?? 0}
          isLoading={isLoading}
          onClick={() => navigate('/deadlines')}
          footer={(summary?.overdueDeadlines ?? 0) > 0
            ? <span className="text-red-600">Needs attention</span>
            : <span className="text-emerald-600">All on track</span>}
        />
        <KpiCard
          title="Unsigned Engagement Letters" icon={FileSignature} tone={summary?.unsignedEngagements ? 'amber' : 'green'}
          value={summary?.unsignedEngagements ?? 0}
          isLoading={isLoading}
          onClick={() => navigate('/clients')}
          footer={<span className="text-slate-400">Sent, awaiting client signature</span>}
        />
        <KpiCard
          title="MTD Compliance" icon={ShieldCheck} tone={(summary?.mtdComplianceRate ?? 100) >= 90 ? 'green' : 'amber'}
          value={summary?.mtdComplianceRate != null ? `${summary.mtdComplianceRate}%` : '—'}
          isLoading={isLoading}
          onClick={() => navigate('/mtd')}
          footer={<span className="text-slate-400">{summary?.mtdClients ?? 0} MTD client{(summary?.mtdClients ?? 0) === 1 ? '' : 's'} with up-to-date obligations</span>}
        />
        <KpiCard
          title="Revenue This Month" icon={Banknote} tone="green"
          value={money(summary?.revenueThisMonth ?? 0)}
          isLoading={isLoading}
          onClick={() => navigate('/clients')}
          footer={<span className="text-slate-400">Paid invoices this calendar month</span>}
        />
      </div>

      {/* Deadlines — what's urgent, what's next (engine-scoped; inherits assignment-scoping) */}
      <div className="mb-8">
        <DashboardDeadlinesPanel />
      </div>

      {/* Recent activity (real job events) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-2">
          <Activity size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />)}</div>
        ) : (summary?.recentActivity?.length ?? 0) === 0 ? (
          <div className="p-6 text-slate-400 text-center py-10 text-sm">No activity yet — events appear here as jobs are created and progressed.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary!.recentActivity.map((e, i) => (
              <li key={i} className="px-6 py-3.5 flex items-center justify-between text-sm">
                <span className="text-slate-700">
                  <strong>{e.clientName}</strong> — {(ACTIVITY_TEXT[e.eventType] || (() => `${e.eventType} on "${e.jobTitle}"`))(e)}
                </span>
                <span className="text-xs text-slate-400 whitespace-nowrap ml-4">{timeAgo(e.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
