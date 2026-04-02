
import React from 'react';
import { useSWRConfig } from 'swr';
import useSWR from 'swr';
import { Camera, Calendar, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function ClientSnapshotsTab({ clientId }: { clientId: string }) {
  const { data: snapshots, error, isLoading } = useSWR(`/api/brain/itsa/snapshots/client/${clientId}`, fetcher);

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading snapshots...</div>;
  if (error) return <div className="p-8 text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
      <h4 className="font-bold flex items-center gap-2 mb-1"><Clock size={16}/> Snapshot data unavailable</h4>
      <p className="text-sm opacity-90">Please ensure the client has at least one active tax year recording data.</p>
  </div>;

  const snapshotList = snapshots || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snapshotList.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} />
            </div>
            <h4 className="text-slate-900 font-bold">No Snapshots Found</h4>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Quarterly snapshots are created automatically when you finalise a period for review.</p>
          </div>
        ) : snapshotList.map((s: any) => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start">
              <div>
                <h4 className="font-bold text-slate-900">{s.tax_year} - {s.quarter}</h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                  <Calendar size={12} />
                  {new Date(s.period_start).toLocaleDateString()} - {new Date(s.period_end).toLocaleDateString()}
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                s.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 
                s.status === 'finalised' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {s.status}
              </span>
            </div>
            <div className="p-5 flex-1 grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Net Profit</span>
                    <p className="text-lg font-bold text-slate-900">£{parseFloat(s.snapshot_json?.totals?.netProfit || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Tax Est.</span>
                    <p className="text-lg font-bold text-blue-600">£{parseFloat(s.snapshot_json?.totals?.estimatedTax || 0).toLocaleString()}</p>
                </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-blue-50/50 transition-colors">
                <span className="text-[10px] font-mono text-slate-400">ID: {s.id.split('-')[0]}</span>
                <button className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">View Details &rarr;</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
