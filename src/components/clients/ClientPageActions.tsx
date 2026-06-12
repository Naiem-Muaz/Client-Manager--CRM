import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImportClientsModal } from './ImportClientsModal';

export function ClientPageActions() {
    const navigate = useNavigate();
    const [showImport, setShowImport] = useState(false);

    return (
        <div className="flex gap-3">
            <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm"
            >
                <Upload size={18} />
                Import clients
            </button>
            <button
                onClick={() => navigate('/clients/new')}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
                <Plus size={20} />
                New Client
            </button>
            {showImport && <ImportClientsModal onClose={() => setShowImport(false)} />}
        </div>
    );
}
