import React, { useState } from 'react';
import { MessageSquare, Plus, Loader2 } from 'lucide-react';
import { Communication } from '../../types/CommunicationTypes';
import { MessageTimelineItem } from '../communications/MessageTimelineItem';
import { ComposeMessageModal } from '../communications/ComposeMessageModal';
import { useCommunications, sendCommunication } from '../../hooks/useCommunications';

export function ClientCommunicationsTab({ client }: { client: any }) {
    const [showCompose, setShowCompose] = useState(false);
    const { messages, isLoading, mutate } = useCommunications(client.id);

    // Returns a promise so the compose modal can surface inline errors / spinner.
    const handleSend = async (newMsg: Communication) => {
        await sendCommunication(newMsg, client.id);
        await mutate();
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

            <div className="flex-1 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        <Loader2 className="animate-spin mr-2" size={18} /> Loading communications…
                    </div>
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            <MessageSquare size={28} className="text-slate-300" />
                        </div>
                        <p className="font-semibold text-slate-700 mb-1">No communications yet</p>
                        <p className="text-sm text-slate-400 mb-4">Emails and secure messages with this client will appear here.</p>
                        <button
                            onClick={() => setShowCompose(true)}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Compose your first message
                        </button>
                    </div>
                ) : (
                    <div className="pl-4 pt-2">
                        {messages.map(msg => (
                            <MessageTimelineItem key={msg.id} message={msg} />
                        ))}
                    </div>
                )}
            </div>

            {showCompose && <ComposeMessageModal
                clientName={client.legalName || client.name || 'Client Contact'}
                onClose={() => setShowCompose(false)}
                onSend={handleSend}
            />}
        </div>
    );
}
