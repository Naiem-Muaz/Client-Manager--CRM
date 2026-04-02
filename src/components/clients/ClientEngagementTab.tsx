import React, { useState } from 'react';
import { FileSignature, Send, Download, CheckCircle, Clock, AlertCircle, PenTool } from 'lucide-react';
import { EngagementWizard } from '../engagement/EngagementWizard';
import { SigningInterface } from '../engagement/SigningInterface';
import { useEngagementLetters, createEngagementLetter, signEngagementLetter } from '../../hooks/useEngagement';

interface Letter {
    id: string;
    title: string;
    sentDate: string;
    status: 'Sent' | 'Signed' | 'Expired';
    services: string[];
    content?: string;
}

export function ClientEngagementTab({ client }: { client: any }) {
    // Live hook integration targeting Node Orchestrator
    const { letters, isLoading, mutate } = useEngagementLetters(client.id);
    const safeLetters: Letter[] = Array.isArray(letters) ? letters : [];
    
    const [showWizard, setShowWizard] = useState(false);
    const [signingLetter, setSigningLetter] = useState<Letter | null>(null);

    const handleCreate = async (newLetter: any) => {
        // Assume modal executes standard SWR hook directly, or we optimistic update
        mutate(undefined);
        setShowWizard(false);
    };

    const handleSignComplete = async (signatureData: any) => {
        if (!signingLetter) return;
        
        await signEngagementLetter(client.id, signingLetter.id, signatureData);
        setSigningLetter(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Engagement Letters</h2>
                    <p className="text-sm text-slate-500">Manage contractual agreements and authority.</p>
                </div>
                <button 
                    onClick={() => setShowWizard(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <FileSignature size={16} />
                    Create New Letter
                </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {isLoading && (
                   <div className="h-24 bg-slate-100 animate-pulse rounded-xl border border-slate-200"></div>
                )}
                {safeLetters.map((letter: any) => (
                    <div key={letter.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:border-blue-300 transition-colors flex items-center justify-between">
                        <div className="flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                                letter.status === 'Signed' ? 'bg-emerald-100 text-emerald-600' :
                                letter.status === 'Sent' ? 'bg-blue-100 text-blue-600' :
                                'bg-slate-100 text-slate-500'
                            }`}>
                                {letter.status === 'Signed' ? <CheckCircle size={24} /> :
                                 letter.status === 'Sent' ? <Clock size={24} /> :
                                 <FileSignature size={24} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg mb-1">{letter.title}</h3>
                                <div className="flex items-center gap-3 text-sm text-slate-500">
                                    <span>Sent: {letter.sentDate}</span>
                                    <span>•</span>
                                    <div className="flex gap-1">
                                        {letter.services?.map((s: string) => (
                                            <span key={s} className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium text-slate-600">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {letter.status === 'Sent' && (
                                <>
                                    <button 
                                        onClick={() => setSigningLetter(letter)}
                                        className="flex items-center gap-2 px-3 py-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors shadow-sm animate-pulse"
                                    >
                                        <PenTool size={16} /> Client Portal View
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors">
                                        <Send size={16} /> Resend
                                    </button>
                                </>
                            )}
                            <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-lg text-sm font-medium transition-colors border border-slate-200">
                                <Download size={16} /> PDF
                            </button>
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                letter.status === 'Signed' ? 'bg-emerald-100 text-emerald-700' :
                                letter.status === 'Sent' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                                {letter.status.toUpperCase()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <h4 className="font-bold text-blue-900">Legal Authority</h4>
                    <p className="text-blue-800 opacity-90">
                        Engagement letters are required before you can act as an agent for this client. 
                        Ensure a signed copy is stored in the Documents tab if not generated here.
                    </p>
                </div>
            </div>

            {/* Modals */}
            {showWizard && <EngagementWizard client={client} onClose={() => setShowWizard(false)} onComplete={handleCreate} />}
            {signingLetter && <SigningInterface letter={signingLetter} onClose={() => setSigningLetter(null)} onSign={handleSignComplete} />}
        </div>
    );
}
