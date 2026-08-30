import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, X } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';
import { entityKey, ENTITY_META } from '../../lib/entityType';

interface Hit {
  id: string;
  legalName: string;
  entityType?: string | null;
  clientReference?: string | null;
}

/**
 * ── THE GLOBAL SEARCH ───────────────────────────────────────────────────────
 *
 * ⛔ THE INPUT THIS REPLACES WAS DECORATIVE. TopBar carried
 *
 *     <input type="text" placeholder="Search Client, UTR, CRN..." className=… />
 *
 * with no `value`, no `onChange`, no `onKeyDown`, no form and no endpoint. It
 * was never wired to anything — typing did nothing because there was nothing to
 * do. That is why it "returns nothing": there is no failing request to find in a
 * log, because no request was ever made.
 *
 * It now queries GET /brain/clients?search= — server-side, across name, legal
 * name, client_reference (the TD- codes), company_number and utr, which is what
 * the placeholder has always promised.
 *
 * ⚠️ DEBOUNCED AND ORDER-GUARDED. Typing "temajo" fires six renders; without a
 * debounce that is six round trips, and without the sequence check a slow早
 * response can land after a fast later one and overwrite the right answers with
 * stale ones.
 */
export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close on an outside click — a results panel that outlives its context is
  // the thing people click through by accident.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setHits(null); setBusy(false); return; }
    setBusy(true);
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await NextGenAPI.get('/brain/clients', { params: { search: term } });
        if (mine !== seq.current) return;          // a newer keystroke already won
        setHits((res.data?.data ?? []).slice(0, 8));
        setOpen(true);
      } catch {
        if (mine === seq.current) setHits([]);     // a failure is "no results I can show",
      } finally {                                  // never a silently empty success
        if (mine === seq.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const go = (id: string) => {
    setOpen(false); setQ(''); setHits(null);
    navigate(`/clients/${id}`);
  };

  const showPanel = open && q.trim().length >= 2;

  return (
    <div className="relative w-72" ref={boxRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
      <input
        type="text"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { if (hits) setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setOpen(false); (e.target as HTMLInputElement).blur(); }
          if (e.key === 'Enter' && hits && hits.length > 0) go(hits[0].id);
        }}
        placeholder="Search name, code, UTR, CRN…"
        className="w-full pl-9 pr-8 py-1.5 bg-bg-main border border-divider rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-secondary/20 focus:border-brand-secondary transition-all text-sm text-slate-700"
      />
      {busy && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
      {!busy && q && (
        <button onClick={() => { setQ(''); setHits(null); setOpen(false); }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="Clear">
          <X size={14} />
        </button>
      )}

      {showPanel && (
        <div className="absolute z-50 mt-1 w-[26rem] right-0 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {hits === null && <p className="px-3 py-3 text-sm text-slate-400">Searching…</p>}
          {hits !== null && hits.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-400">No client matches “{q.trim()}”.</p>
          )}
          <ul className="max-h-80 overflow-auto">
            {(hits ?? []).map((h) => {
              const meta = ENTITY_META[entityKey(h.entityType)];
              return (
                <li key={h.id}>
                  <button onClick={() => go(h.id)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm text-slate-800 truncate">{h.legalName}</span>
                      {h.clientReference && (
                        <span className="block text-[11px] font-mono text-slate-400">{h.clientReference}</span>
                      )}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${meta.badge}`}>
                      <meta.icon size={11} /> {meta.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
