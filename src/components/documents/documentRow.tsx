import React from 'react';
import { FileText, Image as ImageIcon, FileSpreadsheet, File, User, Download, Trash2, RotateCcw, Tag, Link2Off, Share2 } from 'lucide-react';

/**
 * SHARED DOCUMENT ROW PRIMITIVES — the client tab and the org vault use these.
 *
 * ─── WHY THIS FILE EXISTS ───────────────────────────────────────────────────
 * There were THREE shapes for a document in this codebase: the client tab's
 * (correct since the hotfix), `DocumentsPage`'s `DocumentCard` (invented
 * against an endpoint that did not exist), and the API's own. The vault is the
 * moment they would have become four, so the tab's formatting moves here and
 * both render from one source.
 *
 * ⛔ These are the SERVER's fields. B1 made the backend the authority on
 * category labels (services/documents/categories.ts, all 15 codes), so the
 * client formats what it is given rather than re-deriving it.
 */

export interface ApiDocument {
  id: string;
  clientId?: string | null;
  clientName?: string | null;
  fileName?: string | null;
  /** The UI label, mapped server-side. */
  category?: string | null;
  /** The raw snake_case code. */
  documentType?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  uploadedBy?: string | null;
  uploadedByName?: string | null;
  uploadedAt?: string | null;
  source?: string | null;
  sourceRef?: string | null;
  jobId?: string | null;
  jobTitle?: string | null;
  deletedAt?: string | null;
  tags?: string[] | null;
  fileUrl?: string | null;
}

/** Bytes → a size a human reads. Null-safe: no size renders as nothing. */
export function fmtSize(bytes?: number | null): string {
  if (bytes == null || Number.isNaN(Number(bytes))) return '';
  const b = Number(bytes);
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * SOURCE LABELS. 289 gave documents a typed `source`, so this no longer has to
 * infer provenance by sniffing a text field.
 */
export const SOURCE_LABEL: Record<string, string> = {
  staff: 'Staff',
  client_request: 'Client upload',
  esign: 'Signed copy',
  incorporation: 'Incorporation',
  import: 'Imported',
};

export const SOURCE_CHIPS = Object.entries(SOURCE_LABEL).map(([id, label]) => ({ id, label }));

/**
 * Who uploaded it, rendered honestly.
 *
 * ⚠️ `source` FIRST, the text field only as a fallback. Before 289 this had to
 * parse `client-request:<uuid>` out of a display string; the typed column is
 * the authority now, and the legacy parsing is kept only for rows written
 * before the migration.
 */
export function uploader(d: ApiDocument): { label: string; muted: boolean } {
  const src = (d.source || '').trim();
  if (src && src !== 'staff' && SOURCE_LABEL[src]) return { label: SOURCE_LABEL[src], muted: true };

  const raw = (d.uploadedByName || d.uploadedBy || '').trim();
  if (!raw || raw === 'Unknown') return { label: 'Unknown', muted: true };
  if (raw.startsWith('client-request:')) return { label: 'Client upload', muted: true };
  if (raw.startsWith('esign:')) return { label: 'Signed copy', muted: true };
  // A bare uuid is an unresolved actor, not a person's name.
  if (UUID_RE.test(raw)) return { label: 'Unknown', muted: true };
  return { label: raw, muted: false };
}

export function DocIcon({ mimeType }: { mimeType?: string | null }) {
  const m = (mimeType || '').toLowerCase();
  const cls = 'w-5 h-5';
  if (m.startsWith('image/')) return <ImageIcon className={`${cls} text-purple-500`} />;
  if (m.includes('spreadsheet') || m.includes('excel') || m === 'text/csv')
    return <FileSpreadsheet className={`${cls} text-emerald-600`} />;
  if (m === 'application/pdf') return <FileText className={`${cls} text-red-500`} />;
  return <File className={`${cls} text-slate-400`} />;
}

interface RowProps {
  doc: ApiDocument;
  /** Shown in the vault, hidden in the client tab where it is redundant. */
  showClient?: boolean;
  onDownload: (d: ApiDocument) => void;
  onDelete?: (d: ApiDocument) => void;
  onRestore?: (d: ApiDocument) => void;
  /** B3 — inline tag editing. Omit to render tags read-only. */
  onEditTags?: (d: ApiDocument, tags: string[]) => void;
  /** B3 — shown in the job drawer only. */
  onUnlinkJob?: (d: ApiDocument) => void;
  /** B5 — open the share dialog. Omit where sharing is not offered. */
  onShare?: (d: ApiDocument) => void;
  /** B5 — count of ACTIVE shares, shown as a badge. */
  activeShares?: number;
  /** B4 — multi-select. Omit for a non-selectable list. */
  selected?: boolean;
  onSelect?: (d: ApiDocument, next: boolean) => void;
  busy?: boolean;
}

/**
 * One document row. Deleted rows render dimmed with a Restore action rather
 * than disappearing — the whole point of B1's soft delete is that the record
 * is still there.
 */
export function DocumentRow({
  doc, showClient, onDownload, onDelete, onRestore,
  onEditTags, onUnlinkJob, onShare, activeShares, selected, onSelect, busy,
}: RowProps) {
  const up = uploader(doc);
  const deleted = !!doc.deletedAt;
  const tags = doc.tags ?? [];

  /**
   * Tags are edited as a comma-separated string — the server normalises
   * (trim / lowercase / dedupe / caps), so the client deliberately does NOT
   * pre-validate. One normaliser, server-side, or the two disagree about what
   * 'VAT' and 'vat' mean and the ?tag= filter starts missing rows.
   */
  const editTags = () => {
    if (!onEditTags) return;
    const next = window.prompt('Tags (comma separated):', tags.join(', '));
    if (next === null) return;
    onEditTags(doc, next.split(',').map((t) => t.trim()).filter(Boolean));
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 ${
        deleted ? 'opacity-60' : ''
      }`}
      data-testid="document-row"
    >
      {onSelect && (
        <input
          type="checkbox"
          checked={!!selected}
          onChange={(e) => onSelect(doc, e.target.checked)}
          className="shrink-0"
          aria-label={`Select ${doc.fileName ?? 'document'}`}
        />
      )}
      <DocIcon mimeType={doc.mimeType} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate text-sm font-medium ${deleted ? 'line-through text-slate-500' : 'text-slate-800'}`}>
            {doc.fileName || 'Untitled'}
          </span>
          {deleted && (
            <span className="shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
              DELETED
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
          {showClient && doc.clientName && (
            <span className="font-medium text-slate-600">{doc.clientName}</span>
          )}
          <span>{doc.category || 'Other'}</span>
          <span aria-hidden>·</span>
          <span className={up.muted ? 'inline-flex items-center gap-1 italic' : ''}>
            {up.muted && <User className="h-3 w-3" />}
            {up.label}
          </span>
          <span aria-hidden>·</span>
          <span>{fmtDate(doc.uploadedAt)}</span>
          {fmtSize(doc.fileSize) && (
            <>
              <span aria-hidden>·</span>
              <span>{fmtSize(doc.fileSize)}</span>
            </>
          )}
          {doc.jobTitle && (
            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">
              {doc.jobTitle}
            </span>
          )}
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              #{t}
            </span>
          ))}
          {onEditTags && (
            <button onClick={editTags} title="Edit tags" className="text-slate-400 hover:text-slate-700">
              <Tag className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {/* A deleted document keeps its object, so the download still works —
            that is the soft-delete contract, not an oversight. */}
        <button
          onClick={() => onDownload(doc)}
          disabled={busy || !doc.fileUrl}
          title={doc.fileUrl ? 'Download' : 'No file'}
          className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
        >
          <Download className="h-4 w-4" />
        </button>
        {onShare && !deleted && (
          <button
            onClick={() => onShare(doc)}
            disabled={busy}
            title={activeShares ? `${activeShares} active share link${activeShares === 1 ? '' : 's'}` : 'Share'}
            className="relative rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
          >
            <Share2 className="h-4 w-4" />
            {!!activeShares && (
              <span className="absolute -right-0.5 -top-0.5 rounded-full bg-emerald-500 px-1 text-[9px] font-semibold leading-[14px] text-white">
                {activeShares}
              </span>
            )}
          </button>
        )}
        {onUnlinkJob && doc.jobId && (
          <button
            onClick={() => onUnlinkJob(doc)}
            disabled={busy}
            title="Unlink from this job"
            className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
          >
            <Link2Off className="h-4 w-4" />
          </button>
        )}
        {deleted
          ? onRestore && (
              <button
                onClick={() => onRestore(doc)}
                disabled={busy}
                title="Restore"
                className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            )
          : onDelete && (
              <button
                onClick={() => onDelete(doc)}
                disabled={busy}
                title="Delete"
                className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
      </div>
    </div>
  );
}
