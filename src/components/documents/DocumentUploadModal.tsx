import React, { useState } from 'react';
import { errMsg } from '../../lib/errMsg';
import { Upload, X, FileText, Tag, AlertCircle } from 'lucide-react';
import { DocumentCategory, FOLDERS, VaultDocument } from '../../types/DocumentTypes';
import { uploadDocument } from '../../hooks/useDocuments';

interface Props {
    category?: DocumentCategory;
    clientId?: string;
    initialFile?: File | null;
    onClose: () => void;
    onUpload: (doc: VaultDocument) => void;
}

const MAX_SIZE_MB = 25;

export function DocumentUploadModal({ category, clientId, initialFile, onClose, onUpload }: Props) {
    const [file, setFile] = useState<File | null>(initialFile || null);
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(category || 'Client Uploads');
    const [taxYear, setTaxYear] = useState('');
    const [status, setStatus] = useState<'Draft' | 'Final'>('Draft');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null);
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            if (f.size > MAX_SIZE_MB * 1024 * 1024) {
                setError(`File is too large. Maximum size is ${MAX_SIZE_MB}MB.`);
                return;
            }
            setFile(f);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setProgress(0);
        setError(null);

        try {
            await uploadDocument(file, selectedCategory, clientId, setProgress, {
                status,
                ...(taxYear ? { taxYear } : {}),
            });

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
        } catch (err: any) {
            setError(errMsg(err, 'Upload failed. Please try again.'));
            setUploading(false);
        }
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

                    {error && (
                        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}

                    {uploading && (
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Uploading…</span>
                                <span>{progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex items-center gap-3">
                        <button onClick={onClose} disabled={uploading} className="flex-1 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50">
                            Cancel
                        </button>
                        <button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                            className="flex-1 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
                        >
                            {uploading ? 'Uploading…' : 'Upload to Vault'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
