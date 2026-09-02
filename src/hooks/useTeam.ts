import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const TEAM_URL = '/brain/team/members';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data || res.data);

export interface TeamMember {
  id: string;
  name: string;          // normalised from backend `fullName`
  email: string;
  role: string | null;
  jobTitle?: string | null;   // free-text HR label (e.g. "System Designer"); distinct from `role`
  active: boolean;
  status?: 'active' | 'pending';
  /**
   * For a `status: 'pending'` row, what is actually TRUE of the invitation.
   * The backend reads the invite WITH the account that may already exist, so
   * "Pending" stops being the only thing this screen can say:
   *   live      — sent, unexpired, nobody has signed up yet
   *   expired   — past its 7-day window; the emailed link no longer works
   *   unusable  — a legacy row with no token, so no link can ever match it
   *   signed_up — they DO have an account (public signup), but no staff role
   *               was granted, so the invitation is still outstanding
   */
  inviteState?: 'live' | 'expired' | 'unusable' | 'signed_up';
  accountExists?: boolean;
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

// Soft (de)activation: active=false → status='deactivated' (blocks login, reversible).
export async function setMemberActive(id: string, active: boolean) {
  return updateTeamMember(id, { active });
}

export interface ActiveWork {
  clientAssignments: { clientId: string; clientName: string }[];
  openJobs: { jobId: string; title: string; dueDate?: string | null; clientName?: string | null }[];
  openDeadlines: { deadlineId: string; title: string; dueDate?: string | null; clientName?: string | null }[];
  total: number;
}

// The reassignment surface for the deactivate confirm — a member's live work.
export function useMemberActiveWork(id: string | null) {
  const { data, isLoading } = useSWR(id ? `${TEAM_URL}/${id}/active-work` : null, fetcher);
  return { work: data as ActiveWork | undefined, isLoading };
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
