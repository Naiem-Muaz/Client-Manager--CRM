import React, { useState } from 'react';
import { Mail, MessageSquare, Send, Calendar, Plus } from 'lucide-react';
import { Communication } from '../../types/CommunicationTypes';
import { MessageTimelineItem } from '../communications/MessageTimelineItem';
import { ComposeMessageModal } from '../communications/ComposeMessageModal';

export function ClientCommunicationsTab({ client }: { client: any }) {
    const [showCompose, setShowCompose] = useState(false);
    const [messages, setMessages] = useState<Communication[]>([
        { 
            id: '1', subject: 'Tax Return Approval Required', body: 'Please review the attached CT600 form for the period ending 31 Mar 2024.\n\nKind regards,\nYour Accountant', 
            type: 'Email', direction: 'Outbound', status: 'Read', timestamp: new Date(Date.now() - 86400000).toISOString(), recipient: client.name 
        },
        { 
            id: '2', subject: 'Payment Reminder: VAT Quarter 3', body: 'This is a reminder that your VAT payment is due soon.', 
            type: 'Email', direction: 'Outbound', status: 'Delivered', timestamp: new Date(Date.now() - 250000000).toISOString(), recipient: client.name 
        },
        { 
            id: '3', subject: 'Question re: Expenses', body: 'Hi, I have a question about the travel expenses...', 
            type: 'SecureMessage', direction: 'Inbound', status: 'Read', timestamp: new Date(Date.now() - 500000000).toISOString(), sender: client.name 
        },
    ]);

    const handleSend = (newMsg: Communication) => {
        setMessages(prev => [newMsg, ...prev]);
        setShowCompose(false);
    };

    return (
        <div className="h-[600px] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-bold text-slate-900">Communication Log</h2>
                    <p className="text-sm text-slate-500">Track emails and secure messages.</p>
                </div>
                <button 
                    onClick={() => setShowCompose(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors shadow-sm font-medium"
                >
                    <Plus size={16} />
                    Compose Message
                </button>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* Timeline Feed */}
                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="pl-4 pt-2">
                        {messages.map(msg => (
                            <MessageTimelineItem key={msg.id} message={msg} />
                        ))}
                    </div>
                </div>

                {/* Sidebar Stats */}
                <div className="w-80 flex-shrink-0 space-y-4">
                     <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-blue-100">
                         <h3 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                             <Calendar size={18} /> Next Automated Email
                         </h3>
                         <p className="text-sm text-indigo-800 opacity-80 mb-4">
                             Scheduled for <strong>Feb 14, 2026</strong>: VAT Period End Reminder.
                         </p>
                         <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-wide">View Schedule &rarr;</button>
                     </div>
                     
                     <div className="bg-emerald-50 rounded-xl p-6 border border-emerald-100">
                         <h3 className="font-bold text-emerald-900 mb-2 flex items-center gap-2">
                             <MessageSquare size={18} /> Client Portal
                         </h3>
                         <p className="text-sm text-emerald-800 opacity-80 mb-4">
                             Client has active access since Dec 2024. Last login was 2 days ago.
                         </p>
                         <button className="text-xs font-bold text-emerald-600 hover:text-emerald-800 uppercase tracking-wide">Manage Access &rarr;</button>
                     </div>
                </div>
            </div>

            {showCompose && <ComposeMessageModal 
                clientName={client.name || 'Client Contact'} 
                onClose={() => setShowCompose(false)} 
                onSend={handleSend} 
            />}
        </div>
    );
}
