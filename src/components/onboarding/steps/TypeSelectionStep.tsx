import React from 'react';
import { User, Building2 } from 'lucide-react';

interface TypeSelectionStepProps {
    onSelect: (type: 'Individual' | 'Company') => void;
}

export function TypeSelectionStep({ onSelect }: TypeSelectionStepProps) {
    return (
        <div className="space-y-6">
            <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900">What type of client are you adding?</h3>
                <p className="text-slate-500 mt-1">Select the entity type to begin the onboarding process.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => onSelect('Individual')}
                    className="flex flex-col items-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                        <User className="text-blue-600" size={24} />
                    </div>
                    <h4 className="font-semibold text-slate-900">Individual</h4>
                    <p className="text-sm text-slate-500 mt-2 text-center">Self Assessment, Sole Trader</p>
                </button>

                <button
                    onClick={() => onSelect('Company')}
                    className="flex flex-col items-center p-6 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-200 transition-colors">
                        <Building2 className="text-purple-600" size={24} />
                    </div>
                    <h4 className="font-semibold text-slate-900">Limited Company</h4>
                    <p className="text-sm text-slate-500 mt-2 text-center">Corporation Tax, VAT, PAYE</p>
                </button>
            </div>
        </div>
    );
}
