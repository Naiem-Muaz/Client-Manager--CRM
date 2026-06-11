import React, { useState } from 'react';
import { Upload, Search, Filter, Folder, FileText, Lock, MoreHorizontal, Download, Eye, Trash2, FileSignature, ShieldCheck, Archive, BookOpen, Receipt, Mail, UploadCloud } from 'lucide-react';
import { VaultDocument, DocumentCategory, FOLDERS } from '../../types/DocumentTypes';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { useDocuments, deleteDocument } from '../../hooks/useDocuments';

const TYPE_ICONS: Record<string, any> = {
    'Engagement': FileSignature,
    'HMRC': ShieldCheck,
    'Permanent': Archive,
    'Accounts': BookOpen,
    'Tax': Receipt,
    'Correspondence': Mail,
    'Client Uploads': UploadCloud
};

export function ClientDocumentsTab({ client }: { client: any }) {
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'All'>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    
    // Live API hook context mapping dynamically against active Client ID
    const { documents, isLoading, mutate } = useDocuments(client.id);

    const safeDocuments = Array.isArray(documents) ? documents : [];

    const filteredDocs = safeDocuments.filter((doc: any) => {
        const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleUpload = (newDoc: VaultDocument) => {
        // Optimistic refresh - actual backend update occurs via SWR
        mutate(undefined);
        setShowUpload(false);
    };

    return (
        <div className="h-[600px] flex gap-6">
            {/* Sidebar: Folders */}
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">Document Vault</h3>
                    <p className="text-xs text-slate-500">Central File Storage</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button 
                        onClick={() => setSelectedCategory('All')}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedCategory === 'All' 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <Folder size={18} className={selectedCategory === 'All' ? 'text-blue-500' : 'text-slate-400'} />
                        All Documents
                    </button>
                    <div className="h-px bg-slate-100 my-2 mx-1" />
                    {FOLDERS.map(folder => {
                        const Icon = TYPE_ICONS[folder.id] || Folder;
                        const count = safeDocuments.filter((d: any) => d.category === folder.id).length;
                        return (
                            <button 
                                key={folder.id}
                                onClick={() => setSelectedCategory(folder.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                                    selectedCategory === folder.id 
                                    ? 'bg-blue-50 text-blue-700' 
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={18} className={selectedCategory === folder.id ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'} />
                                    {folder.label}
                                </div>
                                {count > 0 && (
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
                <div className="p-3 border-t border-slate-100">
                    <button 
                        onClick={() => setShowUpload(true)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Upload size={16} /> Upload File
                    </button>
                </div>
            </div>

            {/* Main Content: File List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                         <span className="font-medium text-slate-800">{selectedCategory === 'All' ? 'All Documents' : FOLDERS.find(f => f.id === selectedCategory)?.label}</span>
                         <span>•</span>
                         <span>{filteredDocs.length} files</span>
                    </div>
                    <div className="relative w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                         <input 
                            type="text" 
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                        />
                    </div>
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 uppercase tracking-wide">
                    <div className="col-span-12 md:col-span-5">Name</div>
                    <div className="col-span-2">Date</div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Tags</div>
                    <div className="col-span-1 text-right">Action</div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                    {filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Folder size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-slate-600">No documents found</p>
                            <p className="text-sm">Try changing the search or upload a new file.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredDocs.map(doc => (
                                <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                                    <div className="col-span-12 md:col-span-5 flex items-center gap-3 overflow-hidden">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            doc.metadata.isImmutable ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                            {doc.metadata.isImmutable ? <Lock size={14} /> : <FileText size={14} />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-medium text-slate-900 truncate" title={doc.name}>{doc.name}</div>
                                            <div className="text-xs text-slate-500 flex gap-1">
                                                <span>{doc.size}</span>
                                                <span>•</span>
                                                <span>Added by {doc.uploadedBy}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="col-span-2 text-sm text-slate-600">{doc.dateAdded}</div>
                                    
                                    <div className="col-span-2">
                                         <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${
                                            doc.status === 'Signed' || doc.status === 'Final' 
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}>
                                            {doc.status}
                                        </span>
                                    </div>
                                    
                                    <div className="col-span-2 flex flex-wrap gap-1">
                                        {doc.metadata.taxYear && (
                                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold border border-indigo-100 truncate">
                                                {doc.metadata.taxYear}
                                            </span>
                                        )}
                                        {selectedCategory === 'All' && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200 truncate">
                                                {doc.category}
                                            </span>
                                        )}
                                    </div>
                                    
                                    <div className="col-span-1 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors" title="Download">
                                            <Download size={16} />
                                        </button>
                                        {!(doc.metadata?.isImmutable || false) && (
                                            <button 
                                                onClick={async () => {
                                                    await deleteDocument(doc.id, client.id);
                                                }}
                                                className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showUpload && <DocumentUploadModal
                category={selectedCategory !== 'All' ? selectedCategory : undefined}
                clientId={client.id}
                onClose={() => setShowUpload(false)}
                onUpload={handleUpload}
            />}
        </div>
    );
}
