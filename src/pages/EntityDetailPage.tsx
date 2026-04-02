import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import useSWR from 'swr';
import { Building2, ArrowLeft, History, Shield, FileText } from 'lucide-react';

import { EntityOverviewTab } from '../components/entities/EntityOverviewTab';
import { EntityPeriodsTab } from '../components/entities/EntityPeriodsTab';

import { useEntity } from '../hooks/useClients';

export function EntityDetailPage() {
    const { entityId } = useParams<{ entityId: string }>();
    const { entity: rawEntity, error } = useEntity(entityId || null);
    const [activeTab, setActiveTab] = useState('overview');

    if (error) return <div className="p-8 text-red-600">Error loading entity.</div>;
    // Mock entity data for now as API might be empty
    const entity = (rawEntity as any)?.data || rawEntity || { id: entityId, legalName: 'Acme Corp Ltd', type: 'Company' };

    return (
        <div className="max-w-6xl mx-auto py-8">
            <Link to="/clients" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 mb-6 transition-colors text-sm font-medium">
                <ArrowLeft size={16} />
                Back to Client
            </Link>

            {/* Header */}
            <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
                    <Building2 size={32} />
                </div>
                <div>
                     <h1 className="text-3xl font-bold text-slate-900">{entity.legalName}</h1>
                     <p className="text-slate-500 mt-1 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-mono">ID: {entityId}</span>
                        <span>•</span>
                        Limited Company
                     </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 mb-8">
                <div className="flex gap-8">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'periods', label: 'Periods' },
                        { id: 'hmrc', label: 'HMRC' },
                        { id: 'accounts', label: 'Accounts' },
                        { id: 'tax', label: 'Tax History' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-4 px-1 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.id 
                                ? 'border-purple-600 text-purple-600' 
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && <EntityOverviewTab entity={entity} />}
                {activeTab === 'periods' && <EntityPeriodsTab periods={[]} />}
                {activeTab === 'hmrc' && <div className="text-slate-400 text-center py-12">HMRC Registration details...</div>}
                {activeTab === 'accounts' && <div className="text-slate-400 text-center py-12">Filing History...</div>}
                {activeTab === 'tax' && <div className="text-slate-400 text-center py-12">Tax Calculation History...</div>}
            </div>
        </div>
    );
}
