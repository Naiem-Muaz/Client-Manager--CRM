import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck, Loader2, AlertTriangle, CheckCircle2, Clock, MailX, Bell, PenLine } from 'lucide-react';
import {
  useDocumentRequests, RequestTab, REQUEST_TABS, TAB_LABEL, RequestRow,
} from '../hooks/useDocumentRequests';
import { RequestDetailDrawer } from '../components/documents/RequestDetailDrawer';
import { SignatureQueue } from '../components/documents/SignatureQueue';

/**
 * The document-request queue — the ReminderQueuePage shell (tabs with counts in
 * the label, stat tiles, loading/empty/list ladder), with one difference that
 * matters: these rows are not approved from the queue. A request is already
 * sent; this page is for seeing what has come back and what has not.
 */

const fmtDate = (iso?: string | null) => iso
  ? new Date(`${String(iso).slice(0, 10)}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  : '—';
const fmtWhen = (iso?: string | null) => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  : '';

const TAB_ICON: Record<RequestTab, React.ReactNode> = {
  open: <Clock size={13} />, overdue: <AlertTriangle size={13} />,
  complete: <CheckCircle2 size={13} />, no_email: <MailX size={13} />,
};
const TAB_ACTIVE: Record<RequestTab, string> = {
  open: 'bg-white text-slate-900 shadow',
  overdue: 'bg-white text-rose-700 shadow',
  complete: 'bg-white text-emerald-700 shadow',
  no_email: 'bg-white text-amber-700 shadow',
};
const EMPTY: Record<RequestTab, string> = {
  open: 'Nothing outstanding — no requests are waiting on a client.',
  overdue: 'Nothing overdue. 🎉',
  complete: 'No completed requests yet.',
  no_email: 'Every open request has an email address to chase. 🎉',
};

export function RequestsPage() {
  const [tab, setTab] = useState<RequestTab>('open');
  const { requests, counts, isLoading } = useDocumentRequests(tab);
  const [openId, setOpenId] = useState<string | null>(null);
  // Two subjects, one page. A segmented switch rather than a second route:
  // "what have we asked clients for" is one job, whether it is files or a
  // signature.
  const [section, setSection] = useState<'documents' | 'signatures'>('documents');
  const [openSigId, setOpenSigId] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <FileCheck className="text-blue-600" size={22} />
        <h1 className="text-xl font-bold text-slate-900">Document Requests</h1>
      </div>
      <p className="text-slate-500 text-sm mb-5">
        What you've asked clients for, and what has come back. Clients upload through a secure
        link — no login, no password.
      </p>

      <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-semibold mb-5">
        <button onClick={() => setSection('documents')}
          className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${section === 'documents' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
          <FileCheck size={14} /> Documents
        </button>
        <button onClick={() => setSection('signatures')}
          className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${section === 'signatures' ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
          <PenLine size={14} /> Signatures
        </button>
      </div>

      {section === 'signatures' ? (
        <SignatureQueue openId={openSigId} setOpenId={setOpenSigId} />
      ) : (<>

      {/* Stat tiles — the two that mean "someone has to do something". */}
      <div className="flex flex-wrap gap-3 mb-5">
        <button onClick={() => setTab('open')} className="flex-1 min-w-[170px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-blue-300 transition-colors">
          <div className="text-2xl font-black text-slate-900">{counts?.open ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">waiting on a client</div>
        </button>
        <button onClick={() => setTab('overdue')} className="flex-1 min-w-[170px] bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-left hover:border-rose-300 transition-colors">
          <div className="text-2xl font-black text-rose-700">{counts?.overdue ?? '—'}</div>
          <div className="text-xs font-medium text-rose-700">past the due date</div>
        </button>
        <button onClick={() => setTab('no_email')} className="flex-1 min-w-[170px] bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-left hover:border-amber-300 transition-colors">
          <div className="text-2xl font-black text-amber-700">{counts?.no_email ?? '—'}</div>
          <div className="text-xs font-medium text-amber-700">no contact email</div>
        </button>
        <button onClick={() => setTab('complete')} className="flex-1 min-w-[170px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-emerald-300 transition-colors">
          <div className="text-2xl font-black text-emerald-600">{counts?.complete ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">complete</div>
        </button>
      </div>

      {/* Tabs, counts in the label (server-side, all four in one response). */}
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-medium mb-4">
        {REQUEST_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded inline-flex items-center gap-1.5 ${tab === t ? TAB_ACTIVE[t] : 'text-slate-500'}`}>
            {TAB_ICON[t]} {TAB_LABEL[t]}{counts ? ` (${counts[t]})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : !requests.length ? (
        <p className="text-slate-400 text-sm text-center py-12">{EMPTY[tab]}</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {requests.map((r) => <RequestRowItem key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
        </div>
      )}

      </>)}

      {openId && <RequestDetailDrawer id={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function RequestRowItem({ r, onOpen }: { r: RequestRow; onOpen: () => void }) {
  const overdue = !!r.dueDate && r.status === 'sent' && new Date(`${String(r.dueDate).slice(0, 10)}T00:00:00Z`) < new Date();
  const pct = r.progress.total ? (r.progress.fulfilled / r.progress.total) * 100 : 0;
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer" onClick={onOpen}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* stopPropagation: the client link must not also open the drawer. */}
          <Link to={`/clients/${r.clientId}`} onClick={(e) => e.stopPropagation()}
            className="font-semibold text-slate-900 hover:text-blue-600 truncate">{r.clientName}</Link>
          {overdue && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">Overdue</span>}
          {!r.hasEmail && r.status === 'sent' && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 inline-flex items-center gap-1">
              <MailX size={10} /> No email
            </span>
          )}
          {r.chaseCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 inline-flex items-center gap-1">
              <Bell size={10} /> {r.chaseCount} chase{r.chaseCount === 1 ? '' : 's'}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-600 truncate mt-0.5">{r.title}</div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
          <span>Due {fmtDate(r.dueDate)}</span>
          {r.sentAt && <span>Sent {fmtWhen(r.sentAt)}</span>}
          {r.lastActivityAt && <span>Last activity {fmtWhen(r.lastActivityAt)}</span>}
        </div>
      </div>
      <div className="shrink-0 w-28 text-right">
        <div className="text-xs font-bold text-slate-700 tabular-nums">{r.progress.fulfilled}/{r.progress.total}</div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
          <div className={`h-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
