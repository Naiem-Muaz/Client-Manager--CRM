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
  // Same cadence as the open-segments panel. Without it the day view was fetched
  // once on mount and never again, so a shift that started while the page was
  // open never appeared — and the screen reported "No attendance for this day"
  // about a day that had some.
  const { data, error, isLoading, mutate } = useSWR<AttendanceSegment[]>(`${BASE}/attendance/team${date ? `?date=${date}` : ''}`, fetcher, { refreshInterval: 60_000 });
  return { segments: (data || []) as AttendanceSegment[], loaded: data !== undefined, isLoading, isError: error, error, mutate };
}
// "Clocked in now" — open segments regardless of date (refreshes on an interval so
// durations stay live). open_hours flags a likely-forgotten clock-out.
export function useOpenAttendance() {
  const { data, error, isLoading, mutate } = useSWR<(AttendanceSegment & { open_hours: number })[]>(`${BASE}/attendance/open`, fetcher, { refreshInterval: 60_000 });
  // `open` is [] both when nobody is clocked in and when the request failed.
  // `loaded` is the difference, and the difference is the whole bug: without it
  // the screen states a fact it does not have.
  return {
    open: (data || []) as (AttendanceSegment & { open_hours: number })[],
    loaded: data !== undefined, isLoading, isError: error, error, mutate,
    // WHEN this answer was obtained. A list refreshed on an interval is a
    // statement about a moment, and the moment has to be on the screen — a
    // reading up to a minute old must not read as "right now".
    checkedAt: data !== undefined ? Date.now() : null,
  };
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
