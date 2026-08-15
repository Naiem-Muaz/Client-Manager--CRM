import React, { useMemo, useState } from 'react';
import {
    Upload, Search, Folder, FileText, Download, Trash2, FileSignature, ShieldCheck,
    Archive, BookOpen, Receipt, Mail, UploadCloud, Loader2, UserRound, Share2,
} from 'lucide-react';
import { DocumentCategory, FOLDERS } from '../../types/DocumentTypes';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { ShareDialog } from '../documents/ShareDialog';
import { uploader as sourceUploader, type ApiDocument } from '../documents/documentRow';
import { useDocuments, deleteDocument } from '../../hooks/useDocuments';
import { RequestSignatureModal } from '../documents/RequestSignatureModal';

/**
 * The client Documents tab.
 *
 * REWRITTEN because it read a shape the API has never sent. It expected
 * `doc.name`, `doc.size`, `doc.dateAdded`, `doc.status` and `doc.metadata.*` —
 * a client-side VaultDocument type nothing produces. The server sends mapDoc
 * (documents.ts:70-84): fileName / category / documentType / mimeType /
 * fileSize / uploadedBy / uploadedAt / fileUrl.
 *
 * It looked healthy for as long as the list was always empty. `doc.name` is
 * undefined, and `.toLowerCase()` on it throws — so the very first document a
 * client could see took the tab to the error boundary. RLS deny-all was hiding
 * the defect, not preventing it; migration 284 repaired the RLS and A2 started
 * putting real rows in, which is what made it visible.
 *
 * So every read here is now a field the API actually sends, and every one of
 * them is treated as possibly null. This tab renders a list from a server; it
 * must not be able to crash on one.
 */

const TYPE_ICONS: Record<string, any> = {
    'Engagement': FileSignature,
    'HMRC': ShieldCheck,
    'Permanent': Archive,
    'Accounts': BookOpen,
    'Tax': Receipt,
    'Correspondence': Mail,
    'Client Uploads': UploadCloud,
};

/**
 * The API returns a DISPLAY LABEL in `category`, mapped server-side from the
 * stored code (toUiCategory). Seven codes map to the seven FOLDERS ids below
 * and round-trip exactly — verified against CODE_TO_UI_LABEL and the
 * documents_category_check constraint.
 *
 * EIGHT DO NOT: identity, address_proof, bank_statement, invoice, receipt,
 * contract, other and — the one that matters today — `incorporation`, which
 * the incorporation workspace writes for real clients. Those have no entry in
 * the server's label map, so `category` comes back as the raw snake_case code,
 * matches no folder, and would be reachable from nowhere but "All Documents".
 *
 * Fixing the map is a backend change and belongs with slice B. What this tab
 * owes them meanwhile is a HOME and a readable name, so nothing a client sent
 * is invisible because a code was never mapped.
 */
const KNOWN_CATEGORIES = new Set<string>(FOLDERS.map((f) => f.id));
const OTHER_ID = '__other__';

/** 'bank_statement' → 'Bank statement'. Leaves a real label untouched. */
function prettyCategory(raw?: string | null): string {
    const v = (raw || '').trim();
    if (!v) return 'Uncategorised';
    if (KNOWN_CATEGORIES.has(v)) return v;
    return v.replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Bytes → a size a human reads. Null-safe: no size renders as nothing. */
function fmtSize(bytes?: number | null): string {
    if (bytes == null || Number.isNaN(Number(bytes))) return '';
    const b = Number(bytes);
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso?: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? '—'
        : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `uploadedBy` is `uploaded_by_name || uploaded_by || 'Unknown'`, so when the
 * join misses it holds a raw stamp. Two of those are worth reading properly:
 * a magic-link upload is stamped `client-request:<uuid>` (A2), and an
 * unresolved staff id comes back as a bare uuid. Neither is a person's name and
 * neither should be printed as one.
 */
/**
 * ⚠️ REPLACED BY THE SHARED, SOURCE-FIRST HELPER.
 *
 * The local version read ONLY the legacy `uploadedBy` text, so it could answer
 * correctly for a client-request upload (whose text carries the prefix) and
 * WRONGLY for anything whose actor join resolved — a signed copy showed the
 * staff display name rather than "Signed copy". 289 gave documents a typed
 * `source` column and B1's mapDoc emits it; that is the authority now.
 *
 * `isClient` is kept as the local shape so the badge below is unchanged: the
 * badge means "not a member of staff", which is exactly `muted`.
 */
function uploader(doc: any): { label: string; isClient: boolean } {
    const r = sourceUploader(doc);
    return { label: r.label, isClient: r.muted && r.label !== 'Unknown' };
}


/**
 * ⚠️ THE LOCAL INTERFACE IS GONE — it was a FOURTH document shape.
 *
 * It was written before 289 and knew nothing of `source`, `deletedAt`, `tags`
 * or `jobId`, so a field the API has been sending since B1 was a type error to
 * read. documentRow.tsx owns the shape now, which is the same file this tab
 * already borrows `uploader` from.
 */


export function ClientDocumentsTab({ client }: { client: any }) {
    const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'All' | typeof OTHER_ID>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    // Only a PDF can be signed — the API refuses anything else, so the action
    // is offered only where it can succeed.
    const [shareDoc, setShareDoc] = useState<any | null>(null);
    const [signDoc, setSignDoc] = useState<ApiDocument | null>(null);

    const { documents, isLoading, mutate } = useDocuments(client?.id);

    // The API may hand back an object on error; only an array is a list.
    const safeDocuments: ApiDocument[] = Array.isArray(documents) ? documents : [];

    const inFolder = (doc: ApiDocument, folder: string) =>
        folder === OTHER_ID
            ? !KNOWN_CATEGORIES.has((doc.category || '').trim())
            : (doc.category || '') === folder;

    const filteredDocs = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return safeDocuments.filter((doc) => {
            const matchesCategory = selectedCategory === 'All' || inFolder(doc, selectedCategory);
            // Null-safe: a row with no fileName must not throw, and must not
            // vanish from an empty search either.
            const matchesSearch = !q || (doc.fileName || '').toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [safeDocuments, selectedCategory, searchQuery]);

    const unmappedCount = safeDocuments.filter((d) => inFolder(d, OTHER_ID)).length;

    const currentLabel =
        selectedCategory === 'All' ? 'All Documents'
        : selectedCategory === OTHER_ID ? 'Other'
        : FOLDERS.find((f) => f.id === selectedCategory)?.label || 'Documents';

    const handleDelete = async (doc: ApiDocument) => {
        if (!window.confirm(`Delete "${doc.fileName || 'this document'}"? This cannot be undone.`)) return;
        setDeletingId(doc.id);
        try { await deleteDocument(doc.id, client.id); }
        catch { window.alert('Could not delete that document. Please try again.'); }
        finally { setDeletingId(null); }
    };

    return (
        <div className="h-[600px] flex gap-6">
            {/* Sidebar: Folders */}
            <div className="w-64 flex-shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="font-bold text-slate-900">Document Vault</h3>
                    <p className="text-xs text-slate-500">Central File Storage</p>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    <button
                        onClick={() => setSelectedCategory('All')}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            selectedCategory === 'All' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <Folder size={18} className={selectedCategory === 'All' ? 'text-blue-500' : 'text-slate-400'} />
                            All Documents
                        </div>
                        {safeDocuments.length > 0 && (
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{safeDocuments.length}</span>
                        )}
                    </button>
                    <div className="h-px bg-slate-100 my-2 mx-1" />
                    {FOLDERS.map(folder => {
                        const Icon = TYPE_ICONS[folder.id] || Folder;
                        const count = safeDocuments.filter((d) => inFolder(d, folder.id)).length;
                        return (
                            <button
                                key={folder.id}
                                onClick={() => setSelectedCategory(folder.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                                    selectedCategory === folder.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon size={18} className={selectedCategory === folder.id ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'} />
                                    {folder.label}
                                </div>
                                {count > 0 && (
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{count}</span>
                                )}
                            </button>
                        );
                    })}
                    {/* Only shown when it holds something — an always-present
                        "Other" folder that is always empty is just noise. */}
                    {unmappedCount > 0 && (
                        <button
                            onClick={() => setSelectedCategory(OTHER_ID)}
                            className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg transition-colors group ${
                                selectedCategory === OTHER_ID ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                            title="Documents whose category has no folder yet — incorporation packs, ID, bank statements and so on"
                        >
                            <div className="flex items-center gap-3">
                                <Folder size={18} className={selectedCategory === OTHER_ID ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-500'} />
                                Other
                            </div>
                            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{unmappedCount}</span>
                        </button>
                    )}
                </div>
                <div className="p-3 border-t border-slate-100">
                    <button
                        onClick={() => setShowUpload(true)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium text-sm"
                    >
                        <Upload size={16} /> Upload File
                    </button>
                </div>
            </div>

            {/* Main Content: File List */}
            <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                        <span className="font-medium text-slate-800">{currentLabel}</span>
                        <span>•</span>
                        <span>{filteredDocs.length} file{filteredDocs.length === 1 ? '' : 's'}</span>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                        />
                    </div>
                </div>

                {/* Header columns match what the API actually sends. The old
                    Status and Tags columns were reading fields that do not
                    exist on any document row. */}
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200 uppercase tracking-wide">
                    <div className="col-span-4">Name</div>
                    <div className="col-span-2">Category</div>
                    <div className="col-span-2">Uploaded</div>
                    <div className="col-span-2">By</div>
                    {/* ⚠️ col-span-2, NOT 1. Four actions (signature, share,
                        download, delete) at 28px plus gaps need ~136px; one
                        twelfth of this table is ~83px, so they overflowed LEFT
                        and sat on top of the By column. Name gives up the
                        difference — it has the most slack and it truncates. */}
                    <div className="col-span-2 text-right">Action</div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
                            <Loader2 className="animate-spin" size={16} /> Loading documents…
                        </div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Folder size={48} className="mb-4 opacity-50" />
                            <p className="font-medium text-slate-600">No documents found</p>
                            <p className="text-sm">Try changing the search or upload a new file.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredDocs.map(doc => {
                                const who = uploader(doc);
                                const size = fmtSize(doc.fileSize);
                                return (
                                    <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors group">
                                        <div className="col-span-4 flex items-center gap-3 overflow-hidden">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 text-blue-600">
                                                <FileText size={14} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-slate-900 truncate" title={doc.fileName || undefined}>
                                                    {doc.fileName || 'Untitled document'}
                                                </div>
                                                {size && <div className="text-xs text-slate-500">{size}</div>}
                                            </div>
                                        </div>

                                        <div className="col-span-2">
                                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] border border-slate-200 truncate max-w-full"
                                                title={doc.documentType || undefined}>
                                                {prettyCategory(doc.category)}
                                            </span>
                                        </div>

                                        <div className="col-span-2 text-sm text-slate-600">{fmtDate(doc.uploadedAt)}</div>

                                        <div className="col-span-2 min-w-0 text-sm text-slate-600">
                                            {who.isClient ? (
                                                <span
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-[11px] font-bold border border-emerald-100"
                                                    title={`${who.label} — source: ${doc.source ?? "staff"}`}
                                                >
                                                    {/* ⚠️ who.label, NOT the literal "Client upload".
                                                        The badge shows for ANY non-staff source, so a
                                                        signed copy was being labelled a client upload —
                                                        introduced when the source-aware uploader landed
                                                        and the hardcoded text was left behind. */}
                                                    <UserRound size={10} /> {who.label}
                                                </span>
                                            ) : (
                                                // `block truncate` so a long staff name ellipses
                                                // inside its column rather than pushing the row wide.
                                                <span className="block truncate" title={who.label}>{who.label}</span>
                                            )}
                                        </div>

                                        {/* ⚠️ ALWAYS VISIBLE BELOW lg. `opacity-0 group-hover:` is unreachable on a
    touch device — there is no hover — so on a tablet these actions did not
    exist at all. Hover-reveal is a pointer-device affordance and is now
    scoped to one. */}
                                        <div className="col-span-2 flex justify-end items-center gap-1.5 whitespace-nowrap opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                            {/* fileUrl is a freshly-signed, short-lived URL from the
                                                list response (the NextGen DocumentsTab pattern).
                                                Null means signing failed — disabled, not a dead
                                                button that looks live. */}
                                            {String(doc.mimeType || '').toLowerCase() === 'application/pdf' && (
                                                <button
                                                    onClick={() => setSignDoc(doc)}
                                                    className="p-1.5 hover:bg-violet-100 text-slate-400 hover:text-violet-600 rounded-lg transition-colors"
                                                    title="Request signature"
                                                >
                                                    {/* Was PenLine — a bare pencil reads as "edit the
                                                        document", which is not what this does. */}
                                                    <FileSignature size={16} />
                                                </button>
                                            )}
                                            {/* SHARE. This tab had NO share entry point — B5 wired the
                                                dialog into the vault page only. In the action column
                                                beside download and delete, where the other verbs are. */}
                                            {!doc.deletedAt && (
                                                <button
                                                    onClick={() => setShareDoc(doc)}
                                                    className="p-1.5 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                                                    title="Share link"
                                                >
                                                    <Share2 size={16} />
                                                </button>
                                            )}
                                            {doc.fileUrl ? (
                                                <a
                                                    href={doc.fileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 hover:bg-blue-100 text-slate-400 hover:text-blue-600 rounded-lg transition-colors"
                                                    title={`Download ${doc.fileName || 'file'}`}
                                                >
                                                    <Download size={16} />
                                                </a>
                                            ) : (
                                                <span className="p-1.5 text-slate-200 cursor-not-allowed" title="Download unavailable">
                                                    <Download size={16} />
                                                </span>
                                            )}
                                            <button
                                                onClick={() => handleDelete(doc)}
                                                disabled={deletingId === doc.id}
                                                className="p-1.5 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-lg transition-colors disabled:opacity-40"
                                                title="Delete"
                                            >
                                                {deletingId === doc.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {shareDoc && <ShareDialog doc={shareDoc} onClose={() => setShareDoc(null)} />}

            {signDoc && (
                <RequestSignatureModal
                    clientId={client.id}
                    clientName={client.legalName || client.name}
                    document={{ id: signDoc.id, fileName: signDoc.fileName || 'document.pdf' }}
                    onClose={() => setSignDoc(null)}
                    onDone={() => { setSignDoc(null); mutate(undefined); }}
                />
            )}

            {showUpload && <DocumentUploadModal
                category={selectedCategory !== 'All' && selectedCategory !== OTHER_ID ? selectedCategory : undefined}
                clientId={client.id}
                onClose={() => setShowUpload(false)}
                onUpload={() => { mutate(undefined); setShowUpload(false); }}
            />}
        </div>
    );
}
