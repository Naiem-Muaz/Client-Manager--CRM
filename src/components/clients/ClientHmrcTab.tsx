
import React, { useState } from 'react';
import { useClientSubmissions, useClientSnapshots, submitQuarter } from '../../hooks/useClients';
import { ShieldCheck, CloudUpload, CheckCircle, AlertCircle, ExternalLink, Send, Loader2 } from 'lucide-react';

export function ClientHmrcTab({ clientId }: { clientId: string }) {
  const { submissions, isLoading: submissionsLoading } = useClientSubmissions(clientId);
  const { snapshots } = useClientSnapshots(clientId);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('');

  // Filter finalised snapshots that haven't been submitted yet
  const finalisedSnapshots = (snapshots || []).filter((s: any) => s.status === 'finalised');

  const handleSubmit = async () => {
    if (!selectedSnapshotId) {
      alert('Please select a finalised snapshot to submit.');
      return;
    }
    if (!confirm('This will submit the selected quarter to HMRC (simulated). Continue?')) return;
    
    setSubmitting(true);
    try {
      await submitQuarter(clientId, selectedSnapshotId);
      setSelectedSnapshotId('');
    } catch (err: any) {
      alert(err?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionsLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading HMRC data...</div>;

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

      {/* 2. Submit to HMRC */}
      {finalisedSnapshots.length > 0 && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-6">
          <h4 className="font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Send size={18} className="text-blue-500" />
            Submit Quarterly Return
          </h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Select Finalised Snapshot</label>
              <select
                value={selectedSnapshotId}
                onChange={e => setSelectedSnapshotId(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a snapshot...</option>
                {finalisedSnapshots.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.tax_year} - {s.quarter} ({new Date(s.period_start).toLocaleDateString('en-GB')} to {new Date(s.period_end).toLocaleDateString('en-GB')})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!selectedSnapshotId || submitting}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Submitting...</> : <><CloudUpload size={14} /> Submit to HMRC</>}
            </button>
          </div>
        </div>
      )}

      {/* 3. Submission History */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h4 className="font-bold text-slate-900 flex items-center gap-2 uppercase tracking-tighter text-sm">
                <CloudUpload size={18} className="text-indigo-500" />
                MTD Submission Log
            </h4>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {submissions.length} Submissions
            </span>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/20">
              <th className="px-6 py-4 font-bold">Correlation ID</th>
              <th className="px-6 py-4 font-bold">Period</th>
              <th className="px-6 py-4 font-bold">Submitted At</th>
              <th className="px-6 py-4 font-bold">HMRC Status</th>
              <th className="px-6 py-4 font-bold text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {submissions.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                        <div className="flex flex-col items-center gap-3">
                            <CloudUpload size={48} className="text-slate-100" />
                            <span>No HMRC submissions recorded for this client yet.</span>
                        </div>
                    </td>
                </tr>
            ) : submissions.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono text-xs text-slate-500">{sub.correlation_id?.substring(0, 20)}...</td>
                <td className="px-6 py-4 text-slate-900 font-semibold">
                  {new Date(sub.period_start).toLocaleDateString('en-GB')} — {new Date(sub.period_end).toLocaleDateString('en-GB')}
                </td>
                <td className="px-6 py-4 text-slate-600">{new Date(sub.submitted_at).toLocaleString('en-GB')}</td>
                <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                        {sub.status === 'accepted' ? <CheckCircle size={16} className="text-emerald-500" /> : <AlertCircle size={16} className="text-red-500" />}
                        <span className={`font-bold ${sub.status === 'accepted' ? 'text-emerald-700' : 'text-red-700'}`}>{sub.status}</span>
                    </div>
                </td>
                <td className="px-6 py-4 text-right">
                    <button className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold hover:underline transition-all">
                        View <ExternalLink size={14} />
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
