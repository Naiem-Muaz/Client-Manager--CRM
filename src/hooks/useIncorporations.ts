import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

// Incorporations API (/api/brain/incorporations/*) — accountant + super_admin
// only (the backend role-gates; client-portal users get 403 and never see the
// nav entry). Modeled on useSponsorCompliance: SWR + res.data.data unwrap.
const BASE = '/brain/incorporations';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data);

// ── shapes (loose — the backend is the source of truth) ──────────────────────
export type IncorporationStatus =
  | 'draft' | 'ready_to_file' | 'submitted' | 'accepted'
  | 'rejected' | 'onboarded' | 'abandoned';

export interface BlockingIssue { code: string; message: string; path?: string }

export interface NameCheckResult {
  result: 'available' | 'same_as_existing' | 'error';
  checked_name: string;
  checked_at: string;
  same_as?: Array<{ company_number: string; company_name: string; company_status: string | null }>;
  close_matches?: Array<{ company_number: string; company_name: string; company_status: string | null }>;
  warnings?: string[];
}

export interface Incorporation {
  id: string;
  status: IncorporationStatus;
  proposedName: string;
  nameCheck: NameCheckResult | null;
  wizardData: Record<string, any>;
  blockingIssues: BlockingIssue[];
  blockingCount?: number;
  companyNumber: string | null;
  hasAuthCode: boolean;
  authCodeMasked: string | null;
  clientId: string | null;
  assignedTo: string | null;
  assignedName?: string | null;
  submittedAt: string | null;
  acceptedAt: string | null;
  onboardedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // detail (GET /:id) only:
  filings?: any[];
  documents?: any[];
  documentsGenerated?: boolean;
  documentsStale?: boolean;
}

export interface PscSuggestion { subscriber_ref: number; percent: number; natures_of_control: string[] }

// ── reads ─────────────────────────────────────────────────────────────────────
export function useIncorporations(status?: string) {
  const key = `${BASE}${status ? `?status=${status}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR<Incorporation[]>(key, fetcher);
  return { incorporations: (data || []) as Incorporation[], isLoading, isError: error, mutate };
}

export function useIncorporation(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Incorporation>(id ? `${BASE}/${id}` : null, fetcher);
  return { incorporation: data, isLoading, isError: error, mutate };
}

export function usePscSuggestions(id: string | undefined) {
  const { data, mutate } = useSWR<PscSuggestion[]>(id ? `${BASE}/${id}/psc-suggestions` : null, fetcher);
  return { suggestions: (data || []) as PscSuggestion[], mutate };
}

const revalidate = (id: string) => { globalMutate(BASE); globalMutate(`${BASE}/${id}`); };

// ── actions ───────────────────────────────────────────────────────────────────
export async function createIncorporation(proposedName: string): Promise<Incorporation> {
  const res = await NextGenAPI.post(BASE, { proposedName });
  globalMutate(BASE);
  return res.data.data ?? res.data;
}

export async function updateIncorporation(id: string, updates: { proposedName?: string; wizardData?: Record<string, any>; assignedTo?: string }) {
  const res = await NextGenAPI.patch(`${BASE}/${id}`, updates);
  revalidate(id);
  return res.data.data ?? res.data;
}

export async function runNameCheck(id: string): Promise<{ nameCheck: NameCheckResult; blockingIssues: BlockingIssue[] }> {
  const res = await NextGenAPI.post(`${BASE}/${id}/name-check`, {});
  revalidate(id);
  return res.data.data ?? res.data;
}

/** draft → ready_to_file. Throws with `.blocking` (BlockingIssue[]) on a 422. */
export async function markReadyToFile(id: string) {
  try {
    const res = await NextGenAPI.post(`${BASE}/${id}/ready`, {});
    revalidate(id);
    return res.data.data ?? res.data;
  } catch (e: any) {
    revalidate(id); // the 422 also refreshed blocking_issues server-side
    const issues = e?.response?.data?.data?.blockingIssues;
    if (issues) throw Object.assign(new Error(e.response.data.error || 'Blocking issues prevent filing'), { blocking: issues });
    throw e;
  }
}

export async function abandonIncorporation(id: string) {
  const res = await NextGenAPI.post(`${BASE}/${id}/abandon`, {});
  revalidate(id);
  return res.data.data ?? res.data;
}
