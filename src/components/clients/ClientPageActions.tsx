
import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { OnboardingWizard } from '../onboarding/OnboardingWizard';

export function ClientPageActions() {
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    return (
        <>
            <div className="flex gap-3">
                <button 
                    onClick={() => setIsWizardOpen(true)}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} />
                    New Client
                </button>
            </div>

            <OnboardingWizard 
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
            />
        </>
    );
}
