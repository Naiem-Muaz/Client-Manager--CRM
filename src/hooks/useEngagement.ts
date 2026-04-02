import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useEngagementLetters(clientId: string) {
  const { data, error, isLoading } = useSWR(`/api/brain/clients/${clientId}/engagements`, fetcher);

  return {
    letters: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function createEngagementLetter(clientId: string, letterData: any) {
  const response = await NextGenAPI.post(`/api/brain/clients/${clientId}/engagements`, letterData);
  mutate(`/api/brain/clients/${clientId}/engagements`);
  return response.data;
}

export async function signEngagementLetter(clientId: string, letterId: string, signatureData: any) {
  const response = await NextGenAPI.put(`/api/brain/clients/${clientId}/engagements/${letterId}/sign`, signatureData);
  mutate(`/api/brain/clients/${clientId}/engagements`);
  return response.data;
}
