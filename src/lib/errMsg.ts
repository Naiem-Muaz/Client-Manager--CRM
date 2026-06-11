/**
 * Coerce any thrown/rejected API value into a human-readable string.
 *
 * Backend agents reject with a structured error: { success:false, error:{ code, message,
 * recoverable } }. Rendering `e.error` (an object) directly as a React child crashes with
 * "Objects are not valid as a React child". Always run caught errors through this helper
 * before putting them in state that gets rendered.
 */
export function errMsg(e: any, fallback = 'Something went wrong'): string {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  // Structured agent error: { error: { message } } or { error: 'string' }
  if (e.error) {
    if (typeof e.error === 'string') return e.error;
    if (typeof e.error === 'object' && e.error.message) return String(e.error.message);
  }
  if (typeof e.message === 'string') return e.message;
  try { return JSON.stringify(e); } catch { return fallback; }
}
