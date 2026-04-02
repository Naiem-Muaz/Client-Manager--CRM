import React, { useState } from 'react';
import { X } from 'lucide-react';
import { TypeSelectionStep } from './steps/TypeSelectionStep';
import { CompanyLookupStep } from './steps/CompanyLookupStep';
import { ClientDetailsStep } from './steps/ClientDetailsStep';
import { nextgenApi } from '../../utils/nextgenApi';
import { useSWRConfig } from 'swr';

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type Step = 'TYPE_SELECTION' | 'COMPANY_LOOKUP' | 'DETAILS';

export function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
    const [step, setStep] = useState<Step>('TYPE_SELECTION');
    const [clientType, setClientType] = useState<'Individual' | 'Company' | null>(null);
    const [draftData, setDraftData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { mutate } = useSWRConfig();

    if (!isOpen) return null;

    const handleTypeSelect = (type: 'Individual' | 'Company') => {
        setClientType(type);
        if (type === 'Company') {
            setStep('COMPANY_LOOKUP');
        } else {
            setStep('DETAILS');
        }
    };

    const handleCompanySelect = (data: any) => {
        setDraftData(data);
        setStep('DETAILS');
    };

    const handleManualEntry = () => {
        setStep('DETAILS');
    };

    const handleSubmit = async (finalData: any) => {
        setIsSubmitting(true);
        try {
            await nextgenApi.createClient(finalData);
            // Refresh client list
            mutate('/clients');
            onClose();
            // Reset state
            setStep('TYPE_SELECTION');
            setClientType(null);
            setDraftData({});
        } catch (error) {
            console.error('Failed to create client:', error);
            alert('Failed to create client. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleBack = () => {
        if (step === 'DETAILS') {
            if (clientType === 'Company') {
                setStep('COMPANY_LOOKUP');
            } else {
                setStep('TYPE_SELECTION');
            }
        } else if (step === 'COMPANY_LOOKUP') {
            setStep('TYPE_SELECTION');
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                    <h2 className="text-lg font-semibold text-slate-900">Add New Client</h2>
                    <button 
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-slate-100 w-full">
                    <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ 
                            width: step === 'TYPE_SELECTION' ? '33%' : step === 'COMPANY_LOOKUP' ? '66%' : '100%' 
                        }}
                    />
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto">
                    {step === 'TYPE_SELECTION' && (
                        <TypeSelectionStep onSelect={handleTypeSelect} />
                    )}

                    {step === 'COMPANY_LOOKUP' && (
                        <CompanyLookupStep 
                            onSelect={handleCompanySelect}
                            onManual={handleManualEntry}
                        />
                    )}

                    {step === 'DETAILS' && (
                        <ClientDetailsStep 
                            type={clientType!}
                            initialData={draftData}
                            onSubmit={handleSubmit}
                            onBack={handleBack}
                        />
                    )}
                </div>
                
                {isSubmitting && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-20">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
