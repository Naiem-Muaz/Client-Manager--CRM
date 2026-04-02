
import React from 'react';
import { useClientFullData } from '../../hooks/useClients';
import { FileText, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

export function ClientTransactionsTab({ clientId }: { clientId: string }) {
  const { fullData, isLoading, isError } = useClientFullData(clientId);

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading transactions...</div>;
  if (isError || !fullData) return <div className="p-8 text-red-600">Failed to load transactions.</div>;

  const transactions = fullData.data.transactions || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-500" />
            Transaction Ledger
        </h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
            {transactions.length} Transactions
        </span>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-bold bg-slate-50/30">
              <th className="px-6 py-3 font-bold">Date</th>
              <th className="px-6 py-3 font-bold">Description</th>
              <th className="px-6 py-3 font-bold">Category</th>
              <th className="px-6 py-3 font-bold text-right">Amount (£)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
                <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No transactions found for this period.</td>
                </tr>
            ) : transactions.map((t: any) => (
              <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 text-slate-600 font-medium">{t.date}</td>
                <td className="px-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-slate-900 font-semibold">{t.description}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {t.id}</span>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium whitespace-nowrap">
                        {t.category || 'Uncategorised'}
                    </span>
                </td>
                <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                        <span className={`font-bold ${t.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                            {t.amount < 0 ? '-' : '+'}£{Math.abs(t.amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                        </span>
                        {t.amount < 0 ? <ArrowUpRight size={14} className="text-red-400" /> : <ArrowDownLeft size={14} className="text-emerald-400" />}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
