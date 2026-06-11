
import React, { useState } from 'react';
import { useClientSnapshots, generateSnapshot, finaliseSnapshot } from '../../hooks/useClients';
import { Camera, Calendar, CheckCircle2, Clock, Lock, Loader2, Plus } from 'lucide-react';

export function ClientSnapshotsTab({ clientId }: { clientId: string }) {
  const { snapshots, isLoading, isError, mutate } = useClientSnapshots(clientId);
  const [generating, setGenerating] = useState(false);
  const [finalisingId, setFinalisingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [periodStart, setPeriodStart] = useState('2026-04-06');
  const [periodEnd, setPeriodEnd] = useState('2026-07-05');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateSnapshot(clientId, periodStart, periodEnd);
      mutate();
      setShowForm(false);
    } catch (err: any) {
      alert(err?.error || 'Failed to generate snapshot');
    } finally {
      setGenerating(false);
    }
  };

  const handleFinalise = async (snapshotId: string) => {
    if (!confirm('Finalising will lock all transactions in this period. Continue?')) return;
    setFinalisingId(snapshotId);
    try {
      await finaliseSnapshot(clientId, snapshotId);
      mutate();
    } catch (err: any) {
      alert(err?.error || 'Failed to finalise snapshot');
    } finally {
      setFinalisingId(null);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading snapshots...</div>;
  if (isError) return <div className="p-8 text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
      <h4 className="font-bold flex items-center gap-2 mb-1"><Clock size={16}/> Snapshot data unavailable</h4>
      <p className="text-sm opacity-90">Please ensure the client has at least one active tax year recording data.</p>
  </div>;

  return (
    <div className="space-y-6">
      {/* Generate Snapshot Button */}
      <div className="flex justify-end">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm shadow-sm"
          >
            <Plus size={16} /> Generate Snapshot
          </button>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 w-full max-w-md">
            <h4 className="font-bold text-slate-900 mb-4">Generate Quarterly Snapshot</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Period Start</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Period End</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleGenerate} disabled={generating}
                  className="flex-1 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {generating ? <><Loader2 size={14} className="animate-spin" /> Generating...</> : 'Generate'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 font-medium rounded-lg hover:bg-slate-200 transition text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {snapshots.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera size={32} />
            </div>
            <h4 className="text-slate-900 font-bold">No Snapshots Found</h4>
            <p className="text-slate-500 text-sm mt-1 max-w-xs mx-auto">Use the Generate Snapshot button to create a quarterly snapshot from your transaction data.</p>
          </div>
        ) : snapshots.map((s: any) => {
          const snapshotData = s.snapshot_json || {};
          const netProfit = snapshotData.netProfit || (s.net_profit ? s.net_profit / 100 : 0);
          const estimatedTax = snapshotData.totals?.estimatedTax || 0;

          return (
            <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
              <div className="p-5 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-slate-900">{s.tax_year || '—'} - {s.quarter || '—'}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                    <Calendar size={12} />
                    {new Date(s.period_start).toLocaleDateString('en-GB')} - {new Date(s.period_end).toLocaleDateString('en-GB')}
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
                      <p className="text-lg font-bold text-slate-900">£{Number(netProfit).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">Tax Est.</span>
                      <p className="text-lg font-bold text-blue-600">£{Number(estimatedTax).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
              </div>
              <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center group-hover:bg-blue-50/50 transition-colors">
                  <span className="text-[10px] font-mono text-slate-400">ID: {s.id.split('-')[0]}</span>
                  {s.status === 'draft' && (
                    <button
                      onClick={() => handleFinalise(s.id)}
                      disabled={finalisingId === s.id}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
                    >
                      {finalisingId === s.id ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
                      Finalise
                    </button>
                  )}
                  {s.status === 'finalised' && (
                    <span className="text-xs font-bold text-blue-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Ready to Submit
                    </span>
                  )}
                  {s.status === 'submitted' && (
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Submitted
                    </span>
                  )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
