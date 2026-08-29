import React, { useState } from 'react';
import { entityKey, ENTITY_META, EntityKey } from '../../lib/entityType';
import { User, MapPin, Phone, Mail, Building2, Ticket, Pencil, Plus, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { mutate } from 'swr';
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

/**
 * ── UTR ──────────────────────────────────────────────────────────────────────
 * Exactly ten digits. Checked against production before being written: all 18
 * UTRs currently stored in client_manager.clients match `^[0-9]{10}$` and none
 * has any other shape, so this rejects nothing that already exists.
 *
 * ⚠️ NOT check-digit validated. A UTR's first digit IS a checksum over the
 * other nine, but a client record has to be able to hold what the client
 * actually gave us — a number that fails the checksum is far more likely to be
 * a real transcription of a real letter than an invented one, and refusing it
 * here would leave staff with nowhere to put it.
 */
const UTR_RE = /^\d{10}$/;

function validateUtr(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;                       // empty clears
  if (!UTR_RE.test(v)) return 'A UTR is exactly 10 digits.';
  return null;
}

const readUtr = (c: any): string =>
  c?.utr && c.utr !== 'undefined' ? String(c.utr) : '';
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
    const [utr, setUtr] = useState('');
    const [errUtr, setErrUtr] = useState<string | null>(null);
    /** Set once a UTR change has been shown to the user; a second Save commits it. */
    const [confirmUtr, setConfirmUtr] = useState(false);
    const [savingD, setSavingD] = useState(false);
    const [errorD, setErrorD] = useState<string | null>(null);

    /**
     * ── THE SAVED VALUE IS WRITTEN INTO THE SWR CACHE, NOT A LOCAL OVERLAY ───
     *
     * ⚠️ THIS REPLACES the keyed local overlay the company-number field used.
     * That overlay could only ever repaint THIS card. The identity chip in the
     * page header — `client.utr ? UTR : CRN` at ClientDetailPage.tsx:147 — is a
     * sibling component reading the same SWR entry, and a local overlay cannot
     * reach it. Saving a UTR and watching the header still show the old one is
     * the same "did that work?" moment the overlay existed to prevent.
     *
     * Writing the accepted values into the shared cache repaints BOTH
     * immediately. `onSaved` then revalidates, and the server stays
     * authoritative. Keying by client id is no longer needed: the cache entry
     * IS keyed by client id.
     */
    const cacheKey = `/brain/clients/${id}`;

    const startEditD = () => {
        setLegalName(client.legalName || ''); setEntity(entityKey(client.entityType));
        setLine1(client.address?.line1 || ''); setLine2(client.address?.line2 || '');
        setCity(client.address?.town || ''); setPostcode(client.address?.postcode || '');
        setCompanyNumber(readCrn(client));
        setUtr(readUtr(client));
        setErrorD(null); setErrCrn(null); setErrUtr(null); setConfirmUtr(false); setEditD(true);
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
        const utrErr = validateUtr(utr);
        setErrUtr(utrErr);
        if (utrErr) { setErrorD(null); return; }

        const crn = companyNumber.trim().toUpperCase();
        const nextUtr = utr.trim();
        const prevUtr = readUtr(client);

        /**
         * ⛔ ONE EXTRA CLICK WHEN AN EXISTING UTR IS BEING REPLACED.
         *
         * A UTR is how HMRC matches this client to a record. Overwriting one
         * that is already there is not the same act as filling in a blank, and
         * this practice has mis-filed against a wrong UTR before — so the
         * REPLACE case gets a deliberate second press and the other cases do
         * not. Adding a first UTR, or clearing one, saves on the first click.
         *
         * Not a modal: a dialog here trains people to dismiss dialogs. The
         * button changes what it says and waits.
         */
        if (prevUtr && nextUtr && prevUtr !== nextUtr && !confirmUtr) {
            setConfirmUtr(true);
            setErrorD(null);
            return;
        }

        setSavingD(true); setErrorD(null);
        try {
            await NextGenAPI.patch(`/brain/clients/${id}`, {
                legal_name: legalName.trim(), entity_type: entity,
                company_number: crn,
                utr: nextUtr,
                address_line1: line1.trim(), address_line2: line2.trim(), city: city.trim(), postcode: postcode.trim(),
            });
            /**
             * Repaint the header chip and this card at once. `revalidate: false`
             * because onSaved fires the refetch a line later — without it the
             * same GET runs twice for one save.
             *
             * BOTH spellings of the company number are written: the API returns
             * `companyNumber` (mapped) while the raw row is spread into the same
             * object as `company_number`, and readers exist for each.
             */
            await mutate(
                cacheKey,
                (cur: any) => (cur ? { ...cur, utr: nextUtr || null, companyNumber: crn || null, company_number: crn || null } : cur),
                { revalidate: false },
            );
            setConfirmUtr(false);
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
                    <span className="text-slate-500 text-xs block">Reference</span>
                    {editD ? (
                        <div className="space-y-2 mt-1">
                            <div>
                                <label className="text-[11px] text-slate-400 block mb-0.5">Company number</label>
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
                            <div>
                                <label className="text-[11px] text-slate-400 block mb-0.5">UTR</label>
                                <input
                                    value={utr}
                                    onChange={(e) => {
                                        setUtr(e.target.value);
                                        if (errUtr) setErrUtr(null);
                                        // Editing again withdraws the confirmation — the value the
                                        // user agreed to save is no longer the value in the box.
                                        if (confirmUtr) setConfirmUtr(false);
                                    }}
                                    placeholder="10 digits"
                                    inputMode="numeric"
                                    className={inputCls}
                                    spellCheck={false}
                                />
                                {errUtr && <p className="mt-1 text-[11px] text-red-600">{errUtr}</p>}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Ticket size={14} className="text-slate-400" />
                            <span className="font-mono text-slate-700">{client.utr || readCrn(client) || 'N/A'}</span>
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
                        <button
                            onClick={saveDetails}
                            disabled={savingD}
                            className={`text-xs font-bold text-white px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1 ${confirmUtr ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {savingD ? <Loader2 size={12} className="animate-spin" /> : confirmUtr ? <AlertTriangle size={12} /> : <Check size={12} />}
                            {confirmUtr ? 'Save anyway' : 'Save details'}
                        </button>
                        <button onClick={() => { setEditD(false); setErrorD(null); setConfirmUtr(false); }} className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1"><X size={12} /> Cancel</button>
                        {confirmUtr && <p className="text-xs text-amber-700 font-medium">Changing UTR affects HMRC matching — save anyway?</p>}
                        {errorD && <p className="text-xs text-red-600">{errorD}</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
