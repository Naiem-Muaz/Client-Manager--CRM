import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useComplianceSummary, useComplianceClients, ClientComplianceRow, ComplianceSummary } from '../hooks/useCompliance';
import { ShieldAlert, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export function ComplianceDashboard() {
  const { summary, isLoading: isSummaryLoading, isError: summaryError } = useComplianceSummary();
  const { clients, isLoading: isClientsLoading, isError: clientsError } = useComplianceClients();

  const [filter, setFilter] = useState<'all' | 'red' | 'amber' | 'green'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  if (summaryError || clientsError) {
    return (
      <div className="p-8 bg-red-50 text-red-700 rounded-lg border border-red-200">
        Failed to load compliance data. Ensure the NextGen ORCHESTRATOR is running.
      </div>
    );
  }

  if (isSummaryLoading || isClientsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-xl" />
        <div className="h-64 bg-slate-100 rounded-xl" />
      </div>
    );
  }

  const KPICard = ({ title, value, icon, colorClass }: { title: string, value: number, icon: React.ReactNode, colorClass: string }) => (
    <div className={`p-6 rounded-xl border bg-white flex items-center justify-between ${colorClass}`}>
      <div>
        <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
        <p className="text-3xl font-bold">{value}</p>
      </div>
      <div className="p-3 rounded-full opacity-80 bg-white">
        {icon}
      </div>
    </div>
  );

  const StatusBadge = ({ status, type }: { status: string, type: 'risk' | 'deadline' | 'submission' | 'cdd' }) => {
    let color = 'bg-slate-100 text-slate-700';
    if (type === 'risk') {
      if (status === 'red') color = 'bg-red-100 text-red-700 border border-red-200';
      if (status === 'amber') color = 'bg-amber-100 text-amber-700 border border-amber-200';
      if (status === 'green') color = 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }
    if (type === 'deadline') {
      if (status === 'overdue') color = 'bg-red-100 text-red-700';
      if (status === 'urgent') color = 'bg-orange-100 text-orange-700';
      if (status === 'due_soon') color = 'bg-amber-100 text-amber-700';
      if (status === 'resolved') color = 'bg-emerald-100 text-emerald-700';
    }
    if (type === 'cdd') {
      if (status === 'approved') color = 'bg-emerald-100 text-emerald-700';
      else color = 'bg-amber-100 text-amber-700';
    }

    return (
      <span className={`px-2.5 py-1 text-xs font-medium rounded-full uppercase tracking-wider ${color}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const filteredClients = clients.filter(c => {
    const matchesFilter = filter === 'all' || c.risk_level === filter;
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const total = summary?.total_clients || 1;
  const redPct = summary ? Math.round((summary.overdue / total) * 100) : 0;
  const greenPct = summary ? Math.round((summary.ready / total) * 100) : 0;
  const amberPct = summary ? Math.round(((summary.issues - summary.overdue) / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Firm Compliance</h1>
          <p className="text-slate-500 mt-1">Real-time risk detection and MTD ITSA obligations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard 
          title="Total Clients" 
          value={summary?.total_clients || 0} 
          icon={<ShieldAlert className="w-6 h-6 text-slate-500" />} 
          colorClass="border-slate-200" 
        />
        <KPICard 
          title="Ready For Submission" 
          value={summary?.ready || 0} 
          icon={<CheckCircle className="w-6 h-6 text-emerald-600" />} 
          colorClass="border-emerald-200 bg-emerald-50" 
        />
        <KPICard 
          title="Compliance Issues" 
          value={summary?.issues || 0} 
          icon={<AlertCircle className="w-6 h-6 text-amber-600" />} 
          colorClass="border-amber-200 bg-amber-50" 
        />
        <KPICard 
          title="Overdue Obligations" 
          value={summary?.overdue || 0} 
          icon={<Clock className="w-6 h-6 text-red-600" />} 
          colorClass="border-red-200 bg-red-50" 
        />
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">Firm Risk Distribution</h3>
        <div className="w-full h-8 flex rounded-full overflow-hidden bg-slate-100">
          <div style={{ width: `${greenPct}%` }} className="bg-emerald-400 h-full transition-all duration-500" title={`Compliant (${greenPct}%)`} />
          <div style={{ width: `${amberPct}%` }} className="bg-amber-400 h-full transition-all duration-500" title={`Needs Attention (${amberPct}%)`} />
          <div style={{ width: `${redPct}%` }} className="bg-red-500 h-full transition-all duration-500" title={`Critical/Overdue (${redPct}%)`} />
        </div>
        <div className="flex items-center gap-6 mt-3 text-sm text-slate-600">
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-400"></span> Fully Compliant</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-400"></span> Action Required</div>
          <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500"></span> Critical / Overdue</div>
        </div>
      </div>

      <div className="bg-white border text-left border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50">
          <input 
            type="text" 
            placeholder="Search clients..." 
            className="px-3 py-2 border rounded-md text-sm w-full sm:w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="flex gap-2">
            {(['all', 'red', 'amber', 'green'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${filter === f ? 'bg-slate-800 text-white' : 'bg-white border text-slate-600 hover:bg-slate-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">CDD</th>
                <th className="px-6 py-4 font-medium">HMRC Link</th>
                <th className="px-6 py-4 font-medium">Obligations</th>
                <th className="px-6 py-4 font-medium">Risk Level</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map(client => (
                <tr key={client.client_id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-900 font-medium">
                    <Link to={`/clients/${client.client_id}`} className="hover:text-blue-600">{client.name}</Link>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={client.cdd_status} type="cdd" />
                  </td>
                  <td className="px-6 py-4">
                    {client.authorised ? (
                       <span className="text-emerald-600 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> Active</span>
                    ) : (
                       <span className="text-slate-400">Disconnected</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {client.deadline_status !== 'unknown' ? (
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={client.deadline_status} type="deadline" />
                          <span className="text-xs text-slate-400">{client.days_remaining} days</span>
                        </div>
                    ) : <span className="text-slate-400">N/A</span>}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={client.risk_level} type="risk" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/clients/${client.client_id}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredClients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No clients found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
