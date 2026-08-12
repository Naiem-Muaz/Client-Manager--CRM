import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

/**
 * Document requests — the staff queue and detail (design §3.3, slice A3).
 *
 * useJobs/useInbox conventions: SWR for reads, mutations as exported plain
 * functions that revalidate by URL PREFIX afterwards. Prefix revalidation
 * matters here because one action changes several views at once — sending a
 * request moves it between tabs AND changes all four tab counts AND changes the
 * client's own list, and none of those callers knows about the others.
 */

const BASE = '/brain/document-requests';
const fetcher = (url: string) => NextGenAPI.get(url).then((r) => r.data);

export type RequestTab = 'open' | 'overdue' | 'complete' | 'no_email';
export const REQUEST_TABS: RequestTab[] = ['open', 'overdue', 'complete', 'no_email'];
export const TAB_LABEL: Record<RequestTab, string> = {
  open: 'Open', overdue: 'Overdue', complete: 'Complete', no_email: 'No email',
};

export interface RequestRow {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  status: 'draft' | 'sent' | 'complete' | 'cancelled';
  progress: { fulfilled: number; total: number };
  dueDate: string | null;
  sentAt: string | null;
  chaseCount: number;
  chaseEnabled: boolean;
  jobId: string | null;
  hasEmail: boolean;
  lastActivityAt: string | null;
}

export interface RequestDocument {
  id: string; fileName: string; mimeType: string | null;
  fileSize: number | null; uploadedAt: string | null; fileUrl: string | null;
  itemId: string | null;
}
export interface RequestItem {
  id: string; name: string; description: string | null;
  status: 'pending' | 'fulfilled' | 'waived';
  position: number; fulfilledAt: string | null;
  documents: RequestDocument[];
}
export interface RequestEvent {
  id: string; type: string; actorId: string | null; actorName: string | null;
  metadata: any; createdAt: string;
}
export interface RequestDetail {
  id: string; clientId: string; clientName: string | null; jobId: string | null;
  title: string; message: string | null;
  status: RequestRow['status'];
  dueDate: string | null; chaseEnabled: boolean; chaseCount: number;
  nextChaseAt: string | null; sentAt: string | null; completedAt: string | null;
  createdAt: string;
  email: string | null;
  progress: { fulfilled: number; total: number };
  items: RequestItem[];
  events: RequestEvent[];
  unmatchedDocuments: RequestDocument[];
  /** ONLY present on the send / regenerate responses — never on a plain GET. */
  url?: string;
  emailed?: boolean;
  warning?: string | null;
}

const listUrl = (tab: RequestTab, clientId?: string) =>
  `${BASE}?tab=${tab}${clientId ? `&clientId=${clientId}` : ''}`;

export function useDocumentRequests(tab: RequestTab, clientId?: string) {
  const { data, isLoading, error } = useSWR<{ data: RequestRow[]; counts: Record<RequestTab, number> }>(
    listUrl(tab, clientId), fetcher,
  );
  return {
    requests: data?.data || [],
    // Counts come from the server for ALL four tabs in one response, so the tab
    // labels are correct without four round trips.
    counts: data?.counts,
    isLoading,
    isError: error,
    refresh: () => mutate((k) => typeof k === 'string' && k.startsWith(BASE), undefined, { revalidate: true }),
  };
}

export function useDocumentRequest(id?: string | null) {
  const { data, isLoading, error } = useSWR<{ data: RequestDetail }>(
    id ? `${BASE}/${id}` : null, fetcher,
  );
  return { request: data?.data, isLoading, isError: error };
}

/**
 * Revalidate EVERY document-request key. A mutation on one request changes the
 * tab counts, the other tabs' membership and any client-scoped list — a
 * targeted mutate() would leave whichever of those the user is looking at stale.
 */
const refreshAll = () =>
  mutate((k) => typeof k === 'string' && k.startsWith(BASE), undefined, { revalidate: true });

export async function createDocumentRequest(clientId: string, body: {
  title: string; message?: string; dueDate?: string | null; jobId?: string | null;
  items: Array<{ name: string; description?: string }>;
}): Promise<RequestDetail> {
  const r = await NextGenAPI.post(`/brain/clients/${clientId}/document-requests`, body);
  await refreshAll();
  return r.data.data;
}

/** Returns the detail PLUS `url` — the only moment the link exists. Keep it. */
export async function sendDocumentRequest(id: string): Promise<RequestDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/send`);
  await refreshAll();
  return r.data.data;
}

/** Also returns `url` once. The previous link stops working immediately. */
export async function regenerateRequestLink(id: string): Promise<RequestDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/regenerate-link`);
  await refreshAll();
  return r.data.data;
}

export async function updateDocumentRequest(id: string, patch: {
  cancel?: boolean; chaseEnabled?: boolean; dueDate?: string | null;
}): Promise<RequestDetail> {
  const r = await NextGenAPI.patch(`${BASE}/${id}`, patch);
  await refreshAll();
  return r.data.data;
}

export async function waiveRequestItem(id: string, itemId: string): Promise<RequestDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/items/${itemId}/waive`);
  await refreshAll();
  return r.data.data;
}

/**
 * Item-name quick picks for the create modal. Deliberately plain strings and
 * deliberately hardcoded: making these a table would be a settings screen, a
 * migration and a permission question in service of six words. Staff type
 * anything they like; these only save keystrokes.
 */
export const ITEM_SUGGESTIONS: string[] = [
  'P60', 'P45', 'Bank statements', 'Sales invoices', 'Purchase receipts', 'Photo ID',
];
