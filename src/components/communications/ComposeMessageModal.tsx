import React, { useState } from 'react';
import { X, Send, Lock, Mail, Paperclip, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { Communication, MessageType, EMAIL_TEMPLATES } from '../../types/CommunicationTypes';

interface Props {
    onClose: () => void;
    onSend: (msg: Communication) => void | Promise<void>;
    clientName: string;
}

export function ComposeMessageModal({ onClose, onSend, clientName }: Props) {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [type, setType] = useState<MessageType>('Email');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const applyTemplate = (templateId: string) => {
        const template = EMAIL_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setSubject(template.subjectTemplate.replace('{{clientName}}', clientName));
            setBody(template.bodyTemplate.replace('{{clientName}}', clientName).replace('{{agentName}}', 'Accountant Name'));
            setSelectedTemplateId(templateId);
        }
    };

    const handleSend = async () => {
        const newMessage: Communication = {
            id: Date.now().toString(),
            subject,
            body,
            type,
            direction: 'Outbound',
            status: 'Sent',
            timestamp: new Date().toISOString(),
            recipient: clientName,
            sender: 'Me'
        };
        setSending(true);
        setError(null);
        try {
            await onSend(newMessage);
        } catch (err: any) {
            setError(err?.error || err?.message || 'Failed to send message. Please try again.');
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-fadeIn flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                        {type === 'SecureMessage' ? <Lock size={18} className="text-emerald-600" /> : <Mail size={18} className="text-blue-600" />}
                        Compose {type === 'SecureMessage' ? 'Secure Message' : 'Email'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    
                    {/* Channel Selector */}
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                            type === 'Email' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}>
                            <input type="radio" name="type" className="hidden" checked={type === 'Email'} onChange={() => setType('Email')} />
                            <Mail size={18} /> Email
                        </label>
                        <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${
                            type === 'SecureMessage' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}>
                            <input type="radio" name="type" className="hidden" checked={type === 'SecureMessage'} onChange={() => setType('SecureMessage')} />
                            <Lock size={18} /> Secure Portal Message
                        </label>
                    </div>

                    {/* Template Selector */}
                    <div className="relative">
                        <select 
                            value={selectedTemplateId} 
                            onChange={(e) => applyTemplate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
                        >
                            <option value="">Select a template...</option>
                            {EMAIL_TEMPLATES.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                    </div>

                    {/* Subject */}
                    <div>
                         <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Subject</label>
                         <input 
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:font-normal"
                            placeholder="Enter subject line..."
                        />
                    </div>

                    {/* Rich Editor Stub */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block mb-1">Message</label>
                        <textarea 
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            className="w-full flex-1 min-h-[200px] p-4 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none font-sans"
                            placeholder="Type your message here..."
                        ></textarea>
                    </div>

                     {/* Attachments Stub */}
                     <div className="flex items-center gap-2 text-sm text-slate-500">
                        <button className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                            <Paperclip size={16} /> Attach Files
                        </button>
                     </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 bg-slate-50">
                    {error && (
                        <div className="px-4 pt-3 flex items-start gap-2 text-sm text-red-700">
                            <AlertCircle size={16} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    <div className="p-4 flex justify-end gap-3">
                        <button onClick={onClose} disabled={sending} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg transition-colors disabled:opacity-50">Discard</button>
                        <button
                            onClick={handleSend}
                            disabled={!subject || !body || sending}
                            className={`px-6 py-2 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all ${
                                 !subject || !body || sending ? 'bg-slate-300 cursor-not-allowed' :
                                 type === 'SecureMessage' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                        >
                            {sending
                                ? <><Loader2 size={16} className="animate-spin" /> Sending…</>
                                : <><Send size={16} /> Send {type === 'SecureMessage' ? 'Securely' : 'Email'}</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
