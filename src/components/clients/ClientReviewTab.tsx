import React, { useState, useEffect } from 'react';
import { 
  useClientTransactions, useClientAccounting, useClientTaxCalc, useClientSnapshots,
  checkHmrcReadiness, generateSnapshot, finaliseSnapshot, submitQuarter
} from '../../hooks/useClients';
import { FileText, CheckCircle, AlertTriangle, Send, BarChart3, Calculator, Loader2 } from 'lucide-react';

export function ClientReviewTab({ clientId }: { clientId: string }) {
  const { transactions, isLoading: txnLoading } = useClientTransactions(clientId);
  const { accounting, isLoading: accLoading } = useClientAccounting(clientId);
  const { taxCalc, isLoading: taxLoading } = useClientTaxCalc(clientId);
  const { snapshots, mutate: mutateSnapshots } = useClientSnapshots(clientId);
  
  const [submitting, setSubmitting] = useState(false);
  const [readiness, setReadiness] = useState<any>(null);

  useEffect(() => {
    checkHmrcReadiness().then(res => {
      setReadiness(res.data);
    }).catch(console.error);
  }, []);

  const isLoading = txnLoading || accLoading || taxLoading;
  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading review data...</div>;

  const finalisedSnapshots = (snapshots || []).filter((s: any) => s.status === 'finalised');
  const hasFinalisedSnapshot = finalisedSnapshots.length > 0;

  const handleSubmit = async () => {
    if (finalisedSnapshots.length === 0) {
      alert('No finalised snapshot available. Generate and finalise a snapshot first.');
      return;
    }
    setSubmitting(true);
    try {
      await submitQuarter(clientId, finalisedSnapshots[0].id);
      alert('Successfully submitted quarter to HMRC (simulated).');
      mutateSnapshots();
    } catch (err: any) {
      alert(err?.error || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Transaction Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Transaction Summary
          </h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {transactions?.length || 0} Transactions
          </span>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Amount (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(transactions || []).slice(0, 10).map((t: any) => (
              <tr key={t.id}>
                <td className="py-3 text-slate-700">{t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('en-GB') : '-'}</td>
                <td className="py-3 text-slate-700">{t.description}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    t.review_status === 'reviewed' ? 'bg-blue-100 text-blue-700' :
                    t.review_status === 'finalised' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{t.review_status || 'draft'}</span>
                </td>
                <td className={`py-3 text-right font-medium ${parseFloat(t.amount) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {parseFloat(t.amount) < 0 ? '-' : '+'}£{Math.abs(parseFloat(t.amount)).toFixed(2)}
                </td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">No transactions found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 2. Accounting & Tax */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-indigo-500" />
            Profit & Loss
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Turnover</span>
              <span className="font-medium text-slate-900">£{accounting?.turnover?.pounds || '0.00'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Expenses</span>
              <span className="font-medium text-slate-900">£{accounting?.expenses?.pounds || '0.00'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Disallowable</span>
              <span className="font-medium text-amber-600">£{accounting?.disallowables?.pounds || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold pt-2">
              <span className="text-slate-900">Net Profit</span>
              <span className="text-emerald-600">£{accounting?.net_profit?.pounds || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-slate-900">Adjusted Profit</span>
              <span className="text-blue-600">£{accounting?.adjusted_profit?.pounds || '0.00'}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calculator size={20} className="text-purple-500" />
            Tax Calculation
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Adjusted Profit</span>
              <span className="font-medium text-slate-900">£{taxCalc?.adjusted_profit || '0.00'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Personal Allowance</span>
              <span className="font-medium text-slate-900">-£{taxCalc?.personal_allowance || '0.00'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Taxable Income</span>
              <span className="font-medium text-slate-900">£{taxCalc?.taxable_income || '0.00'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Rate</span>
              <span className="font-medium text-slate-900">{taxCalc?.basic_rate || '20%'}</span>
            </div>
            <div className="flex justify-between font-bold pt-2">
              <span className="text-slate-900">Income Tax</span>
              <span className="text-blue-600">£{taxCalc?.income_tax || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Readiness and Submission */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-200 pb-2">Review & Submission</h3>
        
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          <div className="flex-1 space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
              <div className="mt-0.5">
                {hasFinalisedSnapshot ? <CheckCircle className="text-emerald-500" size={24} /> : <AlertTriangle className="text-amber-500" size={24} />}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Snapshot Status</h4>
                <p className="text-sm text-slate-500">
                  {hasFinalisedSnapshot 
                    ? `${finalisedSnapshots.length} finalised snapshot(s) ready for submission.` 
                    : 'No finalised snapshot. Go to Snapshots tab to generate and finalise one.'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
              <div className="mt-0.5">
                {readiness?.ready ? <CheckCircle className="text-emerald-500" size={24} /> : <AlertTriangle className="text-amber-500" size={24} />}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">HMRC Readiness</h4>
                <p className="text-sm text-slate-500">
                  {readiness ? readiness.message : 'Checking readiness...'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-1/3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
             <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Send size={32} />
             </div>
             <h4 className="font-bold text-slate-900 mb-2">Submit to HMRC</h4>
             <p className="text-sm text-slate-500 mb-6">File the quarterly MTD return.</p>
             <button
                onClick={handleSubmit}
                disabled={!hasFinalisedSnapshot || !readiness?.ready || submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition shadow-sm flex items-center justify-center gap-2"
             >
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : 'Submit Quarter'}
             </button>
          </div>
        </div>

      </div>

    </div>
  );
}
