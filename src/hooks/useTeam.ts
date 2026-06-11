import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const TEAM_URL = '/brain/team/members';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  status?: 'active' | 'pending';
  agentCode?: string;
}

export function useTeamMembers() {
  const { data, error, isLoading } = useSWR(TEAM_URL, fetcher);

  return {
    members: (data?.items || data || []) as TeamMember[],
    isLoading,
    isError: error,
    mutate: () => mutate(TEAM_URL),
  };
}

export async function inviteTeamMember(payload: { email: string; role: string }) {
  const response = await NextGenAPI.post('/brain/team/invite', payload);
  mutate(TEAM_URL);
  return response.data.data || response.data;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>) {
  const response = await NextGenAPI.patch(`${TEAM_URL}/${id}`, updates);
  mutate(TEAM_URL);
  return response.data.data || response.data;
}
