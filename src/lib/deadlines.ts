// Shared deadline display helpers + types for the CRM Deadlines surfaces.
// NON-NEGOTIABLE: dates are 'YYYY-MM-DD' strings and are formatted WITHOUT any
// timezone conversion (no new Date(str)). overdue (boolean) drives the red state,
// never days_remaining <= 0 (a deadline due today is days_remaining 0 but not overdue).

export type DeadlineStatus =
  | 'not_started' | 'in_progress' | 'awaiting_client' | 'ready_to_file'
  | 'submitted' | 'filed' | 'confirmed' | 'not_applicable';

export type Authority = 'companies_house' | 'hmrc' | 'pension_regulator' | 'internal';

export interface Deadline {
  id: string;
  client_id: string;
  client_name?: string;
  client_entity_type?: string | null;   // from the engine join — feeds clientTypeOf
  client_mtd_status?: string | null;
  deadline_type: {
    code: string; name: string; authority: Authority; category: string;
    penalty_info: { summary: string; authority: string } | null;
  };
  period_start: string | null;
  period_end: string | null;
  statutory_due_date: string;
  internal_due_date: string | null;
  title: string;
  status: DeadlineStatus;
  assigned_to: string | null;
  assignee_name: string | null;
  source: 'companies_house' | 'hmrc' | 'computed' | 'manual';
  external_ref: string | null;
  is_manual_override: boolean;
  last_synced_at: string | null;
  completed_at: string | null;
  notes: string | null;
  overdue: boolean;       // SQL-derived, London-pinned — trust this for red
  days_remaining: number; // signed; negative = overdue magnitude
}

export type CoverageStatus = 'ok' | 'unmonitored' | 'under_monitored';
export interface Coverage {
  client_id: string;
  status: CoverageStatus;
  reason_codes: string[];
  detail?: any;
  computed_at?: string;
}

// ── Date-only formatting (NO timezone conversion) ────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** '2027-03-31' -> '31 Mar 2027'. Returns '—' for null/empty. Never constructs a Date. */
export function formatDateOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`;
}

/** '2025-04-06'..'2026-04-05' -> 'period' label, or '—' when there's no period. */
export function formatPeriod(start: string | null, end: string | null): string {
  if (!start && !end) return '—';
  return `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
}

/**
 * Monday of the week containing `iso`, as a 'YYYY-MM-DD' string. UTC math is used
 * ONLY to compute the grouping key (never for display) so there's no tz drift.
 */
export function weekStartISO(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = d.getUTCDay();              // 0 Sun .. 6 Sat
  const delta = (dow === 0 ? -6 : 1 - dow); // back to Monday
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// ── Days pill (overdue boolean is the source of truth) ───────────────────────
export interface Pill { text: string; className: string; }

const PILL_RED = 'bg-red-100 text-red-700 border border-red-200';
const PILL_AMBER = 'bg-amber-100 text-amber-700 border border-amber-200';
const PILL_GREEN = 'bg-emerald-100 text-emerald-700 border border-emerald-200';

export function daysPill(d: Pick<Deadline, 'overdue' | 'days_remaining'>): Pill {
  if (d.overdue) {
    const n = Math.abs(d.days_remaining);
    return { text: `${n} ${n === 1 ? 'day' : 'days'} overdue`, className: PILL_RED };
  }
  if (d.days_remaining === 0) return { text: 'Due today', className: PILL_AMBER };
  if (d.days_remaining <= 14) return { text: `${d.days_remaining} days`, className: PILL_AMBER };
  return { text: `${d.days_remaining} days`, className: PILL_GREEN };
}

// ── Status labels + select options ───────────────────────────────────────────
export const STATUS_LABELS: Record<DeadlineStatus, string> = {
  not_started: 'Not started', in_progress: 'In progress', awaiting_client: 'Awaiting client',
  ready_to_file: 'Ready to file', submitted: 'Submitted', filed: 'Filed',
  confirmed: 'Confirmed', not_applicable: 'Not applicable',
};
export const STATUS_ORDER: DeadlineStatus[] = [
  'not_started', 'in_progress', 'awaiting_client', 'ready_to_file', 'submitted', 'filed', 'confirmed', 'not_applicable',
];
export const COMPLETED_STATUSES: DeadlineStatus[] = ['filed', 'confirmed', 'not_applicable'];

// UI-only "Done" partition for the Deadlines list collapse. DELIBERATELY distinct
// from COMPLETED_STATUSES (a backend-terminal set other code relies on): here
// 'submitted' also counts as done for the accountant's list view, so a submitted
// item drops out of the active work list. Do not merge the two.
export const DONE_STATUSES: DeadlineStatus[] = ['submitted', 'filed', 'confirmed', 'not_applicable'];

// ── Authority grouping (Companies House first, then HMRC) ─────────────────────
export const AUTHORITY_LABELS: Record<Authority, string> = {
  companies_house: 'Companies House', hmrc: 'HMRC',
  pension_regulator: 'Pension Regulator', internal: 'Internal',
};
export const AUTHORITY_ORDER: Authority[] = ['companies_house', 'hmrc', 'pension_regulator', 'internal'];

export function groupByAuthority(deadlines: Deadline[]): { authority: Authority; rows: Deadline[] }[] {
  const buckets = new Map<Authority, Deadline[]>();
  for (const d of deadlines) {
    const a = d.deadline_type.authority;
    if (!buckets.has(a)) buckets.set(a, []);
    buckets.get(a)!.push(d);
  }
  return AUTHORITY_ORDER
    .filter((a) => buckets.has(a))
    .map((a) => ({ authority: a, rows: buckets.get(a)! }));
}

// ── Coverage reason → UI copy + action (per the Phase 5 brief) ───────────────
export interface ReasonMeta { badge: 'red' | 'amber'; message: string; action: string; }
export const REASON_MAP: Record<string, ReasonMeta> = {
  no_entity_type: { badge: 'red', message: "No entity type set — can't determine obligations", action: 'Set entity type' },
  no_company_number: { badge: 'red', message: "No company number — Companies House & CT deadlines can't be tracked", action: 'Add CRN' },
  ch_not_found: { badge: 'red', message: "Company number didn't match Companies House", action: 'Check CRN' },
  no_obligations_derived: { badge: 'red', message: 'No deadlines could be derived', action: 'Review client' },
  vat_registered_no_stagger: { badge: 'amber', message: 'VAT-registered but VAT quarter not set — VAT deadlines not tracked', action: 'Set VAT stagger' },
  vat_registered_no_vat_deadline: { badge: 'amber', message: 'VAT-registered but no VAT deadlines generated', action: 'Review VAT setup' },
  employer_no_payroll_deadline: { badge: 'amber', message: 'Employer but no payroll deadlines', action: 'Review payroll setup' },
  mtd_participant_no_mtd_deadline: { badge: 'amber', message: 'MTD participant but no MTD deadlines', action: 'Review MTD setup' },
  suspected_vat_uncaptured: { badge: 'amber', message: "Has a VAT number but isn't flagged VAT-registered", action: 'Confirm VAT status' },
  suspected_employer_uncaptured: { badge: 'amber', message: "Has a PAYE reference but isn't flagged an employer", action: 'Confirm employer status' },
};

export function reasonMeta(code: string): ReasonMeta {
  return REASON_MAP[code] ?? { badge: 'amber', message: code, action: 'Review client' };
}

// Which detail-page tab actually owns the editable field for a reason — used to
// render the banner ACTION as a real navigation button. Only reasons whose field
// has an edit surface reachable from the client detail page are listed; for any
// other reason the banner shows the message WITHOUT a (dead) action button.
//   - vat_registered / vat_quarter_end live in ClientComplianceDatesCard (Overview).
//   - vat_stagger/vat_scheme/is_employer/paye_reference/payroll_frequency have NO
//     edit UI at all; entity_type/mtd_status are only editable via the list-page
//     QuickEditDrawer (not openable here) → intentionally no button.
// The Overview tab's ClientComplianceDatesCard now edits vat_registered,
// vat_quarter_end, vat_stagger, vat_scheme, is_employer, paye_reference and
// payroll_frequency — so every VAT/employer coverage reason routes there.
// (entity_type/mtd_status are only in the list-page drawer, and company_number
// is in the always-visible CH panel — those stay message-only, no dead button.)
export const REASON_NAV_TAB: Record<string, string> = {
  vat_registered_no_stagger: 'overview',
  vat_registered_no_vat_deadline: 'overview',
  suspected_vat_uncaptured: 'overview',
  employer_no_payroll_deadline: 'overview',
  suspected_employer_uncaptured: 'overview',
};

export function reasonNavTab(code: string): string | null {
  return REASON_NAV_TAB[code] ?? null;
}
