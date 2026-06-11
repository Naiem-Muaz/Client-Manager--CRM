import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface Engagement {
  id: string;
  clientId: string;
  templateId: string | null;
  templateName: string | null;
  templateBody: string | null;
  status: 'draft' | 'sent' | 'signed' | 'expired';
  sentAt: string | null;
  signedAt: string | null;
  signerName: string | null;
  signerEmail: string | null;
  signatureHash: string | null;
  certificatePdfUrl: string | null;
  locked: boolean;
  signingTokenExpiresAt: string | null;
  createdAt: string;
}

export interface EngagementTemplate {
  id: string;
  name: string;
  description: string | null;
  templateBody: string;
  isSystem: boolean;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data ?? []);

export function useEngagementLetters(clientId: string | undefined) {
  const key = clientId ? `/brain/clients/${clientId}/engagements` : null;
  const { data, error, isLoading, mutate } = useSWR<Engagement[]>(key, fetcher);
  return { letters: (data || []) as Engagement[], isLoading, isError: error, mutate };
}

export function useEngagementTemplates() {
  const { data, error, isLoading } = useSWR<EngagementTemplate[]>('/brain/engagement-templates', fetcher);
  return { templates: (data || []) as EngagementTemplate[], isLoading, isError: error };
}

const revalidate = (clientId: string) => globalMutate(`/brain/clients/${clientId}/engagements`);

// Generate a draft engagement from a template (server merges the fields).
export async function generateEngagement(clientId: string, templateId: string) {
  const res = await NextGenAPI.post(`/brain/clients/${clientId}/engagements/generate`, { templateId });
  revalidate(clientId);
  return res.data.data ?? res.data;
}

// Mark a draft as sent (triggers the signing email + Lumina alert server-side).
export async function sendEngagement(clientId: string, engagementId: string) {
  const res = await NextGenAPI.post(`/brain/clients/${clientId}/engagements/${engagementId}/send`);
  revalidate(clientId);
  return res.data.data ?? res.data;
}

// Fresh signed download URL for a signed engagement's certificate.
export async function fetchCertificateUrl(clientId: string, engagementId: string): Promise<string | null> {
  const res = await NextGenAPI.get(`/brain/clients/${clientId}/engagements/${engagementId}/certificate`);
  return (res.data.data ?? res.data)?.url ?? null;
}
