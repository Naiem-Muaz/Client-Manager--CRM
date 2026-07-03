import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const TEAM_URL = '/brain/team/members';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export interface TeamMember {
  id: string;
  name: string;          // normalised from backend `fullName`
  email: string;
  role: string | null;
  active: boolean;
  status?: 'active' | 'pending';
  agentCode?: string | null;
  jobCount?: number;
  avatarInitial?: string;
}

export const TEAM_ROLES = ['partner', 'manager', 'senior-accountant', 'accountant', 'trainee', 'admin'];

export function useTeamMembers() {
  const { data, error, isLoading } = useSWR(TEAM_URL, fetcher);
  const rows = (data?.items || data || []) as any[];
  const members: TeamMember[] = (Array.isArray(rows) ? rows : []).map(r => ({
    ...r,
    name: r.fullName ?? r.name ?? r.email,
  }));

  return {
    members,
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

export async function updateTeamMember(id: string, updates: Record<string, any>) {
  const response = await NextGenAPI.patch(`${TEAM_URL}/${id}`, updates);
  mutate(TEAM_URL);
  return response.data.data || response.data;
}

// Regenerate the token + re-send the invite email for a pending invite.
// Returns { emailSent } so the caller can surface an email-send failure.
export async function resendInvite(id: string) {
  const response = await NextGenAPI.post(`/brain/team/invite/${id}/resend`);
  mutate(TEAM_URL);
  return response.data.data || response.data;
}

// Soft-cancel a pending invite (status='cancelled'); it drops out of the list.
export async function cancelInvite(id: string) {
  const response = await NextGenAPI.post(`/brain/team/invite/${id}/cancel`);
  mutate(TEAM_URL);
  return response.data.data || response.data;
}
