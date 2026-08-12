import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, FileUp, Loader2, PartyPopper, XCircle } from 'lucide-react';
import { errMsg } from '../lib/errMsg';

/**
 * PUBLIC document-request page — /request/:token (no auth; the hashed token is
 * the secret). The client opens this from an email, sees the checklist their
 * accountant asked for, and uploads against each item.
 *
 * ProposalPage's architecture: same API_ROOT strip, same validated-accent
 * fallback, same Shell/Terminal branded wrappers. MOBILE-FIRST — most clients
 * open this on a phone, so the item rows stack, the upload target is the whole
 * row, and nothing depends on hover.
 */

const API_ROOT = (import.meta.env.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api').replace(/\/api\/?$/, '');
const NAVY = '#1a365d';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

// Mirrors UPLOAD_MIME_ALLOWLIST on the server (documentRequests.ts). The input
// `accept` is a convenience filter only — the server is the authority, and a
// rejected file comes back with a per-file reason.
const ACCEPT =
  '.pdf,.png,.jpg,.jpeg,.heic,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt,' +
  'application/pdf,image/png,image/jpeg,image/heic,image/webp,text/csv,text/plain';

interface Firm {
  name: string; logoUrl: string | null; accentColor: string | null;
  address: string | null; licenceNumber: string | null;
  supportEmail: string; phone: string | null;
}
interface Item {
  id: string; name: string; description: string | null;
  status: 'pending' | 'fulfilled' | 'waived'; position: number; uploadedCount: number;
}
interface Payload {
  status: 'sent' | 'complete';
  title: string; message: string | null; dueDate: string | null;
  items: Item[];
  progress: { fulfilled: number; total: number };
  firm: Firm;
}
type FileResult = { fileName: string; ok: boolean; reason?: string };

const fmtDate = (iso: string | null) => {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
};

export function RequestPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<'loading' | 'view' | 'expired' | 'cancelled' | 'notfound' | 'error'>('loading');
  const [data, setData] = useState<Payload | null>(null);
  const [deadFirm, setDeadFirm] = useState<Firm | null>(null);   // 410 payloads still carry branding
  const [busyItem, setBusyItem] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, FileResult[]>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const res = await fetch(`${API_ROOT}/r/${token}`);
      if (res.status === 404) return setPhase('notfound');
      const json = await res.json().catch(() => ({}));
      if (res.status === 410) {
        setDeadFirm(json?.firm || null);
        return setPhase(json?.state === 'cancelled' ? 'cancelled' : 'expired');
      }
      if (!res.ok || !json?.data) return setPhase('error');
      setData(json.data as Payload);
      setPhase('view');
    } catch {
      setPhase('error');
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const upload = async (itemId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusyItem(itemId);
    setErrors((e) => ({ ...e, [itemId]: '' }));
    try {
      const form = new FormData();
      Array.from(files).forEach((f) => form.append('files', f));
      const res = await fetch(`${API_ROOT}/r/${token}/items/${itemId}/upload`, { method: 'POST', body: form });
      const json = await res.json().catch(() => ({}));
      if (res.status === 410 || res.status === 404) return load();   // link died mid-session
      if (!res.ok) {
        setErrors((e) => ({ ...e, [itemId]: errMsg(json, 'Upload failed — please try again.') }));
        return;
      }
      setResults((r) => ({ ...r, [itemId]: (json.results || []) as FileResult[] }));
      // Server is the authority on item/progress/status — merge its truth.
      setData((d) => {
        if (!d) return d;
        const items = d.items.map((i) => (json.item && i.id === json.item.id ? { ...i, ...json.item } : i));
        return { ...d, items, progress: json.progress || d.progress, status: json.status || d.status };
      });
    } catch (e) {
      setErrors((er) => ({ ...er, [itemId]: errMsg(e, 'Upload failed — please try again.') }));
    } finally {
      setBusyItem(null);
    }
  };

  const accent = data?.firm?.accentColor && HEX_RE.test(data.firm.accentColor) ? data.firm.accentColor : NAVY;

  if (phase === 'loading') {
    return <Shell accent={NAVY}><div className="py-24 flex justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div></Shell>;
  }
  if (phase === 'notfound' || phase === 'error') {
    return <Terminal accent={NAVY} icon={XCircle} tone="text-slate-400"
      title="This link isn't valid"
      body="The link may be mistyped or no longer active. If you were expecting to upload documents, contact your accountant and they'll send a fresh link." />;
  }
  if (phase === 'expired' || phase === 'cancelled') {
    const f = deadFirm;
    return <Terminal accent={f?.accentColor && HEX_RE.test(f.accentColor) ? f.accentColor : NAVY}
      icon={phase === 'expired' ? Clock : XCircle} tone="text-amber-500" firm={f || undefined}
      title={phase === 'expired' ? 'This link has expired' : 'This request was cancelled'}
      body={phase === 'expired'
        ? 'Document links expire for security. Contact us and we\'ll send you a fresh one.'
        : 'Your accountant cancelled this document request. Contact us if you think that\'s a mistake.'} />;
  }

  const d = data!;
  const done = d.progress.total > 0 && d.progress.fulfilled >= d.progress.total;

  return (
    <Shell accent={accent}>
      {/* Firm header */}
      <header className="pt-8 pb-6 flex items-center gap-3">
        {d.firm.logoUrl
          ? <img src={d.firm.logoUrl} alt={d.firm.name} className="h-9 sm:h-10 object-contain" />
          : <span className="text-lg font-bold" style={{ color: accent }}>{d.firm.name}</span>}
      </header>

      {/* Intro */}
      <section className="pb-5 border-b border-slate-200">
        <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>Documents requested</p>
        <h1 className="mt-2 text-xl sm:text-2xl font-bold text-slate-900 leading-snug">{d.title}</h1>
        <p className="mt-1.5 text-sm text-slate-500">from {d.firm.name}</p>
        {d.message && <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{d.message}</p>}
        {d.dueDate && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
            <Clock size={12} /> Please send by {fmtDate(d.dueDate)}
          </p>
        )}
      </section>

      {/* Progress */}
      <section className="py-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-900">{d.progress.fulfilled} of {d.progress.total} provided</p>
          {done && <span className="text-xs font-semibold text-emerald-700">All done</span>}
        </div>
        <div className="mt-2 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all"
            style={{ width: `${d.progress.total ? (d.progress.fulfilled / d.progress.total) * 100 : 0}%`, background: accent }} />
        </div>
      </section>

      {done && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3">
          <PartyPopper size={20} className="text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-emerald-900">Thank you — that's everything</p>
            <p className="mt-1 text-sm text-emerald-800 leading-relaxed">
              We've received all the documents on this list. You can still add more below if you need to.
            </p>
          </div>
        </div>
      )}

      {/* Items */}
      <section className="space-y-3 pb-8">
        {d.items.map((item) => (
          <ItemRow key={item.id} item={item} accent={accent} busy={busyItem === item.id}
            results={results[item.id]} error={errors[item.id]}
            onFiles={(files) => upload(item.id, files)} />
        ))}
      </section>

      {/* Firm footer */}
      <footer className="border-t border-slate-200 py-6 text-xs text-slate-500 leading-relaxed">
        <p className="font-semibold text-slate-700">{d.firm.name}</p>
        {d.firm.address && <p className="mt-0.5">{d.firm.address}</p>}
        <p className="mt-1.5">
          Questions? <a href={`mailto:${d.firm.supportEmail}`} className="font-medium underline" style={{ color: accent }}>{d.firm.supportEmail}</a>
          {d.firm.phone ? <> · {d.firm.phone}</> : null}
        </p>
        {d.firm.licenceNumber && <p className="mt-1.5 text-slate-400">Licence {d.firm.licenceNumber}</p>}
      </footer>
    </Shell>
  );
}

function ItemRow({ item, accent, busy, results, error, onFiles }: {
  item: Item; accent: string; busy: boolean;
  results?: FileResult[]; error?: string;
  onFiles: (files: FileList | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const fulfilled = item.status === 'fulfilled';
  const waived = item.status === 'waived';

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!waived) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!waived && !busy) onFiles(e.dataTransfer.files); }}
      className={`rounded-xl border p-4 transition-colors ${
        over ? 'border-dashed bg-slate-50' : fulfilled ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200 bg-white'}`}
      style={over ? { borderColor: accent } : undefined}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {fulfilled ? <CheckCircle2 size={18} className="text-emerald-600" />
            : waived ? <XCircle size={18} className="text-slate-300" />
              : <span className="block w-[18px] h-[18px] rounded-full border-2 border-slate-300" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${waived ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.name}</p>
          {item.description && <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">{item.description}</p>}
          {item.uploadedCount > 0 && (
            <p className="mt-1 text-xs text-emerald-700 font-medium">
              {item.uploadedCount} file{item.uploadedCount === 1 ? '' : 's'} received
            </p>
          )}
          {waived && <p className="mt-1 text-xs text-slate-400">No longer needed</p>}
        </div>
      </div>

      {!waived && (
        <div className="mt-3">
          <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden"
            onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2.5 text-sm font-semibold disabled:opacity-50"
            style={{ borderColor: accent, color: accent }}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
            {busy ? 'Uploading…' : fulfilled ? 'Add more files' : 'Choose files'}
          </button>
          <p className="mt-1.5 text-[11px] text-slate-400">PDF, images, Word, Excel or CSV · up to 10MB each</p>
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle size={13} className="shrink-0 mt-px" /> {error}
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="mt-2 space-y-1">
          {results.map((r, i) => (
            <li key={i} className={`flex items-start gap-1.5 text-xs ${r.ok ? 'text-emerald-700' : 'text-red-600'}`}>
              {r.ok ? <CheckCircle2 size={13} className="shrink-0 mt-px" /> : <XCircle size={13} className="shrink-0 mt-px" />}
              <span className="min-w-0 break-all">{r.fileName}{r.ok ? '' : ` — ${r.reason || 'not accepted'}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Shell({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50" style={{ borderTop: `4px solid ${accent}` }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8">{children}</div>
    </div>
  );
}

function Terminal({ accent, icon: Icon, tone, title, body, firm }: {
  accent: string; icon: any; tone: string; title: string; body: string; firm?: Firm;
}) {
  return (
    <Shell accent={accent}>
      <div className="py-24 text-center">
        {firm?.logoUrl ? <img src={firm.logoUrl} alt="" className="h-10 object-contain mx-auto mb-8" />
          : firm?.name ? <p className="text-lg font-bold mb-8" style={{ color: NAVY }}>{firm.name}</p> : null}
        <Icon size={40} className={`mx-auto ${tone}`} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{body}</p>
        {firm && (
          <p className="mt-6 text-sm text-slate-600">
            <a href={`mailto:${firm.supportEmail}`} className="font-medium underline">{firm.supportEmail}</a>
            {firm.phone ? <> · {firm.phone}</> : null}
          </p>
        )}
      </div>
    </Shell>
  );
}
