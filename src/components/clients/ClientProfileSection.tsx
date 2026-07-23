import React, { useState } from 'react';
import { User, MapPin, Phone, Mail, Building2, Ticket, Pencil, Plus, Check, X, Loader2 } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClientProfileSection({ client, clientId, onSaved }: { client: any; clientId?: string; onSaved?: () => void }) {
    if (!client) return null;
    const id = clientId || client.id;

    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(client.contactName || '');
    const [email, setEmail] = useState(client.email || '');
    const [phone, setPhone] = useState(client.phone || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hasContact = !!(client.email || client.phone);

    const save = async () => {
        if (!EMAIL_RE.test(email.trim())) { setError('Enter a valid email address.'); return; }
        setSaving(true); setError(null);
        try {
            const res = await NextGenAPI.post(`/brain/clients/${id}/primary-contact`, { email: email.trim(), name: name.trim() || undefined, phone: phone.trim() || undefined });
            setEditing(false);
            onSaved?.();
            const unblocked = res.data?.data?.unblocked ?? 0;
            if (unblocked > 0) console.info(`[profile] contact added — unblocked ${unblocked} reminder(s)`);
        } catch (e: any) {
            setError(e?.response?.data?.error || 'Could not save the contact.');
        } finally { setSaving(false); }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-500" />
                Client Profile
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Legal Name</span>
                    <span className="font-medium text-slate-900">{client.legalName}</span>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Entity Type</span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium text-xs">
                        {client.entityType === 'Company' ? <Building2 size={12} /> : <User size={12} />}
                        {client.entityType}
                    </span>
                </div>

                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Reference</span>
                    <div className="flex items-center gap-2">
                        <Ticket size={14} className="text-slate-400" />
                        <span className="font-mono text-slate-700">{client.utr || (client.companyNumber !== 'undefined' ? client.companyNumber : null) || 'N/A'}</span>
                    </div>
                </div>

                {/* Contact — editable (Phase 1: add/edit the primary contact + unblock reminders) */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs block">Contact</span>
                        {!editing && (
                            <button onClick={() => { setEditing(true); setName(client.contactName || ''); setEmail(client.email || ''); setPhone(client.phone || ''); setError(null); }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                {hasContact ? <><Pencil size={12} /> Edit</> : <><Plus size={12} /> Add contact</>}
                            </button>
                        )}
                    </div>

                    {editing ? (
                        <div className="space-y-2 mt-1">
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name (optional)"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)"
                                className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                            {error && <p className="text-xs text-red-600">{error}</p>}
                            <div className="flex items-center gap-2">
                                <button onClick={save} disabled={saving} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">
                                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                                </button>
                                <button onClick={() => { setEditing(false); setError(null); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1"><X size={12} /> Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0.5">
                            {client.email && <div className="flex items-center gap-2 text-slate-600"><Mail size={14} /> {client.email}</div>}
                            {client.phone && <div className="flex items-center gap-2 text-slate-600"><Phone size={14} /> {client.phone}</div>}
                            {!hasContact && <span className="text-slate-400">No contact email — add one to reach this client</span>}
                        </div>
                    )}
                </div>

                <div className="col-span-1 md:col-span-2 space-y-1 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 text-xs block">Address</span>
                    <div className="flex items-start gap-2 text-slate-600">
                        <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                        <span>
                            {client.address
                                ? <>
                                    {[client.address.line1, client.address.line2, client.address.town].filter(Boolean).join(', ')}
                                    {client.address.postcode && <>
                                        {[client.address.line1, client.address.line2, client.address.town].filter(Boolean).length > 0 ? ' ' : ''}
                                        <span className="font-medium text-slate-900">{client.address.postcode}</span>
                                    </>}
                                  </>
                                : <span className="text-slate-400">Not provided</span>}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
