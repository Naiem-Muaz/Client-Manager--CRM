// Append this to useClients.ts
import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

export function useClients() {
  const { data, error, isLoading } = useSWR('/brain/clients', fetcher);

  return {
    clients: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useClientDetails(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(clientId ? `/brain/clients/${clientId}` : null, fetcher);

  return {
    client: data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useClientFullData(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(clientId ? `/brain/clients/${clientId}/full-data` : null, fetcher);

  return {
    fullData: data,
    isLoading,
    isError: error,
    mutate
  };
}

// ============================================================================
// DATA PIPELINE HOOKS
// ============================================================================

export function useClientTransactions(clientId: string | undefined) {
  const { data, error, isLoading, mutate: mutateTxns } = useSWR(
    clientId ? `/brain/clients/${clientId}/transactions` : null,
    fetcher
  );

  return {
    transactions: data || [],
    isLoading,
    isError: error,
    mutate: mutateTxns,
  };
}

export function useClientSnapshots(clientId: string | undefined) {
  const { data, error, isLoading, mutate: mutateSnaps } = useSWR(
    clientId ? `/brain/itsa/snapshots/client/${clientId}` : null,
    fetcher
  );

  return {
    snapshots: data || [],
    isLoading,
    isError: error,
    mutate: mutateSnaps,
  };
}

export function useClientSubmissions(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/brain/hmrc/submissions/${clientId}` : null,
    fetcher
  );

  return {
    submissions: data || [],
    isLoading,
    isError: error,
  };
}

export function useClientAccounting(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/brain/clients/${clientId}/reports/accounting` : null,
    fetcher
  );

  return {
    accounting: data || null,
    isLoading,
    isError: error,
  };
}

export function useClientTaxCalc(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/brain/clients/${clientId}/tax/calculation` : null,
    fetcher
  );

  return {
    taxCalc: data || null,
    isLoading,
    isError: error,
  };
}

// ============================================================================
// MUTATION FUNCTIONS
// ============================================================================

export async function approveClient(clientId: string) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/approve`);
  mutate(`/brain/clients/${clientId}/full-data`);
  mutate('/brain/clients');
  return response.data;
}

export async function checkHmrcReadiness() {
  const response = await NextGenAPI.get('/brain/hmrc/readiness');
  return response.data;
}

export async function submitQuarter(clientId: string, snapshotId?: string) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/hmrc/submit-quarter`, { snapshot_id: snapshotId });
  mutate(`/brain/hmrc/submissions/${clientId}`);
  mutate(`/brain/itsa/snapshots/client/${clientId}`);
  return response.data;
}

export async function createClient(clientData: Record<string, any>) {
  const response = await NextGenAPI.post('/brain/clients', clientData);
  mutate('/brain/clients');
  return response.data;
}

export async function processAccounting(clientId: string, taxYearId: string) {
  const response = await NextGenAPI.post('/brain/accounting/process', { clientId, taxYearId });
  mutate(`/brain/clients/${clientId}/full-data`);
  return response.data;
}

export async function updateClient(clientId: string, clientData: Record<string, any>) {
  const response = await NextGenAPI.put(`/brain/clients/${clientId}`, clientData);
  mutate(`/brain/clients/${clientId}`);
  mutate('/brain/clients');
  return response.data;
}

export async function archiveClient(clientId: string) {
  const response = await NextGenAPI.patch(`/brain/clients/${clientId}`, { status: 'archived' });
  mutate('/brain/clients');
  mutate(`/brain/clients/${clientId}`);
  return response.data;
}

// Persist company / VAT fields (snake_case columns) via PATCH.
export async function patchClient(clientId: string, fields: Record<string, any>) {
  const response = await NextGenAPI.patch(`/brain/clients/${clientId}`, fields);
  mutate(`/brain/clients/${clientId}`);
  mutate('/brain/clients');
  return response.data;
}

export async function reviewTransaction(clientId: string, txnId: string) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/transactions/${txnId}/review`);
  mutate(`/brain/clients/${clientId}/transactions`);
  return response.data;
}

export async function updateTransaction(clientId: string, txnId: string, updates: Record<string, any>) {
  const response = await NextGenAPI.put(`/brain/clients/${clientId}/transactions/${txnId}`, updates);
  mutate(`/brain/clients/${clientId}/transactions`);
  return response.data;
}

export async function generateSnapshot(clientId: string, periodStart: string, periodEnd: string) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/snapshots/generate`, {
    period_start: periodStart,
    period_end: periodEnd,
  });
  mutate(`/brain/itsa/snapshots/client/${clientId}`);
  return response.data;
}

export async function finaliseSnapshot(clientId: string, snapshotId: string) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/snapshots/finalise`, {
    snapshot_id: snapshotId,
  });
  mutate(`/brain/itsa/snapshots/client/${clientId}`);
  mutate(`/brain/clients/${clientId}/transactions`);
  return response.data;
}

// Map the legacy entity hook
export function useEntity(entityId: string | null) {
  return { entity: null, isLoading: false, error: null };
}
