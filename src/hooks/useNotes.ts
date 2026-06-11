import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface ClientNote {
  id: string;
  clientId: string;
  authorId: string | null;
  authorName: string;
  body: string;
  isInternal: boolean;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data ?? []);

export function useClientNotes(clientId: string | undefined) {
  const key = clientId ? `/brain/clients/${clientId}/notes` : null;
  const { data, error, isLoading, mutate } = useSWR<ClientNote[]>(key, fetcher);
  return { notes: (data || []) as ClientNote[], isLoading, isError: error, mutate };
}

export async function addNote(clientId: string, body: string, isInternal: boolean) {
  const res = await NextGenAPI.post(`/brain/clients/${clientId}/notes`, { body, isInternal });
  return res.data.data ?? res.data;
}
export async function updateNote(id: string, updates: { body?: string; pinned?: boolean }) {
  const res = await NextGenAPI.patch(`/brain/notes/${id}`, updates);
  return res.data.data ?? res.data;
}
export async function deleteNote(id: string) {
  const res = await NextGenAPI.delete(`/brain/notes/${id}`);
  return res.data;
}
