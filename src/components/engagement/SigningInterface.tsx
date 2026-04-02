import React, { useState } from 'react';
import { PenTool, CheckCircle, ShieldCheck } from 'lucide-react';

export function SigningInterface({ letter, onClose, onSign }: { letter: any, onClose: () => void, onSign: (signature: any) => void }) {
    const [name, setName] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [isSigned, setIsSigned] = useState(false);

    const handleSign = () => {
        if (!name || !agreed) return;
        
        // Mock Signature Metadata
        const signatureData = {
            signerName: name,
            timestamp: new Date().toISOString(),
            ipAddress: '192.168.1.1', // Mock IP
            type: 'Digital (Type)'
        };
        
        setIsSigned(true);
        setTimeout(() => {
            onSign(signatureData);
        }, 1500);
    };

    if (isSigned) {
        return (
            <div className="fixed inset-0 bg-emerald-50 z-50 flex flex-col items-center justify-center p-4 animate-fadeIn">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle size={48} />
                </div>
                <h2 className="text-3xl font-bold text-emerald-900 mb-2">Document Signed!</h2>
                <p className="text-emerald-700 mb-8">Thank you, {name}. A copy has been emailed to you.</p>
                <div className="flex items-center gap-2 text-sm text-emerald-600/60 font-mono">
                    <ShieldCheck size={14} /> Secured by NextGen Brain
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center overflow-auto py-10">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl min-h-[500px] flex flex-col">
                {/* Header */}
                 <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Review & Sign Document</h1>
                        <p className="text-sm text-slate-500">Secure Digital Signature Portal</p>
                    </div>
                    <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600 underline">Cancel</button>
                </div>

                {/* Document View */}
                <div className="flex-1 p-12 overflow-y-auto bg-white">
                    <div className="max-w-2xl mx-auto prose prose-slate">
                         <div dangerouslySetInnerHTML={{ __html: letter.content }} />
                    </div>
                </div>

                {/* Signing Footer */}
                <div className="p-8 bg-slate-50 border-t border-slate-200">
                    <div className="max-w-2xl mx-auto space-y-6">
                        
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                            <input 
                                type="checkbox" 
                                id="agree" 
                                checked={agreed} 
                                onChange={(e) => setAgreed(e.target.checked)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded cursor-pointer" 
                            />
                            <label htmlFor="agree" className="text-sm text-blue-900 cursor-pointer select-none">
                                I confirm that I have read and understood the terms of engagement and agree to be bound by them. I authorise <strong>Agent Name</strong> to act as my tax agent.
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700">Type Full Name to Sign</label>
                                <div className="relative">
                                    <PenTool className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. John Doe" 
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg font-script text-2xl text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none placeholder:text-slate-300 placeholder:font-sans placeholder:text-base"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                onClick={handleSign}
                                disabled={!name || !agreed}
                                className="h-[50px] w-full bg-emerald-600 text-white rounded-lg font-bold text-lg hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                <PenTool size={20} /> Sign Document
                            </button>
                        </div>

                         <div className="text-center">
                            <p className="text-xs text-slate-400">
                                By clicking Sign, you agree to transact electronically. <br />
                                IP Address logged: 192.168.1.1 • {new Date().toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
