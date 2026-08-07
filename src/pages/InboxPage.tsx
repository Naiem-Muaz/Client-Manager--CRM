import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Loader2, Paperclip, CalendarClock, User as UserIcon, AtSign } from 'lucide-react';
import { useInbox, useInboxCounts, InboxMessage, InboxTab } from '../hooks/useInbox';
import { MessageDrawer } from '../components/inbox/MessageDrawer';

const initials = (name?: string | null) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

// Relative received time — an inbox reads in "2h ago", not date strings.
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const TAB_LABELS: Record<InboxTab, string> = {
  unassigned: 'Unassigned', mine: 'Mine', assigned: 'Assigned', snoozed: 'Snoozed', done: 'Done',
};

export function InboxPage() {
  const [tab, setTab] = useState<InboxTab>('unassigned');
  const [mentionedOnly, setMentionedOnly] = useState(false);
  // ?clientId=<id> pre-filters the list (server-side filter already exists) —
  // read ONCE on mount, the ?message= idiom; no view-state/URL syncing.
  const [clientFilter] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('clientId')
  );
  const { counts, mutate: refreshCounts } = useInboxCounts();
  const { messages, isLoading, mutate } = useInbox(tab, { mentionedMe: mentionedOnly, clientId: clientFilter || undefined });
  // ?message=<id> is the email deep link — read ONCE on mount to open the drawer;
  // view state does not otherwise sync to the URL (repo convention).
  const [openId, setOpenId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('message')
  );

  const onChanged = () => { mutate(); refreshCounts(); };

  const tabCount = (t: InboxTab) => (counts ? counts[t] : null);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-1">
        <Inbox className="text-blue-600" size={22} /><h1 className="text-xl font-bold text-slate-900">Inbox</h1>
        {(counts?.mentions ?? 0) > 0 && (
          <button onClick={() => setMentionedOnly(v => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors ${
              mentionedOnly ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}>
            <AtSign size={12} /> Mentions ({counts!.mentions})
          </button>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-5">Emails forwarded from the practice mailbox. Triage, assign and track them here; reply from your own mailbox.</p>

      {/* Headline counts (ReminderQueuePage idiom) */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-black text-slate-900">{counts?.unassigned ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">unassigned</div>
        </div>
        <div className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-2xl font-black text-blue-600">{counts?.mine ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">assigned to me</div>
        </div>
        <button onClick={() => setTab('done')} className="flex-1 min-w-[160px] bg-white border border-slate-200 rounded-xl px-4 py-3 text-left hover:border-emerald-300 transition-colors">
          <div className="text-2xl font-black text-emerald-600">{counts?.done ?? '—'}</div>
          <div className="text-xs font-medium text-slate-500">done · view history</div>
        </button>
      </div>

      {/* Tab pills with counts-in-label (DeadlinesPage idiom) */}
      <div className="flex bg-slate-100 p-1 rounded-lg w-fit text-sm font-medium mb-4 flex-wrap">
        {(Object.keys(TAB_LABELS) as InboxTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded ${tab === t ? 'bg-white text-slate-900 shadow' : 'text-slate-500'}`}>
            {TAB_LABELS[t]}{tabCount(t) !== null ? ` (${tabCount(t)})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : !messages.length ? (
        <p className="text-slate-400 text-sm text-center py-12">
          {tab === 'unassigned' ? 'Nothing waiting for triage. 🎉' : `No ${TAB_LABELS[tab].toLowerCase()} emails.`}
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
          {messages.map((m: InboxMessage) => (
            <button key={m.id} onClick={() => setOpenId(m.id)} className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-800 truncate">{m.fromName || m.fromEmail}</span>
                  {m.fromName && <span className="text-xs text-slate-400 truncate">{m.fromEmail}</span>}
                  {m.clientId && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 truncate">{m.clientName || 'Client'}</span>
                  )}
                </div>
                <div className="font-semibold text-slate-900 truncate">{m.subject || '(no subject)'}</div>
                {m.preview
                  ? <div className="text-sm text-slate-500 truncate">{m.preview}</div>
                  : <div className="text-xs text-slate-400 italic">no text preview</div>}
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(m.receivedAt)}</span>
                <div className="flex items-center gap-1.5">
                  {m.hasAttachments && <Paperclip size={13} className="text-slate-400" />}
                  {m.dueDate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700">
                      <CalendarClock size={11} /> {new Date(m.dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  )}
                  {m.assigneeName
                    ? <span title={m.assigneeName} className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">{initials(m.assigneeName)}</span>
                    : <span title="Unassigned" className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><UserIcon size={12} /></span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openId && <MessageDrawer id={openId} onClose={() => setOpenId(null)} onChanged={onChanged} />}
    </div>
  );
}
