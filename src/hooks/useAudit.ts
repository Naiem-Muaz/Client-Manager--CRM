import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useAuditLogs(clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/audit-logs` : `/brain/audit-logs`;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    logs: data?.items || data || [],
    isLoading,
    isError: error
  };
}
