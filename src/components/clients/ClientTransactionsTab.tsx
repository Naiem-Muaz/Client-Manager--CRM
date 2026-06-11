
import React, { useState } from 'react';
import { useClientTransactions, reviewTransaction, updateTransaction } from '../../hooks/useClients';
import { FileText, ArrowDownLeft, ArrowUpRight, CheckCircle, Edit3, Loader2 } from 'lucide-react';

const HMRC_CATEGORIES = [
  'Cost of goods',
  'Car, van and travel',
  'Wages and staff costs',
  'Rent, rates, power',
  'Repairs and maintenance',
  'Admin and office',
  'Advertising and marketing',
  'Interest and bank charges',
  'Other expenses',
];

const STATUS_BADGES: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-amber-100', text: 'text-amber-700' },
  reviewed: { bg: 'bg-blue-100', text: 'text-blue-700' },
  finalised: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
};

export function ClientTransactionsTab({ clientId }: { clientId: string }) {
  const { transactions, isLoading, isError, mutate } = useClientTransactions(clientId);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleReview = async (txnId: string) => {
    setReviewingId(txnId);
    try {
      await reviewTransaction(clientId, txnId);
      mutate();
    } catch (err: any) {
      alert(err?.error || 'Failed to review transaction');
    } finally {
      setReviewingId(null);
    }
  };

  const handleCategoryChange = async (txnId: string, newCategory: string) => {
    try {
      await updateTransaction(clientId, txnId, { category: newCategory });
      mutate();
      setEditingId(null);
    } catch (err: any) {
      alert(err?.error || 'Failed to update category');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading transactions...</div>;
  if (isError) return <div className="p-8 text-red-600">Failed to load transactions.</div>;

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
              <th className="px-6 py-3 font-bold text-center">Status</th>
              <th className="px-6 py-3 font-bold text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">No transactions found for this client.</td>
                </tr>
            ) : transactions.map((t: any) => {
              const statusStyle = STATUS_BADGES[t.review_status] || STATUS_BADGES.draft;
              const amt = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount);
              const isExpense = t.type === 'expense' || amt < 0;
              const displayDate = t.transaction_date || t.date;

              return (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-600 font-medium whitespace-nowrap">
                    {displayDate ? new Date(displayDate).toLocaleDateString('en-GB') : '-'}
                  </td>
                  <td className="px-6 py-4">
                      <div className="flex flex-col">
                          <span className="text-slate-900 font-semibold">{t.description}</span>
                          <span className="text-[10px] text-slate-400 font-mono">ID: {t.id?.split('-')[0]}</span>
                      </div>
                  </td>
                  <td className="px-6 py-4">
                    {editingId === t.id ? (
                      <select
                        className="text-xs border border-blue-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        defaultValue={t.hmrc_category || t.category || ''}
                        onChange={(e) => handleCategoryChange(t.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      >
                        {HMRC_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium whitespace-nowrap cursor-pointer hover:bg-blue-50 hover:text-blue-600 transition-colors inline-flex items-center gap-1"
                        onClick={() => t.review_status !== 'finalised' && setEditingId(t.id)}
                        title={t.review_status === 'finalised' ? 'Locked — cannot edit' : 'Click to edit category'}
                      >
                          {t.hmrc_category || t.category || 'Uncategorised'}
                          {t.review_status !== 'finalised' && <Edit3 size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                          <span className={`font-bold ${isExpense ? 'text-red-500' : 'text-emerald-600'}`}>
                              {isExpense ? '-' : '+'}£{Math.abs(amt).toLocaleString('en-GB', { minimumFractionDigits: 2 })}
                          </span>
                          {isExpense ? <ArrowUpRight size={14} className="text-red-400" /> : <ArrowDownLeft size={14} className="text-emerald-400" />}
                      </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.text}`}>
                          {t.review_status || 'draft'}
                      </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {t.review_status === 'draft' && (
                      <button
                        onClick={() => handleReview(t.id)}
                        disabled={reviewingId === t.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {reviewingId === t.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                        Mark Reviewed
                      </button>
                    )}
                    {t.review_status === 'reviewed' && (
                      <span className="text-xs text-blue-500 font-medium">✓ Reviewed</span>
                    )}
                    {t.review_status === 'finalised' && (
                      <span className="text-xs text-emerald-500 font-medium">🔒 Locked</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
