import React from 'react';
import { Shield, Zap, AlertTriangle, Users, Lock, CheckCircle } from 'lucide-react';
import { useTeamMembers } from '../../hooks/useTeam';
import { useAutomationRules, toggleAutomationRule } from '../../hooks/useAutomationRules';

const initials = (name: string) =>
    (name || '?')
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

// --- Tab 1: Users & Roles ---
export function UsersTab() {
    const { members, isLoading } = useTeamMembers();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
                    <p className="text-slate-500 text-sm">Manage staff access and permissions.</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                    Invite User
                </button>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
            ) : members.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                        <Users size={28} />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">No team members added yet</h4>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Invite colleagues to give them access to the practice.</p>
                    <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                        Invite your first team member
                    </button>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.map(m => (
                                <tr key={m.id} className="group hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{initials(m.name)}</div>
                                        {m.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{m.role}</td>
                                    <td className="px-6 py-4">
                                        {m.status === 'pending' ? (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right"><button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// --- Tab 2: HMRC Setup (Read-Only) ---
export function HMRCTab() {
    return (
        <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3 text-blue-800">
                <Lock className="shrink-0 mt-0.5" size={18} />
                <div className="text-sm">
                    <strong>Read-Only Configuration</strong>
                    <p className="opacity-90 mt-0.5">These settings are managed centrally by the practice administrator. Contact IT to request changes.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Agent Credentials</h3>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Self Assessment (SA) Agent Code</label>
                        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-sm">
                            <Shield size={14} /> No agent code configured yet
                        </div>
                    </div>
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Corporation Tax (CT) Agent Code</label>
                         <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400 text-sm">
                            <Shield size={14} /> No agent code configured yet
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Gateway Status</h3>
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={28} />
                        </div>
                        <h4 className="font-bold text-slate-700 text-lg">Gateway not configured</h4>
                        <p className="text-slate-500 text-sm mt-1">HMRC connection details will appear here once authorised.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Tab 3: Workflow Rules ---
export function WorkflowTab() {
    const { rules, isLoading } = useAutomationRules();

    const handleToggle = (id: string, current: boolean) => {
        toggleAutomationRule(id, !current).catch(() => {/* SWR revalidate restores state */});
    };

    return (
        <div className="space-y-6">
             <div>
                <h3 className="text-lg font-semibold text-slate-900">Automation Rules</h3>
                <p className="text-slate-500 text-sm">Configure how the system reacts to client events.</p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />)}
                </div>
            ) : rules.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-400">
                        <Zap size={28} />
                    </div>
                    <h4 className="text-base font-semibold text-slate-900">No automation rules configured yet</h4>
                    <p className="text-slate-500 text-sm mt-1">Automation rules will appear here once your practice administrator adds them.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {rules.map(rule => (
                        <div key={rule.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Zap size={18} />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-900 text-sm">{rule.title}</h4>
                                    <p className="text-xs text-slate-500">{rule.description}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleToggle(rule.id, rule.active)}
                                aria-label={rule.active ? 'Disable rule' : 'Enable rule'}
                                className={`w-12 h-6 rounded-full relative transition-colors cursor-pointer ${rule.active ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${rule.active ? 'left-7' : 'left-1'}`}></div>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// --- Tab 4: Risk Thresholds ---
export function RiskTab() {
    return (
        <div className="space-y-6">
             <div>
                <h3 className="text-lg font-semibold text-slate-900">Risk & Compliance Thresholds</h3>
                <p className="text-slate-500 text-sm">Set triggers for risk alerts.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-orange-500" size={20} />
                        <h4 className="font-semibold text-slate-900">VAT Threshold</h4>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Flag returns exceeding:</label>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-medium">£</span>
                            <input type="number" defaultValue={10000} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
                        </div>
                    </div>
                </div>

                 <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="text-red-500" size={20} />
                        <h4 className="font-semibold text-slate-900">Deadline Alerts</h4>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Mark as 'High Risk' when due in:</label>
                        <div className="flex items-center gap-2">
                            <input type="number" defaultValue={7} className="w-20 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            <span className="text-slate-500 text-sm">Days</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
