import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useDocuments(clientId?: string) {
  // If clientId is provided, fetch client specific docs, else generic vault docs
  const url = clientId ? `/brain/clients/${clientId}/documents` : `/brain/documents`;
  
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    documents: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function uploadDocument(
  file: File,
  category: string,
  clientId?: string,
  onProgress?: (percent: number) => void,
  extra?: Record<string, string>
) {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('category', category);
  if (extra) Object.entries(extra).forEach(([k, v]) => formData.append(k, v));

  const uploadUrl = clientId ? `/brain/clients/${clientId}/documents/upload` : `/brain/documents/upload`;
  const response = await NextGenAPI.post(uploadUrl, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    }
  });

  // Revalidate the list the document belongs to
  mutate(clientId ? `/brain/clients/${clientId}/documents` : `/brain/documents`);
  return response.data;
}

export async function deleteDocument(documentId: string, clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/documents/${documentId}` : `/brain/documents/${documentId}`;
  const response = await NextGenAPI.delete(url);
  
  mutate(clientId ? `/brain/clients/${clientId}/documents` : `/brain/documents`);
  return response.data;
}
