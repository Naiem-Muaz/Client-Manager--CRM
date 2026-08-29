import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import {
  Building2,
  User,
  ArrowLeft,
  MoreHorizontal,
  RefreshCw,
  History,
  Copy,
  Archive,
  Trash2,
  FileCheck
} from 'lucide-react';

import { ClientProfileSection } from '../components/clients/ClientProfileSection';
import { ClientEntitiesColumn, ClientActiveWorkColumn, ClientAlertsColumn } from '../components/clients/ClientColumns';
// import { EntitiesSummarySection } from '../components/clients/EntitiesSummarySection';
import { ActivePeriodsSection } from '../components/clients/ActivePeriodsSection';
import { OutstandingWorkSection, ComplianceHistorySection } from '../components/clients/WorkAndHistorySections';
import { ClientDetailTopBar } from '../components/clients/ClientDetailTopBar';
import { ClientSettingsTab } from '../components/clients/ClientSettingsTab';
import { ClientDocumentsTab } from '../components/clients/ClientDocumentsTab';
import { ClientEngagementTab } from '../components/clients/ClientEngagementTab';
import { ClientTaxTab } from '../components/clients/ClientTaxTab';
import { ClientReviewTab } from '../components/clients/ClientReviewTab';
import { ClientTransactionsTab } from '../components/clients/ClientTransactionsTab';
import { ClientSnapshotsTab } from '../components/clients/ClientSnapshotsTab';
import { ClientHmrcTab } from '../components/clients/ClientHmrcTab';
import { ClientDeadlinesTab } from '../components/clients/ClientDeadlinesTab';
import { ClientUpcomingDeadlinesCard } from '../components/clients/ClientUpcomingDeadlinesCard';
import { ClientDetailsSection } from '../components/clients/ClientDetailsSection';
import { RelatedClientsSection } from '../components/clients/RelatedClientsSection';
import { ClientComplianceDatesCard } from '../components/clients/ClientComplianceDatesCard';
import { ClientHealthScoreCard } from '../components/clients/ClientHealthScoreCard';
import { ClientWIPCard } from '../components/clients/ClientWIPCard';
import { ActivityFeed } from '../components/clients/ActivityFeed';
import { ClientAuthority, DEFAULT_AUTHORITY } from '../types/ClientAuthority';
import { entityKey, ENTITY_META } from '../lib/entityType';

// MOCK_STARTING_AUTHORITY REMOVED. It hardcoded sa/ct/vat = 'Authorized' for
// EVERY client, which the top bar rendered as a green "HMRC: Authorized" badge.
// Paired with hasEngagement=useState(true) — a green "Engagement: Signed" badge
// for every client, when 2 of 15 engagements are actually signed.
//
// ComplianceSimulator (components/dev/) was rendered UNGATED on this page and let
// anyone toggle both from the UI. It was removed rather than env-gated: a control
// that flips a compliance gate should not exist in the shipped bundle at all, and
// the badges it toggled were fabricated whether or not anyone touched it.
//
// Both are now passed as undefined, which the top bar renders as "not checked".
// Wiring them to client_manager.engagements.signed_at and
// client_manager.client_hmrc_authorisations is a real task, tracked in HANDOFF.md
// under "fabricated data rendered as real".

import { useClientDetails as useClient, archiveClient, unarchiveClient } from '../hooks/useClients';
import { DeleteClientModal } from '../components/clients/DeleteClientModal';
import { CreateRequestModal } from '../components/documents/CreateRequestModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEntitiesForClient } from '../hooks/useEntities';

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Parallel fetch: Client Details + Entities
  const { client: rawClientData, isError: clientError, mutate: mutateClient } = useClient(id || undefined);
  const { entities: rawEntitiesData } = useEntitiesForClient(id || null);

  const client = (rawClientData as any)?.data || rawClientData;
  const entities = (rawEntitiesData as any)?.data || rawEntitiesData || [];

  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  // Set when a person clicks "link" beside an officer; consumed by the
  // Related-clients picker, which clears it.
  const [officerPrefill, setOfficerPrefill] = useState<string | null>(null);
  const [showRequestDocs, setShowRequestDocs] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // State for Compliance Simulation


  const ek = client ? entityKey(client.entityType) : 'other';
  const entityMeta = ENTITY_META[ek];
  const isCompany = ek === 'limited_company';
  // Guard against the literal string 'undefined' leaking from imports.
  const crn = client?.companyNumber && client.companyNumber !== 'undefined' ? client.companyNumber : null;

  if (clientError) return <div className="p-8 text-red-600">Error loading client.</div>;
  if (!client) return <div className="p-8 space-y-4 animate-pulse">
      <div className="h-32 bg-slate-100 rounded-xl"></div>
      <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 h-64 bg-slate-100 rounded-xl"></div>
           <div className="col-span-1 h-64 bg-slate-100 rounded-xl"></div>
      </div>
  </div>;

  return (
    <div>
      {/* Top Nav Area */}
      <div className="flex items-center justify-between mb-6">
            <Link to="/clients" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                Back to Clients
            </Link>
            <ClientDetailTopBar />
      </div>

      {/* Header Card */}
      {/* ⛔ overflow-hidden IS NOT ON THIS CARD ANY MORE, AND MUST NOT GO BACK.
          The ⋯ menu is position:absolute INSIDE this card. With overflow-hidden
          here, everything past the card's bottom edge was clipped — the menu
          rendered six items and the user could see two ("Request documents…",
          "View audit trail"). The other four, including "Delete client…", were
          in the DOM, in the deployed bundle, correctly gated, and invisible.
          That cost a role investigation and two deploys to find, because a
          clipped control is indistinguishable from an absent one.

          The overflow-hidden was only ever there to stop the decorative
          watermark below spilling past the rounded corners, so it now clips
          exactly that and nothing else. */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 relative">
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 p-6 opacity-5">
             {isCompany ? <Building2 size={160} /> : <User size={160} />}
          </div>
        </div>

        <div className="relative z-10 flex justify-between items-start">
            <div className="flex gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ${
                    isCompany ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                    {client.legalName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{client.legalName}</h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${entityMeta.badge}`}>
                            <entityMeta.icon size={13} />
                            {entityMeta.label}
                        </span>
                        {(client.utr || crn) && <>
                          <span>•</span>
                          <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                               {client.utr ? `UTR: ${client.utr}` : `CRN: ${crn}`}
                          </span>
                        </>}
                         <span>•</span>
                         <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${true ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            Active Client
                         </span>
                    </div>
                </div>
            </div>
            
            <div className="relative">
                <button
                    onClick={() => setMenuOpen(o => !o)}
                    className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    aria-label="Client actions"
                >
                    <MoreHorizontal size={20} />
                </button>
                {menuOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                        <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
                            <button
                                onClick={() => { setMenuOpen(false); setShowRequestDocs(true); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <FileCheck size={15} className="text-slate-400" /> Request documents…
                            </button>
                            <button
                                onClick={() => { setActiveTab('audit'); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <History size={15} className="text-slate-400" /> View audit trail
                            </button>
                            <button
                                onClick={() => { mutateClient(`/brain/clients/${id}`); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <RefreshCw size={15} className="text-slate-400" /> Refresh data
                            </button>
                            <button
                                onClick={() => { navigator.clipboard?.writeText(client.id); setMenuOpen(false); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Copy size={15} className="text-slate-400" /> Copy client ID
                            </button>
                            {/* Archive — the normal, safe, reversible action */}
                            <button
                                onClick={async () => {
                                    setMenuOpen(false);
                                    const wasArchived = !!client.archived_at;
                                    if (!window.confirm(wasArchived ? `Restore ${client.legalName} to the active list?` : `Archive ${client.legalName}? Hidden from the active list — reversible.`)) return;
                                    setArchiving(true);
                                    try { await (wasArchived ? unarchiveClient(client.id) : archiveClient(client.id)); if (!wasArchived) navigate('/clients'); }
                                    catch { window.alert('Action failed. Please try again.'); }
                                    finally { setArchiving(false); }
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Archive size={15} className="text-slate-400" /> {client.archived_at ? 'Restore client' : 'Archive client'}
                            </button>
                            {/* Delete — rare, dangerous, super_admin only; visually separated + red */}
                            {isSuperAdmin && (
                                <>
                                    <div className="my-1 border-t border-slate-100" />
                                    <button
                                        onClick={() => { setMenuOpen(false); setShowDelete(true); }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                                    >
                                        <Trash2 size={15} /> Delete client…
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Companies House panel (limited companies — any legacy/canonical entity_type spelling) */}
      {/* ── Details: one switch, entity-aware. See ClientDetailsSection. ── */}
      <div className="mb-6">
        <ClientDetailsSection
          client={client}
          clientId={id!}
          onUpdated={() => mutateClient(`/brain/clients/${id}`)}
          onLinkOfficer={(name) => setOfficerPrefill(name)}
        />
      </div>

      {/* ── Related clients: EVERY entity type, including the ones with no
             details card of their own. A partnership's partners and a person's
             family are the same fact as a company's directors. ── */}
      <div className="mb-6">
        <RelatedClientsSection
          clientId={id!}
          prefillName={officerPrefill}
          onPrefillConsumed={() => setOfficerPrefill(null)}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <div className="flex gap-8 whitespace-nowrap">
            {['overview', 'activity', 'transactions', 'snapshots', 'accounting', 'tax', 'hmrc', 'documents', 'engagement', 'deadlines'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                        activeTab === tab 
                        ? 'border-blue-600 text-blue-600' 
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <ClientProfileSection client={client} clientId={id} onSaved={() => mutateClient(`/brain/clients/${id}`)} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
              {/* Column 1: Entities */}
              <div className="h-full">
                  <ClientEntitiesColumn entities={entities} />
              </div>

              {/* Column 2: Active Work */}
              <div className="h-full border-l border-slate-200 pl-8 border-dashed lg:block hidden">
                   <ClientActiveWorkColumn clientId={client.id} />
              </div>

              {/* Column 3: Alerts */}
              <div className="h-full border-l border-slate-200 pl-8 border-dashed lg:block hidden space-y-8">
                   <ClientAlertsColumn clientId={client.id} onNavigate={setActiveTab} />
              </div>

               {/* Mobile Fallback (Stacking) */}
               <div className="lg:hidden space-y-8">
                    <div className="pt-8 border-t border-slate-200">
                       <ClientActiveWorkColumn clientId={client.id} />
                    </div>
                    <div className="pt-8 border-t border-slate-200">
                       <ClientAlertsColumn clientId={client.id} onNavigate={setActiveTab} />
                    </div>
               </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ClientHealthScoreCard clientId={client.id} />
            <ClientWIPCard clientId={client.id} />
          </div>
          <ClientUpcomingDeadlinesCard clientId={client.id} onViewAll={() => setActiveTab('deadlines')} />
          <ClientComplianceDatesCard client={client} />
        </div>
      )}

      {activeTab === 'transactions' && <ClientTransactionsTab clientId={client.id} clientName={client.legalName} />}
      {activeTab === 'snapshots' && <ClientSnapshotsTab clientId={client.id} />}
      {activeTab === 'accounting' && <ClientReviewTab clientId={client.id} />}
      {activeTab === 'tax' && <ClientTaxTab client={client} />}
      {activeTab === 'hmrc' && <ClientHmrcTab clientId={client.id} />}
      {activeTab === 'documents' && <ClientDocumentsTab client={client} />}
      {activeTab === 'engagement' && <ClientEngagementTab clientId={client.id} />}
      {activeTab === 'deadlines' && <ClientDeadlinesTab clientId={client.id} onNavigate={setActiveTab} />}
      {activeTab === 'activity' && <ActivityFeed clientId={client.id} onOpenTab={(tab) => { if (['documents', 'deadlines', 'engagement', 'transactions', 'hmrc'].includes(tab)) setActiveTab(tab); }} />}
      

      {showRequestDocs && (
        <CreateRequestModal
          clientId={client.id}
          clientName={client.legalName}
          onClose={() => setShowRequestDocs(false)}
        />
      )}

      {showDelete && (
        <DeleteClientModal
          client={{ id: client.id, name: client.legalName }}
          onClose={() => setShowDelete(false)}
          onDeleted={() => { setShowDelete(false); navigate('/clients'); }}
        />
      )}
    </div>
  );
}
