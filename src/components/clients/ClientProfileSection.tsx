import React, { useState } from 'react';
import { entityKey, ENTITY_META, EntityKey } from '../../lib/entityType';
import { User, MapPin, Phone, Mail, Building2, Ticket, Pencil, Plus, Check, X, Loader2 } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ── COMPANY NUMBER ───────────────────────────────────────────────────────────
 * Eight digits (England & Wales), or two letters and six digits (SC…, NI…, OC…).
 * Ported from the NextGen app's DetailsTab, deliberately unchanged: two apps
 * writing the SAME column through the SAME endpoint must not disagree about
 * what is acceptable.
 *
 * The message says "doesn't look like" and not "is invalid" — Companies House
 * has issued prefixes this pattern does not know, and a client record is not
 * the place to refuse a number that exists.
 */
const CRN_RE = /^(?:\d{8}|[A-Z]{2}\d{6})$/;

/** Error string, or null when acceptable. EMPTY IS ACCEPTABLE — it clears the field. */
function validateCrn(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  if (!CRN_RE.test(v)) {
    return "That doesn't look like a company number — 8 digits, or 2 letters and 6 digits.";
  }
  return null;
}

/**
 * ⚠️ THE STRING "undefined" IS A REAL VALUE IN THIS COLUMN. Some rows were
 * written with a stringified undefined, so a bare truthiness test renders the
 * word "undefined" as if it were a company number. Every reader here goes
 * through this function.
 */
const readCrn = (c: any): string =>
  c?.companyNumber && c.companyNumber !== 'undefined' ? String(c.companyNumber) : '';
const inputCls = 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

export function ClientProfileSection({ client, clientId, onSaved }: { client: any; clientId?: string; onSaved?: () => void }) {
    if (!client) return null;
    const id = clientId || client.id;

    // ── Phase 1: Contact (primary contact + reminder unblock) ──────────────────
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(client.contactName || '');
    const [email, setEmail] = useState(client.email || '');
    const [phone, setPhone] = useState(client.phone || '');
    const [savingC, setSavingC] = useState(false);
    const [errorC, setErrorC] = useState<string | null>(null);
    const hasContact = !!(client.email || client.phone);

    const saveContact = async () => {
        // ⛔ NAME IS REQUIRED, AND THE PLACEHOLDER USED TO SAY "(optional)".
        // client_manager.contacts.name is NOT NULL with no default, and
        // setPrimaryContact's INSERT branch passes `input.name?.trim() || null`
        // straight through — so a blank name on a client with NO existing
        // contact is a 23502 from Postgres, surfaced as an unexplained 500.
        // The UPDATE branch coalesces to the stored name, which is why EDITING a
        // contact worked and ADDING one never did.
        //
        // The form is what was wrong: it promised optional and the column
        // refuses null. Not fixed by making the column nullable (a migration
        // touching every other writer) nor by defaulting to the legal name
        // (which invents a person's name from a company's).
        if (!name.trim()) { setErrorC('Contact name is required.'); return; }
        if (!EMAIL_RE.test(email.trim())) { setErrorC('Enter a valid email address.'); return; }
        setSavingC(true); setErrorC(null);
        try {
            await NextGenAPI.post(`/brain/clients/${id}/primary-contact`, { email: email.trim(), name: name.trim(), phone: phone.trim() || undefined });
            setEditing(false); onSaved?.();
        } catch (e: any) { setErrorC(e?.response?.data?.error || 'Could not save the contact.'); } finally { setSavingC(false); }
    };

    // ── Phase 2: details (legal name, entity type, address) via PATCH /clients/:id
    const [editD, setEditD] = useState(false);
    const [legalName, setLegalName] = useState(client.legalName || '');
    const [entity, setEntity] = useState<EntityKey>(entityKey(client.entityType));
    const [line1, setLine1] = useState(client.address?.line1 || '');
    const [line2, setLine2] = useState(client.address?.line2 || '');
    const [city, setCity] = useState(client.address?.town || '');
    const [postcode, setPostcode] = useState(client.address?.postcode || '');
    const [companyNumber, setCompanyNumber] = useState('');
    const [errCrn, setErrCrn] = useState<string | null>(null);
    const [savingD, setSavingD] = useState(false);
    const [errorD, setErrorD] = useState<string | null>(null);

    /**
     * ── WHY AN OVERLAY, WHEN onSaved ALREADY REVALIDATES ─────────────────────
     * onSaved fires SWR's mutate (ClientDetailPage.tsx:250), so the value does
     * come back — after a round trip. Until it lands the card would show the
     * OLD number with the edit form already closed, which reads as "the save
     * didn't work". The overlay shows the accepted value immediately; the
     * refetch remains authoritative.
     *
     * ⚠️ KEYED BY CLIENT ID. This component is not remounted on every route
     * change, so an unkeyed overlay would show one client's number on the next
     * client's card.
     */
    const [savedCrn, setSavedCrn] = useState<{ id: string; value: string } | null>(null);
    const crnValue = savedCrn && savedCrn.id === id ? savedCrn.value : readCrn(client);

    const startEditD = () => {
        setLegalName(client.legalName || ''); setEntity(entityKey(client.entityType));
        setLine1(client.address?.line1 || ''); setLine2(client.address?.line2 || '');
        setCity(client.address?.town || ''); setPostcode(client.address?.postcode || '');
        setCompanyNumber(crnValue);
        setErrorD(null); setErrCrn(null); setEditD(true);
    };
    const saveDetails = async () => {
        if (!legalName.trim()) { setErrorD('Legal name is required.'); return; }
        const crnErr = validateCrn(companyNumber);
        setErrCrn(crnErr);
        if (crnErr) { setErrorD(null); return; }
        /**
         * ⛔ THREE NAMES, ONE FACT — and they are not interchangeable.
         *   send   `company_number`  (snake_case; the PATCH allow-list at
         *                             routes/brain.ts:1493 accepts nothing else)
         *   read   `client.companyNumber`  (GET /brain/clients/:id maps it)
         *   and the OTHER route aliases it `AS crn` (routes/clients.ts:77)
         * Sending `companyNumber` here is silently dropped by the allow-list —
         * a save that reports success and changes nothing.
         */
        const crn = companyNumber.trim().toUpperCase();
        setSavingD(true); setErrorD(null);
        try {
            await NextGenAPI.patch(`/brain/clients/${id}`, {
                legal_name: legalName.trim(), entity_type: entity,
                company_number: crn,
                address_line1: line1.trim(), address_line2: line2.trim(), city: city.trim(), postcode: postcode.trim(),
            });
            setSavedCrn({ id, value: crn });
            setEditD(false); onSaved?.();
        } catch (e: any) { setErrorD(e?.response?.data?.error || 'Could not save.'); } finally { setSavingD(false); }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2"><User size={20} className="text-blue-500" /> Client Profile</h3>
                {!editD && <button onClick={startEditD} className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Pencil size={12} /> Edit details</button>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Legal Name</span>
                    {editD ? <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} />
                        : <span className="font-medium text-slate-900">{client.legalName}</span>}
                </div>

                <div className="space-y-1">
                    <span className="text-slate-500 text-xs block">Entity Type</span>
                    {editD ? (
                        <select value={entity} onChange={(e) => setEntity(e.target.value as EntityKey)} className={inputCls}>
                            {(Object.keys(ENTITY_META) as EntityKey[]).map((k) => <option key={k} value={k}>{ENTITY_META[k].label}</option>)}
                        </select>
                    ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-medium text-xs">
                            {client.entityType === 'Company' ? <Building2 size={12} /> : <User size={12} />}{client.entityType}
                        </span>
                    )}
                </div>

                <div className="space-y-1">
                    {/* Viewing shows the REFERENCE (UTR first, else the company
                        number). Editing shows the company number, because that is
                        the only one of the two this form writes — a field labelled
                        "Reference" with a UTR in it and a CRN input under it would
                        be two facts in one box. */}
                    <span className="text-slate-500 text-xs block">{editD ? 'Company number' : 'Reference'}</span>
                    {editD ? (
                        <div>
                            <input
                                value={companyNumber}
                                onChange={(e) => { setCompanyNumber(e.target.value); if (errCrn) setErrCrn(null); }}
                                placeholder="e.g. 16170908 or SC123456"
                                className={inputCls}
                                autoCapitalize="characters"
                                spellCheck={false}
                            />
                            {errCrn && <p className="mt-1 text-[11px] text-red-600">{errCrn}</p>}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Ticket size={14} className="text-slate-400" />
                            <span className="font-mono text-slate-700">{client.utr || crnValue || 'N/A'}</span>
                        </div>
                    )}
                </div>

                {/* Contact — Phase 1 inline (primary contact + reminder unblock) */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs block">Contact</span>
                        {!editing && (
                            <button onClick={() => { setEditing(true); setName(client.contactName || ''); setEmail(client.email || ''); setPhone(client.phone || ''); setErrorC(null); }}
                                className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                                {hasContact ? <><Pencil size={12} /> Edit</> : <><Plus size={12} /> Add contact</>}
                            </button>
                        )}
                    </div>
                    {editing ? (
                        <div className="space-y-2 mt-1">
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contact name" className={inputCls} />
                            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" type="email" className={inputCls} />
                            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className={inputCls} />
                            {errorC && <p className="text-xs text-red-600">{errorC}</p>}
                            <div className="flex items-center gap-2">
                                <button onClick={saveContact} disabled={savingC} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">{savingC ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save</button>
                                <button onClick={() => { setEditing(false); setErrorC(null); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1"><X size={12} /> Cancel</button>
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
                    {editD ? (
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address line 1" className={inputCls} />
                            <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder="Address line 2" className={inputCls} />
                            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / town" className={inputCls} />
                            <input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Postcode" className={inputCls} />
                        </div>
                    ) : (
                        <div className="flex items-start gap-2 text-slate-600">
                            <MapPin size={14} className="mt-0.5 flex-shrink-0" />
                            <span>
                                {client.address
                                    ? <>{[client.address.line1, client.address.line2, client.address.town].filter(Boolean).join(', ')}
                                        {client.address.postcode && <>{[client.address.line1, client.address.line2, client.address.town].filter(Boolean).length > 0 ? ' ' : ''}<span className="font-medium text-slate-900">{client.address.postcode}</span></>}</>
                                    : <span className="text-slate-400">Not provided</span>}
                            </span>
                        </div>
                    )}
                </div>

                {editD && (
                    <div className="col-span-1 md:col-span-2 flex items-center gap-2 pt-1">
                        <button onClick={saveDetails} disabled={savingD} className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">{savingD ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save details</button>
                        <button onClick={() => { setEditD(false); setErrorD(null); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1"><X size={12} /> Cancel</button>
                        {errorD && <p className="text-xs text-red-600">{errorD}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
