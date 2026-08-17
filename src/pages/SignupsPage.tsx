import React, { useMemo, useState } from 'react';
import { UserPlus, Loader2, Mail, Phone, RefreshCw, Save } from 'lucide-react';
import { useSignups, updateSignup, SignupRow, SignupStatus } from '../hooks/useSignups';

// Website signup leads. Moved here from NextGen (founder's ruling 2026-08-17)
// so marketing/sales staff handle the whole prospect-to-client journey in one
// tool. Data lives in client_manager.pending_signups; this page reads and
// updates it through the orchestrator's staff routes.

const STATUSES: SignupStatus[] = ['pending', 'contacted', 'converted', 'rejected'];

const STATUS_STYLES: Record<SignupStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    contacted: 'bg-blue-100 text-blue-800',
    converted: 'bg-green-100 text-green-800',
    rejected: 'bg-slate-200 text-slate-600',
};

/** "sole_trader_starter" → "Sole Trader Starter". A mechanical prettifier,
 *  NOT a plan catalogue — the catalogue's one home is the monorepo's plans.ts,
 *  and duplicating names here is how two homes drift. Unknown ids stay
 *  readable instead of becoming "Unknown plan". */
const prettyPlan = (id: string | null) =>
    id ? id.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—';

const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

function SignupCard({ signup }: { signup: SignupRow }) {
    const [saving, setSaving] = useState<string | null>(null);
    const [notes, setNotes] = useState(signup.notes ?? '');
    const [notesDirty, setNotesDirty] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const act = async (patch: { status?: SignupStatus; notes?: string }, key: string) => {
        setSaving(key);
        setError(null);
        try {
            await updateSignup(signup.id, patch);
            if (patch.notes !== undefined) setNotesDirty(false);
        } catch (e: any) {
            setError(e?.error || e?.message || 'Update failed — nothing was saved.');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="font-semibold text-slate-900">{signup.name || '(no name)'}</p>
                    <p className="text-xs text-slate-500">
                        {signup.business_name || '—'}
                        {signup.business_type ? ` · ${signup.business_type}` : ''}
                    </p>
                </div>
                <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLES[signup.status]}`}>
                        {signup.status}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{fmtDate(signup.created_at)}</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                <span className="font-medium text-slate-800">{prettyPlan(signup.plan_id)}</span>
                {signup.email && (
                    <a href={`mailto:${signup.email}`} className="flex items-center gap-1 hover:text-slate-900">
                        <Mail className="h-3.5 w-3.5" /> {signup.email}
                    </a>
                )}
                {signup.phone && (
                    <a href={`tel:${signup.phone}`} className="flex items-center gap-1 hover:text-slate-900">
                        <Phone className="h-3.5 w-3.5" /> {signup.phone}
                    </a>
                )}
                {signup.referral_source && (
                    <span className="text-slate-400">via {signup.referral_source}</span>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {STATUSES.filter((s) => s !== signup.status).map((s) => (
                    <button
                        key={s}
                        onClick={() => act({ status: s }, s)}
                        disabled={saving !== null}
                        className="px-2.5 py-1 rounded-md border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                        {saving === s ? <Loader2 className="h-3 w-3 animate-spin inline" /> : `Mark ${s}`}
                    </button>
                ))}
            </div>

            <div className="flex items-start gap-2">
                <textarea
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setNotesDirty(true); }}
                    placeholder="Notes…"
                    rows={1}
                    className="flex-1 text-sm border border-slate-200 rounded-md px-2 py-1.5 resize-y min-h-[34px]"
                />
                {notesDirty && (
                    <button
                        onClick={() => act({ notes }, 'notes')}
                        disabled={saving !== null}
                        className="px-2.5 py-1.5 rounded-md bg-slate-800 text-white text-xs font-medium disabled:opacity-50"
                    >
                        {saving === 'notes' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    </button>
                )}
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
        </div>
    );
}

export function SignupsPage() {
    const { signups, isLoading, isValidating, isError, refresh } = useSignups();
    const [filter, setFilter] = useState<SignupStatus | 'all'>('all');

    const filtered = useMemo(
        () => (filter === 'all' ? signups : signups.filter((s) => s.status === filter)),
        [signups, filter],
    );

    const counts = useMemo(() => {
        const c: Record<string, number> = { all: signups.length };
        for (const s of STATUSES) c[s] = signups.filter((r) => r.status === s).length;
        return c;
    }, [signups]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserPlus className="h-6 w-6 text-slate-700" />
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">Website Signups</h1>
                        <p className="text-sm text-slate-500">
                            Leads from the public subscribe form. Converting one still means creating
                            the client here in the CRM — this list only tracks the funnel.
                        </p>
                    </div>
                </div>
                <button
                    onClick={refresh}
                    disabled={isValidating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? 'animate-spin' : ''}`} />
                    {isValidating ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {(['all', ...STATUSES] as const).map((s) => (
                    <button
                        key={s}
                        onClick={() => setFilter(s)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                            filter === s
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                    >
                        {s} ({counts[s] ?? 0})
                    </button>
                ))}
            </div>

            {isLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading signups…
                </div>
            )}
            {isError && !isLoading && (
                <p className="text-sm text-red-600 py-4">
                    Could not load signups — the list is unavailable, not empty. Try Refresh.
                </p>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
                <p className="text-sm text-slate-500 py-8 text-center">
                    No signups{filter !== 'all' ? ` with status "${filter}"` : ' yet'}.
                </p>
            )}

            <div className="grid gap-3 md:grid-cols-2">
                {filtered.map((s) => (
                    <SignupCard key={s.id} signup={s} />
                ))}
            </div>
        </div>
    );
}
