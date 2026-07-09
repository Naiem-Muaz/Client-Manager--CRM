import {
  Building2, FileSignature, FileText, Landmark, ListChecks, MapPin, PenLine, PieChart, Users,
} from 'lucide-react';
import type { BlockingIssue, IncorporationStatus } from '../../hooks/useIncorporations';

/**
 * Client-side model for the incorporation wizard. wizard_data shapes mirror the
 * backend (services/incorporation/types.ts) — the backend is the source of
 * truth; this file only carries what the UI needs: section definitions, empty
 * templates, the issue→section mapping (the gate list IS the progress
 * indicator) and status presentation.
 */

export interface Address {
  premises?: string; address_line_1?: string; address_line_2?: string;
  locality?: string; region?: string; postal_code?: string; country?: string;
}
export interface Officer {
  role: 'director' | 'secretary';
  kind: 'person' | 'corporate';
  name: { title?: string; forenames?: string; surname?: string; corporate_name?: string };
  dob?: string; nationality?: string; occupation?: string; country_of_residence?: string;
  service_address?: Address;
  residential_address?: Address;
  residential_same_as_service?: boolean;
  consent_to_act?: boolean;
  idv?: { status: 'verified' | 'pending' | 'unverified'; ch_personal_code?: string | null };
  email?: string; phone?: string;
}
export interface ShareClass { class: string; currency: string; nominal_value: string; prescribed_particulars?: string }
export interface Allotment { subscriber_ref: number; class: string; num_shares: number; amount_paid_per_share?: string }
export interface Subscriber { officer_ref?: number; name?: { forenames?: string; surname?: string; corporate_name?: string }; address?: Address }
export interface Psc { source: 'derived' | 'manual'; subscriber_ref?: number; name?: string; natures_of_control: string[]; dismissed?: boolean }

export interface WizardData {
  company?: {
    name?: string; type?: string; registered_office?: Address; registered_email?: string;
    lawful_purpose_confirmed?: boolean; sic_codes?: string[];
    articles?: { kind?: 'model' | 'bespoke'; document_id?: string | null };
  };
  officers?: Officer[];
  share_capital?: { classes?: ShareClass[]; allotments?: Allotment[] };
  subscribers?: Subscriber[];
  pscs?: Psc[];
  no_psc_statement?: boolean;
  statement_of_compliance?: boolean;
  presenter?: { name?: string; reference?: string };
}

export const emptyOfficer = (role: Officer['role']): Officer => ({
  role, kind: 'person', name: {}, service_address: {}, residential_same_as_service: true,
  consent_to_act: false, ...(role === 'director' ? { idv: { status: 'unverified' } } : {}),
});
export const DEFAULT_SHARE_CLASS: ShareClass = { class: 'Ordinary', currency: 'GBP', nominal_value: '1.00', prescribed_particulars: 'Full voting, dividend and capital distribution rights' };

// ── wizard sections (ids also anchor the issue→section mapping below) ────────
export interface WizardSection { id: string; title: string; icon: any; blurb?: string }
export const WIZARD_SECTIONS: WizardSection[] = [
  { id: 'name', title: 'Company name', icon: PenLine, blurb: 'Proposed name + live availability check' },
  { id: 'company', title: 'Company details', icon: Building2, blurb: 'Type, registered email, lawful purpose' },
  { id: 'office', title: 'Registered office', icon: MapPin, blurb: 'The company’s official address' },
  { id: 'officers', title: 'Officers', icon: Users, blurb: 'Directors & secretary — IDV required to file' },
  { id: 'shares', title: 'Shares & subscribers', icon: PieChart, blurb: 'Classes, subscribers, allotments' },
  { id: 'pscs', title: 'People with significant control', icon: Landmark, blurb: 'Auto-derived from holdings >25%' },
  { id: 'articles', title: 'Articles', icon: FileText, blurb: 'Model articles or bespoke upload' },
  { id: 'sic', title: 'Nature of business (SIC)', icon: ListChecks, blurb: 'What the company does' },
  { id: 'declarations', title: 'Declarations', icon: FileSignature, blurb: 'Statement of compliance, presenter' },
];

/** Which section fixes a given blocking-issue code (prefix match, most-specific first). */
const ISSUE_SECTION: Array<[RegExp, string]> = [
  [/^name_/, 'name'],
  [/^company_type/, 'company'],
  [/^registered_office/, 'office'],
  [/^registered_email|^lawful_purpose/, 'company'],
  [/^sic_/, 'sic'],
  [/^articles_/, 'articles'],
  [/^(officer_|director_|no_person_director|consent_to_act)/, 'officers'],
  [/^(share_|allotment_|subscriber_)/, 'shares'],
  [/^psc_/, 'pscs'],
  [/^compliance_statement/, 'declarations'],
];
export const sectionForIssue = (code: string): string =>
  ISSUE_SECTION.find(([re]) => re.test(code))?.[1] ?? 'declarations';

export const issuesBySection = (issues: BlockingIssue[]): Record<string, BlockingIssue[]> => {
  const out: Record<string, BlockingIssue[]> = {};
  for (const i of issues) (out[sectionForIssue(i.code)] ||= []).push(i);
  return out;
};

// ── status presentation ───────────────────────────────────────────────────────
export const STATUS_META: Record<IncorporationStatus, { label: string; chip: string; dot: string }> = {
  draft:         { label: 'Draft',         chip: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400' },
  ready_to_file: { label: 'Ready to file', chip: 'bg-blue-50 text-blue-700',      dot: 'bg-blue-500' },
  submitted:     { label: 'Submitted',     chip: 'bg-indigo-50 text-indigo-700',  dot: 'bg-indigo-500' },
  accepted:      { label: 'Accepted',      chip: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  rejected:      { label: 'Rejected',      chip: 'bg-rose-50 text-rose-700',      dot: 'bg-rose-500' },
  onboarded:     { label: 'Onboarded',     chip: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-600' },
  abandoned:     { label: 'Abandoned',     chip: 'bg-slate-100 text-slate-400',   dot: 'bg-slate-300' },
};

/** The tracker's pipeline columns, in flow order (rejected/abandoned surface separately). */
export const PIPELINE: IncorporationStatus[] = ['draft', 'ready_to_file', 'submitted', 'accepted', 'onboarded'];

export const IDV_META = {
  verified:   { label: 'Verified',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  pending:    { label: 'IDV pending', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  unverified: { label: 'Not verified', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
} as const;

export const daysSince = (iso?: string | null): number | null => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return Number.isFinite(d) ? Math.max(0, d) : null;
};
