
import React from 'react';
import { useClients } from '../hooks/useClients';

export function DashboardPage() {
  const { clients, isLoading } = useClients();
  const dataList = Array.isArray(clients) ? clients : (clients as any)?.data || [];
  const totalClients = isLoading ? '...' : dataList.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Partner Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Clients</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">{totalClients}</p>
          <span className="text-green-600 text-sm font-medium mt-1 inline-block">↑ Connected to NextGen API</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Pending Tasks</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">34</p>
          <span className="text-orange-600 text-sm font-medium mt-1 inline-block">5 high priority</span>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-slate-500 text-sm font-medium uppercase tracking-wider">Revenue YTD</h3>
          <p className="text-3xl font-bold text-slate-900 mt-2">£450k</p>
          <span className="text-green-600 text-sm font-medium mt-1 inline-block">On track</span>
        </div>
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
