import React, { useState } from 'react';
import { Upload, FileText, Check } from 'lucide-react';
import { ClientAuthority } from '../../types/ClientAuthority';

interface Props {
    onUpdate: (updates: Partial<ClientAuthority>) => void;
    onCancel: () => void;
}

export function LegacyAuthFlow({ onUpdate, onCancel }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [selectedServices, setSelectedServices] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const toggleService = (id: string) => {
        if (selectedServices.includes(id)) {
            setSelectedServices(prev => prev.filter(s => s !== id));
        } else {
            setSelectedServices(prev => [...prev, id]);
        }
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        setIsSubmitting(true);
        // Mock processing
        setTimeout(() => {
            const updates: any = {};
            selectedServices.forEach(s => updates[s] = 'Authorized');
            onUpdate(updates);
            setIsSubmitting(false);
            onCancel(); // Close flow
        }, 1500);
    };

    return (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 animate-fadeIn">
            <h3 className="font-bold text-slate-900 mb-1">Upload 64-8 Form</h3>
            <p className="text-sm text-slate-500 mb-6">Use this fallback method if digital authorisation is not possible.</p>

            <div className="space-y-6">
                
                {/* File Upload */}
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center bg-white hover:bg-slate-50 transition-colors relative">
                    <input 
                        type="file" 
                        accept=".pdf,.jpg,.png" 
                        onChange={handleUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {file ? (
                        <div className="flex flex-col items-center">
                            <FileText size={32} className="text-blue-600 mb-2" />
                            <span className="font-medium text-slate-900">{file.name}</span>
                            <span className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center text-slate-400">
                            <Upload size={32} className="mb-2" />
                            <span className="font-medium text-slate-600">Click to upload 64-8 PDF</span>
                            <span className="text-xs">or drag and drop here</span>
                        </div>
                    )}
                </div>

                {/* Scope Selection */}
                <div>
                     <label className="text-sm font-semibold text-slate-700 block mb-3">Which services does this cover?</label>
                     <div className="flex gap-2 flex-wrap">
                        {['sa', 'ct', 'vat', 'paye'].map(id => (
                            <button 
                                key={id}
                                onClick={() => toggleService(id)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border transition-colors ${
                                    selectedServices.includes(id) 
                                        ? 'bg-slate-800 text-white border-slate-800' 
                                        : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'
                                }`}
                            >
                                {id.toUpperCase()}
                            </button>
                        ))}
                     </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                    <button onClick={onCancel} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg">Cancel</button>
                    <button 
                        onClick={handleSubmit}
                        disabled={!file || selectedServices.length === 0 || isSubmitting}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[100px]"
                    >
                        {isSubmitting ? 'Processing...' : 'Confirm Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
