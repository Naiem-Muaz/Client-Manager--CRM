import React, { useState, useEffect } from 'react';
import { useClientFullData, approveClient, checkHmrcReadiness, submitQuarter, processAccounting } from '../../hooks/useClients';
import { FileText, CheckCircle, AlertTriangle, Send, RefreshCw } from 'lucide-react';

export function ClientReviewTab({ clientId }: { clientId: string }) {
  const { fullData, isLoading, isError, mutate } = useClientFullData(clientId);
  const [approving, setApproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [readiness, setReadiness] = useState<any>(null);

  useEffect(() => {
    // Fetch readiness check on mount
    checkHmrcReadiness().then(res => {
      setReadiness(res.data);
    }).catch(console.error);
  }, []);

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading review data...</div>;
  if (isError || !fullData) return <div className="p-8 text-red-600">Failed to load client full data.</div>;

  const data = fullData.data;
  const { client, transactions, snapshot, taxCalculation, hmrcStatus } = data;
  
  const isApproved = client.is_active === false; // derived from our backend logic
  
  const handleApprove = async () => {
    setApproving(true);
    try {
      await approveClient(clientId);
      mutate(undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    } finally {
      setApproving(false);
    }
  };

  const handleProcess = async () => {
    if (!data.profile.tax_year_id) return;
    setProcessing(true);
    try {
      await processAccounting(clientId, data.profile.tax_year_id);
      mutate(undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to process accounting');
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitQuarter(clientId);
      alert('Successfully submitted quarter to HMRC!');
      mutate(undefined);
    } catch (err: any) {
      alert(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Recent Transactions
          </h3>
          <button 
            onClick={handleProcess}
            disabled={processing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-medium rounded-lg hover:bg-blue-100 transition text-sm"
          >
            <RefreshCw size={16} className={processing ? 'animate-spin' : ''} />
            {processing ? 'Processing...' : 'Process Accounting'}
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium text-right">Amount (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions?.map((t: any) => (
              <tr key={t.id}>
                <td className="py-3 text-slate-700">{t.date}</td>
                <td className="py-3 text-slate-700">{t.description}</td>
                <td className={`py-3 text-right font-medium ${t.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {t.amount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 2. Snapshot & Tax */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Accounts Snapshot</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Total Revenue</span>
              <span className="font-medium text-slate-900">£{snapshot?.totalRevenue}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Total Expenses</span>
              <span className="font-medium text-slate-900">£{snapshot?.totalExpenses}</span>
            </div>
            <div className="flex justify-between font-bold pt-2">
              <span className="text-slate-900">Net Profit</span>
              <span className="text-emerald-600">£{snapshot?.netProfit}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Tax Calculation</h3>
          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Taxable Income</span>
              <span className="font-medium text-slate-900">£{taxCalculation?.taxableIncome}</span>
            </div>
            <div className="flex justify-between font-bold pt-2">
              <span className="text-slate-900">Estimated Tax</span>
              <span className="text-blue-600">£{taxCalculation?.estimatedTax}</span>
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
                {isApproved ? <CheckCircle className="text-emerald-500" size={24} /> : <AlertTriangle className="text-amber-500" size={24} />}
              </div>
              <div>
                <h4 className="font-semibold text-slate-900">Client Approval</h4>
                <p className="text-sm text-slate-500">
                  {isApproved ? 'Client has been approved for submission.' : 'Approval required before submission.'}
                </p>
                {!isApproved && (
                  <button 
                    onClick={handleApprove}
                    disabled={approving}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                  >
                    {approving ? 'Approving...' : 'Approve Accounts'}
                  </button>
                )}
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
                disabled={!isApproved || !readiness?.ready || submitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition shadow-sm"
             >
                {submitting ? 'Submitting...' : 'Submit Quarter'}
             </button>
          </div>
        </div>

      </div>

    </div>
  );
}
