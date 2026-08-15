import React, { useState } from 'react';
import { X, Copy, Check, Link2, Ban } from 'lucide-react';
import useSWR from 'swr';
import { NextGenAPI } from '../../api/NextGenAPI';
import type { ApiDocument } from './documentRow';

/**
 * B5 — share links.
 *
 * ⛔ THE URL IS SHOWN ONCE AND IS NEVER RETRIEVABLE. Only the SHA-256 reaches
 * the database, so there is no query that could show it again — the same
 * contract as the request and signature magic links. The copy-once panel says
 * so plainly rather than letting a user assume they can come back for it; the
 * recovery is revoke-and-reissue, and that is offered right there.
 */

const EXPIRY_CHOICES = [1, 7, 14, 30];

interface ShareRow {
  id: string;
  expiresAt: string;
  maxDownloads: number | null;
  accessCount: number;
  lastAccessedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdByName: string | null;
  status: 'active' | 'revoked' | 'expired' | 'exhausted';
}

const STATUS_META: Record<ShareRow['status'], { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700' },
  // The button says Revoke, so the resulting state says Revoked. Two words
  // for one state makes a user wonder whether they are two states.
  revoked:   { label: 'Revoked',   cls: 'bg-slate-100 text-slate-500' },
  expired:   { label: 'Expired',   cls: 'bg-amber-50 text-amber-700' },
  exhausted: { label: 'Limit reached', cls: 'bg-amber-50 text-amber-700' },
};

const fetcher = (u: string) => NextGenAPI.get(u).then((r) => r.data.data);

export function ShareDialog({ doc, onClose }: { doc: ApiDocument; onClose: () => void }) {
  const key = `/brain/documents/${doc.id}/shares`;
  const { data: shares, mutate } = useSWR<ShareRow[]>(key, fetcher);

  const [days, setDays] = useState(7);
  const [capOn, setCapOn] = useState(false);
  const [cap, setCap] = useState(1);
  const [minting, setMinting] = useState(false);
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setMinting(true); setError(null);
    try {
      const res = await NextGenAPI.post(key, {
        expiresInDays: days,
        maxDownloads: capOn ? cap : null,
      });
      setFresh(res.data.data.url);
      mutate();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Could not create the link.');
    } finally { setMinting(false); }
  };

  const [revoking, setRevoking] = useState<string | null>(null);

  const revoke = async (id: string) => {
    // Confirm: revoking is instant, silent to whoever holds the link, and not
    // undoable — the recovery is issuing a NEW link, which is a different link.
    if (!window.confirm(
      'Revoke this link?\n\nAnyone holding it will stop being able to download '
      + 'the document immediately. This cannot be undone — you would need to '
      + 'create a new link.')) return;
    setRevoking(id);
    try {
      await NextGenAPI.delete(`${key}/${id}`);
      await mutate();
    } finally { setRevoking(null); }
  };

  const copy = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Share this document</h3>
            <p className="truncate text-xs text-slate-500">{doc.fileName}</p>
          </div>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>

        {fresh ? (
          /* ── Copy-once panel — the requests-send idiom ─────────────────── */
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <p className="mb-2 text-xs font-semibold text-emerald-800">
              Copy this link now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <input
                readOnly value={fresh}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded border border-emerald-200 bg-white px-2 py-1.5 font-mono text-[11px]"
              />
              <button
                onClick={copy}
                className="flex items-center gap-1 rounded bg-emerald-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-emerald-700">
              Only a hash is stored, so we cannot show it again. If it is lost,
              withdraw this link and create another.
            </p>
            <button onClick={() => setFresh(null)} className="mt-2 text-[11px] text-emerald-800 underline">
              Done
            </button>
          </div>
        ) : (
          /* ── Mint ──────────────────────────────────────────────────────── */
          <div className="mb-4 rounded-lg border border-slate-200 p-3">
            <label className="mb-2 block text-xs font-medium text-slate-600">Expires after</label>
            <div className="mb-3 flex gap-1">
              {EXPIRY_CHOICES.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded border px-2 py-1 text-xs ${
                    days === d ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  {d} day{d === 1 ? '' : 's'}
                </button>
              ))}
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={capOn} onChange={(e) => setCapOn(e.target.checked)} />
              Limit downloads
              {capOn && (
                <input
                  type="number" min={1} max={100} value={cap}
                  onChange={(e) => setCap(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  className="w-16 rounded border border-slate-200 px-1.5 py-0.5"
                />
              )}
            </label>

            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

            <button
              onClick={create}
              disabled={minting}
              className="mt-3 flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              <Link2 className="h-3 w-3" />
              {minting ? 'Creating…' : 'Create link'}
            </button>
          </div>
        )}

        {/* ── Existing shares ─────────────────────────────────────────────── */}
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Links</h4>
        <div className="max-h-56 overflow-y-auto rounded border border-slate-100">
          {!shares?.length ? (
            <p className="p-3 text-center text-xs text-slate-400">No links yet.</p>
          ) : (
            shares.map((s) => {
              const meta = STATUS_META[s.status];
              return (
                <div key={s.id} className="flex items-center gap-2 border-b border-slate-50 px-3 py-2 text-xs last:border-0">
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${meta.cls}`}>{meta.label}</span>

                  {/* "Expires 22 Aug", not a bare date — a date on its own beside
                      a status pill reads as "created on", which is the opposite
                      of what it means. Past tense once it has passed. */}
                  <span className="shrink-0 text-slate-500">
                    {s.status === 'expired' ? 'Expired' : 'Expires'}{' '}
                    {new Date(s.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>

                  <span className="shrink-0 text-slate-500">
                    {s.maxDownloads != null
                      ? `${s.accessCount} / ${s.maxDownloads} downloads`
                      : `${s.accessCount} download${s.accessCount === 1 ? '' : 's'}`}
                  </span>

                  <span className="ml-auto min-w-0 truncate text-slate-400" title={s.createdByName ?? ''}>
                    {s.createdByName ?? ''}
                  </span>

                  {/* An unlabelled ⊘ is a guess. The label says what it does and
                      the confirm says what that costs. */}
                  {!s.revokedAt && (
                    <button
                      onClick={() => revoke(s.id)}
                      disabled={revoking === s.id}
                      className="flex shrink-0 items-center gap-1 rounded border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Ban className="h-3 w-3" />
                      {revoking === s.id ? 'Revoking…' : 'Revoke'}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
