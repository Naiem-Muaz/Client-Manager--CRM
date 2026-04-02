import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';
import { ClientAuthority } from '../types/ClientAuthority';

export interface ComplianceSummary {
  total_clients: number;
  ready: number;
  not_ready: number;
  overdue: number;
  issues: number;
}

export interface ClientComplianceRow {
  client_id: string;
  name: string;
  cdd_status: string;
  hmrc_connected: boolean;
  authorised: boolean;
  obligation_status: 'open' | 'fulfilled' | 'overdue' | 'unknown';
  deadline_status: 'upcoming' | 'due_soon' | 'urgent' | 'overdue' | 'resolved' | 'unknown';
  submission_status: 'pending' | 'success' | 'failed' | 'unknown';
  risk_level: 'green' | 'amber' | 'red';
  days_remaining: number | null;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data);

export const useComplianceSummary = () => {
  const { data, error, isLoading, mutate } = useSWR<ComplianceSummary>(
    '/compliance/summary',
    fetcher,
    { refreshInterval: 60000 } // Poll every 60s
  );

  return {
    summary: data,
    isLoading,
    isError: error,
    mutate
  };
};

export const useComplianceClients = () => {
  const { data, error, isLoading, mutate } = useSWR<ClientComplianceRow[]>(
    '/compliance/clients',
    fetcher,
    { refreshInterval: 60000 } // Poll every 60s
  );

  return {
    clients: data || [],
    isLoading,
    isError: error,
    mutate
  };
};

export const useCompliance = (serviceId: string, hasEngagement: boolean, authority: ClientAuthority) => {
  const missingRequirements: string[] = [];
  
  if (!hasEngagement) {
    missingRequirements.push('Engagement Letter');
  }
  
  const status = (authority as any)[serviceId.toLowerCase()] || 'None';
  if (status !== 'Authorized') {
    missingRequirements.push(`${serviceId} Authority`);
  }

  return {
    isCompliant: missingRequirements.length === 0,
    missingRequirements
  };
};
