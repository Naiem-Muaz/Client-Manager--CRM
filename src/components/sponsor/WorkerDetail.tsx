import React, { useState } from 'react';
import { ArrowLeft, Loader2, Pencil, X, Check, AlertTriangle, PoundSterling, CalendarX, ShieldCheck, Archive, FileArchive } from 'lucide-react';
import { useSponsorWorker, updateWorker, downloadAuditPack } from '../../hooks/useSponsorCompliance';
import { errMsg } from '../../lib/errMsg';
import { fmtDate, fmtMoney, tierChipCls, salaryChip, chipBase, prettify } from './format';
import { SECTIONS, FieldValue, EDITABLE_KEYS, labelFor } from './fields';
import { WorkerForm } from './WorkerForm';
import { SponsorDocuments } from './SponsorDocuments';
import { SponsorAbsences } from './SponsorAbsences';
import { SponsorPayRecords } from './SponsorPayRecords';
import { SponsorRoster } from './SponsorRoster';
import { SponsorSmsReports } from './SponsorSmsReports';

const SUB_TABS = ['Documents', 'Absences', 'Pay records', 'Roster', 'SMS reports'];
const initials = (n?: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();

export function WorkerDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { worker: w, isLoading, mutate } = useSponsorWorker(id);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sub, setSub] = useState('Documents');
  const [packBusy, setPackBusy] = useState(false);

  const genPack = async () => {
    setPackBusy(true); setError(null);
    try { await downloadAuditPack(id); }
    catch (e: any) { setError(errMsg(e, 'Could not generate audit pack')); }
    finally { setPackBusy(false); }
  };

  if (isLoading || !w) return <div className="p-10 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" size={18} /> Loading…</div>;

  const startEdit = () => { const f: any = {}; for (const k of EDITABLE_KEYS) f[k] = w[k] ?? (k === 'contractedWeekdays' ? [] : ''); setForm(f); setError(null); setEditing(true); };
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const save = async () => {
    if (!String(form.fullName || '').trim()) { setError('Full name is required'); return; }
    setSaving(true); setError(null);
    try {
      const payload: any = {}; for (const k of EDITABLE_KEYS) payload[k] = form[k] === '' ? null : form[k];
      await updateWorker(id, payload); mutate(); setEditing(false);
    } catch (e: any) { setError(errMsg(e, 'Could not save')); }
    finally { setSaving(false); }
  };

  const c = w.computed;

  return (
    <div className="space-y-6">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm font-medium"><ArrowLeft size={16} /> All workers</button>
        {editing
          ? <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="px-3.5 py-2 text-slate-600 text-sm font-medium hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5"><X size={15} /> Cancel</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-1.5 shadow-sm">{saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save changes</button>
            </div>
          : <div className="flex gap-2">
              <button onClick={genPack} disabled={packBusy} title="Assemble a consolidated compliance pack (summary + evidence) as a ZIP"
                className="px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-100 rounded-lg inline-flex items-center gap-1.5 border border-slate-200 disabled:opacity-50">
                {packBusy ? <Loader2 size={15} className="animate-spin" /> : <FileArchive size={15} />} {packBusy ? 'Generating…' : 'Generate audit pack'}
              </button>
              <button onClick={startEdit} className="px-4 py-2 text-blue-700 text-sm font-medium hover:bg-blue-50 rounded-lg inline-flex items-center gap-1.5 border border-blue-100"><Pencil size={15} /> Edit record</button>
            </div>}
      </div>

      {/* header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0F1E3A] to-[#2F4A7D] text-white flex items-center justify-center text-lg font-bold shadow-sm">{initials(w.fullName)}</div>
        <div>
          <h2 className="text-2xl font-bold text-[#0F1E3A] leading-tight">{w.fullName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-500">{prettify(w.visaRoute)}</span>
            <span className="text-slate-300">·</span>
            <span className={`${chipBase} bg-slate-100 text-slate-600 border-slate-200`}>{prettify(w.status)}</span>
            {w.nationality && <span className="text-sm text-slate-400">{w.nationality}</span>}
          </div>
        </div>
      </div>
      {error && !editing && <p className="text-sm text-rose-600">{error}</p>}

      {/* alerts */}
      {c?.alerts?.length ? (
        <div className="flex flex-wrap gap-2">
          {c.alerts.map((a: any, i: number) => <span key={i} className={`${chipBase} ${tierChipCls(a.tier)} !py-1.5`}><AlertTriangle size={12} /> {a.message}</span>)}
        </div>
      ) : <div className="inline-flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2"><ShieldCheck size={15} /> No active compliance alerts.</div>}

      {/* computed compliance — the star */}
      {c && <ComplianceStrip w={w} />}

      {/* record: edit form or read-only section cards */}
      {editing ? (
        <>
          <WorkerForm value={form} onChange={set} />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <section key={s.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                <header className="flex items-center gap-2.5 px-5 py-3 border-b border-slate-100">
                  <Icon size={15} className="text-slate-400" />
                  <h4 className="text-sm font-semibold text-[#0F1E3A]">{s.title}</h4>
                </header>
                <dl className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {s.fields.map(f => (
                    <div key={f.k} className={`flex flex-col gap-0.5 ${f.span === 2 || f.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                      <dt className="text-[11px] text-slate-400">{labelFor(f)}</dt>
                      <dd><FieldValue f={f} value={w[f.k]} /></dd>
                    </div>
                  ))}
                </dl>
              </section>
            );
          })}
        </div>
      )}

      {/* sub-sections */}
      <div>
        <div className="flex gap-1 border-b border-slate-200 mb-4 overflow-x-auto">
          {SUB_TABS.map(t => (
            <button key={t} onClick={() => setSub(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${sub === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{t}</button>
          ))}
        </div>
        {sub === 'Documents' && <SponsorDocuments workerId={id} />}
        {sub === 'Absences' && <SponsorAbsences worker={w} onChanged={mutate} />}
        {sub === 'Pay records' && <SponsorPayRecords worker={w} onChanged={mutate} />}
        {sub === 'Roster' && <SponsorRoster worker={w} onChanged={mutate} />}
        {sub === 'SMS reports' && <SponsorSmsReports worker={w} onChanged={mutate} />}
      </div>
    </div>
  );
}

// ── computed compliance strip (stat tiles) ────────────────────────────────────
type Tone = 'good' | 'warn' | 'bad' | 'neutral';
const TILE: Record<Tone, string> = {
  good: 'border-emerald-200 bg-emerald-50/40', warn: 'border-amber-200 bg-amber-50/40',
  bad: 'border-rose-200 bg-rose-50/40', neutral: 'border-slate-200 bg-white',
};
const TILE_ICON: Record<Tone, string> = {
  good: 'bg-emerald-100 text-emerald-600', warn: 'bg-amber-100 text-amber-600',
  bad: 'bg-rose-100 text-rose-600', neutral: 'bg-slate-100 text-slate-500',
};

function Tile({ icon, label, tone, children }: { icon: React.ReactNode; label: string; tone: Tone; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-4 ${TILE[tone]}`}>
      <div className="flex items-center gap-2 mb-2.5">
        <span className={`w-6 h-6 rounded-md flex items-center justify-center ${TILE_ICON[tone]}`}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      </div>
      {children}
    </div>
  );
}

function ComplianceStrip({ w }: { w: any }) {
  const c = w.computed;
  const sc = salaryChip(c.salary?.status);
  const salaryTone: Tone = c.salary?.status === 'meets' ? 'good' : c.salary?.status === 'breach' ? 'bad' : 'neutral';
  const absTone: Tone = c.unauthorisedAbsence?.breaches ? 'bad' : 'neutral';
  const rtwBreach = (c.alerts || []).some((a: any) => a.kind === 'right_to_work_breach');
  const ecsTone: Tone = rtwBreach ? 'bad' : c.ecsGraceDeadline ? 'warn' : 'neutral';

  const gt = Number(w.generalThreshold) || null, gr = Number(w.socGoingRate) || null, h = Number(w.weeklyHours) || null;
  const prorated = gr != null && h ? Math.round(gr * (Math.min(h, 48) / 37.5)) : gr;

  return (
    <div className="bg-slate-50/70 border border-slate-200 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-[#0F1E3A] mb-3">Compliance status</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <Tile icon={<PoundSterling size={14} />} label="Salary" tone={salaryTone}>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-[#0F1E3A] tabular-nums">{fmtMoney(c.requiredSalary)}</span>
            <span className={`${chipBase} ${sc.cls}`}>{sc.label}</span>
          </div>
          {c.requiredSalary != null && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Higher of general {fmtMoney(gt)}{gr != null && <> &amp; going {fmtMoney(gr)}{h ? ` → ${fmtMoney(prorated)} (×${h}/37.5)` : ''}</>}. <span className="text-slate-400">{c.salary?.window}</span>
            </p>
          )}
        </Tile>

        <Tile icon={<CalendarX size={14} />} label="Unauthorised absence" tone={absTone}>
          <div className="flex items-baseline gap-1.5">
            <span className={`text-xl font-bold tabular-nums ${absTone === 'bad' ? 'text-rose-700' : 'text-[#0F1E3A]'}`}>{c.unauthorisedAbsence?.maxStreak || 0}</span>
            <span className="text-xs text-slate-500">consecutive rostered days</span>
          </div>
          <p className="text-[11px] mt-1.5 leading-snug">{c.unauthorisedAbsence?.breaches ? <span className="text-rose-700 font-medium">Reportable to UKVI (&gt;10)</span> : <span className="text-slate-400">Within limit · {prettify(c.unauthorisedAbsence?.rosterType)} roster</span>}</p>
        </Tile>

        <Tile icon={<ShieldCheck size={14} />} label="Right to work / ECS" tone={ecsTone}>
          {rtwBreach
            ? <p className="text-sm font-semibold text-rose-700">RTW breach — visa expired, no in-time extension</p>
            : <>
                <p className="text-sm text-[#0F1E3A]">Next ECS: <span className="font-semibold tabular-nums">{fmtDate(c.nextEcsCheckDue)}</span></p>
                {c.ecsGraceDeadline && <p className="text-[11px] text-amber-700 mt-1">28-day grace to initiate: {fmtDate(c.ecsGraceDeadline)}</p>}
              </>}
        </Tile>

        <Tile icon={<Archive size={14} />} label="Retention" tone="neutral">
          {c.retention?.anchor
            ? <>
                <p className="text-sm text-[#0F1E3A]">Keep until <span className="font-semibold tabular-nums">{fmtDate(c.retention.retainUntil)}</span></p>
                <p className="text-[11px] text-slate-400 mt-1">Anchor {fmtDate(c.retention.anchor)} · GDPR purge {fmtDate(c.retention.purgeDue)}{c.retention.retentionHold ? ' · HOLD' : ''}</p>
              </>
            : <p className="text-sm text-slate-400">Active — clock not started</p>}
        </Tile>
      </div>
    </div>
  );
}
