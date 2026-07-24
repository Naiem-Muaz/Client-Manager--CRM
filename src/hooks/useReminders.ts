import useSWR, { mutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

const SUMMARY_URL = '/brain/reminders/summary';
const listUrl = (status?: string) => (status ? `/brain/reminders?status=${status}` : '/brain/reminders');
const fetcher = (url: string) => NextGenAPI.get(url).then((r) => r.data.data ?? r.data);

export interface ReminderRow {
  id: string;
  status: 'pending' | 'no_email' | 'sent' | 'skipped' | 'failed';
  template_kind: 'payment' | 'information';
  threshold_days: number;
  due_date: string;
  days_out: number;
  to_email: string | null;
  subject: string;
  body_html: string;
  client_id: string;
  client_name: string;
  deadline_name: string;
  deadline_type_code: string;
}
export interface ReminderSummary { ready: number; blocked: number; sent: number }

export function useReminderSummary() {
  const { data } = useSWR<ReminderSummary>(SUMMARY_URL, fetcher);
  return { summary: data };
}

export function useReminders(status?: string) {
  const { data, isLoading, error } = useSWR<ReminderRow[]>(listUrl(status), fetcher);
  return {
    reminders: data || [],
    isLoading,
    isError: error,
    refresh: () => { mutate(listUrl(status)); mutate(SUMMARY_URL); },
  };
}

const refreshAll = () => { mutate(listUrl('pending')); mutate(listUrl('no_email')); mutate(listUrl()); mutate(SUMMARY_URL); };

// `refresh: false` lets the caller defer the list revalidation (e.g. to hold a
// "Sent ✓" confirmation on the row for a beat before it drops out of the queue).
export async function approveReminder(id: string, opts?: { refresh?: boolean }) { await NextGenAPI.post(`/brain/reminders/${id}/approve`); if (opts?.refresh !== false) refreshAll(); }
export async function bulkApproveReminders(ids: string[], opts?: { refresh?: boolean }) { const r = await NextGenAPI.post('/brain/reminders/bulk-approve', { ids }); if (opts?.refresh !== false) refreshAll(); return r.data.data as { sent: number; failed: number; skipped: number }; }
export async function skipReminder(id: string) { await NextGenAPI.post(`/brain/reminders/${id}/skip`); refreshAll(); }
export async function editReminder(id: string, updates: { subject?: string; body_html?: string }) { await NextGenAPI.patch(`/brain/reminders/${id}`, updates); refreshAll(); }
export async function addReminderEmail(id: string, email: string) { await NextGenAPI.post(`/brain/reminders/${id}/add-email`, { email }); refreshAll(); }

// ── Practice Settings ────────────────────────────────────────────────────────
const SETTINGS_URL = '/brain/reminders/settings';
export interface ReminderTypeSetting { id: string; code: string; name: string; category: string; reminder_offsets_days: number[] }
export interface ReminderSettings { enabled: boolean; types: ReminderTypeSetting[] }

export function useReminderSettings() {
  const { data, isLoading } = useSWR<ReminderSettings>(SETTINGS_URL, fetcher);
  return { settings: data, isLoading };
}
export async function setRemindersEnabled(enabled: boolean) { await NextGenAPI.put(SETTINGS_URL, { enabled }); mutate(SETTINGS_URL); }
export async function setTypeOffsets(typeId: string, offsets: number[]) { await NextGenAPI.put(`${SETTINGS_URL}/offsets/${typeId}`, { offsets }); mutate(SETTINGS_URL); }
