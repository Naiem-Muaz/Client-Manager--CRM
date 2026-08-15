import React, { useState } from 'react';
import { Paperclip, Plus, Upload, Search, X } from 'lucide-react';
import {
  useJobDocuments, useVaultPage, patchDocument, bulkDownload,
} from '../../hooks/useDocuments';
import { DocumentRow, type ApiDocument } from './documentRow';
import { DocumentUploadModal } from './DocumentUploadModal';

/**
 * B3 — the documents attached to one job.
 *
 * ⛔ THERE WAS NO JOB-ATTACHMENT IDIOM TO FOLLOW. The re-survey checked: no
 * table linked a document to a job, and `brain_mtd.job_events` is an event log,
 * not an attachment. 289 added `documents.job_id` and this is its only surface,
 * so it is deliberately minimal — list, attach, upload, unlink. No checklist
 * coupling (the survey §5 ruling stands).
 *
 * Reads the VAULT route with `?jobId=`, so org scoping is the same SQL predicate
 * as everywhere else rather than a second path that could drift.
 */
export function JobDocumentsSection({ job }: { job: { id: string; clientId?: string | null; client_id?: string | null } }) {
  const jobId = job.id;
  const clientId = job.clientId ?? job.client_id ?? null;

  const { documents, isLoading } = useJobDocuments(jobId);
  const [picking, setPicking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onDownload = (d: ApiDocument) => { if (d.fileUrl) window.open(d.fileUrl, '_blank', 'noopener'); };

  const onUnlink = async (d: ApiDocument) => {
    setBusyId(d.id);
    try { await patchDocument(d.id, { jobId: null }, clientId ?? undefined); }
    finally { setBusyId(null); }
  };

  const onEditTags = async (d: ApiDocument, tags: string[]) => {
    setBusyId(d.id);
    try { await patchDocument(d.id, { tags }, clientId ?? undefined); }
    finally { setBusyId(null); }
  };

  const toggle = (d: ApiDocument, next: boolean) =>
    setSelected((prev) => {
      const s = new Set(prev);
      if (next) s.add(d.id); else s.delete(d.id);
      return s;
    });

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Paperclip className="h-4 w-4" /> Documents
          {documents.length > 0 && <span className="text-xs font-normal text-slate-400">{documents.length}</span>}
        </h3>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button
              onClick={() => bulkDownload([...selected])}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
            >
              Download {selected.size}
            </button>
          )}
          {clientId && (
            <>
              <button
                onClick={() => setPicking(true)}
                className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                <Plus className="h-3 w-3" /> Attach existing
              </button>
              <button
                onClick={() => setUploading(true)}
                className="flex items-center gap-1 rounded bg-slate-900 px-2 py-1 text-xs text-white hover:bg-slate-800"
              >
                <Upload className="h-3 w-3" /> Upload
              </button>
            </>
          )}
        </div>
      </div>

      {!clientId && (
        // An org-level job has no client, and a document must belong to one.
        <p className="rounded border border-dashed border-slate-200 p-3 text-xs text-slate-400">
          This job has no client, so documents cannot be filed against it.
        </p>
      )}

      <div className="rounded border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-center text-xs text-slate-400">Loading…</p>
        ) : documents.length === 0 ? (
          <p className="p-4 text-center text-xs text-slate-400">No documents attached to this job.</p>
        ) : (
          documents.map((d) => (
            <DocumentRow
              key={d.id}
              doc={d}
              busy={busyId === d.id}
              selected={selected.has(d.id)}
              onSelect={toggle}
              onDownload={onDownload}
              onUnlinkJob={onUnlink}
              onEditTags={onEditTags}
            />
          ))
        )}
      </div>

      {picking && clientId && (
        <AttachExisting
          clientId={clientId}
          jobId={jobId}
          alreadyAttached={new Set(documents.map((d) => d.id))}
          onClose={() => setPicking(false)}
        />
      )}

      {uploading && clientId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="w-[420px] rounded-lg bg-white p-5 shadow-xl">
            {/* jobId rides along on the upload so job_id is set in the SAME
                INSERT — a create-then-link leaves a window where the document
                exists unattached, and a failure in step two strands it there. */}
            <DocumentUploadModal
              clientId={clientId}
              extra={{ jobId }}
              onClose={() => setUploading(false)}
              onUpload={() => setUploading(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

/** Picker over the job's CLIENT only — scoped by the vault route, not filtered here. */
function AttachExisting({
  clientId, jobId, alreadyAttached, onClose,
}: { clientId: string; jobId: string; alreadyAttached: Set<string>; onClose: () => void }) {
  const [q, setQ] = useState('');
  const { documents } = useVaultPage({ clientId, q, limit: 25 }, null);
  const [busy, setBusy] = useState<string | null>(null);

  const attach = async (d: ApiDocument) => {
    setBusy(d.id);
    try { await patchDocument(d.id, { jobId }, clientId); onClose(); }
    finally { setBusy(null); }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
      <div className="w-[520px] rounded-lg bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">Attach an existing document</h4>
          <button onClick={onClose}><X className="h-4 w-4 text-slate-400" /></button>
        </div>
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search this client's documents…"
            className="w-full rounded border border-slate-200 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="max-h-72 overflow-y-auto rounded border border-slate-100">
          {documents.filter((d) => !alreadyAttached.has(d.id)).length === 0 ? (
            <p className="p-4 text-center text-xs text-slate-400">Nothing to attach.</p>
          ) : (
            documents.filter((d) => !alreadyAttached.has(d.id)).map((d) => (
              <button
                key={d.id}
                disabled={busy === d.id}
                onClick={() => attach(d)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="truncate">{d.fileName}</span>
                <span className="ml-3 shrink-0 text-xs text-slate-400">{d.category}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
