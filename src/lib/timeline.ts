import {
  StickyNote, FileText, FileSignature, MessageSquare, UserPlus, ShieldCheck,
  CalendarClock, Briefcase, Building2, Handshake, Archive, Activity, Mail, FileCheck, PenLine,
} from 'lucide-react';

// Visual + label metadata per timeline entry type — one map, used by the feed and
// the filter chips. `crossPage` links navigate away; the rest are client-detail tabs.
export interface TimelineTypeMeta { label: string; icon: any; color: string; crossPage?: boolean; }

export const TIMELINE_META: Record<string, TimelineTypeMeta> = {
  note:          { label: 'Notes',          icon: StickyNote,     color: 'bg-blue-100 text-blue-600' },
  document:      { label: 'Documents',      icon: FileText,       color: 'bg-amber-100 text-amber-600' },
  engagement:    { label: 'Engagement',     icon: FileSignature,  color: 'bg-indigo-100 text-indigo-600' },
  communication: { label: 'Communications', icon: MessageSquare,  color: 'bg-emerald-100 text-emerald-600' },
  assignment:    { label: 'Assignments',    icon: UserPlus,       color: 'bg-slate-100 text-slate-600' },
  compliance:    { label: 'Compliance',     icon: ShieldCheck,    color: 'bg-rose-100 text-rose-600' },
  deadline:      { label: 'Deadlines',      icon: CalendarClock,  color: 'bg-red-100 text-red-600' },
  job:           { label: 'Jobs',           icon: Briefcase,      color: 'bg-purple-100 text-purple-600', crossPage: true },
  incorporation: { label: 'Incorporations', icon: Building2,      color: 'bg-cyan-100 text-cyan-600' },
  proposal:      { label: 'Proposals',      icon: Handshake,      color: 'bg-teal-100 text-teal-600', crossPage: true },
  lifecycle:     { label: 'Lifecycle',      icon: Archive,        color: 'bg-slate-200 text-slate-600' },
  // BACKFILLED: the backend has emitted this arm since Shared Triage shipped and
  // this map never learned about it, so inbox emails fell through to the generic
  // fallback below — label 'triage_email', a stopwatch icon, and NO filter chip,
  // which made them unfilterable rather than merely plain. Survey §5 flagged it;
  // fixing it here is the fix-forward that item owed.
  triage_email:      { label: 'Inbox emails',      icon: Mail,      color: 'bg-sky-100 text-sky-600' },
  // Document requests (slice A). 'sent' and 'completed' only — see the arm's
  // comment in clientTimeline.ts for why chases stay out of the feed.
  document_request:  { label: 'Document requests', icon: FileCheck, color: 'bg-blue-100 text-blue-700' },
  // Signature requests (slice C). sent / signed / declined only — chases and
  // views stay in the request's own drawer.
  document_signature:{ label: 'Signatures',        icon: PenLine,   color: 'bg-violet-100 text-violet-700' },
};

export const timelineMeta = (type: string): TimelineTypeMeta => TIMELINE_META[type] || { label: type, icon: Activity, color: 'bg-slate-100 text-slate-500' };

// Order for the filter chips.
export const TIMELINE_FILTER_ORDER = ['note', 'document', 'document_request', 'document_signature', 'deadline', 'communication', 'triage_email', 'engagement', 'job', 'proposal', 'incorporation', 'assignment', 'compliance', 'lifecycle'] as const;

/** 'YYYY-…' ISO → "3d ago" / date. */
export function relativeTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB');
}
