import React, { useState } from 'react';
import { Upload, Search, LayoutGrid, List as ListIcon, Filter } from 'lucide-react';
import { DocumentCard, Document } from '../components/documents/DocumentCard';
import { useDocuments } from '../hooks/useDocuments';

export function DocumentsPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [dragActive, setDragActive] = useState(false);

    // Live SWR Hook mapping
    const { documents, isLoading } = useDocuments();
    const items = isLoading ? [] : documents;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        // Handle file upload logic here
        console.log("Files dropped:", e.dataTransfer.files);
    };

    return (
        <div 
            className="space-y-6 h-[calc(100vh-120px)] flex flex-col relative"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
             {/* Drag Overlay */}
             {dragActive && (
                <div className="absolute inset-0 bg-blue-50/90 border-4 border-blue-500 border-dashed rounded-xl z-50 flex flex-col items-center justify-center text-blue-600 animate-fadeIn pointer-events-none">
                    <Upload size={64} className="mb-4 animate-bounce" />
                    <h2 className="text-2xl font-bold">Drop files to upload</h2>
                    <p className="font-medium">They will be added to the vault</p>
                </div>
            )}

             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
                    <p className="text-slate-500 mt-1">Secure storage for client records and permanent files.</p>
                </div>
                <div className="flex items-center gap-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Search documents..." 
                            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 w-64 shadow-sm"
                        />
                    </div>
                    
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm ml-2">
                        <Upload size={18} /> Upload
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 pb-4 border-b border-slate-200 overflow-x-auto">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-medium shadow-sm">
                    All Files
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors">
                    <Filter size={14} /> Evidence
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors">
                    <Filter size={14} /> Correspondence
                </button>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-sm font-medium hover:border-slate-300 transition-colors">
                    <Filter size={14} /> Reports
                </button>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto pr-2 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6' : 'flex flex-col gap-3'}`}>
                {items.map((doc: any) => (
                    <DocumentCard key={doc.id} doc={doc} viewMode={viewMode} />
                ))}
                
                {/* Add New Placeholder (Grid Only) */}
                {viewMode === 'grid' && (
                    <div className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-blue-500 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer min-h-[220px]">
                        <Upload size={32} className="mb-2" />
                        <span className="font-medium">Upload File</span>
                    </div>
                )}
            </div>
        </div>
    );
}
