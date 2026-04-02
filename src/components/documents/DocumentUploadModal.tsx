import React, { useState } from 'react';
import { Upload, X, FileText, Tag } from 'lucide-react';
import { DocumentCategory, FOLDERS, VaultDocument } from '../../types/DocumentTypes';

interface Props {
    category?: DocumentCategory;
    onClose: () => void;
    onUpload: (doc: VaultDocument) => void;
}

export function DocumentUploadModal({ category, onClose, onUpload }: Props) {
    const [file, setFile] = useState<File | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(category || 'Client Uploads');
    const [taxYear, setTaxYear] = useState('');
    const [status, setStatus] = useState<'Draft' | 'Final'>('Draft');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = () => {
        if (!file) return;

        const newDoc: VaultDocument = {
            id: Date.now().toString(),
            name: file.name,
            type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
            size: (file.size / 1024 / 1024).toFixed(2) + ' MB',
            dateAdded: new Date().toLocaleDateString(),
            category: selectedCategory,
            metadata: {
                isImmutable: status === 'Final',
                taxYear: taxYear || undefined,
            },
            status: status === 'Final' ? 'Final' : 'Draft',
            uploadedBy: 'Agent'
        };

        onUpload(newDoc);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fadeIn">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900">Upload Document</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* File Drop Area */}
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors relative group">
                        <input 
                            type="file" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {file ? (
                            <div className="flex flex-col items-center">
                                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mb-2">
                                    <FileText size={24} />
                                </div>
                                <span className="font-medium text-slate-900">{file.name}</span>
                                <span className="text-xs text-slate-500">Click to change</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-600">
                                <Upload size={32} className="mb-2" />
                                <span className="font-medium">Click to upload file</span>
                                <span className="text-xs">PDF, PNG, JPG, DOCX supported</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata Form */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Folder / Category</label>
                            <select 
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                            >
                                {FOLDERS.map(f => (
                                    <option key={f.id} value={f.id}>{f.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                    <Tag size={14} /> Tax Year
                                </label>
                                <select 
                                    value={taxYear} 
                                    onChange={(e) => setTaxYear(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                >
                                    <option value="">None</option>
                                    <option value="2025/26">2025/26</option>
                                    <option value="2024/25">2024/25</option>
                                    <option value="2023/24">2023/24</option>
                                </select>
                            </div>

                             <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Status</label>
                                <select 
                                    value={status} 
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                >
                                    <option value="Draft">Draft (Editable)</option>
                                    <option value="Final">Final (Locked)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex items-center gap-3">
                        <button onClick={onClose} className="flex-1 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                        </button>
                        <button 
                            onClick={handleUpload}
                            disabled={!file}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                        >
                            Upload to Vault
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
