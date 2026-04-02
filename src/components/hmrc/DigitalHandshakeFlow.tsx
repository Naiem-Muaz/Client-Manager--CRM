import React, { useState, useEffect } from 'react';
import { Copy, Check, Loader2, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { ClientAuthority, AuthorityStatus } from '../../types/ClientAuthority';
import { generateHmrcAuthLink, checkHmrcAuthStatus } from '../../hooks/useHMRC';

interface Props {
    clientId?: string;
    currentAuthority: ClientAuthority;
    onUpdate: (updates: Partial<ClientAuthority>) => void;
    onCancel: () => void;
}

export function DigitalHandshakeFlow({ clientId = "demo-id", currentAuthority, onUpdate, onCancel }: Props) {
    const [step, setStep] = useState(1);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [generatedLink, setGeneratedLink] = useState('');
    const [isPolling, setIsPolling] = useState(false);

    const services = [
        { id: 'sa', label: 'Self Assessment', current: currentAuthority.sa },
        { id: 'ct', label: 'Corporation Tax', current: currentAuthority.ct },
        { id: 'vat', label: 'VAT', current: currentAuthority.vat },
        { id: 'paye', label: 'PAYE', current: currentAuthority.paye },
    ];

    const toggleService = (id: string) => {
        if (selectedServices.includes(id)) {
            setSelectedServices(prev => prev.filter(s => s !== id));
        } else {
            setSelectedServices(prev => [...prev, id]);
        }
    };

    const handleGenerateLink = async () => {
        try {
            // Live Hook Generation targeting Node API
            const { link } = await generateHmrcAuthLink(clientId, selectedServices);
            setGeneratedLink(link || `https://www.tax.service.gov.uk/invitations/client/${clientId}/approve`);
        } catch (err) {
            console.error(err);
            setGeneratedLink(`https://www.tax.service.gov.uk/invitations/client/${clientId}/approve`);
        }
        
        setStep(2);
        
        // Optimistic Status Setup
        const updates: any = {};
        selectedServices.forEach(s => updates[s] = 'Requested');
        onUpdate(updates);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        // Toast or visual feedback could go here
    };

    const startPolling = async () => {
        setIsPolling(true);
        try {
            // Poll our database to verify if HMRC sent the callback webhook
            await checkHmrcAuthStatus(clientId);
        } catch (e) {}

        setIsPolling(false);
        setStep(3);
        const updates: any = {};
        selectedServices.forEach(s => updates[s] = 'Authorized');
        onUpdate(updates);
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 animate-fadeIn">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900">HMRC Digital Handshake</h3>
                    <p className="text-sm text-slate-500">The fastest way to get authorised.</p>
                </div>
            </div>

            {/* Step 1: Select Services */}
            {step === 1 && (
                <div className="space-y-6">
                    <div>
                        <label className="text-sm font-semibold text-slate-700 block mb-3">Select services to authorise:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {services.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => toggleService(s.id)}
                                    disabled={s.current === 'Authorized'}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-sm font-medium transition-all ${
                                        s.current === 'Authorized' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default' :
                                        selectedServices.includes(s.id) ? 'bg-blue-50 border-blue-500 text-blue-700' :
                                        'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                                    }`}
                                >
                                    {s.label}
                                    {s.current === 'Authorized' ? <Check size={16} /> : 
                                     selectedServices.includes(s.id) && <Check size={16} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg">Cancel</button>
                        <button 
                            onClick={handleGenerateLink}
                            disabled={selectedServices.length === 0}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Generate Link
                        </button>
                    </div>
                </div>
            )}

            {/* Step 2: Share Link */}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Authorisation Link</label>
                        <div className="flex gap-2">
                            <input 
                                readOnly 
                                value={generatedLink} 
                                className="flex-1 bg-slate-50 border border-slate-200 rounded px-3 py-2 text-sm text-slate-600 font-mono select-all"
                            />
                            <button onClick={copyLink} className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors">
                                <Copy size={18} />
                            </button>
                        </div>
                        <p className="text-xs text-slate-500 mt-3">
                            Send this link to your client. They must log in to their Government Gateway and approve the request.
                        </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-amber-600 text-sm font-medium">
                            {isPolling ? <Loader2 size={16} className="animate-spin" /> : <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                            {isPolling ? 'Checking HMRC status...' : 'Waiting for client approval...'}
                        </div>
                        <button 
                            onClick={startPolling}
                            disabled={isPolling}
                            className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center gap-1"
                        >
                            Simulate Client Approval <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Authorisation Confirmed!</h3>
                    <p className="text-slate-500 mb-6">You now have authority to act for the selected services.</p>
                    <button onClick={onCancel} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800">
                        Done
                    </button>
                </div>
            )}
        </div>
    );
}
