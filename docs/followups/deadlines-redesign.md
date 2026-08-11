# Deadlines redesign — follow-ups

Captured from the `feat/deadlines-redesign` work (design_handoff_deadlines_page).
These are deliberately **out of scope** for that branch. File each as its own issue.

---

## Restyle app chrome to the Modernist system

**Context.** The redesigned Deadlines page adopts the Modernist system (cream/black/red,
Archivo + Archivo Narrow, radius-0, 2px rules). The surrounding app chrome — the shared
sidebar, top bar and layout frame — is still the prior blue/slate Inter style, so the page
is Modernist *inside* non-Modernist chrome. Making the whole app match is an app-wide visual
decision, deliberately kept off the redesign branch. The page also can't bleed edge-to-edge
today because `AppLayout` wraps every route in `<main class="p-8">` + `max-w-[1600px] mx-auto`.

**Files.**
- `src/components/layout/AppLayout.tsx` (frame padding, `max-w`, background)
- `src/components/layout/Sidebar.tsx`
- `src/components/layout/TopBar.tsx`
- `src/index.css` / `tailwind.config.js` (if the Modernist tokens/fonts are promoted to a shared layer)

**Also — square the shared pill wrappers in the same pass.** `daysPill` (`src/lib/deadlines.ts`)
is now one shared 5-tier definition returning **colours only**; each consumer applies its own
shape wrapper. The Deadlines page uses square corners (radius-0, per Modernist), but the other
consumers still wrap the pill in `rounded-full`:
- `src/components/dashboard/DashboardDeadlinesPanel.tsx`
- `src/components/clients/ClientDeadlinesTab.tsx`
- `src/components/clients/ClientColumns.tsx`
- `src/components/clients/ClientUpcomingDeadlinesCard.tsx`

They were intentionally left rounded on the redesign branch (colours-only change there). When
the chrome is restyled, switch those wrappers to square so the pill **shape** doesn't drift
between screens.

**Acceptance criteria.**
- Sidebar / top bar / frame render in the Modernist palette, type, radius-0 and 2px rules.
- The Deadlines page bleeds edge-to-edge within the frame (no competing padding/centering).
- Every `daysPill` consumer uses a square (radius-0) pill wrapper — no `rounded-full` left on days pills.
- No layout regressions on non-deadline screens.

---

## Wire the "Send client chase" bulk action

**Context.** The Deadlines bulk-action bar has a **Send client chase** button that is currently
a stub — it shows a toast ("Client chase isn't wired up yet"). It should send a chase
communication (email/reminder) to the clients of the selected deadlines.

**Files.**
- `src/pages/DeadlinesPage.tsx` — the stubbed `onClick` in the bulk bar
- `src/hooks/useDeadlineEngine.ts` — a `sendChase(ids)` helper
- backend — a chase/notify endpoint (reuse the existing reminder/email path if one fits)

**Acceptance criteria.**
- Selecting deadlines and choosing "Send client chase" sends a chase per client.
- Success reports the count; failure surfaces a **single** error and keeps the selection
  (same convention as the bulk fan-out already in `runBulk`).
- No send for clients with no contact email — surfaced clearly, not silently skipped.

---

## Wire "New deadline" creation

**Context.** The Deadlines app-bar **New deadline** button is a stub (toast). It should open a
create flow for a manual deadline.

**Files.**
- `src/pages/DeadlinesPage.tsx` — the stubbed button
- a create modal/drawer component (new)
- `src/hooks/useDeadlineEngine.ts` — a create helper + revalidate
- backend — `POST /deadlines` (manual create) if not already present

**Acceptance criteria.**
- Opens a form: client, deadline type, statutory due date, assignee, notes.
- On save it persists and the new row appears in the list (revalidated).
- Validation + error handling consistent with the rest of the page.

---

## Add `POST /deadlines/bulk { ids, status?, assigned_to? }`

**Context.** Bulk actions (Advance status, Mark not applicable, Assign to…) currently **fan out
one `PATCH /deadlines/:id` per row** from the client (`runBulk` in `DeadlinesPage.tsx`). That is
atomic *from the user's side* — a single error is shown and the selection is kept on any failure
— but it is **not transactional server-side**: a partial failure leaves some rows applied. A real
bulk endpoint makes it atomic.

**Files.**
- backend — new `POST /deadlines/bulk` route accepting `{ ids: string[], status?, assigned_to? }`
- `src/hooks/useDeadlineEngine.ts` — a single `bulkPatch(ids, body)` helper
- `src/pages/DeadlinesPage.tsx` — `runBulk` calls the one endpoint instead of `Promise.allSettled` over per-row PATCHes

**Acceptance criteria.**
- One request updates all ids all-or-nothing (or returns per-id results the UI can act on).
- `runBulk` uses it instead of the per-row fan-out.
- Existing UX preserved: single error, selection kept on failure, list revalidated to server truth.
