// Append this to useClients.ts
import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function useClients() {
  const { data, error, isLoading } = useSWR('/api/brain/clients', fetcher);

  return {
    clients: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useClientDetails(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(clientId ? `/api/brain/clients/${clientId}` : null, fetcher);

  return {
    client: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useClientFullData(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(clientId ? `/api/brain/clients/${clientId}/full-data` : null, fetcher);

  return {
    fullData: data,
    isLoading,
    isError: error,
    mutate
  };
}

export async function approveClient(clientId: string) {
  const response = await NextGenAPI.post(`/api/brain/clients/${clientId}/approve`);
  mutate(`/api/brain/clients/${clientId}/full-data`);
  mutate('/api/brain/clients');
  return response.data;
}

export async function checkHmrcReadiness() {
  const response = await NextGenAPI.get('/api/brain/hmrc/readiness');
  return response.data;
}

export async function submitQuarter(clientId: string) {
  const response = await NextGenAPI.post('/api/brain/hmrc/submit-quarter', { clientId });
  return response.data;
}

export async function createClient(clientData: Record<string, any>) {
  const response = await NextGenAPI.post('/api/brain/clients', clientData);
  mutate('/api/brain/clients');
  return response.data;
}

export async function processAccounting(clientId: string, taxYearId: string) {
  const response = await NextGenAPI.post('/api/brain/accounting/process', { clientId, taxYearId });
  mutate(`/api/brain/clients/${clientId}/full-data`);
  return response.data;
}

export async function updateClient(clientId: string, clientData: Record<string, any>) {
  const response = await NextGenAPI.put(`/api/brain/clients/${clientId}`, clientData);
  mutate(`/api/brain/clients/${clientId}`);
  mutate('/api/brain/clients');
  return response.data;
}

// Map the legacy entity hook
export function useEntity(entityId: string | null) {
  return { entity: null, isLoading: false, error: null };
}

