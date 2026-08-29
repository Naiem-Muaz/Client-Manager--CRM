/**
 * How a signed-in person is rendered in the chrome.
 *
 * ⚠️ ONE HOME, because there are now TWO places that show the signed-in user —
 * the sidebar footer and the top bar. When this lived as a module-local const in
 * Sidebar.tsx, the top bar could not reuse it, which is how that surface ended
 * up with the hardcoded "NextGen Admin / Platform Admin" placeholder instead.
 */

/** "senior-accountant" → "Senior Accountant". Falls back rather than rendering blank. */
export const roleLabel = (r?: string | null): string =>
  r ? r.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Signed in';

/**
 * Avatar initials. A person's name gives two letters, an email gives one.
 *
 * ⚠️ Never invents a letter. With neither name nor email the avatar shows a
 * neutral dash — a wrong initial on every screen is worse than an absent one,
 * and this used to read "NG" for every user in the practice.
 */
export const initials = (name?: string | null, email?: string | null): string => {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const e = (email ?? '').trim();
  return e ? e[0].toUpperCase() : '—';
};
