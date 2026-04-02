import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useTasks(clientId?: string) {
  // If no clientId is passed, fetch all tasks for the global dashboard
  const url = clientId ? `/api/brain/clients/${clientId}/tasks` : `/api/brain/tasks`;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    tasks: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function createTask(taskData: any, clientId?: string) {
  const url = clientId ? `/api/brain/clients/${clientId}/tasks` : `/api/brain/tasks`;
  const response = await NextGenAPI.post(url, taskData);
  mutate(url);
  return response.data;
}

export async function updateTask(taskId: string, updateData: any, clientId?: string) {
  const url = clientId ? `/api/brain/clients/${clientId}/tasks/${taskId}` : `/api/brain/tasks/${taskId}`;
  const response = await NextGenAPI.put(url, updateData);
  mutate(clientId ? `/api/brain/clients/${clientId}/tasks` : `/api/brain/tasks`);
  return response.data;
}
