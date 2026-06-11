import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export type JobStatus = 'not-started' | 'in-progress' | 'review' | 'blocked' | 'complete';
export type JobPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface ChecklistStep { name: string; completed: boolean }

export interface Job {
  id: string;
  clientId: string | null;
  clientName: string | null;
  templateId: string | null;
  title: string;
  jobType: string;
  status: JobStatus;
  priority: JobPriority;
  assigneeId: string | null;
  assigneeName: string | null;
  dueDate: string | null;
  taxYear: string | null;
  checklistSteps: ChecklistStep[];
  timeLoggedMins: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobTemplate {
  id: string;
  name: string;
  jobType: string;
  recurrence: 'annual' | 'quarterly' | 'monthly' | 'one-off';
  dueDateRule: string | null;
  checklistSteps: string[];
  isSystem: boolean;
}

export interface JobFilters {
  clientId?: string;
  assigneeId?: string;
  status?: string[];
  priority?: string[];
  dueFrom?: string;
  dueTo?: string;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data ?? []);

function buildQuery(f: JobFilters): string {
  const p = new URLSearchParams();
  if (f.clientId) p.set('clientId', f.clientId);
  if (f.assigneeId) p.set('assigneeId', f.assigneeId);
  if (f.status?.length) p.set('status', f.status.join(','));
  if (f.priority?.length) p.set('priority', f.priority.join(','));
  if (f.dueFrom) p.set('dueFrom', f.dueFrom);
  if (f.dueTo) p.set('dueTo', f.dueTo);
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function useJobs(filters: JobFilters = {}) {
  const key = `/brain/jobs${buildQuery(filters)}`;
  const { data, error, isLoading, mutate } = useSWR<Job[]>(key, fetcher);
  return { jobs: (data || []) as Job[], isLoading, isError: error, mutate };
}

export function useJobTemplates() {
  const { data, error, isLoading } = useSWR<JobTemplate[]>('/brain/job-templates', fetcher);
  return { templates: (data || []) as JobTemplate[], isLoading, isError: error };
}

export interface JobEvent {
  id: string;
  jobId: string;
  jobTitle: string;
  eventType: 'created' | 'status_changed' | 'assigned' | 'comment_added' | 'time_logged' | 'completed' | 'checklist_step_toggled';
  fromValue: string | null;
  toValue: string | null;
  metadata: any;
  actorName: string;
  createdAt: string;
}

export function useJobEvents(clientId: string | undefined) {
  const key = clientId ? `/brain/jobs/events?clientId=${clientId}` : null;
  const { data, error, isLoading, mutate } = useSWR<JobEvent[]>(key, fetcher);
  return { events: (data || []) as JobEvent[], isLoading, isError: error, mutate };
}

export function useJobComments(jobId: string | null) {
  const key = jobId ? `/brain/jobs/${jobId}/comments` : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetcher);
  return { comments: (data || []) as any[], isLoading, isError: error, mutate };
}

const revalidateJobs = () =>
  globalMutate((k) => typeof k === 'string' && k.startsWith('/brain/jobs'), undefined, { revalidate: true });

export async function createJob(payload: Record<string, any>) {
  const res = await NextGenAPI.post('/brain/jobs', payload);
  revalidateJobs();
  return res.data.data ?? res.data;
}

export async function updateJob(id: string, updates: Record<string, any>) {
  const res = await NextGenAPI.patch(`/brain/jobs/${id}`, updates);
  return res.data.data ?? res.data;
}

export async function deleteJob(id: string) {
  const res = await NextGenAPI.delete(`/brain/jobs/${id}`);
  revalidateJobs();
  return res.data;
}

export async function addJobComment(jobId: string, body: string) {
  const res = await NextGenAPI.post(`/brain/jobs/${jobId}/comments`, { body });
  return res.data.data ?? res.data;
}

export async function logJobTime(jobId: string, minutes: number, description: string) {
  const res = await NextGenAPI.post(`/brain/jobs/${jobId}/time`, { minutes, description });
  return res.data.data ?? res.data;
}
