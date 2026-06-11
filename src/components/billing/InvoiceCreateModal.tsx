import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Loader2 } from 'lucide-react';
import { createInvoice } from '../../hooks/useInvoices';

interface LineItem { description: string; quantity: number; unitPrice: number }
const blankItem = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0 });
const money = (n: number) => `£${n.toFixed(2)}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().split('T')[0]; };

export function InvoiceCreateModal({ clientId, clientName, onClose, onCreated }: {
  clientId: string;
  clientName?: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(new Date(), 30));
  const [items, setItems] = useState<LineItem[]>([blankItem()]);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'draft' | 'sent'>('draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = useMemo(() => items.reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0), [items]);
  const vatAmount = vatEnabled ? subtotal * 0.2 : 0;
  const total = subtotal + vatAmount;

  const setItem = (i: number, patch: Partial<LineItem>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const removeItem = (i: number) => setItems(items.length > 1 ? items.filter((_, idx) => idx !== i) : items);

  const submit = async () => {
    if (items.every(it => !it.description.trim())) { setError('Add at least one line item with a description.'); return; }
    setSaving(true); setError(null);
    try {
      await createInvoice(clientId, {
        invoiceDate, dueDate,
        lineItems: items.map(it => ({ description: it.description, quantity: it.quantity, unitPrice: it.unitPrice, amount: (it.quantity || 0) * (it.unitPrice || 0) })),
        subtotal, vatAmount, totalAmount: total, status, notes,
      });
      onCreated();
    } catch (e: any) { setError(e?.error || e?.message || 'Failed to create invoice'); setSaving(false); }
  };

  const field = 'px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900">New invoice{clientName ? ` — ${clientName}` : ''}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Invoice date</label>
              <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={`${field} w-full`} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Due date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={`${field} w-full`} /></div>
          </div>

          {/* Line items */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Line items</label>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-[10px] font-bold uppercase text-slate-400 px-1">
                <span className="col-span-6">Description</span><span className="col-span-2">Qty</span><span className="col-span-2">Unit £</span><span className="col-span-2 text-right">Amount</span>
              </div>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input value={it.description} onChange={e => setItem(i, { description: e.target.value })} placeholder="Service…" className={`${field} col-span-6`} />
                  <input type="number" min="0" step="1" value={it.quantity} onChange={e => setItem(i, { quantity: parseFloat(e.target.value) || 0 })} className={`${field} col-span-2`} />
                  <input type="number" min="0" step="0.01" value={it.unitPrice} onChange={e => setItem(i, { unitPrice: parseFloat(e.target.value) || 0 })} className={`${field} col-span-2`} />
                  <div className="col-span-2 flex items-center justify-end gap-1">
                    <span className="text-sm text-slate-700">{money((it.quantity || 0) * (it.unitPrice || 0))}</span>
                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setItems([...items, blankItem()])} className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Plus size={14} /> Add line</button>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-medium">{money(subtotal)}</span></div>
            <div className="flex justify-between items-center">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer">
                <input type="checkbox" checked={vatEnabled} onChange={e => setVatEnabled(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /> VAT (20%)
              </label>
              <span className="font-medium">{money(vatAmount)}</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-200"><span className="font-bold text-slate-800">Total</span><span className="font-bold text-slate-900">{money(total)}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as any)} className={`${field} w-full`}>
                <option value="draft">Draft</option><option value="sent">Sent</option>
              </select></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase block mb-1">Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${field} w-full resize-none`} placeholder="Optional" /></div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Create invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
