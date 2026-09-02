import useSWR from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

// Team attendance / roster / leave (hr_core, Layer 2). Staff self-endpoints are
// own-scoped server-side (app-layer + RLS); super_admin endpoints see all.
const BASE = '/brain/hr';
const fetcher = (url: string) => NextGenAPI.get(url).then(r => r.data.data ?? r.data);

export interface AttendanceSegment { id: string; work_date: string; clock_in_at: string; clock_out_at: string | null; source: string; worked_minutes: number | null; email?: string; display_name?: string | null; user_id: string; }
export interface MyAttendance { date: string; segments: AttendanceSegment[]; isClockedIn: boolean; totalMinutes: number; }

// ── attendance: self ─────────────────────────────────────────────────────────
export function useMyAttendance(date?: string) {
  const { data, error, isLoading, mutate } = useSWR<MyAttendance>(`${BASE}/attendance/me${date ? `?date=${date}` : ''}`, fetcher);
  return { attendance: data, isLoading, isError: error as any, mutate };
}
export async function clockIn() { return (await NextGenAPI.post(`${BASE}/attendance/clock-in`)).data; }
export async function clockOut() { return (await NextGenAPI.post(`${BASE}/attendance/clock-out`)).data; }

// ── attendance: super_admin team view ────────────────────────────────────────
export function useTeamAttendance(date?: string) {
  const { data, error, isLoading, mutate } = useSWR<AttendanceSegment[]>(`${BASE}/attendance/team${date ? `?date=${date}` : ''}`, fetcher);
  return { segments: (data || []) as AttendanceSegment[], isLoading, isError: error, mutate };
}
// "Clocked in now" — open segments regardless of date (refreshes on an interval so
// durations stay live). open_hours flags a likely-forgotten clock-out.
export function useOpenAttendance() {
  const { data, error, isLoading, mutate } = useSWR<(AttendanceSegment & { open_hours: number })[]>(`${BASE}/attendance/open`, fetcher, { refreshInterval: 60_000 });
  return { open: (data || []) as (AttendanceSegment & { open_hours: number })[], isLoading, isError: error, mutate };
}
export async function closeSegment(id: string, clockOutAt?: string) {
  return (await NextGenAPI.patch(`${BASE}/attendance/${id}/close`, clockOutAt ? { clockOutAt } : {})).data;
}

// ── leave (chunk 2) ──────────────────────────────────────────────────────────
export interface LeaveRequest { id: string; user_id: string; start_date: string; end_date: string; leave_type: string; status: string; half_day: boolean; reason?: string; approved_by?: string; email?: string; display_name?: string | null; }
export function useMyLeave() {
  const { data, error, isLoading, mutate } = useSWR<LeaveRequest[]>(`${BASE}/leave/me`, fetcher);
  return { leave: (data || []) as LeaveRequest[], isLoading, isError: error, mutate };
}
export function useLeaveRequests(status?: string) {
  const { data, error, isLoading, mutate } = useSWR<LeaveRequest[]>(`${BASE}/leave${status ? `?status=${status}` : ''}`, fetcher);
  return { requests: (data || []) as LeaveRequest[], isLoading, isError: error, mutate };
}
export async function requestLeave(p: { startDate: string; endDate: string; leaveType: string; halfDay?: boolean; reason?: string }) { return (await NextGenAPI.post(`${BASE}/leave`, p)).data; }
export async function cancelLeave(id: string) { return (await NextGenAPI.post(`${BASE}/leave/${id}/cancel`)).data; }
export async function approveLeave(id: string) { return (await NextGenAPI.post(`${BASE}/leave/${id}/approve`)).data; }
export async function rejectLeave(id: string) { return (await NextGenAPI.post(`${BASE}/leave/${id}/reject`)).data; }

// ── roster + enrolment (chunk 3) ─────────────────────────────────────────────
export function useRoster(params?: { userId?: string; from?: string; to?: string }) {
  const q = new URLSearchParams(Object.entries(params || {}).filter(([, v]) => v) as any).toString();
  const { data, error, isLoading, mutate } = useSWR(`${BASE}/roster${q ? `?${q}` : ''}`, fetcher);
  return { roster: (data || []) as any[], isLoading, isError: error, mutate };
}
export async function upsertRoster(days: any[]) { return (await NextGenAPI.post(`${BASE}/roster`, { days })).data; }
export function useMyRoster(from?: string, to?: string) {
  const q = new URLSearchParams(Object.entries({ from, to }).filter(([, v]) => v) as any).toString();
  const { data, error, isLoading, mutate } = useSWR(`${BASE}/roster/me${q ? `?${q}` : ''}`, fetcher);
  return { roster: (data || []) as any[], isLoading, isError: error as any, mutate };
}
export function useStaff() {
  const { data, error, isLoading, mutate } = useSWR(`${BASE}/staff`, fetcher);
  return { staff: (data || []) as any[], isLoading, isError: error, mutate };
}
export async function setClocking(userId: string, enabled: boolean) { return (await NextGenAPI.patch(`${BASE}/staff/${userId}/clocking`, { enabled })).data; }
