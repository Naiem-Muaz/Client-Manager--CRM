import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';
import type { ApiDocument } from '../components/documents/documentRow';

/**
 * Documents — the client tab and the org-wide vault (B2).
 *
 * ⚠️ THE VAULT ENDPOINT DID NOT EXIST UNTIL B2. `useDocuments()` with no
 * clientId has always built `/brain/documents`, and nothing served it — so the
 * page rendered empty and its uploads 404'd (resurvey §2). It is real now, and
 * its shape is different from the client route's: `{ data, nextCursor, counts }`
 * rather than a bare array.
 */

const BASE = '/brain/documents';

const fetcher = (url: string) => NextGenAPI.get(url).then((res) => res.data);

export interface VaultFilters {
  category?: string;
  clientId?: string;
  source?: string;
  jobId?: string;
  tag?: string;
  q?: string;
  includeDeleted?: boolean;
  limit?: number;
}

/**
 * Filters → query string. Empty values are OMITTED rather than sent blank —
 * the useJobs idiom — because `?category=` is a filter on the empty string
 * server-side, not an absent filter.
 */
export function vaultQuery(f: VaultFilters, cursor?: string | null): string {
  const p = new URLSearchParams();
  if (f.category) p.set('category', f.category);
  if (f.clientId) p.set('clientId', f.clientId);
  if (f.source) p.set('source', f.source);
  if (f.jobId) p.set('jobId', f.jobId);
  if (f.tag) p.set('tag', f.tag);
  if (f.q && f.q.trim()) p.set('q', f.q.trim());
  if (f.includeDeleted) p.set('includeDeleted', '1');
  if (f.limit) p.set('limit', String(f.limit));
  if (cursor) p.set('cursor', cursor);
  const s = p.toString();
  return s ? `${BASE}?${s}` : BASE;
}

/** One page of the vault. Paging is caller-driven — see DocumentsPage. */
export function useVaultPage(f: VaultFilters, cursor?: string | null) {
  const { data, error, isLoading } = useSWR<{
    data: ApiDocument[];
    nextCursor: string | null;
    counts: { total: number; deleted: number };
  }>(vaultQuery(f, cursor), fetcher);

  return {
    documents: data?.data ?? [],
    nextCursor: data?.nextCursor ?? null,
    counts: data?.counts ?? { total: 0, deleted: 0 },
    isLoading,
    isError: error,
  };
}

/** Sidebar counts. Org-scoped and live-only, server-side. */
export function useDocumentFacets() {
  const { data, isLoading } = useSWR<{
    data: { total: number; byCategory: Record<string, number>; bySource: Record<string, number> };
  }>(`${BASE}/facets`, fetcher);
  return {
    facets: data?.data ?? { total: 0, byCategory: {}, bySource: {} },
    isLoading,
  };
}

/** The CLIENT-scoped list (unchanged shape: a bare array). */
export function useDocuments(clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/documents` : null;
  const { data, error, isLoading } = useSWR(
    url,
    (u: string) => NextGenAPI.get(u).then((r) => r.data.data || r.data),
  );
  return { documents: data?.items || data || [], isLoading, isError: error, mutate };
}

/** Revalidate every vault key AND the client list, whatever the filters were. */
const refreshAll = (clientId?: string) => {
  mutate((k) => typeof k === 'string' && k.startsWith(BASE), undefined, { revalidate: true });
  if (clientId) mutate(`/brain/clients/${clientId}/documents`);
};

export async function uploadDocument(
  file: File,
  category: string,
  clientId?: string,
  onProgress?: (percent: number) => void,
  extra?: Record<string, string>,
) {
  // ⛔ UPLOAD IS CLIENT-SCOPED BY DESIGN. There is no org-level "unfiled"
  // bucket: a document belongs to a client, and the storage prefix is built
  // from that client's organisation (B1(c) removed the 'org' literal that used
  // to stand in for one). The vault asks for a client BEFORE opening the modal.
  if (!clientId) throw new Error('Pick a client before uploading — documents are filed against a client.');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('category', category);
  if (extra) Object.entries(extra).forEach(([k, v]) => formData.append(k, v));

  const response = await NextGenAPI.post(`/brain/clients/${clientId}/documents`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  refreshAll(clientId);
  return response.data;
}

/**
 * Soft delete (B1). The row survives with `deletedAt` set and the storage
 * object is untouched — so the UI must show it as deleted rather than remove
 * it, and Restore has something to restore.
 */
export async function deleteDocument(documentId: string, clientId: string, reason?: string) {
  const res = await NextGenAPI.delete(
    `/brain/clients/${clientId}/documents/${documentId}`,
    { data: reason ? { reason } : undefined },
  );
  refreshAll(clientId);
  return res.data;
}

export async function restoreDocument(documentId: string, clientId: string) {
  const res = await NextGenAPI.post(`/brain/clients/${clientId}/documents/${documentId}/restore`);
  refreshAll(clientId);
  return res.data;
}
