import React from 'react';
import { SWRConfig } from 'swr';

/**
 * SWR DEFAULTS FOR THE WHOLE APP.
 *
 * ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * There was no SWRConfig anywhere, so every hook ran on SWR's stock defaults:
 * `shouldRetryOnError: true` with `errorRetryCount` UNSET, which is unlimited.
 *
 * That is survivable when errors are transient. It is not when they cannot be:
 * `GET /brain/clients/:id/tasks` and `GET /brain/entities` have never existed
 * server-side, so they 404 — forever, retried forever. And `useTasks(clientId)`
 * is called from ClientActiveWorkColumn, which renders PER CLIENT ROW, so the
 * traffic is (visible rows × unlimited retries). That is the "dozens of
 * identical 404s in a single page load" Mohammad saw, and it is production
 * being billed for answers that cannot exist.
 *
 * ⛔ A 4xx IS NOT TRANSIENT. The server has answered, definitively, that the
 * request is wrong: the route is absent, the caller is unauthorised, the input
 * is invalid. Retrying cannot change any of those, so retrying is pure cost
 * with a guaranteed outcome. 408 and 429 are the deliberate exceptions — the
 * first IS a timeout and the second explicitly means "try later".
 *
 * 5xx and network failures still retry, bounded, because those genuinely can
 * resolve on their own.
 */

/** 4xx that a retry could plausibly resolve. Everything else in 4xx is final. */
const RETRYABLE_4XX = new Set([408, 429]);

export const swrDefaults = {
  /** Bounded even for the retryable cases — unlimited was the original defect. */
  errorRetryCount: 3,
  errorRetryInterval: 3000,

  /**
   * Collapses identical concurrent keys. With one hook per client row this is
   * what stops N rows becoming N requests for the same URL in one paint.
   */
  dedupingInterval: 5000,

  /** Refetching every window focus multiplies any standing error. */
  revalidateOnFocus: false,

  shouldRetryOnError: (err: any): boolean => {
    const status = err?.response?.status ?? err?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      return RETRYABLE_4XX.has(status);
    }
    // No status at all = a network/CORS failure, which IS transient. Retry.
    return true;
  },
};

export function AppSWRConfig({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={swrDefaults}>{children}</SWRConfig>;
}
