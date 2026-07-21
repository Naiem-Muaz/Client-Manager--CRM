import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';
import { useClientTimeline } from '../../hooks/useTimeline';
import { timelineMeta, relativeTime, TIMELINE_FILTER_ORDER, TIMELINE_META } from '../../lib/timeline';
import { addNote } from '../../hooks/useNotes';

const initials = (n?: string | null) => (n || '·').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/**
 * Client Timeline — the unified activity feed (server-aggregated via
 * /clients/:id/timeline). Retires the old 3-hook client-side merge. The note
 * composer stays as a quick-add; new notes appear in the feed on refresh.
 * `onOpenTab` (from the detail page) lets same-page entries jump to their tab.
 */
export function ActivityFeed({ clientId, onOpenTab }: { clientId: string; onOpenTab?: (tab: string) => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const { items, hasMore, loading, error, loadMore, refresh } = useClientTimeline(clientId, selected);

  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(true);
  const [sending, setSending] = useState(false);

  const toggle = (t: string) => setSelected((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const submit = async () => {
    if (!body.trim()) return;
    setSending(true);
    try { await addNote(clientId, body.trim(), isInternal); setBody(''); refresh(); }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-3xl">
      {/* Composer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 mb-5">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="Add a note…"
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

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        <button onClick={() => setSelected([])} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${selected.length === 0 ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>All</button>
        {TIMELINE_FILTER_ORDER.map((t) => {
          const on = selected.includes(t);
          return (
            <button key={t} onClick={() => toggle(t)} className={`px-2.5 py-1 rounded-full text-xs font-medium border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
              {TIMELINE_META[t].label}
            </button>
          );
        })}
      </div>

      {/* Feed */}
      {loading && items.length === 0 ? (
        <div className="text-slate-400 text-sm flex items-center gap-2 py-6"><Loader2 size={16} className="animate-spin" /> Loading timeline…</div>
      ) : error ? (
        <p className="text-rose-600 text-sm py-6">Couldn’t load the timeline. <button onClick={refresh} className="underline">Retry</button></p>
      ) : items.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-8">No {selected.length ? 'matching ' : ''}activity yet.</p>
      ) : (
        <div className="relative pl-4">
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-slate-100" />
          <div className="space-y-4">
            {items.map((item) => {
              const meta = timelineMeta(item.type);
              const Icon = meta.icon;
              const nav = item.link && (meta.crossPage
                ? <Link to={item.link} className="text-slate-300 hover:text-blue-600 shrink-0"><ArrowRight size={14} /></Link>
                : onOpenTab
                  ? <button onClick={() => onOpenTab(item.link)} className="text-slate-300 hover:text-blue-600 shrink-0"><ArrowRight size={14} /></button>
                  : null);
              return (
                <div key={item.id} className="relative flex gap-3 group">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${meta.color}`}><Icon size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[9px] font-bold">{initials(item.actor)}</div>
                      <span className="text-sm font-medium text-slate-800">{item.actor || 'System'}</span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{meta.label}</span>
                      <span className="text-xs text-slate-400">{relativeTime(item.timestamp)}</span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap mt-0.5 break-words">{item.summary}</p>
                  </div>
                  {nav}
                </div>
              );
            })}
          </div>
          {hasMore && (
            <div className="pl-8 mt-5">
              <button onClick={loadMore} disabled={loading} className="text-sm font-medium text-blue-600 hover:underline inline-flex items-center gap-1.5 disabled:opacity-50">
                {loading ? <Loader2 size={14} className="animate-spin" /> : null} Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
