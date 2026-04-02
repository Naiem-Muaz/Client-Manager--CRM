import React, { useState } from 'react';
import { Search, Building2, AlertCircle } from 'lucide-react';
import { nextgenApi } from '../../../utils/nextgenApi';

interface CompanyLookupStepProps {
    onSelect: (companyData: any) => void;
    onManual: () => void;
}

export function CompanyLookupStep({ onSelect, onManual }: CompanyLookupStepProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await nextgenApi.lookupCompany(query);
            if (data) {
                setResult(data);
            } else {
                setError('Company not found. Please try again or enter details manually.');
            }
        } catch (err) {
            setError('An error occurred while connecting to Companies House.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
             <div className="text-center">
                <h3 className="text-lg font-medium text-slate-900">Find Company</h3>
                <p className="text-slate-500 mt-1">Search Companies House to auto-fill details.</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Company Name or Number"
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 flex items-start gap-3">
                    <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-amber-900 text-sm font-medium">{error}</p>
                        <button 
                            onClick={onManual}
                            className="text-amber-700 text-sm hover:underline mt-1"
                        >
                            Enter details manually instead &rarr;
                        </button>
                    </div>
                </div>
            )}

            {result && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white rounded-lg border border-slate-200">
                                <Building2 className="text-slate-600" size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold text-slate-900">{result.legalName}</h4>
                                <p className="text-xs text-slate-500">#{result.companyNumber}</p>
                            </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            {result.status}
                        </span>
                    </div>
                    <div className="p-4 space-y-2 text-sm text-slate-600">
                        <p><strong>Incorporated:</strong> {result.dateOfIncorporation}</p>
                        <p><strong>Address:</strong> {result.registeredAddress.line1}, {result.registeredAddress.town}, {result.registeredAddress.postcode}</p>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                         <button 
                            onClick={() => setResult(null)}
                            className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => onSelect(result)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Confirm & Use
                        </button>
                    </div>
                </div>
            )}

            {!result && !error && (
                <div className="text-center pt-4">
                     <button 
                        onClick={onManual}
                        className="text-slate-500 hover:text-slate-700 text-sm font-medium"
                    >
                        Skip lookup and enter manually
                    </button>
                </div>
            )}
        </div>
    );
}
