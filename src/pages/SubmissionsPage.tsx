
import React from 'react';
import useSWR from 'swr';
import { CloudUpload, Filter, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function SubmissionsPage() {
  const { data: submissions, error, isLoading } = useSWR('/api/brain/hmrc/submissions/all', fetcher);

  if (isLoading) return <div className="p-8 space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-slate-100 rounded"></div>
      <div className="h-64 bg-slate-100 rounded-xl"></div>
  </div>;

  const submissionList = submissions || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">MTD Submissions</h1>
          <p className="text-slate-500 mt-1">Monitor all HMRC filings across your client base.</p>
        </div>
        <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Filter size={16} />
                Filter
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                <Download size={16} />
                Export CSV
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Total Submissions</h4>
              <p className="text-2xl font-bold text-slate-900">{submissionList.length}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-emerald-500 text-xs font-bold uppercase tracking-wider mb-2">Success Rate</h4>
              <p className="text-2xl font-bold text-slate-900">100%</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-red-500 text-xs font-bold uppercase tracking-wider mb-2">Failed</h4>
              <p className="text-2xl font-bold text-slate-900">0</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-2">Pending</h4>
              <p className="text-2xl font-bold text-slate-900">2</p>
          </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/30">
              <th className="px-6 py-4 font-bold">Client</th>
              <th className="px-6 py-4 font-bold">Submission ID</th>
              <th className="px-6 py-4 font-bold">Period</th>
              <th className="px-6 py-4 font-bold">Sent At</th>
              <th className="px-6 py-4 font-bold">Status</th>
              <th className="px-6 py-4 font-bold text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissionList.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-20 text-center text-slate-400">
                        No submissions recorded for this firm.
                    </td>
                </tr>
            ) : submissionList.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-bold text-slate-900">{sub.client_name}</td>
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{sub.id.split('-')[0]}...</td>
                <td className="px-6 py-4">{sub.tax_year} - {sub.quarter}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(sub.sent_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                        {sub.status === 'Success' ? <CheckCircle size={16} className="text-emerald-500" /> : <Clock size={16} className="text-blue-500" />}
                        <span className={`font-bold ${sub.status === 'Success' ? 'text-emerald-700' : 'text-blue-700'}`}>{sub.status}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-bold hover:underline">View Receipt</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
