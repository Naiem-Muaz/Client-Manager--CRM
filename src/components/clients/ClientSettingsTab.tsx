import React, { useState } from 'react';
import { Settings, ShieldAlert, Users, BookOpen, ShieldCheck, History } from 'lucide-react';
import { ClientAuthority, DEFAULT_AUTHORITY } from '../../types/ClientAuthority';
import { DigitalHandshakeFlow } from '../../components/hmrc/DigitalHandshakeFlow';
import { LegacyAuthFlow } from '../../components/hmrc/LegacyAuthFlow';

export function ClientSettingsTab({ client }: { client: any }) {
    const [authority, setAuthority] = useState<ClientAuthority>(DEFAULT_AUTHORITY);
    const [activeFlow, setActiveFlow] = useState<'none' | 'digital' | 'legacy'>('none');

    const handleUpdateAuthority = (updates: Partial<ClientAuthority>) => {
        setAuthority(prev => ({ ...prev, ...updates, lastUpdated: new Date().toISOString() }));
    };

    return (
        <div className="space-y-6 max-w-4xl">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <Settings size={20} className="text-slate-400" />
                    General Configuration
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Engagement Status */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Engagement Status</label>
                        <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100">
                            <option value="Active">Active Client</option>
                            <option value="Onboarding">Onboarding</option>
                            <option value="Lead">Lead / Prospect</option>
                            <option value="Disengaged">Disengaged</option>
                        </select>
                        <p className="text-xs text-slate-500">Controls visibility and automated workflows.</p>
                    </div>

                    {/* Assigned Staff */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Account Manager</label>
                         <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">JD</div>
                            <span className="flex-1 text-sm text-slate-700">John Doe</span>
                            <button className="text-xs text-blue-600 font-medium hover:underline">Change</button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* HMRC Authority Section */}
            {activeFlow === 'none' ? (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-start mb-6">
                         <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-blue-600" />
                            HMRC Authority (64-8)
                        </h3>
                        <div className="flex gap-2">
                             <button 
                                onClick={() => setActiveFlow('legacy')}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded border border-transparent hover:border-slate-200 transition-all"
                            >
                                Upload 64-8
                            </button>
                            <button 
                                onClick={() => setActiveFlow('digital')}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm transition-all"
                            >
                                New Request
                            </button>
                        </div>
                    </div>
                   
                     <div className="grid grid-cols-1 gap-4">
                        {['sa', 'ct', 'vat', 'paye'].map(key => {
                            const status = authority[key as keyof ClientAuthority];
                            return (
                                <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${
                                            status === 'Authorized' ? 'bg-emerald-500' :
                                            status === 'Requested' ? 'bg-amber-500' : 'bg-slate-300'
                                        }`} />
                                        <span className="font-bold text-slate-700 uppercase">{key}</span>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                        status === 'Authorized' ? 'bg-emerald-100 text-emerald-700' :
                                        status === 'Requested' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-500'
                                    }`}>
                                        {status}
                                    </span>
                                </div>
                            );
                        })}
                     </div>
                </div>
            ) : (
                <div className="mb-6">
                    {activeFlow === 'digital' && (
                        <DigitalHandshakeFlow 
                            currentAuthority={authority} 
                            onUpdate={handleUpdateAuthority} 
                            onCancel={() => setActiveFlow('none')} 
                        />
                    )}
                    {activeFlow === 'legacy' && (
                        <LegacyAuthFlow 
                            onUpdate={handleUpdateAuthority} 
                            onCancel={() => setActiveFlow('none')} 
                        />
                    )}
                </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                    <ShieldAlert size={20} className="text-amber-500" />
                    Risk & Compliance
                </h3>

                <div className="space-y-6">
                     {/* Risk Rating */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">Risk Rating</label>
                        <div className="flex gap-4">
                            {['Low', 'Medium', 'High'].map(level => (
                                <label key={level} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <input type="radio" name="risk" value={level} className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-slate-700">{level}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* AML Notes */}
                     <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700">AML / KYC Notes</label>
                        <textarea 
                            className="w-full h-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                            placeholder="Add notes regarding identity verification, source of funds, etc..."
                        ></textarea>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">Start Disengagement</button>
                <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Save Settings</button>
            </div>
        </div>
    );
}
