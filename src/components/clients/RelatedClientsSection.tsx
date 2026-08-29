import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, X, Loader2, Trash2, Search } from 'lucide-react';
import { useClients, useClientRelationships, addClientRelationship, removeClientRelationship } from '../../hooks/useClients';
import { entityKey, ENTITY_META } from '../../lib/entityType';
import { errMsg } from '../../lib/errMsg';

/**
 * ── RELATED CLIENTS ─────────────────────────────────────────────────────────
 *
 * Every client type gets this section — a company's directors, a partnership's
 * partners, an LLP's members, and family links between people are one fact
 * ("these two records are connected, and how"), stored in one table.
 *
 * ⚠️ THE SAME ROW READS DIFFERENTLY FROM EACH END. "Jane is director_of Acme"
 * shows on Jane's page as "Director of — Acme Ltd" and on Acme's page as
 * "Director — Jane Smith". The API returns a `direction` per row and the labels
 * below are paired, so neither page has to invert anything itself.
 *
 * ⛔ NO AUTO-MATCHING. An officer is linked to a client record by a person
 * choosing, never by name similarity — two directors called J Smith are one
 * wrong guess away from merging two people's tax affairs.
 */
const LABELS: Record<string, { forward: string; reverse: string }> = {
  director_of: { forward: 'Director of', reverse: 'Director' },
  owner_of:    { forward: 'Owner of',    reverse: 'Owner' },
  partner_in:  { forward: 'Partner in',  reverse: 'Partner' },
  member_of:   { forward: 'Member of',   reverse: 'Member' },
  family_of:   { forward: 'Family of',   reverse: 'Family of' },
  linked:      { forward: 'Linked to',   reverse: 'Linked to' },
};
const OPTIONS = Object.keys(LABELS);

export function RelatedClientsSection({ clientId, prefillName, onPrefillConsumed }: {
  clientId: string;
  /** Set when the user clicked "link" beside an officer — seeds the search box. */
  prefillName?: string | null;
  onPrefillConsumed?: () => void;
}) {
  const { relationships, isLoading } = useClientRelationships(clientId);
  const { clients } = useClients(false);
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);
  const [rel, setRel] = useState('director_of');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // A prefill opens the form with the officer's name already typed.
  React.useEffect(() => {
    if (prefillName) { setAdding(true); setQ(prefillName); setPicked(null); onPrefillConsumed?.(); }
  }, [prefillName]);

  const matches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return (clients ?? [])
      .filter((c: any) => c.id !== clientId && String(c.legalName || '').toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, clients, clientId]);

  const submit = async () => {
    if (!picked) { setErr('Choose a client from the list.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await addClientRelationship(clientId, { to_client_id: picked.id, relationship: rel });
      // A duplicate is not an error — the backend says so and the list already
      // shows it, so the form just closes.
      if (res?.alreadyLinked) setErr(null);
      setAdding(false); setQ(''); setPicked(null);
    } catch (e: any) { setErr(errMsg(e, 'Could not add the link.')); }
    finally { setBusy(false); }
  };

  const remove = async (r: any) => {
    if (!window.confirm(`Remove the link to ${r.other_name}?\n\nThis removes the relationship only — neither client is changed.`)) return;
    try { await removeClientRelationship(clientId, r.id); }
    catch (e: any) { window.alert(errMsg(e, 'Could not remove the link.')); }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Users size={20} className="text-blue-500" /> Related clients
          {relationships.length > 0 && <span className="text-xs font-normal text-slate-400">({relationships.length})</span>}
        </h3>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Plus size={12} /> Add link
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && relationships.length === 0 && !adding && (
        <p className="text-sm text-slate-400">
          No related clients. Link a director, partner, owner or family member so they show on both records.
        </p>
      )}

      <ul className="space-y-2">
        {relationships.map((r: any) => {
          const label = LABELS[r.relationship] ?? LABELS.linked;
          const ek = entityKey(r.other_entity_type);
          const meta = ENTITY_META[ek];
          return (
            <li key={r.id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-50 last:border-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500 w-24 flex-shrink-0">
                  {r.direction === 'from' ? label.forward : label.reverse}
                </span>
                <Link to={`/clients/${r.other_client_id}`} className="text-sm text-blue-700 hover:underline truncate">
                  {r.other_name}
                </Link>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${meta.badge}`}>
                  <meta.icon size={11} /> {meta.label}
                </span>
              </div>
              <button onClick={() => remove(r)} title="Remove this link"
                className="p-1.5 rounded text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>

      {adding && (
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-2">
            <select value={rel} onChange={(e) => setRel(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
              {OPTIONS.map((o) => <option key={o} value={o}>{LABELS[o].forward}</option>)}
            </select>
            <div className="relative flex-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={picked ? picked.name : q}
                onChange={(e) => { setQ(e.target.value); setPicked(null); }}
                placeholder="Search existing clients by name…"
                className="w-full pl-8 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {!picked && matches.length > 0 && (
                <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-auto">
                  {matches.map((c: any) => (
                    <li key={c.id}>
                      <button onClick={() => { setPicked({ id: c.id, name: c.legalName }); setQ(''); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50">
                        {c.legalName}
                        <span className="text-xs text-slate-400 ml-2">{ENTITY_META[entityKey(c.entityType)].label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!picked && q.trim() && matches.length === 0 && (
                <p className="mt-1 text-[11px] text-slate-400">
                  No client matches “{q.trim()}”. Only EXISTING clients can be linked — create the client first.
                </p>
              )}
            </div>
          </div>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <div className="flex items-center gap-2">
            <button onClick={submit} disabled={busy || !picked}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Add link
            </button>
            <button onClick={() => { setAdding(false); setQ(''); setPicked(null); setErr(null); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1">
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
