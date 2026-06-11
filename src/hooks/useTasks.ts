import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export function useTasks(clientId?: string) {
  // If no clientId is passed, fetch all tasks for the global dashboard
  const url = clientId ? `/brain/clients/${clientId}/tasks` : `/brain/tasks`;
  const { data, error, isLoading } = useSWR(url, fetcher);

  return {
    tasks: data?.items || data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export interface TasksSummary {
  pending: number;
  highPriority: number;
}

export function useTasksSummary() {
  const { data, error, isLoading } = useSWR('/brain/tasks/summary', fetcher);

  const summary: TasksSummary | null = data
    ? {
        pending: data.pending ?? data.pending_count ?? 0,
        highPriority: data.highPriority ?? data.high_priority ?? 0,
      }
    : null;

  return {
    summary,
    isLoading,
    isError: error,
  };
}

export async function createTask(taskData: any, clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/tasks` : `/brain/tasks`;
  const response = await NextGenAPI.post(url, taskData);
  mutate(url);
  return response.data;
}

export async function updateTask(taskId: string, updateData: any, clientId?: string) {
  const url = clientId ? `/brain/clients/${clientId}/tasks/${taskId}` : `/brain/tasks/${taskId}`;
  const response = await NextGenAPI.put(url, updateData);
  mutate(clientId ? `/brain/clients/${clientId}/tasks` : `/brain/tasks`);
  return response.data;
}
