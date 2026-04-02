import React from 'react';
import { User, MapPin, Phone, Mail, Building2, Ticket } from 'lucide-react';

export function ClientProfileSection({ client }: { client: any }) {
    if (!client) return null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-500" />
                Client Profile
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Legal Name</span>
                    <span className="font-medium text-slate-900">{client.legalName}</span>
                </div>
                
                <div className="space-y-1">
                     <span className="text-slate-500 text-xs block">Entity Type</span>
                     <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium text-xs">
                        {client.entityType === 'Company' ? <Building2 size={12} /> : <User size={12} />}
                        {client.entityType}
                     </span>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Reference</span>
                    <div className="flex items-center gap-2">
                        <Ticket size={14} className="text-slate-400" />
                        <span className="font-mono text-slate-700">{client.utr || client.companyNumber || 'N/A'}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Contact</span>
                    <div className="space-y-0.5">
                        {client.email && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <Mail size={14} /> {client.email}
                            </div>
                        )}
                        {client.phone && (
                            <div className="flex items-center gap-2 text-slate-600">
                                <Phone size={14} /> {client.phone}
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-xs block">Address</span>
                    <div className="flex items-start gap-2 text-slate-600">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <span>
                            {client.address && (
                                <>
                                    {client.address.line1}, {client.address.town}, <span className="font-medium text-slate-900">{client.address.postcode}</span>
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
