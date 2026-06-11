import { JobTemplate } from '../hooks/useJobs';

/**
 * Rule-based due-date calculation for job templates.
 *
 * NOTE on bank holidays: the deadline engine's bank-holiday cache lives in the backend
 * (routes/deadlines.ts) and can't be imported into the browser bundle. This module keeps a
 * parallel frontend cache (localStorage, 24h) of gov.uk/bank-holidays.json. calculateDueDate
 * is synchronous and applies weekend roll-forward; call applyBankHolidayRoll() to additionally
 * roll past bank holidays.
 */

export interface DueDateConfig {
  taxYearEnd?: Date;          // default: next 5 April
  accountingPeriodEnd?: Date;
  vatQuarterEnd?: Date;
  incorporationDate?: Date;
}

const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0));
const addMonths = (d: Date, n: number) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };

/** Next 5 April at or after today. */
function nextFifthApril(from = new Date()): Date {
  const y = from.getUTCFullYear();
  const d = new Date(Date.UTC(y, 3, 5)); // 5 Apr
  return d < from ? new Date(Date.UTC(y + 1, 3, 5)) : d;
}

/** Next occurrence of a fixed month/day at or after `from`. */
function nextFixed(month: number, day: number, from = new Date()): Date {
  const y = from.getUTCFullYear();
  const d = new Date(Date.UTC(y, month, day));
  return d < from ? new Date(Date.UTC(y + 1, month, day)) : d;
}

/** Roll a Saturday/Sunday forward to the following Monday. */
function rollWeekend(d: Date): Date {
  const x = new Date(d);
  const day = x.getUTCDay();
  if (day === 6) x.setUTCDate(x.getUTCDate() + 2);
  else if (day === 0) x.setUTCDate(x.getUTCDate() + 1);
  return x;
}

export function calculateDueDate(template: JobTemplate, config: DueDateConfig = {}): Date | null {
  const taxYearEnd = config.taxYearEnd ?? nextFifthApril();
  let due: Date | null = null;

  switch (template.jobType) {
    case 'self-assessment':
    case 'final-declaration':
      // 31 Jan following the tax year end (tax year ending 5 Apr Y -> 31 Jan Y+1)
      due = new Date(Date.UTC(taxYearEnd.getUTCFullYear() + 1, 0, 31));
      break;
    case 'corporation-tax':
      due = config.accountingPeriodEnd ? addMonths(config.accountingPeriodEnd, 12) : null;
      break;
    case 'vat':
      if (config.vatQuarterEnd) { due = addMonths(config.vatQuarterEnd, 1); due.setUTCDate(due.getUTCDate() + 7); }
      break;
    case 'mtd-quarterly': {
      const n = template.name;
      if (n.includes('Q1')) due = nextFixed(7, 5);       // 5 Aug
      else if (n.includes('Q2')) due = nextFixed(10, 5);  // 5 Nov
      else if (n.includes('Q3')) due = nextFixed(1, 5);   // 5 Feb
      else if (n.includes('Q4')) due = nextFixed(4, 5);   // 5 May
      break;
    }
    case 'eops':
      // 5 Apr after the tax year end (before final declaration)
      due = new Date(Date.UTC(taxYearEnd.getUTCFullYear() + 1, 3, 5));
      break;
    case 'bookkeeping': {
      const now = new Date();
      due = lastDayOfMonth(now.getUTCFullYear(), now.getUTCMonth() + 1); // last day of next month
      break;
    }
    case 'payroll': {
      const now = new Date();
      due = lastDayOfMonth(now.getUTCFullYear(), now.getUTCMonth()); // last day of current month
      break;
    }
    default:
      due = null;
  }

  return due ? rollWeekend(due) : null;
}

/** Whether the due date for this template depends on client-specific config. */
export function needsClientConfig(template: JobTemplate): boolean {
  return template.jobType === 'corporation-tax' || template.jobType === 'vat';
}

// ── Bank holiday roll-forward (frontend cache) ─────────────────────────────────

const BH_KEY = 'uk_bank_holidays_v1';

async function getBankHolidays(): Promise<Set<string>> {
  try {
    const raw = localStorage.getItem(BH_KEY);
    if (raw) {
      const { dates, ts } = JSON.parse(raw);
      if (Date.now() - ts < 24 * 60 * 60 * 1000) return new Set(dates);
    }
  } catch { /* ignore */ }
  try {
    const res = await fetch('https://www.gov.uk/bank-holidays.json');
    const body = await res.json();
    const dates: string[] = [];
    for (const region of Object.values(body) as any[]) for (const ev of region?.events || []) if (ev?.date) dates.push(ev.date);
    try { localStorage.setItem(BH_KEY, JSON.stringify({ dates, ts: Date.now() })); } catch { /* ignore */ }
    return new Set(dates);
  } catch {
    return new Set();
  }
}

const iso = (d: Date) => d.toISOString().split('T')[0];

/** Roll a date past weekends and UK bank holidays to the next working day. */
export async function applyBankHolidayRoll(date: Date): Promise<Date> {
  const holidays = await getBankHolidays();
  const d = rollWeekend(date);
  for (let i = 0; i < 14; i++) {
    if (holidays.has(iso(d))) { d.setUTCDate(d.getUTCDate() + 1); rollWeekend(d); } else break;
  }
  return rollWeekend(d);
}
