/**
 * ── NATIONAL INSURANCE NUMBER ───────────────────────────────────────────────
 *
 * Two letters, six digits, one suffix letter A–D. Same discipline as the CRN
 * and UTR fields: trim, uppercase, empty clears, and a message that describes
 * the shape rather than accusing the user.
 *
 * ⚠️ THE PREFIX RULES ARE REAL RULES, NOT PEDANTRY. HMRC never issues a prefix
 * whose first letter is D, F, I, Q, U or V, nor a second letter of D, F, I, O,
 * Q, U or V, and BG/GB/NK/KN/TN/NT/ZZ are permanently reserved. A number
 * failing these is a transcription error every time — usually a 0/O or 1/I
 * swap — so catching it here is worth more than the flexibility of allowing it.
 *
 * ⛔ THE SUFFIX IS REQUIRED. A NINO without it is incomplete, not merely
 * unusual: it is the form printed on the card and the form HMRC matches on.
 */
const NINO_RE = /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/;
const RESERVED_PREFIXES = ['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'];

/** Storage form: uppercase, no spaces. Empty string means "cleared". */
export function normaliseNino(raw: string): string {
  return String(raw || '').toUpperCase().replace(/\s+/g, '');
}

/** Human form, as printed on the card: QQ 12 34 56 C. */
export function formatNino(raw: string | null | undefined): string {
  const v = normaliseNino(raw || '');
  if (v.length !== 9) return v;
  return `${v.slice(0, 2)} ${v.slice(2, 4)} ${v.slice(4, 6)} ${v.slice(6, 8)} ${v.slice(8)}`;
}

/** Error string, or null when acceptable. Empty is acceptable — it clears. */
export function validateNino(raw: string): string | null {
  const v = normaliseNino(raw);
  if (!v) return null;
  if (RESERVED_PREFIXES.includes(v.slice(0, 2))) {
    return `${v.slice(0, 2)} is not a National Insurance prefix HMRC issues — check the first two letters.`;
  }
  if (!NINO_RE.test(v)) {
    return "That doesn't look like a National Insurance number — two letters, six digits, then A, B, C or D.";
  }
  return null;
}

/** dd/mm/yyyy for display; the API stores and returns ISO. */
export function formatDob(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = String(iso).slice(0, 10);
  const [y, m, dd] = d.split('-');
  return y && m && dd ? `${dd}/${m}/${y}` : d;
}

/**
 * A date of birth must be a real past date and belong to a plausible adult.
 * ⚠️ 16 is the floor, not 18: a 16-year-old can be self-employed and can hold
 * a NINO, so refusing them would refuse a real client.
 */
export function validateDob(iso: string): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return 'Enter a valid date.';
  const now = new Date();
  if (d.getTime() > now.getTime()) return 'A date of birth cannot be in the future.';
  const age = (now.getTime() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age > 120) return 'That date is more than 120 years ago — check the year.';
  if (age < 16) return 'That would make the client under 16 — check the year.';
  return null;
}
