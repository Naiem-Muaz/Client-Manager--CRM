import React from 'react';
import { Lock, Unlock, FileText, AlertTriangle, ShieldCheck, PenTool } from 'lucide-react';
import { ClientAuthority } from '../../types/ClientAuthority';
import { useCompliance } from '../../hooks/useCompliance';

const TaxServiceCard = ({ type, serviceId, hasEngagement, authority }: { type: string, serviceId: 'SA' | 'CT' | 'VAT' | 'PAYE', hasEngagement?: boolean, authority?: ClientAuthority }) => {
    // Compliance state is UNKNOWN until it is wired to engagements.signed_at and
    // client_hmrc_authorisations. It used to come from hardcoded props
    // (hasEngagement=true, sa/ct/vat='Authorized') that were passed for every
    // client, so a service showed UNLOCKED on fabricated compliance.
    //
    // Unknown FAILS CLOSED: locked, with an explicit "not verified" reason rather
    // than a list of satisfied requirements. Unlocking a tax service on a
    // compliance check that never ran is the one outcome that must not happen.
    const unknown = hasEngagement === undefined || authority === undefined;
    const checked = useCompliance(serviceId, hasEngagement ?? false, authority ?? ({} as ClientAuthority));
    const isCompliant = unknown ? false : checked.isCompliant;
    const missingRequirements = unknown
        ? ['engagement and HMRC authority not verified']
        : checked.missingRequirements;

    return (
        <div className={`rounded-xl border p-6 flex flex-col justify-between h-72 relative overflow-hidden transition-all ${
            !isCompliant ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
        }`}>
            {!isCompliant && (
                <div className="absolute inset-0 bg-slate-100/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-3 shadow-sm animate-pulse">
                        <Lock size={24} />
                    </div>
                    <h4 className="font-bold text-slate-900 mb-2">Service Locked</h4>
                    <div className="space-y-1 mb-4">
                        {missingRequirements.map(req => (
                            <div key={req} className="flex items-center gap-1.5 text-xs text-red-600 font-medium justify-center bg-red-50 px-2 py-1 rounded">
                                {req.includes('Engagement') ? <PenTool size={12} /> : <ShieldCheck size={12} />}
                                Missing {req}
                            </div>
                        ))}
                    </div>
                    <button className="text-xs font-bold text-blue-600 hover:underline">Resolve Compliance Issues &rarr;</button>
                </div>
            )}

            <div>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-slate-900">{type}</h3>
                    <div className={`p-2 rounded-lg ${!isCompliant ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600'}`}>
                        <FileText size={20} />
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-300 w-3/4"></div>
                    </div>
                    <p className="text-xs text-slate-400">Next Deadline: 14 days</p>
                </div>
            </div>

            <button disabled={!isCompliant} className={`w-full py-2 rounded-lg font-medium text-sm transition-colors z-0 ${
                !isCompliant ? 'bg-slate-200 text-slate-400 opacity-0' : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}>
                Open Return
            </button>
        </div>
    );
};

export function ClientTaxTab({ client, hasEngagement, authority }: { client: any, hasEngagement?: boolean, authority?: ClientAuthority }) {
    return (
        <div className="space-y-6">
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${hasEngagement === undefined ? 'bg-slate-50 border-slate-200' : (hasEngagement ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200')}`}>
                {hasEngagement ? <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" /> : <Lock size={20} className="text-red-600 shrink-0 mt-0.5" />}
                <div className="text-sm">
                    <h4 className={`font-bold ${hasEngagement ? 'text-blue-900' : 'text-red-900'}`}>{hasEngagement ? 'Compliance Engine Active' : 'Access Restricted'}</h4>
                    <p className={`${hasEngagement ? 'text-blue-800' : 'text-red-800'} opacity-90`}>
                        {hasEngagement 
                            ? 'System is enforcing hard locks based on your HMRC Authority status.' 
                            : 'CRITICAL: Engagement Letter marked as missing. All services are locked until engagement is signed.'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <TaxServiceCard type="Self Assessment" serviceId="SA" hasEngagement={hasEngagement} authority={authority} />
                <TaxServiceCard type="Corporation Tax" serviceId="CT" hasEngagement={hasEngagement} authority={authority} />
                <TaxServiceCard type="VAT Returns" serviceId="VAT" hasEngagement={hasEngagement} authority={authority} />
                <TaxServiceCard type="PAYE / Payroll" serviceId="PAYE" hasEngagement={hasEngagement} authority={authority} />
            </div>
        </div>
    );
}
