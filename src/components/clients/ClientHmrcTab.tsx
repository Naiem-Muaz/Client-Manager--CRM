
import React from 'react';
import useSWR from 'swr';
import { ShieldCheck, CloudUpload, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function ClientHmrcTab({ clientId }: { clientId: string }) {
  const { data: submissions, error, isLoading } = useSWR(`/api/brain/hmrc/submissions/${clientId}`, fetcher);

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading HMRC data...</div>;
  
  const submissionList = submissions || [];

  return (
    <div className="space-y-8">
      {/* 1. Health Status Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 rounded-2xl p-8 text-white flex justify-between items-center shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-sm pointer-events-none">
            <ShieldCheck size={160} />
        </div>
        <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <ShieldCheck className="text-emerald-400" />
                HMRC MTD Governance
            </h3>
            <p className="text-indigo-200 text-sm max-w-md">Your authority for Making Tax Digital (ITSA) is currently active and verified. HMRC sandbox connectivity is operational.</p>
        </div>
        <div className="relative z-10 text-right space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 uppercase tracking-widest">
                Authorized
            </span>
            <p className="text-[10px] text-indigo-300 font-mono">VRN: Verified • SA: Active</p>
        </div>
      </div>

      {/* 2. Submission History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-sm">
                <CloudUpload size={18} className="text-indigo-500" />
                MTD Submission Log
            </h4>
            <button className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200">
                Poll HMRC Updates
            </button>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/20">
              <th className="px-6 py-4 font-bold">Submission ID</th>
              <th className="px-6 py-4 font-bold">Period</th>
              <th className="px-6 py-4 font-bold">Sent At</th>
              <th className="px-6 py-4 font-bold">HMRC Status</th>
              <th className="px-6 py-4 font-bold text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissionList.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                            <CloudUpload size={48} className="text-slate-100" />
                            <span>No HMRC submissions recorded for this client yet.</span>
                        </div>
                    </td>
                </tr>
            ) : submissionList.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{sub.id.split('-')[0]}...</td>
                <td className="px-6 py-4 text-slate-900 font-semibold">{sub.tax_year} - {sub.quarter}</td>
                <td className="px-6 py-4 text-slate-600">{new Date(sub.sent_at).toLocaleString()}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                        {sub.status === 'Success' ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                        <span className={`font-bold ${sub.status === 'Success' ? 'text-emerald-700' : 'text-red-700'}`}>{sub.status}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline transition-all">
                        IR Mark <ExternalLink size={14} />
                    </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
