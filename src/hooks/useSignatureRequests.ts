import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

/**
 * Signature requests — the staff queue and detail (design §4.2, slice C3).
 *
 * Same conventions as useDocumentRequests: SWR reads, mutations as exported
 * functions, prefix revalidation. The prefix matters for the same reason —
 * signing, cancelling or re-stamping changes tab membership AND all four
 * counts, and no caller knows about the others.
 */

const BASE = '/brain/signature-requests';
const fetcher = (url: string) => NextGenAPI.get(url).then((r) => r.data);

export type SignatureTab = 'awaiting' | 'signed' | 'declined' | 'closed';
export const SIGNATURE_TABS: SignatureTab[] = ['awaiting', 'signed', 'declined', 'closed'];
export const SIGNATURE_TAB_LABEL: Record<SignatureTab, string> = {
  awaiting: 'Awaiting', signed: 'Signed', declined: 'Declined', closed: 'Withdrawn',
};

export type SignatureStatus = 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'cancelled';

export interface SignatureRow {
  id: string; clientId: string; clientName: string; title: string;
  status: SignatureStatus;
  sentAt: string | null; signedAt: string | null;
  signerEmail: string | null; chaseCount: number; chaseEnabled: boolean;
  lastActivityAt: string | null;
}

export interface SignatureEvidence {
  sourceSha256: string | null; signedSha256: string | null; signedDocumentId: string | null;
  signedAt: string | null; signatureName: string | null; signatureEmail: string | null;
  signatureIp: string | null; signatureUserAgent: string | null;
  consentConfirmed: boolean | null; declineReason: string | null; declinedAt: string | null;
}

export interface SignatureDetail {
  id: string; clientId: string; clientName: string | null;
  title: string; message: string | null; status: SignatureStatus;
  signerName: string | null; signerEmail: string | null; clientEmail: string | null;
  sentAt: string | null; createdAt: string;
  chaseEnabled: boolean; chaseCount: number; nextChaseAt: string | null;
  document: { id: string; fileName: string; mimeType: string | null; fileSize: number | null; fileUrl: string | null } | null;
  evidence: SignatureEvidence;
  events: Array<{ id: string; type: string; actorId: string | null; actorName: string | null; metadata: any; createdAt: string }>;
  /** ONLY on send / regenerate responses — never on a plain GET. */
  url?: string;
  emailed?: boolean;
  warning?: string | null;
}

const listUrl = (tab: SignatureTab, clientId?: string) =>
  `${BASE}?tab=${tab}${clientId ? `&clientId=${clientId}` : ''}`;

export function useSignatureRequests(tab: SignatureTab, clientId?: string) {
  const { data, isLoading, error } = useSWR<{ data: SignatureRow[]; counts: Record<SignatureTab, number> }>(
    listUrl(tab, clientId), fetcher,
  );
  return { requests: data?.data || [], counts: data?.counts, isLoading, isError: error };
}

export function useSignatureRequest(id?: string | null) {
  const { data, isLoading, error } = useSWR<{ data: SignatureDetail }>(id ? `${BASE}/${id}` : null, fetcher);
  return { request: data?.data, isLoading, isError: error };
}

const refreshAll = () =>
  mutate((k) => typeof k === 'string' && k.startsWith(BASE), undefined, { revalidate: true });

export async function createSignatureRequest(clientId: string, body: {
  documentId: string; title?: string; message?: string; signerName?: string; signerEmail?: string;
}): Promise<SignatureDetail> {
  const r = await NextGenAPI.post(`/brain/clients/${clientId}/signature-requests`, body);
  await refreshAll();
  return r.data.data;
}

/** Returns the detail PLUS `url` — the only moment the link exists. */
export async function sendSignatureRequest(id: string): Promise<SignatureDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/send`);
  await refreshAll();
  return r.data.data;
}

/** Also returns `url` once. The previous link stops working immediately. */
export async function regenerateSignatureLink(id: string): Promise<SignatureDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/regenerate-link`);
  await refreshAll();
  return r.data.data;
}

export async function updateSignatureRequest(id: string, patch: { cancel?: boolean; chaseEnabled?: boolean }): Promise<SignatureDetail> {
  const r = await NextGenAPI.patch(`${BASE}/${id}`, patch);
  await refreshAll();
  return r.data.data;
}

/** Rebuilds a stamped copy that storage lost. Valid only while signed_document_id is null. */
export async function restampSignatureRequest(id: string): Promise<SignatureDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/restamp`);
  await refreshAll();
  return r.data.data;
}

/**
 * Clones a declined/cancelled request into a NEW draft. The old request keeps
 * its decline — that refusal is evidence, not a state to be undone.
 */
export async function sendSignatureAgain(id: string): Promise<SignatureDetail> {
  const r = await NextGenAPI.post(`${BASE}/${id}/send-again`);
  await refreshAll();
  return r.data.data;
}

/** Status → how the queue and drawer describe it. `viewed` is deliberately
 *  distinct from `sent`: "opened, not signed" is the single most useful thing
 *  a chaser can know, and the backend keeps the two apart for that reason. */
export const SIGNATURE_STATUS_META: Record<SignatureStatus, { label: string; cls: string }> = {
  draft:     { label: 'Draft',      cls: 'bg-slate-100 text-slate-600' },
  sent:      { label: 'Sent',       cls: 'bg-blue-100 text-blue-700' },
  viewed:    { label: 'Opened',     cls: 'bg-amber-100 text-amber-700' },
  signed:    { label: 'Signed',     cls: 'bg-emerald-100 text-emerald-700' },
  declined:  { label: 'Declined',   cls: 'bg-rose-100 text-rose-700' },
  cancelled: { label: 'Withdrawn',  cls: 'bg-slate-100 text-slate-400' },
};
