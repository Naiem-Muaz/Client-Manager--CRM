import React from 'react';
import { Link } from 'react-router-dom';
import { MoreHorizontal, AlertTriangle, AlertCircle, Building2, User } from 'lucide-react';

export function ClientTable({ clients }: { clients: any[] }) {
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

    return (
        <div className="bg-bg-surface border border-divider rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-bg-main border-b border-divider text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Client</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">HMRC</th>
                        <th className="px-6 py-4">CDD</th>
                        <th className="px-6 py-4 text-center">Risk</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-divider">
                    {clients.map(client => {
                        // Computed Risk Dot Logic
                        let riskColor = 'bg-slate-200'; // Default gray
                        if (client.riskScore > 80) riskColor = 'bg-red-500';
                        else if (client.riskScore > 50) riskColor = 'bg-amber-500';
                        else riskColor = 'bg-emerald-500';

                        return (
                        <tr key={client.id} className="hover:bg-bg-main/50 transition-colors group cursor-pointer relative">
                            <td className="px-6 py-4">
                                <Link to={`/clients/${client.id}`} className="absolute inset-0 z-10" />
                                <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-sm ${
                                        client.entityType === 'Company' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                                    }`}>
                                        {client.legalName.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-900 block group-hover:text-brand-primary transition-colors">
                                            {client.legalName}
                                        </span>
                                        <span className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                                            {client.entityType} • {client.utr || client.companyNumber || 'No Ref'}
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
                                <span 
                                    className={`inline-block w-3 h-3 rounded-full ${riskColor} ring-2 ring-white shadow-sm`} 
                                    title={`Risk Score: ${client.riskScore}`} 
                                />
                            </td>
                            <td className="px-6 py-4 text-right z-30 relative">
                                <button className="p-2 text-slate-400 hover:text-brand-primary hover:bg-bg-main rounded-lg transition-colors relative z-30">
                                    <MoreHorizontal size={18} />
                                </button>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    );
}
