import React, { useState } from 'react';
import { Plus, Upload, Building2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mutate as globalMutate } from 'swr';
import { ImportClientsModal } from './ImportClientsModal';
import { NextGenAPI } from '../../api/NextGenAPI';
import { errMsg } from '../../lib/errMsg';

export function ClientPageActions() {
    const navigate = useNavigate();
    const [showImport, setShowImport] = useState(false);
    const [enriching, setEnriching] = useState(false);
    const [enrichResult, setEnrichResult] = useState<string | null>(null);

    const runEnrich = async () => {
        if (!window.confirm('Look up all limited companies missing a company number on Companies House and fill in their registration details? Only confident name matches are applied.')) return;
        setEnriching(true); setEnrichResult(null);
        try {
            // Bulk lookup: ~2 CH calls + 100ms pause per client — allow several minutes.
            const res = await NextGenAPI.post('/brain/clients/enrich-from-ch', {}, { timeout: 300000 });
            const d = res.data.data ?? res.data;
            setEnrichResult(`Enriched ${d.enriched} of ${d.total} · ${d.skipped} skipped (no confident match) · ${d.errors} errors`);
            globalMutate('/brain/clients');
        } catch (e: any) { setEnrichResult(errMsg(e, 'Enrichment failed')); }
        finally { setEnriching(false); }
    };

    return (
        <div className="flex flex-col items-end gap-2">
            <div className="flex gap-3">
                <button
                    onClick={runEnrich}
                    disabled={enriching}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 transition-colors font-medium shadow-sm disabled:opacity-60"
                >
                    {enriching ? <Loader2 size={18} className="animate-spin" /> : <Building2 size={18} />}
                    {enriching ? 'Enriching…' : 'Enrich from Companies House'}
                </button>
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
            </div>
            {enrichResult && <span className="text-xs text-slate-500">{enrichResult}</span>}
            {showImport && <ImportClientsModal onClose={() => setShowImport(false)} />}
        </div>
    );
}
