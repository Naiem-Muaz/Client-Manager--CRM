import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface Deadline {
  id: string;
  clientId: string | null;
  clientName: string;
  assignedStaff: string | null;
  deadlineType: string;
  dueDate: string;
  status: 'upcoming' | 'overdue' | 'completed';
  daysUntil: number;
  source: 'hmrc_live' | 'calculated' | 'manual';
  taxYear: string | null;
  notes: string | null;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data || []);

export function useDeadlines(month?: string) {
  const key = month ? `/brain/deadlines?month=${month}` : '/brain/deadlines';
  const { data, error, isLoading, mutate } = useSWR<Deadline[]>(key, fetcher);

  return {
    deadlines: (data || []) as Deadline[],
    isLoading,
    isError: error,
    mutate,
  };
}

export async function createDeadline(payload: {
  clientId?: string | null;
  clientName?: string;
  deadlineType: string;
  dueDate: string;
  assignedStaff?: string;
  notes?: string;
}) {
  const res = await NextGenAPI.post('/brain/deadlines', payload);
  globalMutate((k) => typeof k === 'string' && k.startsWith('/brain/deadlines'), undefined, { revalidate: true });
  return res.data;
}

export async function updateDeadline(id: string, updates: { status?: string; notes?: string }) {
  const res = await NextGenAPI.patch(`/brain/deadlines/${encodeURIComponent(id)}`, updates);
  return res.data;
}
