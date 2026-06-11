import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const RULES_URL = '/brain/automation-rules';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export interface AutomationRule {
  id: string;
  title: string;
  description: string;
  active: boolean;
}

export function useAutomationRules() {
  const { data, error, isLoading } = useSWR(RULES_URL, fetcher);

  return {
    rules: (data?.items || data || []) as AutomationRule[],
    isLoading,
    isError: error,
    mutate: () => mutate(RULES_URL),
  };
}

export async function toggleAutomationRule(id: string, active: boolean) {
  const response = await NextGenAPI.patch(`${RULES_URL}/${id}`, { active });
  mutate(RULES_URL);
  return response.data.data || response.data;
}
