import React from 'react';
import { HelpCircle } from 'lucide-react';
import { entityKey, ENTITY_META, CH_REGISTERED, PERSONAL } from '../../lib/entityType';
import { CompaniesHousePanel } from './CompaniesHousePanel';
import { PersonalDetailsCard } from './PersonalDetailsCard';

/**
 * ── THE DETAILS SWITCH ──────────────────────────────────────────────────────
 *
 * ⛔ ONE PLACE DECIDES WHICH CARD A CLIENT GETS. The Companies House panel used
 * to decide for itself, with `entityType !== 'Company' && !== 'Ltd' && !== 'LLP'`
 * — three values the database cannot store — so it rendered for nobody. Two
 * gates disagreeing is how that survived; there is one now.
 *
 * ⚠️ KEYED ON THE STORED VALUE, via entityKey(), which normalises the snake_case
 * the CHECK allows (limited_company · sole_trader · partnership · llp ·
 * individual) plus the legacy spellings still in imported data.
 *
 * ⚠️ NULL IS ITS OWN BRANCH, not a fallback. 13 production clients have no
 * entity_type; folding them into "other" would tell a member of staff we know
 * this client is something unusual, when the truth is we have not been told
 * what they are. The difference is actionable — one is a data-entry gap with a
 * fix, the other is not — so the branch says which and links to the fix.
 */
export function ClientDetailsSection({ client, clientId, onUpdated }: {
  client: any; clientId: string; onUpdated?: () => void;
}) {
  const ek = entityKey(client?.entityType ?? client?.entity_type);

  if (ek === 'unset') {
    return (
      <div className="bg-white rounded-xl border border-dashed border-slate-300 p-6 text-center">
        <HelpCircle size={22} className="mx-auto text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-700">Set an entity type to see details</p>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          A limited company shows its Companies House record; an individual or sole trader
          shows personal identifiers. Choose one in <strong>Client Profile → Edit details</strong> above.
        </p>
      </div>
    );
  }

  if (CH_REGISTERED.has(ek)) {
    return (
      <CompaniesHousePanel
        client={{
          id: clientId,
          legalName: client?.legalName,
          companyNumber: (client?.companyNumber && client.companyNumber !== 'undefined') ? client.companyNumber : undefined,
          entityType: client?.entityType,
          chData: client?.ch_data ?? client?.chData ?? null,
        }}
        onUpdated={onUpdated}
      />
    );
  }

  if (PERSONAL.has(ek)) {
    return <PersonalDetailsCard client={client} clientId={clientId} onSaved={onUpdated} />;
  }

  /**
   * partnership · trust · other. An ordinary partnership has no Companies House
   * record and no single natural person, so its card is the D4b relationships
   * work, not this release. Saying so is better than showing a person's card to
   * a partnership — which is what a `PERSONAL`-shaped default would have done.
   */
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-sm font-medium text-slate-700">
        {ENTITY_META[ek].label}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        No details card for this entity type yet. Partnerships get one with the related-clients
        work; the identity fields above (UTR, reference, address) apply to every client type.
      </p>
    </div>
  );
}
