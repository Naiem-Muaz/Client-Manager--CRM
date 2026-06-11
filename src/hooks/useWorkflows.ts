import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useWorkflows() {
  const { data, error, isLoading } = useSWR(`/brain/workflows`, fetcher);

  return {
    items: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function updateWorkflowStage(itemId: string, newStage: string) {
  const response = await NextGenAPI.put(`/brain/workflows/${itemId}/stage`, { stage: newStage });
  mutate(`/brain/workflows`);
  return response.data;
}
