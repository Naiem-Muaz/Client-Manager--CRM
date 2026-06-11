import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data); // Support both paginated and standard outputs

export function useTransactions(clientId: string, params: { page?: number, limit?: number } = {}) {
  const query = new URLSearchParams(params as any).toString();
  const { data, error, isLoading } = useSWR(`/brain/clients/${clientId}/transactions?${query}`, fetcher);

  return {
    transactions: data?.items || data,
    pagination: data?.pagination,
    isLoading,
    isError: error,
    mutate
  };
}

export async function createTransaction(clientId: string, transactionData: Record<string, any>) {
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/transactions`, transactionData);
  return response.data;
}

export async function processReceipt(clientId: string, file: File) {
  const formData = new FormData();
  formData.append('receipt', file);
  
  const response = await NextGenAPI.post(`/brain/clients/${clientId}/receipts/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data;
}
