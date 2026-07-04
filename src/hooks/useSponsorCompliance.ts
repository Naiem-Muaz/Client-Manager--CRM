import useSWR, { mutate as globalMutate } from 'swr';
import { NextGenAPI } from '../api/NextGenAPI';

// Super-admin-only Sponsor Compliance API (/api/brain/sponsor-compliance/*).
// Modeled on useTeam: SWR + res.data.data unwrap + mutate.
const BASE = '/brain/sponsor-compliance';
const fetcher = (url: string) => NextGenAPI.get(url).then(res => res.data.data ?? res.data);

// ── shapes (loose — the backend is the source of truth) ──────────────────────
export interface ComplianceAlert { kind: string; tier: 'warning' | 'escalate'; dueDate: string | null; daysUntil: number | null; message: string; }
export interface SalaryAssessment { status: 'meets' | 'breach' | 'insufficient_data' | 'no_data' | 'no_required_salary'; annualRequired: number | null; payFrequency: string | null; window: string; threshold: number | null; worst?: any; failing?: any[]; }
export interface AbsenceStatus { maxStreak: number; currentStreak: number; breaches: boolean; contractedWeekdays: number[]; rosterType: string; }
export interface WorkerComputed {
  requiredSalary: number | null;
  salary: SalaryAssessment;
  nextEcsCheckDue: string | null;
  ecsGraceDeadline: string | null;
  retention: { anchor: string | null; retainUntil: string | null; purgeDue: string | null; eligibleForDeletion: boolean; shouldAnonymise: boolean; retentionHold: boolean };
  unauthorisedAbsence: AbsenceStatus;
  alerts: ComplianceAlert[];
}
export interface Worker { id: string; fullName: string; [k: string]: any; computed?: WorkerComputed; }

// ── reads ────────────────────────────────────────────────────────────────────
export function useSponsorWorkers(includeInactive = false) {
  const key = `${BASE}/workers${includeInactive ? '?includeInactive=true' : ''}`;
  const { data, error, isLoading, mutate } = useSWR<Worker[]>(key, fetcher);
  return { workers: (data || []) as Worker[], isLoading, isError: error, mutate };
}
export function useSponsorWorker(id: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<Worker>(id ? `${BASE}/workers/${id}` : null, fetcher);
  return { worker: data, isLoading, isError: error, mutate };
}
export function useOrgCompliance() {
  const { data, error, isLoading, mutate } = useSWR(`${BASE}/organisation`, fetcher);
  return { org: data, isLoading, isError: error, mutate };
}

const revalidateWorker = (id: string) => { globalMutate(`${BASE}/workers`); globalMutate(`${BASE}/workers/${id}`); };

// ── workers ──────────────────────────────────────────────────────────────────
export async function createWorker(payload: Record<string, any>) {
  const res = await NextGenAPI.post(`${BASE}/workers`, payload);
  globalMutate(`${BASE}/workers`);
  return res.data.data ?? res.data;
}
export async function updateWorker(id: string, updates: Record<string, any>) {
  const res = await NextGenAPI.patch(`${BASE}/workers/${id}`, updates);
  revalidateWorker(id);
  return res.data.data ?? res.data;
}

// ── organisation record ──────────────────────────────────────────────────────
export async function upsertOrgCompliance(payload: Record<string, any>) {
  const res = await NextGenAPI.put(`${BASE}/organisation`, payload);
  globalMutate(`${BASE}/organisation`);
  return res.data.data ?? res.data;
}

// ── absences ──────────────────────────────────────────────────────────────────
export async function addAbsence(workerId: string, payload: Record<string, any>) {
  const res = await NextGenAPI.post(`${BASE}/workers/${workerId}/absences`, payload);
  revalidateWorker(workerId);
  return res.data.data ?? res.data;
}
export async function patchAbsence(workerId: string, absenceId: string, updates: Record<string, any>) {
  const res = await NextGenAPI.patch(`${BASE}/absences/${absenceId}`, updates);
  revalidateWorker(workerId);
  return res.data.data ?? res.data;
}

// ── pay records ───────────────────────────────────────────────────────────────
export async function addPayRecord(workerId: string, payload: Record<string, any>) {
  const res = await NextGenAPI.post(`${BASE}/workers/${workerId}/pay-records`, payload);
  revalidateWorker(workerId);
  return res.data.data ?? res.data;
}

// ── roster (variable-pattern workers) ────────────────────────────────────────
export async function listWorkerRoster(workerId: string, from?: string, to?: string) {
  const q = [from && `from=${from}`, to && `to=${to}`].filter(Boolean).join('&');
  const res = await NextGenAPI.get(`${BASE}/workers/${workerId}/roster${q ? '?' + q : ''}`);
  return res.data.data ?? res.data;
}
export async function upsertRoster(workerId: string, days: { rosterDate: string; isRostered: boolean; shiftNote?: string }[]) {
  const res = await NextGenAPI.post(`${BASE}/workers/${workerId}/roster`, { days });
  revalidateWorker(workerId);
  return res.data.data ?? res.data;
}

// ── SMS reports ───────────────────────────────────────────────────────────────
export async function createSmsReport(payload: Record<string, any>) {
  const res = await NextGenAPI.post(`${BASE}/sms-reports`, payload);
  if (payload.workerId || payload.worker_id) revalidateWorker(payload.workerId || payload.worker_id);
  return res.data.data ?? res.data;
}
export async function patchSmsReport(id: string, updates: Record<string, any>, workerId?: string) {
  const res = await NextGenAPI.patch(`${BASE}/sms-reports/${id}`, updates);
  if (workerId) revalidateWorker(workerId);
  return res.data.data ?? res.data;
}

// ── RTW checks ────────────────────────────────────────────────────────────────
export async function addRtwCheck(workerId: string, payload: Record<string, any>) {
  const res = await NextGenAPI.post(`${BASE}/workers/${workerId}/rtw-checks`, payload);
  revalidateWorker(workerId);
  return res.data.data ?? res.data;
}

// ── documents (secure bucket) ────────────────────────────────────────────────
export async function listWorkerDocuments(workerId: string) {
  const res = await NextGenAPI.get(`${BASE}/workers/${workerId}/documents`);
  return res.data.data ?? res.data;
}
export async function uploadWorkerDocument(workerId: string, file: File, docType: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('doc_type', docType);
  const res = await NextGenAPI.post(`${BASE}/workers/${workerId}/documents`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data.data ?? res.data;
}
/** Returns a SHORT-LIVED (~90s) signed URL; open it immediately. */
export async function getDocumentDownloadUrl(docId: string): Promise<string | null> {
  const res = await NextGenAPI.get(`${BASE}/documents/${docId}/download`);
  return (res.data.data ?? res.data)?.url ?? null;
}
export async function deleteWorkerDocument(docId: string) {
  const res = await NextGenAPI.delete(`${BASE}/documents/${docId}`);
  return res.data.data ?? res.data;
}
