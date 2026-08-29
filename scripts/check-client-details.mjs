/**
 * ── CLIENT-DETAILS LOGIC CHECKS ─────────────────────────────────────────────
 *
 * ⚠️ THIS REPO HAS NO TEST RUNNER. package.json carries dev/build/preview/
 * typecheck/verify and nothing else — no jest, no vitest, no testing-library.
 * Adding one is a real decision (dependency, config, CI wiring) and not one to
 * take inside a feature branch, so these run on esbuild, which Vite already
 * ships. That is a deliberate floor, not a claim of coverage: it exercises the
 * PURE logic — validators and the entity switch — and cannot touch React
 * rendering or network calls.
 *
 *   node scripts/check-client-details.mjs
 */
import { build } from 'esbuild';
import { readFileSync, unlinkSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const OUT = new URL('./.check-bundle.mjs', import.meta.url).pathname;

await build({
  entryPoints: ['scripts/check-entry.ts'],
  outfile: OUT, bundle: true, format: 'esm', platform: 'node',
  logLevel: 'silent',
  // Bundled, not externalised: node cannot resolve the app's ESM deps from
  // scripts/, and entityType only needs lucide's icons as opaque values.
});
const m = await import(pathToFileURL(OUT).href + `?t=${Date.now()}`);
try { unlinkSync(OUT); } catch {}

let pass = 0, fail = 0;
const eq = (got, want, label) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.error(`  ✗ ${label}\n      got  ${JSON.stringify(got)}\n      want ${JSON.stringify(want)}`); }
};

console.log('\n── validateNino ──');
eq(m.validateNino('AB123456C'), null, 'well-formed');
eq(m.validateNino('ab 12 34 56 c'), null, 'lowercase + spaces normalise');
eq(m.validateNino(''), null, 'empty clears');
eq(m.validateNino('   '), null, 'whitespace clears');
eq(typeof m.validateNino('AB123456'), 'string', 'missing suffix rejected');
eq(typeof m.validateNino('AB12345C'), 'string', 'five digits rejected');
eq(typeof m.validateNino('AB123456E'), 'string', 'suffix E rejected (A–D only)');
eq(typeof m.validateNino('DQ123456C'), 'string', 'first letter D rejected');
eq(typeof m.validateNino('AO123456C'), 'string', 'second letter O rejected');
eq(typeof m.validateNino('QA123456C'), 'string', '⚠️ first letter Q rejected — QQ123456C is HMRC\'s EXAMPLE precisely because it is not issuable');
eq(typeof m.validateNino('BG123456C'), 'string', 'reserved prefix BG rejected');
eq(typeof m.validateNino('ZZ123456C'), 'string', 'reserved prefix ZZ rejected');
eq(m.normaliseNino('ab 12 34 56 c'), 'AB123456C', 'normalise strips spaces, uppercases');
eq(m.formatNino('AB123456C'), 'AB 12 34 56 C', 'formats as printed on the card');

console.log('\n── validateDob ──');
eq(m.validateDob(''), null, 'empty clears');
eq(m.validateDob('1980-06-15'), null, 'ordinary adult');
eq(typeof m.validateDob('2099-01-01'), 'string', 'future rejected');
eq(typeof m.validateDob('1850-01-01'), 'string', '>120 years rejected');
eq(typeof m.validateDob(`${new Date().getUTCFullYear() - 10}-01-01`), 'string', 'under 16 rejected');
eq(m.validateDob(`${new Date().getUTCFullYear() - 17}-01-01`), null, '17 accepted — a 16-year-old can be self-employed');

console.log('\n── entityKey: the switch keys off DB values ──');
for (const [v, k] of [
  ['limited_company', 'limited_company'], ['sole_trader', 'sole_trader'],
  ['individual', 'individual'], ['partnership', 'partnership'], ['llp', 'llp'],
  ['limited_liability_partnership', 'llp'],
]) eq(m.entityKey(v), k, `${v} → ${k}`);
eq(m.entityKey(null), 'unset', '⛔ NULL → unset, NOT other');
eq(m.entityKey(''), 'unset', 'empty → unset');
eq(m.entityKey('other'), 'other', 'a real "other" stays other — distinguishable from unset');
eq(m.entityKey('Company'), 'limited_company', 'legacy Company still maps');
eq(m.entityKey('Sole Trader'), 'sole_trader', 'display spelling still maps');

console.log('\n── which card each type gets ──');
eq(m.CH_REGISTERED.has('limited_company'), true, 'limited_company → Business Details');
eq(m.CH_REGISTERED.has('llp'), true, '⚠️ llp → Business Details (it fell to "other" before)');
eq(m.CH_REGISTERED.has('sole_trader'), false, 'sole_trader is not CH-registered');
eq(m.PERSONAL.has('individual'), true, 'individual → Personal Details');
eq(m.PERSONAL.has('sole_trader'), true, 'sole_trader → Personal Details');
eq(m.PERSONAL.has('unset'), false, '⛔ unset gets NEITHER card — it has its own branch');
eq(m.CH_REGISTERED.has('unset'), false, 'unset is not CH-registered either');
eq(m.PERSONAL.has('partnership'), false, 'partnership gets neither — D4b');

console.log('\n── formatDate: UK display, ISO storage ──');
eq(m.formatDate('2027-01-07'), '07/01/2027', 'ISO → DD/MM/YYYY');
eq(m.formatDate('2026-11-06'), '06/11/2026', 'another');
eq(m.formatDate('2027-01-07T00:00:00.000Z'), '07/01/2027', 'a full ISO timestamp');
eq(m.formatDate(''), '—', 'empty → em dash, not "Invalid Date"');
eq(m.formatDate(null), '—', 'null → em dash');
eq(m.formatDate('not a date'), '—', 'garbage → em dash');
eq(m.formatDate('2027-01-07', ''), '07/01/2027', 'custom fallback unused when valid');
// ⚠️ THE DAY MUST NOT SHIFT. `new Date('2027-01-07')` is midnight UTC; a local
// formatter west of Greenwich prints the 6th, and every date this app shows is
// a statutory one where a day out is the whole problem.
eq(m.formatDate('2027-01-01'), '01/01/2027', '⚠️ 1 Jan does not slip to 31 Dec');
eq(m.formatDate('2026-12-31'), '31/12/2026', '⚠️ 31 Dec does not slip to 1 Jan');

console.log('\n── companyTypeLabel: the label, not the CH code ──');
eq(m.companyTypeLabel('ltd'), 'Private Limited Company (LTD)', 'ltd');
eq(m.companyTypeLabel('llp'), 'LLP', 'llp');
eq(m.companyTypeLabel('plc'), 'PLC', 'plc');
eq(m.companyTypeLabel('LTD'), 'Private Limited Company (LTD)', 'case-insensitive');
eq(m.companyTypeLabel('private-unlimited-nsc'), 'Private Unlimited Company (no share capital)', 'a longer mapped code');
eq(m.companyTypeLabel('some-future-type'), 'SOME FUTURE TYPE', '⚠️ unmapped → UPPERCASE, never the raw slug');
eq(m.companyTypeLabel(''), '—', 'empty → em dash');
eq(m.companyTypeLabel(null), '—', 'null → em dash');
eq(m.companyStatusLabel('active'), 'Active', 'status title-cased');
eq(m.companyStatusLabel('voluntary-arrangement'), 'Voluntary Arrangement', 'hyphens become spaces');

console.log('\n── STORABLE_ENTITY_TYPES matches the DB CHECK ──');
eq([...m.STORABLE_ENTITY_TYPES].sort(),
   ['individual','limited_company','llp','partnership','sole_trader'],
   'exactly the five the CHECK permits');
for (const forbidden of ['unset', 'trust', 'other'])
  eq(m.STORABLE_ENTITY_TYPES.includes(forbidden), false,
     `⛔ ${forbidden} is renderable but NOT offerable — a save would 23514`);

console.log(`\n${fail ? '✗' : '✓'} ${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
