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
  Copy
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
import { ClientCommunicationsTab } from '../components/clients/ClientCommunicationsTab';
import { ClientTaxTab } from '../components/clients/ClientTaxTab';
import { ClientReviewTab } from '../components/clients/ClientReviewTab';
import { ClientTransactionsTab } from '../components/clients/ClientTransactionsTab';
import { ClientSnapshotsTab } from '../components/clients/ClientSnapshotsTab';
import { ClientHmrcTab } from '../components/clients/ClientHmrcTab';
import { ComplianceSimulator } from '../components/dev/ComplianceSimulator';
import { CompaniesHousePanel } from '../components/clients/CompaniesHousePanel';
import { ClientComplianceDatesCard } from '../components/clients/ClientComplianceDatesCard';
import { ClientHealthScoreCard } from '../components/clients/ClientHealthScoreCard';
import { ActivityFeed } from '../components/clients/ActivityFeed';
import { ClientAuthority, DEFAULT_AUTHORITY } from '../types/ClientAuthority';

const MOCK_STARTING_AUTHORITY: ClientAuthority = {
    ...DEFAULT_AUTHORITY,
    sa: 'Authorized',
    ct: 'Authorized',
    vat: 'Authorized',
    paye: 'None'
};

import { useClientDetails as useClient } from '../hooks/useClients';
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

  // State for Compliance Simulation
  const [hasEngagement, setHasEngagement] = useState(true);
  const [authority, setAuthority] = useState<ClientAuthority>(MOCK_STARTING_AUTHORITY);

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
            <ClientDetailTopBar hasEngagement={hasEngagement} authority={authority} />
      </div>

      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
           {client.entityType === 'Company' ? <Building2 size={160} /> : <User size={160} />}
        </div>
        
        <div className="relative z-10 flex justify-between items-start">
            <div className="flex gap-6">
                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg ${
                    client.entityType === 'Company' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                }`}>
                    {client.legalName.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">{client.legalName}</h1>
                    <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
                        <span className="flex items-center gap-1.5">
                            {client.entityType === 'Company' ? <Building2 size={16} /> : <User size={16} />}
                            {client.entityType}
                        </span>
                        <span>•</span>
                        <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                             {client.utr ? `UTR: ${client.utr}` : `CRN: ${client.companyNumber}`}
                        </span>
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
                        </div>
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Companies House panel (Company-type clients only) */}
      {client.entityType === 'Company' && (
        <div className="mb-6">
          <CompaniesHousePanel
            client={{
              id: client.id,
              legalName: client.legalName,
              companyNumber: client.companyNumber,
              entityType: client.entityType,
              chData: client.chData ?? null,
            }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <div className="flex gap-8 whitespace-nowrap">
            {['overview', 'activity', 'transactions', 'snapshots', 'accounting', 'tax', 'hmrc', 'documents'].map(tab => (
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
                   <ClientAlertsColumn />
              </div>

               {/* Mobile Fallback (Stacking) */}
               <div className="lg:hidden space-y-8">
                    <div className="pt-8 border-t border-slate-200">
                       <ClientActiveWorkColumn clientId={client.id} />
                    </div>
                    <div className="pt-8 border-t border-slate-200">
                       <ClientAlertsColumn />
                    </div>
               </div>
          </div>

          <ClientHealthScoreCard clientId={client.id} />
          <ClientComplianceDatesCard client={client} />
        </div>
      )}

      {activeTab === 'transactions' && <ClientTransactionsTab clientId={client.id} />}
      {activeTab === 'snapshots' && <ClientSnapshotsTab clientId={client.id} />}
      {activeTab === 'accounting' && <ClientReviewTab clientId={client.id} />}
      {activeTab === 'tax' && <ClientTaxTab client={client} hasEngagement={hasEngagement} authority={authority} />}
      {activeTab === 'hmrc' && <ClientHmrcTab clientId={client.id} />}
      {activeTab === 'documents' && <ClientDocumentsTab client={client} />}
      {activeTab === 'activity' && <ActivityFeed clientId={client.id} />}
      
      <ComplianceSimulator 
        hasEngagement={hasEngagement} 
        setHasEngagement={setHasEngagement}
        authority={authority}
        setAuthority={setAuthority}
      />
    </div>
  );
}
