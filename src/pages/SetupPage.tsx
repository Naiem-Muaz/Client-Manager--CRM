import React, { useState } from 'react';
import {
    PoundSterling,
    Users,
    Shield,
    Zap,
    AlertTriangle,
    Building2,
    FileText,
    ShieldCheck,
    Clock,
    Save
} from 'lucide-react';
import { UsersTab, HMRCTab, WorkflowTab, RiskTab } from '../components/settings/SettingsTabs';
import { FirmSettingsTab } from '../components/settings/FirmSettingsTab';
import { ServiceCatalogueTab } from '../components/settings/ServiceCatalogueTab';
import { ProposalDefaultsTab } from '../components/settings/ProposalDefaultsTab';
import { SponsorComplianceTab } from '../components/sponsor/SponsorComplianceTab';
import { TeamTime } from '../components/hr/TeamTime';
import { useAuth } from '../context/AuthContext';

export function SetupPage() {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'super_admin';
    const [activeTab, setActiveTab] = useState('users');

    // Sponsor Compliance holds sensitive immigration data — the tab is hidden
    // entirely for non-super-admins (backend also enforces super_admin + org-lock).
    const tabs = [
        { id: 'firm', label: 'Firm Settings', icon: Building2 },
        { id: 'catalogue', label: 'Service Catalogue', icon: PoundSterling },
        { id: 'proposal-defaults', label: 'Proposal Defaults', icon: FileText },
        { id: 'users', label: 'Users & Roles', icon: Users },
        { id: 'hmrc', label: 'HMRC Setup', icon: Shield },
        { id: 'workflow', label: 'Workflow Rules', icon: Zap },
        { id: 'risk', label: 'Risk Thresholds', icon: AlertTriangle },
        ...(isSuperAdmin ? [{ id: 'sponsor', label: 'Sponsor Compliance', icon: ShieldCheck }, { id: 'attendance', label: 'Team Attendance', icon: Clock }] : []),
    ];

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Practice Settings</h1>
                    <p className="text-slate-500 mt-1">Configure global settings, permissions, and automation rules.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
                    <Save size={18} />
                    Save Configuration
                </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                            activeTab === tab.id 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 min-h-[500px]">
                {activeTab === 'firm' && <FirmSettingsTab />}
                {activeTab === 'catalogue' && <ServiceCatalogueTab />}
                {activeTab === 'proposal-defaults' && <ProposalDefaultsTab />}
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'hmrc' && <HMRCTab />}
                {activeTab === 'workflow' && <WorkflowTab />}
                {activeTab === 'risk' && <RiskTab />}
                {activeTab === 'sponsor' && isSuperAdmin && <SponsorComplianceTab />}
                {activeTab === 'attendance' && isSuperAdmin && <TeamTime />}
            </div>
        </div>
    );
}
