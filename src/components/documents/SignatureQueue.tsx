import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, PenLine, MailX, Bell, Clock } from 'lucide-react';
import {
  useSignatureRequests, SignatureTab, SIGNATURE_TABS, SIGNATURE_TAB_LABEL,
  SignatureRow, SIGNATURE_STATUS_META,
} from '../../hooks/useSignatureRequests';
import { SignatureDetailDrawer } from './SignatureDetailDrawer';

/**
 * The signatures half of /requests. Sibling tab-set to the document-request
 * queue, same ladder (tabs with server counts → loading → empty → list → drawer)
 * so the page reads as one surface with two subjects rather than two pages.
 */
const EMPTY: Record<SignatureTab, string> = {
  awaiting: 'Nothing waiting on a signature.',
  signed:   'No signed documents yet.',
  declined: 'Nothing declined. 🎉',
  closed:   'Nothing withdrawn.',
};

const fmt = (iso?: string | null) => iso
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

export function SignatureQueue({ openId, setOpenId }: {
  openId: string | null; setOpenId: (id: string | null) => void;
}) {
  const [tab, setTab] = useState<SignatureTab>('awaiting');
  const { requests, counts, isLoading } = useSignatureRequests(tab);

  return (
    <>
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-medium mb-4">
        {SIGNATURE_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded ${tab === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {SIGNATURE_TAB_LABEL[t]}{counts ? ` (${counts[t]})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : !requests.length ? (
        <p className="text-slate-400 text-sm text-center py-12">{EMPTY[tab]}</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {requests.map((r) => <SignatureRowItem key={r.id} r={r} onOpen={() => setOpenId(r.id)} />)}
        </div>
      )}

      {openId && <SignatureDetailDrawer id={openId} onClose={() => setOpenId(null)} onCloned={(d) => setOpenId(d.id)} />}
    </>
  );
}

function SignatureRowItem({ r, onOpen }: { r: SignatureRow; onOpen: () => void }) {
  const meta = SIGNATURE_STATUS_META[r.status];
  return (
    <div className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer" onClick={onOpen}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to={`/clients/${r.clientId}`} onClick={(e) => e.stopPropagation()}
            className="font-semibold text-slate-900 hover:text-blue-600 truncate">{r.clientName}</Link>
          {/* 'Opened' is deliberately distinct from 'Sent' — it is the single
              most useful thing a chaser can know. */}
          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
          {!r.signerEmail && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 inline-flex items-center gap-1">
              <MailX size={10} /> No email
            </span>
          )}
          {r.chaseCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 inline-flex items-center gap-1">
              <Bell size={10} /> {r.chaseCount}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-600 truncate mt-0.5">{r.title}</div>
        <div className="text-xs text-slate-400 mt-1 flex items-center gap-3 flex-wrap">
          {r.signerEmail && <span>{r.signerEmail}</span>}
          {r.sentAt && <span>Sent {fmt(r.sentAt)}</span>}
          {r.signedAt && <span className="text-emerald-600">Signed {fmt(r.signedAt)}</span>}
        </div>
      </div>
      <PenLine size={16} className="text-slate-300 shrink-0" />
    </div>
  );
}
