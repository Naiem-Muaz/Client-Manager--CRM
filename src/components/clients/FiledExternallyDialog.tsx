import React, { useState } from 'react';
import { X, Check, Loader2, AlertTriangle } from 'lucide-react';
import { markFiledExternally } from '../../hooks/useClients';
import { errMsg } from '../../lib/errMsg';

const inputCls = 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

/**
 * ── "SOMEONE ELSE FILED THIS" ───────────────────────────────────────────────
 *
 * ⛔ THE SOFTWARE NAME IS REQUIRED, not a nicety. Marking a quarter simply
 * "filed" would let this platform take credit for a submission it did not make
 * — and it has no HMRC credentials, so it has never made one. Naming IRIS
 * Elements is what keeps the record true, and it is the answer when HMRC asks
 * which software submitted a return.
 */
export function FiledExternallyDialog({ clientId, deadline, onClose, onDone }: {
  clientId: string;
  deadline: { id: string; title?: string; period_start?: string | null; period_end?: string | null; statutory_due_date?: string };
  onClose: () => void;
  onDone: () => void;
}) {
  const [software, setSoftware] = useState('IRIS Elements');
  const [on, setOn] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!software.trim()) { setErr('Name the software that filed it.'); return; }
    setBusy(true); setErr(null);
    try {
      await markFiledExternally(clientId, deadline.id, {
        filed_externally_via: software.trim(), filed_externally_on: on,
      });
      onDone(); onClose();
    } catch (e: any) { setErr(errMsg(e, 'Could not record the filing.')); }
    finally { setBusy(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="fixed left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 z-50 w-[26rem] bg-white rounded-xl border border-slate-200 shadow-xl p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-900">Record a filing made elsewhere</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>

        <p className="text-xs text-slate-500 mb-3">
          {deadline.period_start && deadline.period_end
            ? `Period ${deadline.period_start} to ${deadline.period_end}. `
            : ''}
          This records that <strong>another system</strong> submitted it. This platform has no HMRC
          connection and did not file it.
        </p>

        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Filed with (software)</label>
            <input value={software} onChange={(e) => { setSoftware(e.target.value); if (err) setErr(null); }}
              placeholder="IRIS Elements" className={inputCls} />
          </div>
          <div>
            <label className="text-[11px] text-slate-400 block mb-0.5">Date filed</label>
            <input type="date" value={on} max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setOn(e.target.value)} className={inputCls} />
          </div>
          {err && <p className="text-xs text-red-600 flex items-start gap-1"><AlertTriangle size={12} className="mt-0.5" />{err}</p>}
        </div>

        <div className="flex items-center gap-2 mt-4">
          <button onClick={submit} disabled={busy}
            className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Record filing
          </button>
          <button onClick={onClose} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5">Cancel</button>
        </div>
      </div>
    </>
  );
}
