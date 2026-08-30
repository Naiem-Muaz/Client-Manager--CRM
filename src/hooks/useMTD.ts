import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface MTDClientRow {
  client_id: string;
  client_name: string;
  entity_type: 'Company' | 'Individual' | 'Partnership' | string;
  income_band: string | null;
  /**
   * All four recorded values, plus null for "nobody has decided". The backend
   * used to collapse everything but mandated/voluntary to 'unknown', which made
   * a recorded `exempt` indistinguishable from an absent status.
   */
  mtd_status: 'mandated' | 'voluntary' | 'not-enrolled' | 'exempt' | null;
  /** 'calculated' (our ITSA derivation) or 'hmrc' once an overlay exists. */
  obligation_source?: string | null;
  next_obligation_period_start?: string | null;
  next_obligation_period_end?: string | null;
  next_obligation_due: string | null;
  obligation_status: 'open' | 'fulfilled' | 'overdue' | 'no_obligation';
  submission_stage: string;
  agent_auth_status: 'authorized' | 'pending' | 'not_connected';
  days_until_deadline: number | null;
  assigned_staff: string | null;
  hmrc_token_exists: boolean;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data);

export function useMTDClients() {
  const { data, error, isLoading, mutate } = useSWR<MTDClientRow[]>(
    '/brain/mtd/clients',
    fetcher,
    { refreshInterval: 120000 }
  );

  const clients: MTDClientRow[] = (data as any)?.data ?? data ?? [];

  return {
    clients,
    isLoading,
    isError: error,
    mutate,
    refresh: () => mutate(),
  };
}
