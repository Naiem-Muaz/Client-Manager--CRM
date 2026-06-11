import React from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ClientPageActions() {
    const navigate = useNavigate();

    return (
        <div className="flex gap-3">
            <button
                onClick={() => navigate('/clients/new')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
                <Plus size={20} />
                New Client
            </button>
        </div>
    );
}
