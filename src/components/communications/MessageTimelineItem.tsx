import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Eye, CheckCircle2, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { Communication, MessageType } from '../../types/CommunicationTypes';

export function MessageTimelineItem({ message }: { message: Communication }) {
    const [isExpanded, setIsExpanded] = useState(false);

    const isSecure = message.type === 'SecureMessage';
    const isInbound = message.direction === 'Inbound';

    return (
        <div className={`relative pl-8 pb-8 border-l-2 ${isSecure ? 'border-emerald-100' : 'border-blue-100'} last:border-l-0 last:pb-0`}>
             {/* Timeline Dot */}
             <div className={`absolute -left-[11px] top-0 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${
                isSecure ? 'border-emerald-500 text-emerald-500' : 'border-blue-500 text-blue-500'
             }`}>
                {isSecure ? <Lock size={10} /> : <Mail size={10} />}
             </div>

             <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                {/* Header */}
                <div 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-4 cursor-pointer flex items-start justify-between bg-slate-50/50 hover:bg-white transition-colors"
                >
                    <div className="flex gap-3">
                        <div className={`p-2 rounded-lg ${isSecure ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {isSecure ? <MessageSquare size={18} /> : <Mail size={18} />}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-900 leading-tight">{message.subject}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                <span className="font-medium">{isInbound ? message.sender : `To: ${message.recipient}`}</span>
                                <span>•</span>
                                <span>{new Date(message.timestamp).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-slate-100 text-slate-600">
                             {message.status === 'Sent' && <Send size={12} />}
                             {message.status === 'Read' && <Eye size={12} className="text-blue-500" />}
                             {message.status === 'Delivered' && <CheckCircle2 size={12} className="text-slate-400" />}
                             <span>{message.status}</span>
                        </div>
                        <button className="text-slate-400 hover:text-slate-600">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Expanded Body */}
                {isExpanded && (
                    <div className="p-4 border-t border-slate-100 bg-white animate-fadeIn">
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                            {message.body}
                        </div>
                        {isSecure && (
                            <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 p-2 rounded border border-emerald-100">
                                <Lock size={12} />
                                This message was sent via the Client Portal. E2E Encrypted.
                            </div>
                        )}
                    </div>
                )}
             </div>
        </div>
    );
}
