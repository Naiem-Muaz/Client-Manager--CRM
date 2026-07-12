import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

export interface FirmSettings {
  id: string;
  name: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  phone: string | null;
  email: string | null;
  practice_license_number: string | null;
  website: string | null;
  logo_url: string | null;
  brand_accent_color: string | null;
  vat_registered?: boolean;
  default_vat_rate?: number | string | null;
  proposal_intro_template?: string | null;
  proposal_scope_template?: string | null;
}

const fetcher = (url: string) => NextGenAPI.get(url).then(r => r.data.data ?? r.data);

export function useFirmSettings() {
  const { data, error, isLoading, mutate } = useSWR<FirmSettings>('/brain/settings/firm', fetcher);
  return { firm: data, isLoading, isError: error, mutate };
}

export async function updateFirmSettings(fields: Partial<FirmSettings>) {
  const res = await NextGenAPI.patch('/brain/settings/firm', fields);
  return res.data;
}

export async function uploadFirmLogo(file: File): Promise<{ logoUrl: string; suggestedAccent: string | null }> {
  const fd = new FormData();
  fd.append('logo', file);
  const res = await NextGenAPI.post('/brain/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  const d = res.data.data ?? res.data;
  return { logoUrl: d?.logoUrl, suggestedAccent: d?.suggestedAccent ?? null };
}

/** Sample the current logo for a brand accent (PNG only). Never writes anything. */
export async function suggestAccentFromLogo(): Promise<{ suggestedAccent: string | null; reason: string }> {
  const res = await NextGenAPI.post('/brain/settings/suggest-accent', {});
  return res.data.data ?? res.data;
}
