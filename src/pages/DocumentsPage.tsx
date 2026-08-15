import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Upload, FolderOpen, Trash2, X } from 'lucide-react';
import {
  useVaultPage, useDocumentFacets,
  deleteDocument, restoreDocument,
  type VaultFilters,
} from '../hooks/useDocuments';
import { DocumentRow, SOURCE_CHIPS, type ApiDocument } from '../components/documents/documentRow';
import { DocumentUploadModal } from '../components/documents/DocumentUploadModal';
import { useClients } from '../hooks/useClients';

/**
 * THE ORG-WIDE DOCUMENT VAULT.
 *
 * ─── WHAT THIS REPLACES ─────────────────────────────────────────────────────
 * This page has existed since day one against an endpoint that did not exist,
 * rendering a `DocumentCard` built for a THIRD document shape (the client tab
 * had one, the API had another). It showed nothing, and its uploads 404'd.
 *
 * It now reads B2's `GET /brain/documents` and renders the SAME row component
 * as the client tab (components/documents/documentRow.tsx), so the two cannot
 * drift into a fourth shape.
 *
 * ⛔ CATEGORY LABELS COME FROM THE SERVER. B1 made the backend authoritative
 * over all fifteen codes; the sidebar is built from /facets, not from a list
 * restated here. An unmapped code still lands under "Other" — belt and braces,
 * because a folder nobody can click is worse than a catch-all.
 */

const PAGE = 50;

export function DocumentsPage() {
  const [filters, setFilters] = useState<VaultFilters>({ limit: PAGE });
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<Array<string | null>>([null]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');

  // Debounced search — 300ms. Typing a filename should not be one request per
  // keystroke against a route that mints a signed URL per row.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === search ? f : { ...f, q: search }));
      setPages([null]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { facets } = useDocumentFacets();
  const { clients } = useClients();

  // Each cursor is its own SWR key, so pages accumulate rather than refetching
  // the whole list. `pages` holds the cursor chain; page 0 is `null`.
  const lastCursor = pages[pages.length - 1];
  const { documents, nextCursor, counts, isLoading } = useVaultPage(filters, lastCursor);
  const [accumulated, setAccumulated] = useState<ApiDocument[]>([]);

  useEffect(() => {
    if (isLoading) return;
    setAccumulated((prev) => (lastCursor === null ? documents : [...prev, ...documents]));
  }, [documents, isLoading, lastCursor]);

  const setFilter = useCallback((patch: Partial<VaultFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPages([null]);
    setAccumulated([]);
  }, []);

  const categories = useMemo(() => {
    const entries = Object.entries(facets.byCategory).sort((a, b) => b[1] - a[1]);
    return entries;
  }, [facets]);

  const onDownload = (d: ApiDocument) => {
    if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener');
  };

  const onDelete = async (d: ApiDocument) => {
    if (!d.clientId) return;
    const reason = window.prompt(
      `Delete "${d.fileName}"?\n\nThe file is kept — this marks the document deleted and it can be restored.\n\nReason (optional):`,
    );
    if (reason === null) return;          // cancelled, not an empty reason
    setBusyId(d.id);
    try {
      await deleteDocument(d.id, d.clientId, reason || undefined);
      setAccumulated((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, deletedAt: new Date().toISOString() } : x)));
    } finally { setBusyId(null); }
  };

  const onRestore = async (d: ApiDocument) => {
    if (!d.clientId) return;
    setBusyId(d.id);
    try {
      await restoreDocument(d.id, d.clientId);
      setAccumulated((prev) => prev.map((x) => (x.id === d.id ? { ...x, deletedAt: null } : x)));
    } finally { setBusyId(null); }
  };

  const activeChips = [
    filters.category && { label: `Folder: ${filters.category}`, clear: () => setFilter({ category: undefined }) },
    filters.clientId && {
      label: `Client: ${clients?.find((c: any) => c.id === filters.clientId)?.name ?? 'selected'}`,
      clear: () => setFilter({ clientId: undefined }),
    },
    filters.source && { label: `Source: ${filters.source}`, clear: () => setFilter({ source: undefined }) },
    filters.q && { label: `“${filters.q}”`, clear: () => { setSearch(''); setFilter({ q: undefined }); } },
  ].filter(Boolean) as Array<{ label: string; clear: () => void }>;

  return (
    <div className="flex h-full gap-6 p-6">
      {/* ── Sidebar: folders from /facets ───────────────────────────────── */}
      <aside className="w-56 shrink-0">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Folders</h2>
        <button
          onClick={() => setFilter({ category: undefined })}
          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm ${
            !filters.category ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span className="flex items-center gap-2"><FolderOpen className="h-4 w-4" /> All</span>
          <span className="text-xs text-slate-400">{facets.total}</span>
        </button>
        {categories.map(([code, n]) => (
          <button
            key={code}
            onClick={() => setFilter({ category: code })}
            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm ${
              filters.category === code ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span className="truncate">{code}</span>
            <span className="text-xs text-slate-400">{n}</span>
          </button>
        ))}

        <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-400">Source</h2>
        <div className="flex flex-wrap gap-1">
          {SOURCE_CHIPS.map((s) => (
            <button
              key={s.id}
              onClick={() => setFilter({ source: filters.source === s.id ? undefined : s.id })}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                filters.source === s.id
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {s.label}{facets.bySource[s.id] ? ` ${facets.bySource[s.id]}` : ''}
            </button>
          ))}
        </div>

        <label className="mt-6 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={!!filters.includeDeleted}
            onChange={(e) => setFilter({ includeDeleted: e.target.checked })}
          />
          <Trash2 className="h-3.5 w-3.5" />
          Show deleted
          {counts.deleted > 0 && <span className="text-xs text-slate-400">({counts.deleted})</span>}
        </label>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search file names…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={filters.clientId ?? ''}
            onChange={(e) => setFilter({ clientId: e.target.value || undefined })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All clients</option>
            {(clients ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" /> Upload
          </button>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {activeChips.map((c, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {c.label}
                <button onClick={c.clear}><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-white">
          {isLoading && accumulated.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading…</div>
          ) : accumulated.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              No documents match these filters.
            </div>
          ) : (
            accumulated.map((d) => (
              <DocumentRow
                key={d.id}
                doc={d}
                showClient
                busy={busyId === d.id}
                onDownload={onDownload}
                onDelete={onDelete}
                onRestore={onRestore}
              />
            ))
          )}
        </div>

        {nextCursor && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setPages((p) => [...p, nextCursor])}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {isLoading ? 'Loading…' : 'Load more'}
            </button>
          </div>
        )}

        <p className="mt-3 text-xs text-slate-400">
          {counts.total} document{counts.total === 1 ? '' : 's'}
          {counts.deleted > 0 && ` · ${counts.deleted} deleted`}
        </p>
      </main>

      {/* ── Upload: a client is chosen FIRST ─────────────────────────────── */}
      {showUpload && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[420px] rounded-lg bg-white p-5 shadow-xl">
            {!uploadClientId ? (
              <>
                <h3 className="text-base font-semibold text-slate-900">Which client?</h3>
                {/* The route is client-scoped BY DESIGN — a document belongs to a
                    client and its storage prefix comes from that client's
                    organisation. There is no org-level "unfiled" bucket. */}
                <p className="mt-1 text-xs text-slate-500">
                  Documents are filed against a client, so pick one before uploading.
                </p>
                <select
                  autoFocus
                  defaultValue=""
                  onChange={(e) => setUploadClientId(e.target.value)}
                  className="mt-3 w-full rounded border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="" disabled>Select a client…</option>
                  {(clients ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="mt-4 text-right">
                  <button
                    onClick={() => setShowUpload(false)}
                    className="rounded px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <DocumentUploadModal
                clientId={uploadClientId}
                onClose={() => { setShowUpload(false); setUploadClientId(''); }}
                onUpload={() => {
                  setShowUpload(false);
                  setUploadClientId('');
                  setPages([null]);
                  setAccumulated([]);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DocumentsPage;
