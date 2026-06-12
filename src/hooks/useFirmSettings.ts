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

export async function uploadFirmLogo(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('logo', file);
  const res = await NextGenAPI.post('/brain/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  return (res.data.data ?? res.data)?.logoUrl;
}
