import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

// Proposals API (/api/brain/…) — staff only. Modeled on useIncorporations/
// useSponsorCompliance: SWR + res.data.data unwrap + targeted revalidation.
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data);

// ── shapes (loose — the backend is authoritative, incl. ALL pricing) ─────────
export interface CatalogueService {
  id: string; code: string; name: string; description: string | null;
  pricing_model: 'fixed' | 'per_unit' | 'turnover_band';
  fixed_price_pence: number | string | null;
  unit_label: string | null; unit_price_pence: number | string | null;
  bands: Array<{ min_pence: number; max_pence: number | null; price_pence: number }> | null;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
  default_scope_text: string | null; is_active: boolean; sort_order: number;
  vat_rate?: number | string | null;
}

export interface LibraryService {
  code: string; name: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
  description: string;
}

export interface Prospect {
  id: string; contact_name: string; email: string; phone: string | null;
  company_name: string | null; company_number: string | null;
  status: 'open' | 'converted' | 'lost'; client_id: string | null;
}

export interface ProposalListItem {
  id: string; status: string; storedStatus: string; title: string;
  prospectName: string; prospectCompany: string | null; prospectEmail: string;
  monthlyTotalPence: number; annualTotalPence: number; oneoffTotalPence: number;
  discountPercent: number | null; validUntil: string | null;
  clientId: string | null; engagementId: string | null; gcMandateStatus: string | null;
  onboardSteps: Record<string, string> | null;
  acceptedByName: string | null; updatedAt: string; createdAt: string;
}

export interface ProposalDetail extends Omit<ProposalListItem, 'prospectName' | 'prospectCompany' | 'prospectEmail' | 'onboardSteps'> {
  introMd: string | null; scopeMd: string | null; locked: boolean; pdfPath: string | null;
  items: any[]; events: any[]; prospect: Prospect | null;
}

// ── reads ─────────────────────────────────────────────────────────────────────
export function useCatalogue(activeOnly = false) {
  const key = `/brain/service-catalogue${activeOnly ? '?active=true' : ''}`;
  const { data, error, isLoading, mutate } = useSWR<CatalogueService[]>(key, fetcher);
  return { services: (data || []) as CatalogueService[], isLoading, isError: error, mutate };
}

export function useProspects(status?: string) {
  const key = `/brain/prospects${status ? `?status=${status}` : ''}`;
  const { data, error, isLoading, mutate } = useSWR<Prospect[]>(key, fetcher);
  return { prospects: (data || []) as Prospect[], isLoading, isError: error, mutate };
}

export function useProposals() {
  const { data, error, isLoading, mutate } = useSWR<{ proposals: ProposalListItem[]; counts: Record<string, number> }>(
    '/brain/proposals', fetcher);
  return { proposals: data?.proposals || [], counts: data?.counts || {}, isLoading, isError: error, mutate };
}

export function useProposal(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<ProposalDetail>(id ? `/brain/proposals/${id}` : null, fetcher);
  return { proposal: data, isLoading, isError: error, mutate };
}

const revalidate = (id?: string) => { globalMutate('/brain/proposals'); if (id) globalMutate(`/brain/proposals/${id}`); };
const unwrap = (res: any) => res.data.data ?? res.data;

// ── catalogue actions ─────────────────────────────────────────────────────────
export async function createCatalogueService(payload: Partial<CatalogueService>) {
  const res = await NextGenAPI.post('/brain/service-catalogue', payload);
  globalMutate('/brain/service-catalogue'); globalMutate('/brain/service-catalogue?active=true');
  return unwrap(res);
}
export async function updateCatalogueService(id: string, updates: Partial<CatalogueService>) {
  const res = await NextGenAPI.patch(`/brain/service-catalogue/${id}`, updates);
  globalMutate('/brain/service-catalogue'); globalMutate('/brain/service-catalogue?active=true');
  return unwrap(res);
}
export async function deactivateCatalogueService(id: string) {
  const res = await NextGenAPI.delete(`/brain/service-catalogue/${id}`);
  globalMutate('/brain/service-catalogue'); globalMutate('/brain/service-catalogue?active=true');
  return unwrap(res);
}
export function useServiceLibrary() {
  const { data } = useSWR<LibraryService[]>('/brain/service-catalogue/library', fetcher);
  return { library: (data || []) as LibraryService[] };
}
export async function seedStandardServices() {
  const res = await NextGenAPI.post('/brain/service-catalogue/seed-standard', {});
  globalMutate('/brain/service-catalogue'); globalMutate('/brain/service-catalogue?active=true');
  return unwrap(res);
}

// ── prospect actions ──────────────────────────────────────────────────────────
export async function createProspect(payload: { contactName: string; email: string; phone?: string; companyName?: string; companyNumber?: string }) {
  const res = await NextGenAPI.post('/brain/prospects', payload);
  globalMutate('/brain/prospects');
  return unwrap(res);
}

// ── proposal actions ──────────────────────────────────────────────────────────
export async function createProposal(prospectId: string, title: string) {
  const res = await NextGenAPI.post('/brain/proposals', { prospectId, title });
  revalidate();
  return unwrap(res);
}
export async function updateProposal(id: string, updates: any) {
  const res = await NextGenAPI.patch(`/brain/proposals/${id}`, updates);
  revalidate(id);
  return unwrap(res);
}
export async function sendProposal(id: string) {
  const res = await NextGenAPI.post(`/brain/proposals/${id}/send`, {});
  revalidate(id);
  return unwrap(res);
}
export async function remindProposal(id: string) {
  const res = await NextGenAPI.post(`/brain/proposals/${id}/remind`, {});
  revalidate(id);
  return unwrap(res);
}
export async function withdrawProposal(id: string) {
  const res = await NextGenAPI.post(`/brain/proposals/${id}/withdraw`, {});
  revalidate(id);
  return unwrap(res);
}
