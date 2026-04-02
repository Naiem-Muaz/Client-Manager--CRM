import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useDocuments(clientId?: string) {
  // If clientId is provided, fetch client specific docs, else generic vault docs
  const url = clientId ? `/api/brain/clients/${clientId}/documents` : `/api/brain/documents`;
  
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    documents: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function uploadDocument(file: File, category: string, clientId?: string) {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('category', category);
  
  const url = clientId ? `/api/brain/clients/${clientId}/documents/upload` : `/api/brain/documents/upload`;
  const response = await NextGenAPI.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  
  mutate(url);
  return response.data;
}

export async function deleteDocument(documentId: string, clientId?: string) {
  const url = clientId ? `/api/brain/clients/${clientId}/documents/${documentId}` : `/api/brain/documents/${documentId}`;
  const response = await NextGenAPI.delete(url);
  
  mutate(clientId ? `/api/brain/clients/${clientId}/documents` : `/api/brain/documents`);
  return response.data;
}
