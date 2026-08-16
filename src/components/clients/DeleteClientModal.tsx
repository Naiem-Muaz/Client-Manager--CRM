import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X, ShieldAlert, Archive } from 'lucide-react';
import { checkClientDeletion, deleteClient, archiveClient, DeletionCheck } from '../../hooks/useClients';
import { errMsg } from '../../lib/errMsg';

/**
 * Permanent-delete flow (super_admin only — the trigger is hidden otherwise; the
 * backend enforces regardless). Two-tier per the design:
 *   1. Probe the default refuse-gate. If the client has real activity → show the
 *      reasons + Archive as the recommended safe action. No force from here except
 *      an explicit, de-emphasised "Delete anyway" for a super_admin.
 *   2. Confirm modal: type the EXACT client name (case-sensitive) to arm the
 *      permanent delete. Snapshot is kept in the audit log; the client cannot be
 *      restored.
 */
export function DeleteClientModal({ client, onClose, onDeleted }: {
  client: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [check, setCheck] = useState<DeletionCheck | null>(null);
  const [phase, setPhase] = useState<'checking' | 'blocked' | 'confirm'>('checking');
  const [force, setForce] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    checkClientDeletion(client.id)
      .then(c => { if (!live) return; setCheck(c); setPhase(c.blocking ? 'blocked' : 'confirm'); })
      .catch(e => { if (live) setError(errMsg(e, 'Could not check deletion eligibility')); });
    return () => { live = false; };
  }, [client.id]);

  // Confirm against the name the BACKEND validates (client_manager.clients.name,
  // returned by the probe) — not the page's display name, which may be a different
  // column (legal_name). Exact, case-sensitive.
  const nameToConfirm = check?.name ?? client.name;
  const armed = typed === nameToConfirm;

  // 482 Ruling 2: the THIRD archive entry point. Same behaviour change, same
  // warning — a control whose meaning changes without its label changing is a
  // trap, and one that is easy to miss is worse than one that is obvious.
  const doArchive = async () => {
    if (!window.confirm(
      `Archive ${client.name}?\n\n` +
      '• They leave the active client list (reversible).\n' +
      '• THIS ALSO ENDS THEIR ACCESS TO THE LUMINA APP, within 24 hours.\n\n' +
      'Unarchiving restores it.')) return;
    setBusy(true); setError(null);
    try { await archiveClient(client.id); onDeleted(); }
    catch (e) { setError(errMsg(e, 'Failed to archive')); setBusy(false); }
  };

  const doDelete = async () => {
    if (!armed) return;
    setBusy(true); setError(null);
    try { await deleteClient(client.id, { confirmName: typed, force }); onDeleted(); }
    catch (e) { setError(errMsg(e, 'Failed to delete client')); setBusy(false); }
  };

  const totalRecords = (check?.reasons ?? []).reduce((n, r) => n + Math.max(0, r.count), 0);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={busy ? undefined : onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center"><ShieldAlert size={18} /></span>
            <h2 className="font-bold text-slate-900">Delete client</h2>
          </div>
          <button onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-600 disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="px-6 py-5">
          {phase === 'checking' && (
            <div className="py-8 text-center text-slate-500"><Loader2 className="animate-spin inline mr-2" size={18} /> Checking what this client has…</div>
          )}

          {phase === 'blocked' && check && (
            <div className="space-y-4">
              <div className="flex gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700">
                  <strong>{client.name}</strong> has real activity, so it can’t be safely deleted. We recommend <strong>archiving</strong> instead — it disappears from your lists but nothing is lost, and you can restore it anytime.
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">This client has</div>
                <ul className="space-y-1">
                  {check.reasons.map(r => (
                    <li key={r.key} className="flex items-center justify-between text-sm px-3 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-slate-700">{r.label}</span>
                      <span className="font-mono font-semibold text-slate-900">{r.count < 0 ? '—' : r.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={doArchive} disabled={busy} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />} Archive instead (ends app access)
                </button>
                <button onClick={() => { setForce(true); setPhase('confirm'); }} disabled={busy}
                  className="text-sm text-rose-600 hover:text-rose-700 hover:underline font-medium px-2">
                  Delete anyway
                </button>
              </div>
            </div>
          )}

          {phase === 'confirm' && (
            <div className="space-y-4">
              <div className="flex gap-3 p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle size={18} className="text-rose-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-700">
                  This <strong>permanently deletes</strong> {client.name}{force && totalRecords > 0 ? <> and destroys <strong>{totalRecords}+ record(s)</strong> across its financial, tax and compliance data</> : ' and all its associated records'}. A full snapshot is written to the audit log, but <strong>the client cannot be restored.</strong>
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-600">Type the client’s exact name to confirm:</label>
                <div className="mt-1 mb-1 text-sm font-mono font-semibold text-slate-900 bg-slate-50 rounded px-3 py-1.5 select-all">{nameToConfirm}</div>
                <input autoFocus value={typed} onChange={e => setTyped(e.target.value)}
                  placeholder="Client name"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400" />
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button onClick={onClose} disabled={busy} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                <button onClick={doDelete} disabled={!armed || busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                  {busy ? <><Loader2 size={16} className="animate-spin" /> Deleting…</> : 'Permanently delete'}
                </button>
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </div>
      </div>
    </div>
  );
}
