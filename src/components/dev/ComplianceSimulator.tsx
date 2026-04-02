import React, { useState } from 'react';
import { Settings, CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ClientAuthority } from '../../types/ClientAuthority';

interface Props {
    hasEngagement: boolean;
    setHasEngagement: (val: boolean) => void;
    authority: ClientAuthority;
    setAuthority: (val: ClientAuthority) => void;
}

export function ComplianceSimulator({ hasEngagement, setHasEngagement, authority, setAuthority }: Props) {
    const [isOpen, setIsOpen] = useState(false);

    const toggleEngagement = () => setHasEngagement(!hasEngagement);

    const toggleAuthority = (key: keyof ClientAuthority) => {
        if (key === 'lastUpdated') return;
        const current = authority[key];
        const next = current === 'Authorized' ? 'None' : 'Authorized';
        setAuthority({ ...authority, [key]: next });
    };

    const resetAll = () => {
        setHasEngagement(true);
        setAuthority({
            sa: 'Authorized',
            ct: 'Authorized',
            vat: 'Authorized',
            paye: 'Authorized',
            mtd_itsa: 'None',
            lastUpdated: new Date().toISOString()
        });
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-4 right-4 bg-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-slate-800 transition-all hover:scale-105 z-50 border border-slate-700"
                title="Open Compliance Simulator"
            >
                <Settings size={20} />
            </button>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white rounded-xl shadow-2xl border border-slate-200 w-80 overflow-hidden z-50 animate-fadeIn">
            <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
                <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <Settings size={16} /> Compliance Simulator
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                    <XCircle size={18} />
                </button>
            </div>
            
            <div className="p-4 space-y-6">
                {/* Engagement Section */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Engagement Status</h4>
                    <button 
                        onClick={toggleEngagement}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            hasEngagement 
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                : 'bg-red-50 border-red-200 text-red-700'
                        }`}
                    >
                        <span className="font-medium text-sm">Engagement Letter</span>
                        {hasEngagement ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    </button>
                </div>

                {/* Authority Section */}
                <div>
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">HMRC Authority</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {(['sa', 'ct', 'vat', 'paye'] as const).map(key => (
                            <button 
                                key={key}
                                onClick={() => toggleAuthority(key)}
                                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium border transition-all ${
                                    authority[key] === 'Authorized'
                                     ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                     : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                <span className="uppercase">{key}</span>
                                {authority[key] === 'Authorized' && <CheckCircle2 size={12} />}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <button 
                    onClick={resetAll}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <RefreshCw size={12} /> Reset to Fully Compliant
                </button>
            </div>
            <div className="bg-slate-50 px-4 py-2 border-t border-slate-100 text-[10px] text-slate-400 text-center">
                Dev Tool Only - Not visible in Production
            </div>
        </div>
    );
}
