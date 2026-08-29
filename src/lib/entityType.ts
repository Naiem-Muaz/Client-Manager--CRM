import { User, Building2, Briefcase, Users, Shield, HelpCircle } from 'lucide-react';

/**
 * ⚠️ HARMONISED WITH THE DATABASE CHECK, and the two did not agree.
 *
 * client_manager.clients allows exactly:
 *   limited_company · sole_trader · partnership · llp · individual   (or NULL)
 *
 * This union was missing `llp` — an LLP fell through to 'other' and got the
 * generic card — and carried `trust`, which the CHECK forbids. `trust` and
 * `other` are kept as DISPLAY-LEGACY: rows cannot be stored with them, but
 * historical/imported values still reach the badge helpers.
 *
 * `unset` is new and is NOT a value: it is the absence of one. 13 production
 * clients have entity_type NULL, and folding those into 'other' made "we do
 * not know" indistinguishable from "we know it is something else" — which is
 * exactly the branch the details switch has to treat differently.
 */
export type EntityKey =
  | 'limited_company' | 'llp' | 'individual' | 'sole_trader' | 'partnership'
  | 'trust' | 'other' | 'unset';

// Normalises any incoming entity_type value (API lowercases most; legacy 'Company'; IRIS 'Business'/'Person')
// into a canonical key used for badges, icons, filtering and grouping.
export function entityKey(et: string | null | undefined): EntityKey {
  const s = String(et || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return 'unset';
  // ⛔ llp BEFORE the 'limited' test: 'limited_liability_partnership' contains
  // both 'limited' and 'partnership', and would otherwise read as a company.
  if (s === 'llp' || s.includes('limited_liability')) return 'llp';
  if (s.includes('limited') || s.includes('company') || s === 'ltd' || s === 'business') return 'limited_company';
  if (s.includes('sole') || s.includes('self_employed')) return 'sole_trader';
  if (s.includes('partnership')) return 'partnership';
  if (s.includes('trust')) return 'trust';
  if (s.includes('individual') || s.includes('person')) return 'individual';
  return 'other';
}

export const ENTITY_META: Record<EntityKey, { label: string; badge: string; icon: any }> = {
  individual:      { label: 'Individual',      badge: 'bg-blue-100 text-blue-700',     icon: User },
  limited_company: { label: 'Limited Company', badge: 'bg-purple-100 text-purple-700', icon: Building2 },
  llp:             { label: 'LLP',              badge: 'bg-purple-100 text-purple-700', icon: Building2 },
  sole_trader:     { label: 'Sole Trader',     badge: 'bg-green-100 text-green-700',   icon: Briefcase },
  partnership:     { label: 'Partnership',     badge: 'bg-orange-100 text-orange-700', icon: Users },
  trust:           { label: 'Trust',           badge: 'bg-yellow-100 text-yellow-700', icon: Shield },
  other:           { label: 'Other',           badge: 'bg-slate-100 text-slate-600',   icon: User },
  unset:           { label: 'No entity type',  badge: 'bg-slate-100 text-slate-500',   icon: HelpCircle },
};

/** Entities with a Companies House record — the ones with a Business Details card. */
export const CH_REGISTERED: ReadonlySet<EntityKey> = new Set<EntityKey>(['limited_company', 'llp']);
/** Natural persons — the ones with a Personal Details card. */
export const PERSONAL: ReadonlySet<EntityKey> = new Set<EntityKey>(['individual', 'sole_trader']);

// Section order for "Group by entity type".
export const ENTITY_GROUPS: { key: EntityKey; title: string }[] = [
  { key: 'limited_company', title: 'Limited Companies' },
  { key: 'llp', title: 'LLPs' },
  { key: 'individual', title: 'Individuals' },
  { key: 'sole_trader', title: 'Sole Traders' },
  { key: 'partnership', title: 'Partnerships' },
  { key: 'other', title: 'Other' },
  // Kept visible: a client with no entity type must not vanish from a grouped list.
  { key: 'unset', title: 'No entity type' },
];

// ── Client type (entity_type × MTD status) ───────────────────────────────────
// A single, mutually-exclusive category used to filter AND group deadlines by
// client type. THE ONE DEFINITION — both the filter and the grouping call
// clientTypeOf, so "MTD ITSA" etc. mean the same thing everywhere.
export type ClientType = 'limited_company' | 'partnership' | 'mtd_itsa' | 'non_mtd';

/**
 * Classify a client. Companies/partnerships are decided by entity type FIRST (so a
 * company is never "MTD ITSA"); everyone else (sole trader / individual) splits on
 * the app's existing MTD-in-scope rule — mtd_status ∈ {mandated, voluntary} → MTD
 * ITSA, else Non-MTD (exempt / not-enrolled / null all fold into Non-MTD).
 */
export function clientTypeOf(c: { entity_type?: string | null; mtd_status?: string | null }): ClientType {
  const ek = entityKey(c.entity_type);
  if (ek === 'limited_company' || ek === 'llp') return 'limited_company';
  if (ek === 'partnership') return 'partnership';
  const mtd = String(c.mtd_status || '').toLowerCase();
  return mtd === 'mandated' || mtd === 'voluntary' ? 'mtd_itsa' : 'non_mtd';
}

export const CLIENT_TYPE_META: Record<ClientType, { label: string; badge: string }> = {
  limited_company: { label: 'Limited Company', badge: 'bg-purple-100 text-purple-700' },
  mtd_itsa:        { label: 'MTD ITSA',         badge: 'bg-indigo-100 text-indigo-700' },
  non_mtd:         { label: 'Non-MTD',          badge: 'bg-slate-100 text-slate-600' },
  partnership:     { label: 'Partnership',      badge: 'bg-orange-100 text-orange-700' },
};

// Order for the filter checkboxes + the "Client type" grouping sections.
export const CLIENT_TYPE_ORDER: ClientType[] = ['limited_company', 'mtd_itsa', 'non_mtd', 'partnership'];
