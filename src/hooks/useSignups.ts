import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

// Website signup leads (client_manager.pending_signups), served by the
// orchestrator at GET/PATCH /api/brain/signups — the same staff-token routes
// the NextGen frontend used before this screen moved to its natural home here
// (founder's ruling 2026-08-17: marketing/sales staff work in the CRM and
// should never need a NextGen login).
//
// ⚠️ A signup is a LEAD, not a client. Converting one still goes through the
// normal client-creation flow in this CRM; this screen only tracks the funnel.

const LIST_URL = '/brain/signups';
const fetcher = (url: string) => NextGenAPI.get(url).then((r) => r.data.data ?? r.data);

export type SignupStatus = 'pending' | 'contacted' | 'converted' | 'rejected';

export interface SignupRow {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    business_name: string | null;
    business_type: string | null;
    plan_id: string | null;
    referral_source: string | null;
    status: SignupStatus;
    notes: string | null;
    created_at: string;
    updated_at: string | null;
}

export function useSignups() {
    const { data, isLoading, isValidating, error } = useSWR<SignupRow[]>(LIST_URL, fetcher);
    return {
        signups: Array.isArray(data) ? data : [],
        isLoading,
        /** true while a revalidation is in flight — drives the Refresh spinner. */
        isValidating,
        isError: error,
        refresh: () => mutate(LIST_URL),
    };
}

/**
 * Server-confirmed update: the caller refreshes AFTER this resolves. No
 * optimistic UI — the old NextGen screen's original sin was updating the
 * screen whether or not the write landed.
 */
export async function updateSignup(
    id: string,
    patch: { status?: SignupStatus; notes?: string },
): Promise<void> {
    await NextGenAPI.patch(`/brain/signups/${id}`, patch);
    await mutate(LIST_URL);
}
