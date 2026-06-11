import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export type HealthGrade = 'excellent' | 'good' | 'needs-attention' | 'at-risk';

export interface HealthBreakdown {
  deadlineCompliance: number;
  documentCompleteness: number;
  openOverdueTasks: number;
  mtdStatus: number;
  communicationRecency: number;
}
export interface ClientHealth { score: number; grade: HealthGrade; breakdown: HealthBreakdown }

export const GRADE_META: Record<HealthGrade, { label: string; text: string; bg: string; ring: string; dot: string }> = {
  'excellent':       { label: 'Excellent',       text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'text-emerald-500', dot: 'bg-emerald-500' },
  'good':            { label: 'Good',            text: 'text-blue-700',    bg: 'bg-blue-50',    ring: 'text-blue-500',    dot: 'bg-blue-500' },
  'needs-attention': { label: 'Needs attention', text: 'text-amber-700',   bg: 'bg-amber-50',   ring: 'text-amber-500',   dot: 'bg-amber-500' },
  'at-risk':         { label: 'At risk',         text: 'text-red-700',     bg: 'bg-red-50',     ring: 'text-red-500',     dot: 'bg-red-500' },
};

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data);

export function useClientHealth(clientId: string | undefined) {
  const { data, error, isLoading } = useSWR<ClientHealth>(clientId ? `/brain/clients/${clientId}/health` : null, fetcher);
  return { health: data, isLoading, isError: error };
}

export function useHealthScores() {
  const { data, error, isLoading } = useSWR('/brain/clients/health-scores', fetcher);
  const map: Record<string, { score: number; grade: HealthGrade }> = {};
  (Array.isArray(data) ? data : []).forEach((r: any) => { map[r.clientId] = { score: r.score, grade: r.grade }; });
  return { scores: map, isLoading, isError: error };
}
