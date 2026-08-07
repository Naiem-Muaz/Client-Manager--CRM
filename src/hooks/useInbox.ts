import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export type InboxTab = 'unassigned' | 'mine' | 'assigned' | 'snoozed' | 'done';
export type InboxStatus = 'open' | 'done';

export interface InboxMessage {
  id: string;
  fromEmail: string;
  fromName: string | null;
  subject: string | null;
  preview: string | null;      // null = HTML-only mail (no text part) or decrypt unavailable
  receivedAt: string;
  status: InboxStatus;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  snoozedUntil: string | null;
  clientId: string | null;
  clientName: string | null;
  hasAttachments: boolean;
  convertedJobId: string | null;
}

export interface InboxAttachment {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  signedUrl: string | null;    // null = skipped stub ("not stored")
}

export interface InboxEvent {
  id: string;
  eventType: string;
  fromValue: string | null;
  toValue: string | null;
  metadata: any;
  actorName: string;
  createdAt: string;
}

export interface InboxComment {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  mentions: string[];
}

export interface SuggestedClient { id: string; name: string }

export interface InboxMessageDetail extends InboxMessage {
  bodyText: string | null;
  suggestedClients?: SuggestedClient[];
  comments: InboxComment[];
  events: InboxEvent[];
  attachments: InboxAttachment[];
}

export interface InboxCounts {
  unassigned: number;
  mine: number;
  assigned: number;
  snoozed: number;
  done: number;
  mentions: number;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data ?? []);

export function useInbox(tab: InboxTab, filters: { assigneeId?: string; clientId?: string; mentionedMe?: boolean } = {}) {
  const p = new URLSearchParams({ tab });
  if (filters.assigneeId) p.set('assigneeId', filters.assigneeId);
  if (filters.clientId) p.set('clientId', filters.clientId);
  if (filters.mentionedMe) p.set('mentioned', 'me');
  const key = `/brain/inbox?${p.toString()}`;
  const { data, error, isLoading, mutate } = useSWR<InboxMessage[]>(key, fetcher);
  return { messages: (data || []) as InboxMessage[], isLoading, isError: error, mutate };
}

export function useInboxCounts() {
  const { data, error, isLoading, mutate } = useSWR<InboxCounts>('/brain/inbox/counts', fetcher, { refreshInterval: 60000 });
  return { counts: (data || null) as InboxCounts | null, isLoading, isError: error, mutate };
}

export function useInboxMessage(id: string | null) {
  const key = id ? `/brain/inbox/${id}` : null;
  const { data, error, isLoading, mutate } = useSWR<InboxMessageDetail>(key, fetcher);
  return { message: (data || null) as InboxMessageDetail | null, isLoading, isError: error, mutate };
}

const revalidateInbox = () =>
  globalMutate((k) => typeof k === 'string' && k.startsWith('/brain/inbox'), undefined, { revalidate: true });

export async function updateInboxMessage(id: string, patch: Record<string, any>) {
  const res = await NextGenAPI.patch(`/brain/inbox/${id}`, patch);
  revalidateInbox();
  return res.data.data ?? res.data;
}

export async function addInboxComment(id: string, payload: { body: string; mentions?: string[] }) {
  const res = await NextGenAPI.post(`/brain/inbox/${id}/comments`, payload);
  revalidateInbox(); // detail key + counts (mentions count may change)
  return res.data.data ?? res.data;
}

export async function linkInboxClient(id: string, clientId: string | null) {
  const res = await NextGenAPI.patch(`/brain/inbox/${id}/client`, { clientId });
  revalidateInbox();
  return res.data.data ?? res.data;
}

export async function convertInboxMessage(id: string, form: { jobTitle?: string; jobType?: string; templateId?: string; assigneeId?: string }) {
  const res = await NextGenAPI.post(`/brain/inbox/${id}/convert`, form);
  revalidateInbox();
  return res.data.data ?? res.data; // { job, message }
}
