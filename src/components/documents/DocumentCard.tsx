import React from 'react';
import { FileText, Image, MoreVertical, Calendar, Building2, Eye, ShieldCheck } from 'lucide-react';

export interface Document {
    id: number;
    type: 'pdf' | 'img' | 'sheet';
    name: string;
    date: string;
    size: string;
    context?: string; // e.g. "ABC Ltd - 2024 CT"
    category: 'Evidence' | 'Correspondence' | 'Report';
    previewUrl?: string; // For OCR thumbnail
}

interface DocumentCardProps {
    doc: Document;
    viewMode: 'grid' | 'list';
}

export function DocumentCard({ doc, viewMode }: DocumentCardProps) {
    if (viewMode === 'list') {
        return (
            <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    doc.type === 'pdf' ? 'bg-red-50 text-red-600' : 
                    doc.type === 'sheet' ? 'bg-green-50 text-green-600' : 
                    'bg-blue-50 text-blue-600'
                }`}>
                    {doc.type === 'img' ? <Image size={20} /> : <FileText size={20} />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{doc.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="flex items-center gap-1">
                            <Calendar size={12} /> {doc.date}
                        </span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        {doc.context && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    <Building2 size={10} /> {doc.context}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded border ${
                        doc.category === 'Evidence' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                        doc.category === 'Report' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                        'bg-blue-50 text-blue-700 border-blue-100'
                    }`}>
                        {doc.category}
                    </span>
                    <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <MoreVertical size={16} />
                    </button>
                </div>
            </div>
        );
    }

    // Grid View
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group cursor-pointer relative overflow-hidden flex flex-col h-full">
            {/* OCR Preview Area */}
            <div className="h-40 bg-slate-100 relative items-center justify-center flex border-b border-slate-100 group-hover:opacity-90 transition-opacity">
                {doc.previewUrl ? (
                    <img src={doc.previewUrl} alt={doc.name} className="w-full h-full object-cover" />
                ) : (
                    <div className={`p-4 rounded-full ${
                         doc.type === 'pdf' ? 'bg-red-100 text-red-500' : 
                         doc.type === 'sheet' ? 'bg-green-100 text-green-500' : 
                         'bg-blue-100 text-blue-500'
                    }`}>
                        {doc.type === 'img' ? <Image size={32} /> : <FileText size={32} />}
                    </div>
                )}
                
                {/* Overlay Action */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg backdrop-blur-sm transition-colors">
                        <Eye size={20} />
                    </button>
                </div>

                {/* Evidence Badge */}
                {doc.category === 'Evidence' && (
                    <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                        <ShieldCheck size={10} /> EVIDENCE
                    </div>
                )}
            </div>

            <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-start justify-between mb-2">
                    <div className={`p-1.5 rounded ${
                        doc.type === 'pdf' ? 'bg-red-50 text-red-600' : 
                        doc.type === 'sheet' ? 'bg-green-50 text-green-600' : 
                        'bg-blue-50 text-blue-600'
                    }`}>
                        {doc.type === 'img' ? <Image size={14} /> : <FileText size={14} />}
                    </div>
                    <button className="text-slate-300 hover:text-slate-600">
                        <MoreVertical size={16} />
                    </button>
                </div>
                
                <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate" title={doc.name}>{doc.name}</h3>
                
                <div className="mt-auto pt-3 border-t border-slate-50 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{doc.size}</span>
                        <span>{doc.date}</span>
                    </div>
                    {doc.context && (
                        <div className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded truncate flex items-center gap-1.5">
                            <Building2 size={10} /> {doc.context}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
