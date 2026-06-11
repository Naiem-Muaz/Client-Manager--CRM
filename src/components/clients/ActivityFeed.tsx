import React, { useState, useMemo } from 'react';
import { StickyNote, Shield, Briefcase, Pin, PinOff, Trash2, Pencil, Loader2, Check, X } from 'lucide-react';
import { useClientNotes, addNote, updateNote, deleteNote, ClientNote } from '../../hooks/useNotes';
import { useAuditLogs } from '../../hooks/useAudit';
import { useJobs } from '../../hooks/useJobs';
import { useAuth } from '../../context/AuthContext';
import { STATUS_META } from '../work/TaskDetailModal';

type FeedItem = {
  id: string;
  kind: 'note' | 'audit' | 'job';
  ts: number;
  authorName: string;
  title: string;
  pinned?: boolean;
  note?: ClientNote;
};

const initials = (n?: string | null) => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
function relativeTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString('en-GB');
}

const KIND_ICON = { note: StickyNote, audit: Shield, job: Briefcase };
const KIND_COLOR = { note: 'bg-blue-100 text-blue-600', audit: 'bg-slate-100 text-slate-500', job: 'bg-purple-100 text-purple-600' };

export function ActivityFeed({ clientId }: { clientId: string }) {
  const { user } = useAuth();
  const { notes, isLoading: notesLoading, mutate: mutateNotes } = useClientNotes(clientId);
  const { logs } = useAuditLogs(clientId);
  const { jobs } = useJobs({ clientId });

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');

  const items: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [];
    (notes || []).forEach(n => out.push({ id: `note-${n.id}`, kind: 'note', ts: new Date(n.createdAt).getTime(), authorName: n.authorName, title: n.body, pinned: n.pinned, note: n }));
    (Array.isArray(logs) ? logs : []).forEach((l: any, i: number) => {
      const ts = l.timestamp || l.created_at || l.createdAt;
      out.push({ id: `audit-${l.id || i}`, kind: 'audit', ts: ts ? new Date(ts).getTime() : 0, authorName: l.user || l.actor || 'System', title: l.action || l.description || l.event_type || 'Activity' });
    });
    (jobs || []).forEach(j => out.push({ id: `job-${j.id}`, kind: 'job', ts: new Date(j.updatedAt).getTime(), authorName: j.assigneeName || 'Unassigned', title: `${j.title} — ${STATUS_META[j.status]?.label || j.status}` }));
    // Pinned notes first, then reverse-chronological.
    return out.sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return b.ts - a.ts;
    });
  }, [notes, logs, jobs]);

  const submit = async () => {
    if (!body.trim()) return;
    setSending(true);
    try { await addNote(clientId, body.trim(), isInternal); setBody(''); mutateNotes(); }
    finally { setSending(false); }
  };
  const togglePin = async (n: ClientNote) => { await updateNote(n.id, { pinned: !n.pinned }); mutateNotes(); };
  const saveEdit = async (n: ClientNote) => { await updateNote(n.id, { body: editBody }); setEditingId(null); mutateNotes(); };
  const remove = async (n: ClientNote) => {
    if (!window.confirm('Delete this note?')) return;
    try { await deleteNote(n.id); mutateNotes(); } catch { window.alert('Only the author can delete this note.'); }
  };

  return (
    <div className="max-w-3xl">
      {/* Composer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-6">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Add a note…"
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
        <div className="flex items-center justify-between mt-3">
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button onClick={() => setIsInternal(true)} className={`px-3 py-1 rounded ${isInternal ? 'bg-white text-slate-800 shadow' : 'text-slate-500'}`}>Internal</button>
            <button onClick={() => setIsInternal(false)} className={`px-3 py-1 rounded ${!isInternal ? 'bg-white text-emerald-700 shadow' : 'text-slate-500'}`}>Client-visible</button>
          </div>
          <button onClick={submit} disabled={!body.trim() || sending} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {sending ? <Loader2 size={14} className="animate-spin" /> : null} Add note
          </button>
        </div>
      </div>

      {/* Feed */}
      {notesLoading && items.length === 0 ? (
        <div className="text-slate-400 text-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Loading activity…</div>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No activity yet. Add the first note above.</p>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-100" />
          <div className="space-y-4">
            {items.map(item => {
              const Icon = KIND_ICON[item.kind];
              const n = item.note;
              const isAuthor = !!n && !!user && n.authorId === user.id;
              return (
                <div key={item.id} className="relative flex gap-3 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${KIND_COLOR[item.kind]}`}><Icon size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">{initials(item.authorName)}</div>
                      <span className="text-sm font-medium text-slate-800">{item.authorName}</span>
                      <span className="text-xs text-slate-400">{relativeTime(item.ts)}</span>
                      {item.pinned && <Pin size={11} className="text-amber-500" />}
                      {n && (n.isInternal
                        ? <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Internal</span>
                        : <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Client-visible</span>)}
                    </div>
                    <div className="mt-1">
                      {n && editingId === n.id ? (
                        <div className="flex gap-2">
                          <textarea value={editBody} onChange={e => setEditBody(e.target.value)} rows={2} className="flex-1 px-2 py-1 border border-slate-200 rounded text-sm" />
                          <button onClick={() => saveEdit(n)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-50 rounded"><X size={16} /></button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600 whitespace-pre-wrap">{item.title}</p>
                      )}
                    </div>
                    {n && isAuthor && editingId !== n.id && (
                      <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                        <button onClick={() => togglePin(n)} className="hover:text-amber-600 inline-flex items-center gap-1 text-xs">{n.pinned ? <PinOff size={12} /> : <Pin size={12} />}{n.pinned ? 'Unpin' : 'Pin'}</button>
                        <button onClick={() => { setEditingId(n.id); setEditBody(n.body); }} className="hover:text-blue-600 inline-flex items-center gap-1 text-xs"><Pencil size={12} /> Edit</button>
                        <button onClick={() => remove(n)} className="hover:text-red-600 inline-flex items-center gap-1 text-xs"><Trash2 size={12} /> Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
