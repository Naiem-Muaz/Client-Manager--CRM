import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { 
  Building2, 
  User, 
  ArrowLeft, 
  MoreHorizontal
} from 'lucide-react';

import { ClientProfileSection } from '../components/clients/ClientProfileSection';
import { ClientEntitiesColumn, ClientActiveWorkColumn, ClientAlertsColumn } from '../components/clients/ClientColumns';
// import { EntitiesSummarySection } from '../components/clients/EntitiesSummarySection';
import { ActivePeriodsSection } from '../components/clients/ActivePeriodsSection';
import { OutstandingWorkSection, ComplianceHistorySection } from '../components/clients/WorkAndHistorySections';
import { ComplianceTimelineWidget } from '../components/clients/ComplianceTimelineWidget';
import { ClientDetailTopBar } from '../components/clients/ClientDetailTopBar';
import { ClientSettingsTab } from '../components/clients/ClientSettingsTab';
import { ClientDocumentsTab } from '../components/clients/ClientDocumentsTab';
import { ClientEngagementTab } from '../components/clients/ClientEngagementTab';
import { ClientCommunicationsTab } from '../components/clients/ClientCommunicationsTab';
import { ClientTaxTab } from '../components/clients/ClientTaxTab';
import { ClientReviewTab } from '../components/clients/ClientReviewTab';
import { ClientAuditTab } from '../components/clients/ClientAuditTab';
import { ClientTransactionsTab } from '../components/clients/ClientTransactionsTab';
import { ClientSnapshotsTab } from '../components/clients/ClientSnapshotsTab';
import { ClientHmrcTab } from '../components/clients/ClientHmrcTab';
import { ComplianceSimulator } from '../components/dev/ComplianceSimulator';
import { AuditLogEntry } from '../types/AuditTypes';
import { ClientAuthority, DEFAULT_AUTHORITY } from '../types/ClientAuthority';

const MOCK_STARTING_AUTHORITY: ClientAuthority = {
    ...DEFAULT_AUTHORITY,
    sa: 'Authorized',
    ct: 'Authorized',
    vat: 'Authorized',
    paye: 'None'
};

import { useClientDetails as useClient } from '../hooks/useClients';
const useEntitiesForClient = (id: string | null) => ({ entities: [] });

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  // Parallel fetch: Client Details + Entities
  const { client: rawClientData, isError: clientError } = useClient(id || undefined);
  const { entities: rawEntitiesData } = useEntitiesForClient(id || null);

  const client = (rawClientData as any)?.data || rawClientData;
  const entities = (rawEntitiesData as any)?.data || rawEntitiesData || [];

  const [activeTab, setActiveTab] = useState('overview');

  // State for Compliance Simulation
  const [hasEngagement, setHasEngagement] = useState(true);
  const [authority, setAuthority] = useState<ClientAuthority>(MOCK_STARTING_AUTHORITY);

  // Mock Audit Log State for Demo
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([
    { id: '1', timestamp: new Date(Date.now() - 10000000).toISOString(), type: 'CLIENT_CREATED', description: 'Client record created', actor: 'System' },
    { id: '2', timestamp: new Date(Date.now() - 5000000).toISOString(), type: 'ENGAGEMENT_SENT', description: 'Engagement Letter sent for signature', actor: 'John Doe' },
  ] as any);

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
            
            <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                <MoreHorizontal size={20} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8 overflow-x-auto">
        <div className="flex gap-8 whitespace-nowrap">
            {['overview', 'transactions', 'snapshots', 'accounting', 'tax', 'hmrc', 'documents', 'audit'].map(tab => (
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">
              {/* Column 1: Entities */}
              <div className="h-full">
                  <ClientEntitiesColumn entities={entities} />
              </div>

              {/* Column 2: Active Work */}
              <div className="h-full border-l border-slate-200 pl-8 border-dashed lg:block hidden">
                   <ClientActiveWorkColumn />
              </div>

              {/* Column 3: Alerts & Timeline */}
              <div className="h-full border-l border-slate-200 pl-8 border-dashed lg:block hidden space-y-8">
                   <ComplianceTimelineWidget />
                   <ClientAlertsColumn />
              </div>
              
               {/* Mobile Fallback (Stacking) */}
               <div className="lg:hidden space-y-8">
                    <div className="pt-8 border-t border-slate-200">
                       <ClientActiveWorkColumn />
                    </div>
                    <div className="pt-8 border-t border-slate-200">
                       <ComplianceTimelineWidget />
                    </div>
                    <div className="pt-8 border-t border-slate-200">
                       <ClientAlertsColumn />
                    </div>
               </div>
          </div>
      )}

      {activeTab === 'transactions' && <ClientTransactionsTab clientId={client.id} />}
      {activeTab === 'snapshots' && <ClientSnapshotsTab clientId={client.id} />}
      {activeTab === 'accounting' && <ClientReviewTab clientId={client.id} />}
      {activeTab === 'tax' && <ClientTaxTab client={client} hasEngagement={hasEngagement} authority={authority} />}
      {activeTab === 'hmrc' && <ClientHmrcTab clientId={client.id} />}
      {activeTab === 'documents' && <ClientDocumentsTab client={client} />}
      {activeTab === 'audit' && <ClientAuditTab logs={auditLogs} />}
      
      <ComplianceSimulator 
        hasEngagement={hasEngagement} 
        setHasEngagement={setHasEngagement}
        authority={authority}
        setAuthority={setAuthority}
      />
    </div>
  );
}
