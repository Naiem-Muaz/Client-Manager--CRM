/**
 * ── DISPLAY FORMATTING ──────────────────────────────────────────────────────
 *
 * ⛔ DISPLAY ONLY. Stored values and anything sent to the backend stay ISO
 * `YYYY-MM-DD`. These functions are for reading, never for round-tripping — a
 * DD/MM/YYYY string reaching a date column is a 13th-month error waiting for a
 * client whose accounts end on the 5th of a month.
 */

/**
 * ISO (or anything Date accepts) → DD/MM/YYYY.
 *
 * ⚠️ PARSED AS UTC, NOT LOCAL. `new Date('2027-01-07')` is midnight UTC, and
 * rendering that with a local formatter west of Greenwich prints the 6th. Every
 * date this app shows is a STATUTORY date — a filing deadline, an incorporation,
 * a made-up-to date — where being a day out is the whole problem. The parts are
 * read in UTC so the string that comes back is the string that went in.
 *
 * The empty case returns an em dash rather than 'Invalid Date', which is what
 * `new Date(null)` produces and what this app printed before.
 */
export function formatDate(value?: string | Date | null, fallback = '—'): string {
  if (!value) return fallback;
  const d = value instanceof Date ? value : new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? `${value}T00:00:00Z` : String(value));
  if (Number.isNaN(d.getTime())) return fallback;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/**
 * Companies House company_type codes → the label a person reads.
 *
 * ⚠️ THE FALLBACK IS UPPERCASE, NOT THE RAW CODE. An unmapped value reaching
 * the card as `private-unlimited-nsc` reads like a bug; `PRIVATE UNLIMITED NSC`
 * reads like a company type nobody has mapped yet — which is what it is. CH adds
 * types, so there will always be unmapped ones.
 */
const COMPANY_TYPES: Record<string, string> = {
  'ltd': 'Private Limited Company (LTD)',
  'private-limited-guarant-nsc': 'Private Limited by Guarantee (no share capital)',
  'private-limited-guarant-nsc-limited-exemption': 'Private Limited by Guarantee (exempt from using "Limited")',
  'private-limited-shares-section-30-exemption': 'Private Limited by Shares (section 30 exemption)',
  'private-unlimited': 'Private Unlimited Company',
  'private-unlimited-nsc': 'Private Unlimited Company (no share capital)',
  'llp': 'LLP',
  'limited-partnership': 'Limited Partnership',
  'plc': 'PLC',
  'old-public-company': 'Old Public Company',
  'northern-ireland': 'Northern Ireland Company',
  'scottish-partnership': 'Scottish Partnership',
  'charitable-incorporated-organisation': 'Charitable Incorporated Organisation',
  'community-interest-company': 'Community Interest Company (CIC)',
  'registered-society-non-jurisdictional': 'Registered Society',
};

export function companyTypeLabel(code?: string | null, fallback = '—'): string {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return fallback;
  return COMPANY_TYPES[c] ?? c.replace(/[-_]+/g, ' ').toUpperCase();
}

/**
 * Companies House company_status → sentence case. `active` and `dissolved` are
 * the ones that matter; anything else is title-cased rather than shown raw.
 */
export function companyStatusLabel(code?: string | null, fallback = '—'): string {
  const c = String(code || '').trim().toLowerCase();
  if (!c) return fallback;
  return c.replace(/[-_]+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}
