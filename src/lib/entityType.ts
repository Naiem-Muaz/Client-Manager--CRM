import { User, Building2, Briefcase, Users, Shield } from 'lucide-react';

export type EntityKey = 'limited_company' | 'individual' | 'sole_trader' | 'partnership' | 'trust' | 'other';

// Normalises any incoming entity_type value (API lowercases most; legacy 'Company'; IRIS 'Business'/'Person')
// into a canonical key used for badges, icons, filtering and grouping.
export function entityKey(et: string | null | undefined): EntityKey {
  const s = String(et || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (!s) return 'other';
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
  sole_trader:     { label: 'Sole Trader',     badge: 'bg-green-100 text-green-700',   icon: Briefcase },
  partnership:     { label: 'Partnership',     badge: 'bg-orange-100 text-orange-700', icon: Users },
  trust:           { label: 'Trust',           badge: 'bg-yellow-100 text-yellow-700', icon: Shield },
  other:           { label: 'Other',           badge: 'bg-slate-100 text-slate-600',   icon: User },
};

// Section order for "Group by entity type".
export const ENTITY_GROUPS: { key: EntityKey; title: string }[] = [
  { key: 'limited_company', title: 'Limited Companies' },
  { key: 'individual', title: 'Individuals' },
  { key: 'sole_trader', title: 'Sole Traders' },
  { key: 'partnership', title: 'Partnerships' },
  { key: 'other', title: 'Other' },
];
