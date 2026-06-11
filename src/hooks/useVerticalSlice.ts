import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data);

// ============================================================================
// CLIENTS
// ============================================================================

export function useVSClients() {
  const { data, error, isLoading } = useSWR('/api/vs/clients', fetcher);
  return { clients: data || [], isLoading, isError: error };
}

export function useVSClient(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}` : null, fetcher
  );
  return { client: data, isLoading, isError: error };
}

export async function createVSClient(data: { name: string; email: string; phone?: string; business_type?: string }) {
  const res = await NextGenAPI.post('/api/vs/clients', data);
  mutate('/api/vs/clients');
  return res.data;
}

// ============================================================================
// TRANSACTIONS
// ============================================================================

export function useVSTransactions(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}/transactions` : null, fetcher
  );
  return { transactions: data || [], isLoading, isError: error };
}

export async function createVSTransaction(clientId: string, data: {
  date: string; description: string; amount: string; type: 'income' | 'expense'; is_disallowable?: boolean;
}) {
  const res = await NextGenAPI.post(`/api/vs/clients/${clientId}/transactions`, data);
  mutate(`/api/vs/clients/${clientId}/transactions`);
  return res.data;
}

// ============================================================================
// ACCOUNTING (P&L)
// ============================================================================

export function useVSAccounting(clientId: string | null, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set('start', start);
  if (end) params.set('end', end);
  const qs = params.toString();

  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}/reports/accounting${qs ? '?' + qs : ''}` : null, fetcher
  );
  return { accounting: data, isLoading, isError: error };
}

// ============================================================================
// TAX CALCULATION
// ============================================================================

export function useVSTax(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}/tax/calculation` : null, fetcher
  );
  return { tax: data, isLoading, isError: error };
}

// ============================================================================
// SNAPSHOTS
// ============================================================================

export function useVSSnapshots(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}/snapshots` : null, fetcher
  );
  return { snapshots: data || [], isLoading, isError: error };
}

export async function generateVSSnapshot(clientId: string, period_start: string, period_end: string) {
  const res = await NextGenAPI.post(`/api/vs/clients/${clientId}/snapshots/generate`, { period_start, period_end });
  mutate(`/api/vs/clients/${clientId}/snapshots`);
  return res.data;
}

export async function finaliseVSSnapshot(clientId: string, snapshot_id: string) {
  const res = await NextGenAPI.post(`/api/vs/clients/${clientId}/snapshots/finalise`, { snapshot_id });
  mutate(`/api/vs/clients/${clientId}/snapshots`);
  return res.data;
}

// ============================================================================
// HMRC SUBMISSION
// ============================================================================

export function useVSSubmissions(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/api/vs/clients/${clientId}/submissions` : null, fetcher
  );
  return { submissions: data || [], isLoading, isError: error };
}

export async function submitVSQuarter(clientId: string, snapshot_id: string) {
  const res = await NextGenAPI.post(`/api/vs/clients/${clientId}/hmrc/submit-quarter`, { snapshot_id });
  mutate(`/api/vs/clients/${clientId}/submissions`);
  mutate(`/api/vs/clients/${clientId}/snapshots`);
  return res.data;
}
