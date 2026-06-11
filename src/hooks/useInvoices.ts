import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useInvoices(clientId: string) {
  const { data, error, isLoading } = useSWR(`/brain/clients/${clientId}/invoices`, fetcher);

  return {
    invoices: data?.items || data,
    isLoading,
    isError: error,
    mutate
  };
}

export async function createInvoice(clientId: string, invoiceData: Record<string, any>) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/invoices`, invoiceData);
  mutate(`/brain/clients/${clientId}/invoices`);
  return response.data;
}

export async function updateInvoiceStatus(clientId: string, invoiceId: string, status: 'draft' | 'sent' | 'paid') {
  const response = await NextGenAPI.put(`/brain/clients/${clientId}/invoices/${invoiceId}/status`, { status });
  mutate(`/brain/clients/${clientId}/invoices`);
  return response.data;
}
