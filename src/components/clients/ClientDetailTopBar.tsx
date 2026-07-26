import React from 'react';
import { Plus, Upload, Calendar, PenTool, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { ClientAuthority } from '../../types/ClientAuthority';

export function ClientDetailTopBar({ hasEngagement, authority }: { hasEngagement?: boolean, authority?: ClientAuthority }) {
    
    // undefined ⇒ NOT CHECKED, which is not the same as "Pending"/"Missing" and
    // certainly not "Signed"/"Authorized". These badges previously showed green
    // for every client off hardcoded state; a slate "not checked" is the only
    // honest rendering until they are wired to engagements.signed_at and
    // client_hmrc_authorisations.
    const UNKNOWN = 'bg-slate-50 text-slate-500 border-slate-200';
    const engagementStatus = hasEngagement === undefined ? 'not checked' : (hasEngagement ? 'Signed' : 'Pending');
    const engagementColor = hasEngagement === undefined
        ? UNKNOWN
        : (hasEngagement ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100');

    const isAuthorized = authority && Object.values(authority).some(v => v === 'Authorized');
    const authorityStatus = authority === undefined ? 'not checked' : (isAuthorized ? 'Authorized' : 'Missing');
    const authorityColor = authority === undefined
        ? UNKNOWN
        : (isAuthorized ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100');

    return (
        <div className="flex items-center gap-6">
            {/* Status Badges */}
            <div className="flex items-center gap-3 pr-6 border-r border-slate-200 mr-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${engagementColor}`}>
                    <PenTool size={12} />
                    <span>Engagement: {engagementStatus}</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold transition-all ${authorityColor}`}>
                    <ShieldCheck size={12} />
                    <span>HMRC: {authorityStatus}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                 <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
                    <Upload size={16} />
                    Upload Docs
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm">
                    <Calendar size={16} />
                    Add Period
                </button>
                <button className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm shadow-blue-900/10">
                    <Plus size={16} />
                    Add Entity
                </button>
            </div>
        </div>
    );
}
