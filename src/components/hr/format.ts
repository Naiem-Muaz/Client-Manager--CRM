// Shared display helpers for the hr_core (attendance/leave/roster) UI.

export const fmtMins = (m?: number | null): string => {
  if (!m || m < 0) return '0h 0m';
  const h = Math.floor(m / 60), min = m % 60;
  return `${h}h ${min}m`;
};

export const fmtTime = (iso?: string | null): string =>
  iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';

export const fmtDate = (v?: string | null): string =>
  v ? new Date(v + (v.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

/** minutes between an ISO instant and now (for a live open-segment counter). */
export const minsSince = (iso: string): number => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

export const prettify = (s?: string | null): string => (s ? s.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '—');

/**
 * Who a clock-in / leave row belongs to.
 *
 * ⚠️ THE ATTENDANCE SURFACE USED TO PRINT `email` AND CALL THAT THE PERSON. It
 * could tell you how many staff were clocked in but not who: the practice inbox
 * shows as "info@…", and a personal alias carries no name at all. The backend
 * always joined auth_core.user_profiles and simply never selected display_name.
 *
 * The address stays as the SECOND line, not as a replacement: two staff can
 * share a display name, and the address is what disambiguates them.
 */
export const staffName = (r?: { display_name?: string | null; email?: string | null } | null): string =>
  (r?.display_name || '').trim() || (r?.email || '').trim() || 'Unknown user';

/** The address, only when it adds something the name did not already say. */
export const staffSubtitle = (r?: { display_name?: string | null; email?: string | null } | null): string =>
  (r?.display_name || '').trim() ? (r?.email || '').trim() : '';
