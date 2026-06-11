import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export interface ClientEntity {
  id: string;
  name?: string;
  type: string;
  status?: string;
  lastFiled?: string | null;
}

export function useEntitiesForClient(clientId?: string | null) {
  const url = clientId ? `/brain/entities?clientId=${clientId}` : null;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    entities: (data?.items || data || []) as ClientEntity[],
    isLoading,
    isError: error,
  };
}
