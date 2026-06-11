import React, { useState } from 'react';
import { Shield, Zap, AlertTriangle, Users, Lock, X, Loader2 } from 'lucide-react';
import { useTeamMembers, inviteTeamMember, updateTeamMember, TeamMember, TEAM_ROLES } from '../../hooks/useTeam';
import { useAutomationRules, toggleAutomationRule } from '../../hooks/useAutomationRules';

const initials = (name: string) =>
    (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

const roleLabel = (r?: string | null) => (r || '—').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// --- Tab 1: Users & Roles ---
export function UsersTab() {
    const { members, isLoading, mutate } = useTeamMembers();
    const [showInvite, setShowInvite] = useState(false);
    const [editing, setEditing] = useState<TeamMember | null>(null);

    const InviteButton = ({ label }: { label: string }) => (
        <button onClick={() => setShowInvite(true)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">{label}</button>
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">User Management</h3>
                    <p className="text-slate-500 text-sm">Manage staff access and permissions.</p>
                </div>
                <InviteButton label="Invite User" />
            </div>

            {isLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />)}</div>
            ) : members.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-xl p-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400"><Users size={28} /></div>
                    <h4 className="text-base font-semibold text-slate-900">No team members added yet</h4>
                    <p className="text-slate-500 text-sm mt-1 mb-4">Invite colleagues to give them access to the practice.</p>
                    <InviteButton label="Invite your first team member" />
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3">Open jobs</th><th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.map(m => (
                                <tr key={m.id} className="group hover:bg-slate-50">
                                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">{initials(m.name)}</div>
                                        <div>{m.name}<div className="text-xs text-slate-400 font-normal">{m.email}</div></div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{roleLabel(m.role)}</td>
                                    <td className="px-6 py-4 text-slate-600">{m.status === 'pending' ? '—' : (m.jobCount ?? 0)}</td>
                                    <td className="px-6 py-4">
                                        {m.status === 'pending'
                                            ? <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">Pending</span>
                                            : m.active
                                                ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                                                : <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-medium">Inactive</span>}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {m.status === 'pending'
                                            ? <span className="text-slate-300 text-xs">Invited</span>
                                            : <button onClick={() => setEditing(m)} className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} onDone={() => { setShowInvite(false); mutate(); }} />}
            {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); mutate(); }} />}
        </div>
    );
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('accountant');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async () => {
        if (!email.trim()) return;
        setSaving(true); setError(null);
        try { await inviteTeamMember({ email: email.trim(), role }); onDone(); }
        catch (e: any) { setError(e?.error || e?.message || 'Failed to send invite'); setSaving(false); }
    };
    return (
        <Modal title="Invite team member" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Send invite" error={error}>
            <Labeled label="Email">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="colleague@firm.co.uk" className={inputCls} />
            </Labeled>
            <Labeled label="Role">
                <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
                    {TEAM_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
            </Labeled>
        </Modal>
    );
}

function EditMemberModal({ member, onClose, onDone }: { member: TeamMember; onClose: () => void; onDone: () => void }) {
    const [fullName, setFullName] = useState(member.name);
    const [role, setRole] = useState(member.role || 'accountant');
    const [active, setActive] = useState(member.active);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const submit = async () => {
        setSaving(true); setError(null);
        try { await updateTeamMember(member.id, { fullName, role, active }); onDone(); }
        catch (e: any) { setError(e?.error || e?.message || 'Failed to save'); setSaving(false); }
    };
    return (
        <Modal title="Edit team member" onClose={onClose} onSubmit={submit} saving={saving} submitLabel="Save" error={error}>
            <Labeled label="Full name"><input value={fullName} onChange={e => setFullName(e.target.value)} className={inputCls} /></Labeled>
            <Labeled label="Role">
                <select value={role} onChange={e => setRole(e.target.value)} className={inputCls}>
                    {TEAM_ROLES.map(r => <option key={r} value={r}>{roleLabel(r)}</option>)}
                </select>
            </Labeled>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-sm font-medium text-slate-700">Active</span>
            </label>
        </Modal>
    );
}

const inputCls = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
    return <div className="space-y-1"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>{children}</div>;
}
function Modal({ title, onClose, onSubmit, saving, submitLabel, error, children }: any) {
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {children}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm">Cancel</button>
                    <button onClick={onSubmit} disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
                        {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : submitLabel}
                    </button>
                </div>
            </div>
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
