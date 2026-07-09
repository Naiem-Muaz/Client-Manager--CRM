import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, CheckCircle2, FileText, Loader2, Rocket, Save,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { btnGhost, btnPrimary } from '../components/sponsor/ui';
import {
  BlockingIssue, markReadyToFile, runNameCheck, updateIncorporation, useIncorporation, usePscSuggestions,
} from '../hooks/useIncorporations';
import { WIZARD_SECTIONS, WizardData, issuesBySection } from '../components/incorporations/model';
import { ReadinessChecklist, StatusChip } from '../components/incorporations/bits';
import {
  ArticlesSection, CompanySection, DeclarationsSection, NameSection, OfficersSection, OfficeSection,
  PscSection, SharesSection, SicSection,
} from '../components/incorporations/sections';
import { errMsg } from '../lib/errMsg';

const EDITABLE = new Set(['draft', 'ready_to_file', 'rejected']);

/**
 * The incorporation wizard — sectioned like the sponsor WorkerForm: sticky
 * section nav (left) with per-section gate badges, section cards (right).
 * The readiness checklist IS the progress indicator: it renders the same
 * blocking-issue list the backend's /ready gate enforces.
 */
export function IncorporationWizardPage() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { incorporation: inc, isLoading, mutate } = useIncorporation(id);
  const { suggestions } = usePscSuggestions(id);

  const [proposedName, setProposedName] = useState('');
  const [wd, setWd] = useState<WizardData>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [readying, setReadying] = useState(false);
  const [flash, setFlash] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // Hydrate local state from the server record (once per load / after save).
  useEffect(() => {
    if (inc && !dirty) {
      setProposedName(inc.proposedName);
      setWd(inc.wizardData || {});
    }
  }, [inc]); // eslint-disable-line react-hooks/exhaustive-deps

  if (user && user.role === 'client') return <Navigate to="/" replace />;

  const patch = (updates: Partial<WizardData>) => { setWd(prev => ({ ...prev, ...updates })); setDirty(true); };
  const onNameChange = (v: string) => { setProposedName(v); setDirty(true); };

  const issues: BlockingIssue[] = inc?.blockingIssues || [];
  const badges = useMemo(() => issuesBySection(issues), [issues]);
  const editable = inc ? EDITABLE.has(inc.status) : false;
  const nameStale = !!inc?.nameCheck && (dirty ? inc.nameCheck.checked_name !== proposedName : inc.nameCheck.checked_name !== inc.proposedName);

  const say = (kind: 'ok' | 'err', text: string) => { setFlash({ kind, text }); setTimeout(() => setFlash(null), 4000); };

  const save = async (): Promise<boolean> => {
    if (!id || saving) return false;
    setSaving(true);
    try {
      await updateIncorporation(id, { proposedName: proposedName.trim(), wizardData: wd });
      setDirty(false);
      await mutate();
      return true;
    } catch (e: any) {
      say('err', errMsg(e));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const check = async () => {
    if (!id || checking) return;
    setChecking(true);
    try {
      if (dirty && !(await save())) return;
      await runNameCheck(id);
      await mutate();
    } catch (e: any) {
      say('err', errMsg(e));
    } finally {
      setChecking(false);
    }
  };

  const ready = async () => {
    if (!id || readying) return;
    setReadying(true);
    try {
      if (dirty && !(await save())) return;
      await markReadyToFile(id);
      await mutate();
      say('ok', 'Marked ready to file.');
    } catch (e: any) {
      await mutate(); // 422 refreshed blocking_issues server-side
      say('err', e?.blocking ? `${e.blocking.length} item${e.blocking.length === 1 ? '' : 's'} still block filing — see the checklist.` : errMsg(e));
    } finally {
      setReadying(false);
    }
  };

  const jump = (sid: string) => document.getElementById(`inc-sec-${sid}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (isLoading || !inc) {
    return <div className="p-10 flex items-center justify-center gap-2 text-slate-400 text-sm">{isLoading ? <><Loader2 size={16} className="animate-spin" />Loading…</> : 'Incorporation not found.'}</div>;
  }

  const sectionBody = (sid: string): React.ReactNode => {
    switch (sid) {
      case 'name': return <NameSection proposedName={proposedName} onNameChange={onNameChange} nameCheck={inc.nameCheck} nameStale={nameStale} onRunCheck={check} checking={checking} />;
      case 'company': return <CompanySection wd={wd} patch={patch} />;
      case 'office': return <OfficeSection wd={wd} patch={patch} />;
      case 'officers': return <OfficersSection wd={wd} patch={patch} />;
      case 'shares': return <SharesSection wd={wd} patch={patch} />;
      case 'pscs': return <PscSection wd={wd} patch={patch} suggestions={suggestions} />;
      case 'articles': return <ArticlesSection wd={wd} patch={patch} />;
      case 'sic': return <SicSection wd={wd} patch={patch} />;
      case 'declarations': return <DeclarationsSection wd={wd} patch={patch} />;
      default: return null;
    }
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <button onClick={() => navigate('/incorporations')} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 mb-1">
            <ArrowLeft size={13} />Incorporations
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-[#0F1E3A] truncate">{proposedName || inc.proposedName}</h3>
            <StatusChip status={inc.status} />
            {inc.companyNumber && <span className="text-xs font-mono text-slate-500">No. {inc.companyNumber}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {flash && (
            <span className={`text-xs font-medium px-2.5 py-1.5 rounded-lg ${flash.kind === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{flash.text}</span>
          )}
          {editable && (
            <>
              <button onClick={save} disabled={!dirty || saving} className={btnGhost}>
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{dirty ? 'Save changes' : 'Saved'}
              </button>
              {inc.status === 'draft' && (
                <button onClick={ready} disabled={readying} className={btnPrimary}>
                  {readying ? <Loader2 size={15} className="animate-spin" /> : <Rocket size={15} />}Mark ready to file
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {!editable && (
        <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600">
          <CheckCircle2 size={16} className="text-slate-400" />
          This incorporation is <span className="font-semibold">{inc.status.replace(/_/g, ' ')}</span> — the wizard is read-only. {inc.status === 'submitted' && 'Record the Companies House outcome from the filing step.'}
        </div>
      )}

      {inc.status === 'ready_to_file' && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
          <CheckCircle2 size={16} />Ready to file — the guided WebFiling step is next (documents &amp; filing). Editing below drops it back to draft if a gate re-breaks.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-6 items-start">
        {/* Gate-aware section nav */}
        <nav className="hidden md:block sticky top-2 self-start space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 mb-2">Sections</p>
            <div className="space-y-0.5">
              {WIZARD_SECTIONS.map(s => {
                const Icon = s.icon;
                const n = badges[s.id]?.length || 0;
                return (
                  <button key={s.id} type="button" onClick={() => jump(s.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors">
                    <Icon size={15} className="text-slate-400 flex-shrink-0" />
                    <span className="truncate flex-1">{s.title}</span>
                    {n > 0
                      ? <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold flex items-center justify-center">{n}</span>
                      : <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Checklist + section cards */}
        <div className="space-y-5 min-w-0">
          <ReadinessChecklist issues={issues} onJump={jump} />
          {dirty && issues.length > 0 && (
            <p className="text-[11px] text-slate-400 -mt-3 px-1">The checklist refreshes when you save.</p>
          )}

          <fieldset disabled={!editable} className={editable ? '' : 'opacity-70 pointer-events-none'}>
            <div className="space-y-5">
              {WIZARD_SECTIONS.map(s => {
                const Icon = s.icon;
                return (
                  <section key={s.id} id={`inc-sec-${s.id}`} className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-4">
                    <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
                      <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 flex-shrink-0"><Icon size={15} /></span>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[#0F1E3A] leading-none">{s.title}</h4>
                        {s.blurb && <p className="text-[11px] text-slate-400 mt-1 leading-none">{s.blurb}</p>}
                      </div>
                    </header>
                    <div className="p-5">{sectionBody(s.id)}</div>
                  </section>
                );
              })}
            </div>
          </fieldset>

          {/* Documents — staleness surface (generation & filing arrive next) */}
          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <header className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 bg-slate-50/60">
              <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500"><FileText size={15} /></span>
              <h4 className="text-sm font-semibold text-[#0F1E3A] leading-none">Incorporation pack</h4>
            </header>
            <div className="p-5">
              {inc.documentsGenerated && inc.documentsStale ? (
                <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-300 rounded-xl">
                  <AlertTriangle size={17} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-amber-800">The generated documents predate your latest changes.</p>
                    <p className="text-xs text-amber-700 mt-0.5">Regenerate the pack before filing so the memorandum, minutes, certificates and IN01 summary match this wizard.</p>
                  </div>
                </div>
              ) : inc.documentsGenerated ? (
                <p className="text-sm text-slate-500 flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-500" />Pack generated and up to date ({(inc.documents || []).length} documents).</p>
              ) : (
                <p className="text-sm text-slate-400">Not generated yet. Document generation and the guided WebFiling step arrive with the next build stage.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
