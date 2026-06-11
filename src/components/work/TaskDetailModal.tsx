import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { X, ExternalLink, Send, Clock, Check, Loader2 } from 'lucide-react';
import { Job, JobStatus, JobPriority, ChecklistStep, updateJob, useJobComments, addJobComment, logJobTime } from '../../hooks/useJobs';
import { useTeamMembers } from '../../hooks/useTeam';

export const STATUS_META: Record<JobStatus, { label: string; dot: string }> = {
  'not-started': { label: 'Not started', dot: 'bg-slate-400' },
  'in-progress': { label: 'In progress', dot: 'bg-blue-500' },
  'review': { label: 'Review', dot: 'bg-purple-500' },
  'blocked': { label: 'Blocked', dot: 'bg-red-500' },
  'complete': { label: 'Complete', dot: 'bg-emerald-500' },
};

export const PRIORITY_META: Record<JobPriority, { label: string; cls: string }> = {
  low: { label: 'Low', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  medium: { label: 'Medium', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  high: { label: 'High', cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const initials = (name?: string | null) => (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const fmtMins = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export function TaskDetailModal({ job: initialJob, onClose, onChanged }: { job: Job; onClose: () => void; onChanged?: () => void }) {
  const [job, setJob] = useState<Job>(initialJob);
  const { members } = useTeamMembers();
  const { comments, mutate: mutateComments } = useJobComments(initialJob.id);

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pendingRef = useRef<Record<string, any>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const changes = pendingRef.current;
    if (Object.keys(changes).length === 0) return;
    pendingRef.current = {};
    setSaveState('saving');
    try {
      await updateJob(initialJob.id, changes);
      setSaveState('saved');
      onChanged?.();
      setTimeout(() => setSaveState('idle'), 1500);
    } catch {
      setSaveState('idle');
    }
  }, [initialJob.id, onChanged]);

  // Debounced field updates (800ms).
  const update = (field: keyof Job, value: any) => {
    setJob(prev => ({ ...prev, [field]: value }));
    pendingRef.current[field] = value;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 800);
  };

  const close = useCallback(() => { flush(); onClose(); }, [flush, onClose]);

  // Esc to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  // Checklist
  const steps: ChecklistStep[] = Array.isArray(job.checklistSteps) ? job.checklistSteps : [];
  const doneCount = steps.filter(s => s.completed).length;
  const toggleStep = (idx: number) => {
    const next = steps.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s);
    update('checklistSteps', next);
  };

  // Comments
  const [commentBody, setCommentBody] = useState('');
  const [sending, setSending] = useState(false);
  const sendComment = async () => {
    if (!commentBody.trim()) return;
    setSending(true);
    try {
      await addJobComment(initialJob.id, commentBody.trim());
      setCommentBody('');
      mutateComments();
    } finally { setSending(false); }
  };

  // Time logging
  const [showTime, setShowTime] = useState(false);
  const [hours, setHours] = useState('');
  const [timeDesc, setTimeDesc] = useState('');
  const submitTime = async () => {
    const h = parseFloat(hours);
    if (!h || h <= 0) return;
    const mins = Math.round(h * 60);
    const res = await logJobTime(initialJob.id, mins, timeDesc);
    setJob(prev => ({ ...prev, timeLoggedMins: res?.timeLoggedMins ?? (prev.timeLoggedMins + mins) }));
    setHours(''); setTimeDesc(''); setShowTime(false);
    onChanged?.();
  };

  const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={close} />
      <div className="relative w-full max-w-lg bg-white h-full shadow-xl flex flex-col animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            {saveState === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving…</>}
            {saveState === 'saved' && <><Check size={12} className="text-emerald-500" /> Saved</>}
          </div>
          <button onClick={close} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Title */}
          <input
            value={job.title}
            onChange={e => update('title', e.target.value)}
            className="w-full text-lg font-bold text-slate-900 border-0 border-b border-transparent hover:border-slate-200 focus:border-blue-400 focus:outline-none px-0 py-1"
          />

          {/* Client */}
          <Row label="Client">
            {job.clientId
              ? <Link to={`/clients/${job.clientId}`} onClick={close} className="text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1">{job.clientName || 'View'} <ExternalLink size={12} /></Link>
              : <span className="text-slate-400">—</span>}
          </Row>

          <div className="grid grid-cols-2 gap-4">
            <Row label="Assignee">
              <select value={job.assigneeId || ''} onChange={e => update('assigneeId', e.target.value || null)} className={field}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Row>
            <Row label="Due date">
              <input type="date" value={job.dueDate || ''} onChange={e => update('dueDate', e.target.value || null)} className={field} />
            </Row>
            <Row label="Priority">
              <select value={job.priority} onChange={e => update('priority', e.target.value)} className={field}>
                {(Object.keys(PRIORITY_META) as JobPriority[]).map(p => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
              </select>
            </Row>
            <Row label="Status">
              <select value={job.status} onChange={e => update('status', e.target.value)} className={field}>
                {(Object.keys(STATUS_META) as JobStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </Row>
            <Row label="Tax year">
              <input value={job.taxYear || ''} onChange={e => update('taxYear', e.target.value)} placeholder="2024-25" className={field} />
            </Row>
          </div>

          {/* Notes */}
          <Row label="Notes">
            <textarea value={job.notes || ''} onChange={e => update('notes', e.target.value)} rows={3} className={`${field} resize-none`} placeholder="Add notes…" />
          </Row>

          {/* Checklist */}
          {steps.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Checklist</p>
                <span className="text-xs text-slate-400">{doneCount}/{steps.length} complete</span>
              </div>
              <div className="space-y-1">
                {steps.map((s, idx) => (
                  <label key={idx} className="flex items-center gap-2 py-1 cursor-pointer group">
                    <input type="checkbox" checked={s.completed} onChange={() => toggleStep(idx)} className="w-4 h-4 text-blue-600 rounded" />
                    <span className={`text-sm ${s.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Time log */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Time</p>
              <button onClick={() => setShowTime(v => !v)} className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Clock size={12} /> Log time</button>
            </div>
            {showTime && (
              <div className="flex gap-2 mb-2">
                <input type="number" step="0.5" min="0" value={hours} onChange={e => setHours(e.target.value)} placeholder="Hours" className={`${field} w-24`} />
                <input value={timeDesc} onChange={e => setTimeDesc(e.target.value)} placeholder="Description" className={`${field} flex-1`} />
                <button onClick={submitTime} className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">Add</button>
              </div>
            )}
            <p className="text-sm text-slate-600">{fmtMins(job.timeLoggedMins || 0)} logged</p>
          </div>

          {/* Comments */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Comments</p>
            <div className="space-y-3 mb-3">
              {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">{initials(c.authorName)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{c.authorName}</span>
                      <span className="text-xs text-slate-400">{new Date(c.createdAt).toLocaleString('en-GB')}</span>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{c.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea value={commentBody} onChange={e => setCommentBody(e.target.value)} rows={1} placeholder="Add a comment…" className={`${field} resize-none flex-1`} />
              <button onClick={sendComment} disabled={!commentBody.trim() || sending} className="px-3 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 self-end">
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 text-xs text-slate-400">
          Created {new Date(job.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      {children}
    </div>
  );
}
