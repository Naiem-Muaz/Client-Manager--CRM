import React, { useEffect, useRef, useState } from 'react';
import { Upload, Download, Trash2, Loader2, FileText } from 'lucide-react';
import { listWorkerDocuments, uploadWorkerDocument, getDocumentDownloadUrl, deleteWorkerDocument } from '../../hooks/useSponsorCompliance';
import { inputCls } from '../settings/SettingsTabs';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, DOC_TYPES } from './format';

const typeLabel = (code: string) => DOC_TYPES.find(d => d.code === code)?.label || code;
const fmtSize = (b?: number) => b == null ? '' : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;

export function SponsorDocuments({ workerId }: { workerId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('passport');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true);
    try { setDocs(await listWorkerDocuments(workerId) || []); }
    catch (e: any) { setError(errMsg(e, 'Could not load documents')); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [workerId]);

  const onPick = async (file?: File | null) => {
    if (!file) return;
    setBusy(true); setError(null);
    try { await uploadWorkerDocument(workerId, file, docType); await load(); }
    catch (e: any) { setError(errMsg(e, 'Upload failed')); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const onDownload = async (id: string) => {
    setError(null);
    try { const url = await getDocumentDownloadUrl(id); if (url) window.open(url, '_blank', 'noopener'); }
    catch (e: any) { setError(errMsg(e, 'Could not get download link')); }
  };
  const onDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This permanently removes the file (and is logged).`)) return;
    setError(null);
    try { await deleteWorkerDocument(id); await load(); }
    catch (e: any) { setError(errMsg(e, 'Delete failed')); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 bg-white border border-slate-200 rounded-xl p-4">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Document type</label>
          <select value={docType} onChange={e => setDocType(e.target.value)} className={inputCls}>
            {DOC_TYPES.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        </div>
        <input ref={fileRef} type="file" className="hidden" onChange={e => onPick(e.target.files?.[0])} />
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} Upload
        </button>
        <p className="text-xs text-slate-400 ml-auto">Stored in the private sponsor-documents vault · every access is logged.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-2">{[1, 2].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}</div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No documents uploaded yet.</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">File</th><th className="px-4 py-2.5">Uploaded</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{typeLabel(d.documentType || d.docType)}</td>
                  <td className="px-4 py-3 text-slate-600"><span className="inline-flex items-center gap-2"><FileText size={14} className="text-slate-400" />{d.fileName}{d.sizeBytes ? <span className="text-xs text-slate-400">· {fmtSize(Number(d.sizeBytes))}</span> : null}</span></td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{fmtDate(d.uploadedAt)}{d.uploadedBy ? <span className="text-slate-400"> · by {String(d.uploadedBy).slice(0, 8)}</span> : ''}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => onDownload(d.id)} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 text-xs font-medium mr-3"><Download size={14} /> Download</button>
                    <button onClick={() => onDelete(d.id, d.fileName)} className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1 text-xs"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
