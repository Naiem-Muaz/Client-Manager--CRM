// Deadline ENGINE hooks (the persisted statutory deadline engine — distinct from
// the legacy /brain/deadlines route in useDeadlines.ts). SWR over the NextGenAPI
// axios instance (auto-attaches lumina_token; 401 handled globally).
//
// The per-client tab and the Overview panels share one SWR key, so they make a
// single network call (key-based dedup) — see the Phase 5 brief "share fetches".

import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';
import type { Deadline, Coverage, DeadlineStatus } from '../lib/deadlines';

export interface ClientDeadlinesResult {
  deadlines: Deadline[];
  coverage: Coverage | null;
  isLoading: boolean;
  isError: any;
  // SWR's bound mutator — accepts optional data + options (for optimistic updates).
  mutate: (data?: any, opts?: any) => Promise<any>;
}

// Returns the full envelope { data, coverage } (not just res.data.data) because
// the tab needs both deadlines and coverage in one call.
const envelopeFetcher = (url: string) =>
  NextGenAPI.get(url).then((res) => ({
    deadlines: (res.data?.data ?? []) as Deadline[],
    coverage: (res.data?.coverage ?? null) as Coverage | null,
  }));

export function useClientDeadlines(clientId: string | undefined): ClientDeadlinesResult {
  const { data, error, isLoading, mutate } = useSWR(
    clientId ? `/clients/${clientId}/deadlines` : null,
    envelopeFetcher,
  );
  return {
    deadlines: data?.deadlines ?? [],
    coverage: data?.coverage ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

/**
 * Generate statutory deadlines for a client (derive obligations + generate the
 * next periods). Call after creating/editing a client so deadlines appear
 * immediately instead of only on the nightly cron. Idempotent; safe to re-run.
 */
export async function generateClientDeadlines(clientId: string, mode: 'initial' | 'rolling' = 'initial') {
  const res = await NextGenAPI.post(`/clients/${clientId}/deadlines/generate`, { mode });
  return res.data;
}

/** PATCH a deadline (status/assignee/notes/internal date). Returns the updated row + meta. */
export async function patchDeadline(
  id: string,
  body: Partial<{ status: DeadlineStatus; assigned_to: string | null; notes: string; internal_due_date: string; pin: boolean }>,
): Promise<{ data: Deadline; meta?: { autoRolled?: boolean } }> {
  const res = await NextGenAPI.patch(`/deadlines/${id}`, body);
  return res.data;
}

// ── Practice-wide (Step D) ───────────────────────────────────────────────────
export interface CoverageRollup {
  counts: { ok: number; unmonitored: number; under_monitored: number };
  unmonitored: { client_id: string; client_name: string; reason_codes: string[] }[];
  under_monitored: { client_id: string; client_name: string; reason_codes: string[] }[];
}

const dataFetcher = (url: string) => NextGenAPI.get(url).then((res) => res.data.data);

export function useCoverageRollup() {
  const { data, error, isLoading, mutate } = useSWR('/deadlines/coverage', dataFetcher);
  return { rollup: data as CoverageRollup | undefined, isLoading, isError: error, mutate };
}

export interface PracticeFilters {
  authority?: string;
  status?: string[];
  assignee?: string;
  from?: string;
  to?: string;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

export interface PracticeDeadlinesResult {
  rows: Deadline[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  isError: any;
  mutate: () => Promise<any>;
}

function buildQuery(f: PracticeFilters): string {
  const p = new URLSearchParams();
  if (f.authority) p.set('authority', f.authority);
  if (f.status && f.status.length) p.set('status', f.status.join(','));
  if (f.assignee) p.set('assignee', f.assignee);
  if (f.from) p.set('from', f.from);
  if (f.to) p.set('to', f.to);
  if (f.overdue) p.set('overdue', 'true');
  return p.toString();
}

// The backend caps pageSize at 500, so fetch ALL pages and return the full set —
// the practice view must surface every matching deadline, not silently page-drop.
// TOTAL-DRIVEN: pages until it has the route-reported `total`, or a page comes
// back short (the last page). No hardcoded page-count cap. The empty-batch guard
// is purely a no-progress safety so a misbehaving API can't spin forever.
async function fetchAllPages(baseQuery: string): Promise<{ rows: Deadline[]; total: number }> {
  const pageSize = 500;
  let page = 1; let total = Infinity; const rows: Deadline[] = [];
  while (rows.length < total) {
    const res = await NextGenAPI.get(`/deadlines?${baseQuery}${baseQuery ? '&' : ''}page=${page}&pageSize=${pageSize}`);
    const d = res.data.data;
    const batch: Deadline[] = d.rows ?? [];
    rows.push(...batch);
    total = typeof d.total === 'number' ? d.total : rows.length;
    if (batch.length < pageSize || batch.length === 0) break; // last (short/empty) page
    page++;
  }
  return { rows, total };
}

export function usePracticeDeadlines(f: PracticeFilters): PracticeDeadlinesResult {
  const baseQuery = buildQuery(f);
  const { data, error, isLoading, mutate } = useSWR(`practice-deadlines:${baseQuery}`, () => fetchAllPages(baseQuery));
  return {
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    page: 1,
    pageSize: data?.rows?.length ?? 0,
    isLoading,
    isError: error,
    mutate,
  };
}
