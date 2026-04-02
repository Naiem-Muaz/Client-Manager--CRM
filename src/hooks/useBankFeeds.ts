import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function useBankFeeds(clientId: string) {
  const { data, error, isLoading } = useSWR(`/api/bank-feeds/truelayer/accounts?clientId=${clientId}`, fetcher);

  return {
    accounts: data,
    isLoading,
    isError: error,
    mutate
  };
}

export async function connectTrueLayer(clientId: string, redirectUri: string) {
  const response = await NextGenAPI.post('/api/bank-feeds/truelayer/auth-url', { clientId, redirectUri });
  return response.data; // Expected to contain { data: { authUrl: string } }
}

export async function handleTrueLayerCallback(code: string, redirectUri: string, clientId: string) {
  const response = await NextGenAPI.post('/api/bank-feeds/truelayer/callback', { code, redirectUri, clientId });
  return response.data;
}
