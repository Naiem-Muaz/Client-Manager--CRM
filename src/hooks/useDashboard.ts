import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface DashboardSummary {
  totalClients: number;
  clientsByEntity: { entity_type: string | null; n: number }[];
  jobsDueThisWeek: number;
  overdueDeadlines: number;
  unsignedEngagements: number;
  mtdComplianceRate: number | null;
  mtdClients: number;
  revenueThisMonth: number; // pounds
  recentActivity: {
    eventType: string; fromValue: string | null; toValue: string | null;
    jobTitle: string; clientName: string; createdAt: string;
  }[];
}

const fetcher = (url: string) => NextGenAPI.get(url).then(r => r.data.data ?? r.data);

export function useDashboardSummary() {
  const { data, error, isLoading } = useSWR<DashboardSummary>('/brain/dashboard/summary', fetcher);
  return { summary: data, isLoading, isError: error };
}
