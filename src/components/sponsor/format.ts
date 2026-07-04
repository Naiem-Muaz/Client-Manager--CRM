// Shared display helpers for the Sponsor Compliance UI.

export const fmtDate = (v?: string | null): string =>
  v ? new Date(v + (v.length === 10 ? 'T00:00:00Z' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';

export const fmtMoney = (v?: number | null): string =>
  v == null ? '—' : '£' + Number(v).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** whole days from today to `v` (UTC); negative = past. null if no date. */
export function daysUntil(v?: string | null): number | null {
  if (!v) return null;
  const d = new Date(v.slice(0, 10) + 'T00:00:00Z').getTime();
  const now = new Date(); const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((d - today) / 86_400_000);
}

/** colour band for an expiry-style date. */
export function dateBand(v?: string | null): 'none' | 'ok' | 'soon' | 'urgent' | 'past' {
  const d = daysUntil(v);
  if (d == null) return 'none';
  if (d < 0) return 'past';
  if (d <= 30) return 'urgent';
  if (d <= 90) return 'soon';
  return 'ok';
}
export const DATE_BAND_CLS: Record<string, string> = {
  none: 'text-slate-400',
  ok: 'text-slate-700',
  soon: 'text-amber-700',
  urgent: 'text-rose-700 font-semibold',
  past: 'text-rose-700 font-semibold',
};

export const tierChipCls = (tier: 'warning' | 'escalate'): string =>
  tier === 'escalate' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200';

/** salary-status → chip label + classes. */
export function salaryChip(status?: string): { label: string; cls: string } {
  switch (status) {
    case 'meets': return { label: 'Meets', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    case 'breach': return { label: 'Below minimum', cls: 'bg-rose-100 text-rose-700 border-rose-200' };
    case 'insufficient_data': return { label: 'Building', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    case 'no_required_salary': return { label: 'No threshold set', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
    default: return { label: 'No pay data', cls: 'bg-slate-100 text-slate-500 border-slate-200' };
  }
}

export const chipBase = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border';

// Doc-type codes (must match the DB CHECK — used directly, no label mapping).
export const DOC_TYPES: { code: string; label: string }[] = [
  { code: 'passport', label: 'Passport' },
  { code: 'brp_or_evisa', label: 'BRP / eVisa' },
  { code: 'visa_vignette', label: 'Visa vignette' },
  { code: 'rtw_check', label: 'Right-to-work check' },
  { code: 'share_code_evidence', label: 'Share-code evidence' },
  { code: 'cos', label: 'Certificate of Sponsorship' },
  { code: 'contract', label: 'Contract' },
  { code: 'payslip', label: 'Payslip' },
  { code: 'qualification', label: 'Qualification' },
  { code: 'recruitment_evidence', label: 'Recruitment evidence' },
  { code: 'right_to_rent', label: 'Right to rent' },
  { code: 'other', label: 'Other' },
];

/** Add N working days (Mon–Fri; bank holidays NOT excluded — an approximate SMS
 *  deadline the accountant can adjust) to an ISO date. */
export function addWorkingDays(startIso: string, n: number): string {
  if (!startIso) return '';
  const d = new Date(startIso.slice(0, 10) + 'T00:00:00Z');
  let added = 0;
  while (added < n) { d.setUTCDate(d.getUTCDate() + 1); const dow = d.getUTCDay(); if (dow !== 0 && dow !== 6) added++; }
  return d.toISOString().slice(0, 10);
}
export const WEEKDAY_LABELS: [string, number][] = [['Mon', 1], ['Tue', 2], ['Wed', 3], ['Thu', 4], ['Fri', 5], ['Sat', 6], ['Sun', 7]];

export const VISA_ROUTES = ['skilled_worker', 'health_and_care', 'senior_or_specialist_ict', 'global_business_mobility', 'scale_up', 'graduate', 'other'];
export const PAY_FREQUENCIES = ['annual', 'monthly', 'four_weekly', 'fortnightly', 'weekly', 'hourly', 'irregular'];
export const prettify = (s?: string | null): string => (s ? s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');
