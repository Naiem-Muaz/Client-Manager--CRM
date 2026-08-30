import React, { useState } from 'react';
import { Briefcase, Plus, X, Loader2, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useIncomeSources, addIncomeSource, removeIncomeSource, IncomeSource } from '../../hooks/useClients';
import { errMsg } from '../../lib/errMsg';

const inputCls = 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

const TYPES: Array<[string, string]> = [
  ['SOLE_TRADE', 'Self-employment'],
  ['UK_PROPERTY', 'UK property'],
  ['PARTNERSHIP', 'Partnership'],
];
const TYPE_LABEL = (t: string) => TYPES.find(([k]) => k === t)?.[1] ?? t.replace(/_/g, ' ');

/**
 * ── INCOME SOURCES ──────────────────────────────────────────────────────────
 *
 * A client's businesses. HMRC requires a quarterly update PER SOURCE, so this
 * list is what decides whether an enrolled client has anything to file — a
 * client with none correctly has no quarterly obligations, which is why the
 * enrolment card says so in words instead of showing an unexplained zero.
 *
 * ⚠️ ONLY STAFF-CREATED ROWS CAN BE REMOVED HERE. A source the client added in
 * the app is their record of their own business; deleting it from the practice
 * side would remove something the app still shows them.
 *
 * ⚠️ TURNOVER IS OPTIONAL AND NEVER DEFAULTED. The path this replaces wrote
 * £45,000 for everyone who had no source. An absent figure is absent.
 */
export function IncomeSourcesSection({ clientId }: { clientId: string }) {
  const { sources, isLoading } = useIncomeSources(clientId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('SOLE_TRADE');
  const [method, setMethod] = useState('cash');
  const [turnover, setTurnover] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [regen, setRegen] = useState<{ message: string; ran?: boolean } | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr('A trading name is required.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await addIncomeSource(clientId, {
        trading_name: name.trim(), source_type: type,
        accounting_method: method, estimated_turnover: turnover.trim() || null,
      });
      if (res?.regeneration?.message) setRegen(res.regeneration);
      setAdding(false); setName(''); setTurnover('');
    } catch (e: any) { setErr(errMsg(e, 'Could not add the income source.')); }
    finally { setBusy(false); }
  };

  const remove = async (s: IncomeSource) => {
    if (!window.confirm(`Remove “${s.trading_name}”?\n\nThis also removes the quarterly obligations generated for it.`)) return;
    try {
      const res = await removeIncomeSource(clientId, s.id);
      if (res?.regeneration?.message) setRegen(res.regeneration);
    } catch (e: any) { window.alert(errMsg(e, 'Could not remove the income source.')); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Briefcase size={20} className="text-blue-500" /> Income sources
          {sources.length > 0 && <span className="text-xs font-normal text-slate-400">({sources.length})</span>}
        </h3>
        {!adding && (
          <button onClick={() => { setAdding(true); setErr(null); }}
            className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Plus size={12} /> Add source
          </button>
        )}
      </div>

      {regen && (
        <div className={`mb-4 flex items-start gap-2 p-3 rounded-lg border text-sm ${
          regen.ran === false ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
          <ShieldCheck size={15} className="shrink-0 mt-0.5" />
          <span>{regen.message}</span>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && sources.length === 0 && !adding && (
        <p className="text-sm text-slate-400">
          No income sources. HMRC requires a quarterly update per business, so an enrolled client
          with none has no quarterly obligations.
        </p>
      )}

      <ul className="space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
            <div className="min-w-0">
              <span className="text-sm text-slate-800">{s.trading_name}</span>
              <span className="ml-2 text-[11px] text-slate-500">{TYPE_LABEL(s.source_type)}</span>
              {s.estimated_turnover != null && (
                <span className="ml-2 text-[11px] text-slate-400">£{Number(s.estimated_turnover).toLocaleString('en-GB')}</span>
              )}
              {/* ⛔ An unlinked source generates NOTHING. Saying so beats an
                  unexplained absence of obligations. */}
              {!s.linked_to_entity && (
                <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-amber-700">
                  <AlertTriangle size={11} /> not linked — generates no obligations
                </span>
              )}
            </div>
            {s.created_via === 'crm_staff' ? (
              <button onClick={() => remove(s)} title="Remove this income source"
                className="p-1.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0">
                <Trash2 size={13} />
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex-shrink-0" title="Added by the client in the app — remove it there">
                client-added
              </span>
            )}
          </li>
        ))}
      </ul>

      {adding && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Trading name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Anwar Plumbing" className={inputCls} />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Accounting method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                <option value="cash">Cash basis</option>
                <option value="accruals">Accruals</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-0.5">Estimated turnover (optional)</label>
              <input value={turnover} onChange={(e) => setTurnover(e.target.value)} placeholder="Leave blank if unknown"
                inputMode="numeric" className={inputCls} />
            </div>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={busy}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add source
            </button>
            <button onClick={() => { setAdding(false); setErr(null); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
