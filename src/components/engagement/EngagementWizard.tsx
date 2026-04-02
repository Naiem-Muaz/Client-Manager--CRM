import React, { useState } from 'react';
import { X, FileText, Check, ChevronRight, Eye, Send } from 'lucide-react';
import { TEMPLATES, generateLetterHtml } from '../../utils/EngagementTemplates';

export function EngagementWizard({ client, onClose, onComplete }: { client: any, onClose: () => void, onComplete: (letter: any) => void }) {
    const [step, setStep] = useState(1);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);

    const handleTemplateSelect = (id: string) => {
        const template = TEMPLATES.find(t => t.id === id);
        setSelectedTemplateId(id);
        setSelectedServices(template?.defaultServices || []);
        setStep(2);
    };

    const toggleService = (service: string) => {
        if (selectedServices.includes(service)) {
            setSelectedServices(prev => prev.filter(s => s !== service));
        } else {
            setSelectedServices(prev => [...prev, service]);
        }
    };

    const generatedHtml = selectedTemplateId 
        ? generateLetterHtml(selectedTemplateId, client, selectedServices) 
        : '';

    const handleSend = () => {
        // Mock backend creation
        const newLetter = {
            id: Date.now().toString(),
            title: TEMPLATES.find(t => t.id === selectedTemplateId)?.name + ' ' + new Date().getFullYear(),
            sentDate: new Date().toLocaleDateString(),
            status: 'Sent',
            services: selectedServices,
            content: generatedHtml // Store content for signing
        };
        onComplete(newLetter);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Create Engagement Letter</h2>
                        <p className="text-sm text-slate-500">Step {step} of 3</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
                    
                    {/* Step 1: Select Template */}
                    {step === 1 && (
                        <div className="max-w-3xl mx-auto">
                             <h3 className="text-lg font-bold text-slate-900 mb-6">Select a Template</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {TEMPLATES.map(t => (
                                    <button 
                                        key={t.id}
                                        onClick={() => handleTemplateSelect(t.id)}
                                        className="text-left p-6 bg-white rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <FileText size={24} />
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-900 mb-2">{t.name}</h4>
                                        <p className="text-slate-500 text-sm leading-relaxed">{t.description}</p>
                                    </button>
                                ))}
                             </div>
                        </div>
                    )}

                    {/* Step 2: Customize */}
                    {step === 2 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                            <div className="lg:col-span-1 space-y-6">
                                <div>
                                    <h3 className="font-bold text-slate-900 mb-4">Included Services</h3>
                                    <div className="space-y-2">
                                        {[
                                            'Annual Accounts', 
                                            'Corporation Tax', 
                                            'Payroll', 
                                            'Director Self Assessment', 
                                            'VAT Returns', 
                                            'Bi-Monthly Bookkeeping',
                                            'Registered Office'
                                        ].map(service => (
                                            <label key={service} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                                    selectedServices.includes(service) ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                                                }`}>
                                                    {selectedServices.includes(service) && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <input 
                                                    type="checkbox" 
                                                    className="hidden" 
                                                    checked={selectedServices.includes(service)}
                                                    onChange={() => toggleService(service)}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{service}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
                                <div className="p-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Live Preview</span>
                                    <Eye size={16} className="text-slate-400" />
                                </div>
                                <div className="flex-1 overflow-y-auto p-8 prose prose-sm max-w-none">
                                    <div dangerouslySetInnerHTML={{ __html: generatedHtml }} />
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer */}
                <div className="p-6 bg-white border-t border-slate-200 flex justify-between items-center">
                    {step > 1 && (
                        <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">
                            Back
                        </button>
                    )}
                    <div className="ml-auto">
                        {step === 1 ? (
                            <span className="text-sm text-slate-400">Select a template to continue</span>
                        ) : (
                            <button 
                                onClick={handleSend}
                                className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                <Send size={18} /> Send for Signature
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
