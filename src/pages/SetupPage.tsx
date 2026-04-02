import React, { useState } from 'react';
import { 
    Users, 
    Shield, 
    Zap, 
    AlertTriangle,
    Save
} from 'lucide-react';
import { UsersTab, HMRCTab, WorkflowTab, RiskTab } from '../components/settings/SettingsTabs';

export function SetupPage() {
    const [activeTab, setActiveTab] = useState('users');

    const tabs = [
        { id: 'users', label: 'Users & Roles', icon: Users },
        { id: 'hmrc', label: 'HMRC Setup', icon: Shield },
        { id: 'workflow', label: 'Workflow Rules', icon: Zap },
        { id: 'risk', label: 'Risk Thresholds', icon: AlertTriangle },
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
                {activeTab === 'users' && <UsersTab />}
                {activeTab === 'hmrc' && <HMRCTab />}
                {activeTab === 'workflow' && <WorkflowTab />}
                {activeTab === 'risk' && <RiskTab />}
            </div>
        </div>
    );
}
