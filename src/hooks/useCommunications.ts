import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';
import { Communication } from '../types/CommunicationTypes';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useCommunications(clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/communications` : null;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    messages: (data?.items || data || []) as Communication[],
    isLoading,
    isError: error,
    mutate: () => (url ? mutate(url) : Promise.resolve()),
  };
}

export async function sendCommunication(payload: Partial<Communication>, clientId?: string) {
  const response = await NextGenAPI.post('/brain/communications', { ...payload, clientId });
  if (clientId) mutate(`/brain/clients/${clientId}/communications`);
  return response.data.data || response.data;
}
