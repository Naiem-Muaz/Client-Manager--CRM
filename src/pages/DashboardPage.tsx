import React from 'react';
import { useClients } from '../hooks/useClients';
import { useTasksSummary } from '../hooks/useTasks';
import { useComplianceSummary } from '../hooks/useCompliance';

function KpiCard({
  title,
  value,
  isLoading,
  footer,
}: {
  title: string;
  value: React.ReactNode;
  isLoading: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">{title}</h3>
      {isLoading ? (
        <div className="h-9 w-20 bg-slate-100 rounded animate-pulse mt-2" />
      ) : (
        <p className="text-3xl font-bold text-slate-900 mt-2">{value}</p>
      )}
      {!isLoading && footer ? <div className="text-sm font-medium mt-1 inline-block">{footer}</div> : null}
    </div>
  );
}

export function DashboardPage() {
  const { clients, isLoading: clientsLoading } = useClients();
  const { summary: tasksSummary, isLoading: tasksLoading } = useTasksSummary();
  const { summary: complianceSummary, isLoading: complianceLoading } = useComplianceSummary();

  const dataList = Array.isArray(clients) ? clients : (clients as any)?.data || [];
  const totalClients = dataList.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Partner Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <KpiCard
          title="Total Clients"
          value={totalClients}
          isLoading={clientsLoading}
          footer={<span className="text-green-600">↑ Connected to NextGen API</span>}
        />
        <KpiCard
          title="Pending Tasks"
          value={tasksSummary?.pending ?? 0}
          isLoading={tasksLoading}
          footer={
            (tasksSummary?.highPriority ?? 0) > 0 ? (
              <span className="text-orange-600">{tasksSummary?.highPriority} high priority</span>
            ) : (
              <span className="text-slate-400">No high priority</span>
            )
          }
        />
        <KpiCard
          title="Overdue Obligations"
          value={complianceSummary?.overdue ?? 0}
          isLoading={complianceLoading}
          footer={
            (complianceSummary?.overdue ?? 0) > 0 ? (
              <span className="text-red-600">Needs attention</span>
            ) : (
              <span className="text-green-600">All on track</span>
            )
          }
        />
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Recent Activity</h2>
        </div>
        <div className="p-6 text-slate-500 text-center py-12">
          Activity feed coming soon...
        </div>
      </div>
    </div>
  );
}
