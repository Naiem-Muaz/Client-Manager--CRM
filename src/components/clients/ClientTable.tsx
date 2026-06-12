import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoreHorizontal, Eye, Archive, User, ChevronUp, ChevronDown, ChevronRight, Pencil, UserPlus, Tag, Download, X } from 'lucide-react';
import { archiveClient, patchClient } from '../../hooks/useClients';
import { useTeamMembers } from '../../hooks/useTeam';
import { GRADE_META, HealthGrade } from '../../hooks/useHealth';
import { ClientQuickEditDrawer } from './ClientQuickEditDrawer';
import { entityKey, ENTITY_META, ENTITY_GROUPS } from '../../lib/entityType';

interface Props { clients: any[]; healthScores?: Record<string, { score: number; grade: HealthGrade }>; groupBy?: boolean }

export function ClientTable({ clients, healthScores = {}, groupBy = false }: Props) {
    const navigate = useNavigate();
    const { members } = useTeamMembers();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [archivingId, setArchivingId] = useState<string | null>(null);
    const [healthSort, setHealthSort] = useState<'asc' | 'desc' | null>(null);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [editing, setEditing] = useState<any | null>(null);
    const [bulkBusy, setBulkBusy] = useState<string | null>(null);
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const toggleCollapse = (k: string) => setCollapsed(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

    const toggleSelect = (id: string) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const selectedClients = () => clients.filter(c => selected.has(c.id));

    const runBulk = async (label: string, fn: (c: any) => Promise<any>) => {
        const targets = selectedClients();
        let done = 0;
        setBulkBusy(`${label} 0/${targets.length}`);
        await Promise.all(targets.map(c => fn(c).then(() => { done++; setBulkBusy(`${label} ${done}/${targets.length}`); }).catch(() => { done++; })));
        setBulkBusy(null);
        setSelected(new Set());
    };

    const bulkAssign = (staffId: string) => runBulk('Assigning', c => patchClient(c.id, { assigned_staff_id: staffId || null }));
    const bulkAddTag = (tag: string) => runBulk('Tagging', c => patchClient(c.id, { addTag: tag }));
    const bulkArchive = () => { if (!window.confirm(`Archive ${selected.size} client(s)?`)) return; return runBulk('Archiving', c => patchClient(c.id, { status: 'archived' })); };
    const bulkExport = () => {
        const rows = selectedClients();
        const headers = ['id', 'name', 'entityType', 'status', 'riskScore'];
        const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [headers.join(','), ...rows.map(c => [c.id, c.legalName, c.entityType, c.status, c.riskScore].map(esc).join(','))].join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
        const a = document.createElement('a'); a.href = url; a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    };

    const displayClients = useMemo(() => {
        if (!healthSort) return clients;
        return [...clients].sort((a, b) => {
            const sa = healthScores[a.id]?.score ?? -1;
            const sb = healthScores[b.id]?.score ?? -1;
            return healthSort === 'asc' ? sa - sb : sb - sa;
        });
    }, [clients, healthScores, healthSort]);

    const handleArchive = async (client: any) => {
        setOpenMenuId(null);
        if (!window.confirm(`Archive ${client.legalName}? They will be hidden from the active client list.`)) return;
        setArchivingId(client.id);
        try {
            await archiveClient(client.id);
        } catch (e) {
            window.alert('Failed to archive client. Please try again.');
        } finally {
            setArchivingId(null);
        }
    };

    if (clients.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                    <User size={32} />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No clients yet</h3>
                <p className="text-slate-500 mt-1 mb-4">Get started by creating your first client.</p>
                <Link to="/clients/new" className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    Add your first client
                </Link>
            </div>
        );
    }

    const allSelected = clients.length > 0 && clients.every(c => selected.has(c.id));

    const renderRow = (client: any) => {
        let riskColor = 'bg-slate-200';
        if (client.riskScore > 80) riskColor = 'bg-red-500';
        else if (client.riskScore > 50) riskColor = 'bg-amber-500';
        else riskColor = 'bg-emerald-500';

        const ek = entityKey(client.entityType);
        const meta = ENTITY_META[ek];
        const Icon = meta.icon;

        return (
        <tr key={client.id} className="hover:bg-bg-main/50 transition-colors group cursor-pointer relative">
            <td className="px-4 py-4 relative z-20 w-10">
                <input type="checkbox" checked={selected.has(client.id)} onChange={() => toggleSelect(client.id)} className="w-4 h-4 text-blue-600 rounded" />
            </td>
            <td className="px-6 py-4">
                <Link to={`/clients/${client.id}`} className="absolute inset-0 z-10" />
                <div className="flex items-center gap-3">
                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-sm ${
                        ek === 'limited_company' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}>
                        {(client.legalName || '?').charAt(0)}
                    </div>
                    <div>
                        <span className="font-semibold text-slate-900 flex items-center gap-1.5 group-hover:text-brand-primary transition-colors">
                            <Icon size={14} className="text-slate-400 flex-shrink-0" /> {client.legalName}
                        </span>
                        <span className="flex items-center gap-2 text-xs mt-1">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded font-medium ${meta.badge}`}>{meta.label}</span>
                            <span className="text-slate-400">{client.utr || (client.companyNumber !== 'undefined' ? client.companyNumber : null) || 'No Ref'}</span>
                        </span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 relative z-20 pointer-events-none">
                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${client.status === 'Active' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20' : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/10'}`}>
                    {client.status}
                </span>
            </td>
            <td className="px-6 py-4 text-sm text-slate-600 pointer-events-none">
                {client.hasHmrcConnection ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Connected</span>
                ) : (
                    <span className="flex items-center gap-1.5 text-slate-400"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"/> Unlinked</span>
                )}
            </td>
            <td className="px-6 py-4 pointer-events-none">
                 {client.cddVerified ? (
                    <span className="flex items-center gap-1.5 text-emerald-600 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"/> Verified</span>
                ) : (
                    <span className="flex items-center gap-1.5 text-amber-500 font-medium"><div className="w-1.5 h-1.5 rounded-full bg-amber-500"/> Pending</span>
                )}
            </td>
             <td className="px-6 py-4 text-center pointer-events-none">
                <span className={`inline-block w-3 h-3 rounded-full ${riskColor} ring-2 ring-white shadow-sm`} title={`Risk Score: ${client.riskScore}`} />
            </td>
            <td className="px-6 py-4 pointer-events-none">
                {healthScores[client.id] ? (
                    <span className="inline-flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${GRADE_META[healthScores[client.id].grade].dot}`} />
                        <span className="text-sm font-medium text-slate-700">{healthScores[client.id].score}</span>
                    </span>
                ) : <span className="text-slate-300 text-sm">—</span>}
            </td>
            <td className="px-6 py-4 text-right z-30 relative">
                <div className="relative inline-block">
                    <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === client.id ? null : client.id); }}
                        disabled={archivingId === client.id}
                        aria-label="Client actions"
                        className="p-2 text-slate-400 hover:text-brand-primary hover:bg-bg-main rounded-lg transition-colors relative z-30 disabled:opacity-50"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {openMenuId === client.id && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                            <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-left">
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); navigate(`/clients/${client.id}`); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Eye size={15} className="text-slate-400" /> View
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); setEditing(client); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                    <Pencil size={15} className="text-slate-400" /> Edit
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleArchive(client); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                    <Archive size={15} /> Archive
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </td>
        </tr>
        );
    };

    return (
      <>
        {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-sm font-semibold text-blue-800">{selected.size} selected</span>
                {bulkBusy && <span className="text-xs text-blue-600 inline-flex items-center gap-1">{bulkBusy}…</span>}
                <div className="flex-1" />
                <select onChange={e => { if (e.target.value) { bulkAssign(e.target.value); e.target.value = ''; } }} defaultValue="" className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white">
                    <option value="" disabled>Assign staff…</option>
                    <option value="">Unassign</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={() => { const t = window.prompt('Tag to add:'); if (t && t.trim()) bulkAddTag(t.trim()); }} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"><Tag size={14} /> Add tag</button>
                <button onClick={bulkArchive} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm text-red-600 hover:bg-red-50"><Archive size={14} /> Archive</button>
                <button onClick={bulkExport} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm hover:bg-slate-50"><Download size={14} /> Export</button>
                <button onClick={() => setSelected(new Set())} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
            </div>
        )}
        <div className="bg-bg-surface border border-divider rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-bg-main border-b border-divider text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-4 py-4 w-10">
                            <input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(clients.map(c => c.id)))} className="w-4 h-4 text-blue-600 rounded" />
                        </th>
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">HMRC</th>
                        <th className="px-6 py-4">CDD</th>
                        <th className="px-6 py-4 text-center">Risk</th>
                        <th className="px-6 py-4 cursor-pointer select-none" onClick={() => setHealthSort(s => s === 'desc' ? 'asc' : 'desc')}>
                            <span className="inline-flex items-center gap-1 hover:text-slate-800">
                                Health
                                {healthSort === 'asc' ? <ChevronUp size={12} /> : healthSort === 'desc' ? <ChevronDown size={12} /> : null}
                            </span>
                        </th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                {groupBy ? (
                    ENTITY_GROUPS.map(g => {
                        const members = displayClients.filter(c => entityKey(c.entityType) === g.key);
                        if (members.length === 0) return null; // hide empty sections
                        const isCollapsed = collapsed.has(g.key);
                        return (
                            <tbody key={g.key} className="divide-y divide-divider">
                                <tr className="bg-bg-main border-b border-divider">
                                    <td colSpan={8} className="px-4 py-2.5">
                                        <button onClick={() => toggleCollapse(g.key)} className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900">
                                            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                                            {g.title} <span className="text-slate-400 font-normal">({members.length})</span>
                                        </button>
                                    </td>
                                </tr>
                                {!isCollapsed && members.map(renderRow)}
                            </tbody>
                        );
                    })
                ) : (
                    <tbody className="divide-y divide-divider">
                        {displayClients.map(renderRow)}
                    </tbody>
                )}
            </table>
        </div>
        {editing && <ClientQuickEditDrawer client={editing} onClose={() => setEditing(null)} onSaved={() => setEditing(null)} />}
      </>
    );
}
