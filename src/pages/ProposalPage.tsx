import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Clock, Download, FileText, Loader2, XCircle,
} from 'lucide-react';

/**
 * PUBLIC proposal page — /proposal/:token (no auth; the token is the secret).
 * The firm's shop window: the prospect reads, toggles monthly/annual, accepts
 * (engagement-signing evidence standard) or declines. SigningPage's
 * architecture; the design deliberately elevated — the accent colour
 * (organisations.brand_accent_color) applied to a fixed palette: hero rule,
 * section eyebrows, totals, primary button. Mobile-first.
 */

const API_ROOT = (import.meta.env.VITE_NEXTGEN_API_URL || 'https://lumina-tax-monorepo-production.up.railway.app/api').replace(/\/api\/?$/, '');
const NAVY = '#1a365d';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Item {
  name: string; scope_text: string | null; pricing_model: string;
  quantity: string | number; unit_price_pence: string | number; line_total_pence: string | number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off';
}
interface Payload {
  status: string;
  title?: string; introMd?: string | null; scopeMd?: string | null;
  items?: Item[];
  discountPercent?: number | null;
  monthlyTotalPence?: number; annualTotalPence?: number; oneoffTotalPence?: number;
  validUntil?: string | null;
  prospect?: { name: string | null; company: string | null };
  firm?: { name: string; logoUrl: string | null; accentColor: string | null };
  acceptedAt?: string | null; acceptedByName?: string | null; declinedAt?: string | null;
  hasPdf?: boolean;
  mandateUrl?: string | null; // step-6 seam: rendered when present
}

const money = (pence: any) => '£' + (Number(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FREQ: Record<string, string> = { monthly: '/month', quarterly: '/quarter', annual: '/year', one_off: 'one-off' };
const ANNUALISE: Record<string, number> = { monthly: 12, quarterly: 4, annual: 1 };
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

export function ProposalPage() {
  const { token } = useParams<{ token: string }>();
  const [phase, setPhase] = useState<'loading' | 'view' | 'accepted' | 'declined' | 'expired' | 'unavailable' | 'notfound' | 'error'>('loading');
  const [data, setData] = useState<Payload | null>(null);
  const [justAccepted, setJustAccepted] = useState<{ email: string } | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`${API_ROOT}/p/${token}`);
      if (res.status === 404) return setPhase('notfound');
      const json = await res.json();
      const d: Payload = json?.data || {};
      setData(d);
      if (d.status === 'expired') setPhase('expired');
      else if (d.status === 'unavailable') setPhase('unavailable');
      else if (d.status === 'accepted') setPhase('accepted');
      else if (d.status === 'declined') setPhase('declined');
      else if (d.status === 'sent' || d.status === 'viewed') setPhase('view');
      else setPhase('error');
    } catch {
      setPhase('error');
    }
  };
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const accent = data?.firm?.accentColor && HEX_RE.test(data.firm.accentColor) ? data.firm.accentColor : NAVY;

  if (phase === 'loading') {
    return <Shell accent={NAVY}><div className="py-24 flex justify-center text-slate-400"><Loader2 size={22} className="animate-spin" /></div></Shell>;
  }
  if (phase === 'notfound' || phase === 'error') {
    return <Terminal accent={NAVY} icon={AlertTriangle} tone="text-slate-400" title="Link not found"
      body="This proposal link isn't recognised. Please check the link in your email, or contact the practice." />;
  }
  if (phase === 'unavailable') {
    return <Terminal accent={accent} icon={FileText} tone="text-slate-400" title="No longer available"
      body="This proposal has been withdrawn. Please contact the practice for an up-to-date version." firm={data?.firm} />;
  }
  if (phase === 'expired') {
    return <Terminal accent={accent} icon={Clock} tone="text-amber-500" title="This proposal has expired"
      body="The acceptance window has closed — but that doesn't mean the door has. Get in touch and we'll refresh it for you." firm={data?.firm} />;
  }
  if (phase === 'declined') {
    return <Terminal accent={accent} icon={XCircle} tone="text-slate-400" title="Proposal declined"
      body="You've declined this proposal. If circumstances change, we'd be glad to hear from you." firm={data?.firm} />;
  }

  const d = data!;
  return (
    <Shell accent={accent} firm={d.firm}>
      <ProposalContent
        d={d}
        accent={accent}
        showValidity={phase === 'view'}
        showNextSteps={phase === 'view'}
        pdfHref={d.hasPdf ? `${API_ROOT}/p/${token}/pdf` : null}
        afterHero={phase === 'accepted' ? (
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={22} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900">
                {justAccepted ? 'Accepted — thank you!' : `Accepted by ${d.acceptedByName || 'you'} on ${fmtDate(d.acceptedAt)}`}
              </p>
              <div className="text-sm text-emerald-800 mt-2 space-y-1.5">
                <p><span className="font-medium">What happens next:</span></p>
                <p>1. Your engagement letter is on its way{justAccepted ? ` to ${justAccepted.email}` : ''} — a quick e-sign and we're official.</p>
                <p>2. We'll set up your client workspace and be in touch within one working day.</p>
              </div>
              {d.mandateUrl && (
                <a href={d.mandateUrl} className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm" style={{ background: accent }}>
                  Set up your direct debit
                </a>
              )}
            </div>
          </div>
        </div>
        ) : null}
      />

      {phase === 'view' && <AcceptPanel accent={accent} token={token!} firmName={d.firm?.name || ''} onAccepted={(email) => { setJustAccepted({ email }); setPhase('accepted'); }} onDeclined={() => setPhase('declined')} onStale={load} />}

      <footer className="mt-12 pb-10 text-center text-xs text-slate-400">
        {d.firm?.name} — this proposal is a summary of services and fees; formal terms follow in your engagement letter.
      </footer>
    </Shell>
  );
}

/**
 * The proposal body — exported so the BUILDER's preview renders the exact
 * same component the prospect sees (faithful by construction).
 *
 * NARRATIVE STRUCTURE (redesign 2026-07-11): a story that ends in a price —
 * 1 COVER (no prices) → 2 ABOUT THIS PROPOSAL → 3 SCOPE OF WORK (one
 * subsection per service, real paragraphs, no prices) → 4 YOUR INVESTMENT
 * (fees + toggle + totals; never a £0.00 monthly headline) → 5 NEXT STEPS.
 */
export function ProposalContent({ d, accent, afterHero, pdfHref, showValidity, showNextSteps }: {
  d: Payload; accent: string; afterHero?: React.ReactNode; pdfHref?: string | null; showValidity?: boolean; showNextSteps?: boolean;
}) {
  const hasMonthly = Number(d.monthlyTotalPence) > 0;
  const hasAnnual = Number(d.annualTotalPence) > 0;
  const [view, setView] = useState<'monthly' | 'annual'>(hasMonthly ? 'monthly' : 'annual');
  const recurring = useMemo(() => (d.items || []).filter(i => i.frequency !== 'one_off'), [d]);
  const oneOff = useMemo(() => (d.items || []).filter(i => i.frequency === 'one_off'), [d]);
  const items = d.items || [];
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      {/* ── 1. COVER — the handshake; no prices ─────────────────────────── */}
      <header className="pt-14 sm:pt-20 pb-12 sm:pb-16 min-h-[55vh] flex flex-col">
        {d.firm?.logoUrl
          ? <img src={d.firm.logoUrl} alt={d.firm?.name || ''} className="h-12 sm:h-16 object-contain self-start" />
          : <p className="text-2xl font-bold" style={{ color: NAVY }}>{d.firm?.name}</p>}
        <div className="h-[3px] w-full mt-7 rounded-full" style={{ background: accent }} />
        <div className="mt-14 sm:mt-20">
          <p className="text-xs font-semibold tracking-[0.3em]" style={{ color: accent }}>PROPOSAL</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-slate-900 leading-[1.1]">{d.title}</h1>
          <p className="mt-5 text-lg text-slate-500 leading-relaxed">
            Prepared for <span className="font-semibold text-slate-700">{d.prospect?.name || 'you'}</span>
            {d.prospect?.company && <><br /><span className="text-slate-600">{d.prospect.company}</span></>}
          </p>
        </div>
        <div className="mt-auto pt-12 text-sm text-slate-400 space-y-0.5">
          <p>{today}{d.validUntil && showValidity && <span className="inline-flex items-center gap-1.5 ml-3 text-slate-400"><Clock size={12} />Valid until {fmtDate(d.validUntil)}</span>}</p>
          <p className="font-medium text-slate-500">Prepared by {d.firm?.name}</p>
        </div>
      </header>

      {afterHero}

      {/* ── 2. INTRODUCTION ─────────────────────────────────────────────── */}
      <section className="pt-2">
        <SectionLabel accent={accent}>About this proposal</SectionLabel>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
          {d.introMd || `Thank you for the opportunity to work with ${d.prospect?.company || 'you'}. This proposal sets out the services we recommend, exactly what each one covers, and a clear, fixed view of your investment — no surprises, only the support you signed up for.`}
        </p>
      </section>

      {/* ── 3. SCOPE OF WORK — per service, no prices ───────────────────── */}
      <section className="mt-12">
        <SectionLabel accent={accent}>Scope of work</SectionLabel>
        <p className="mt-2 text-sm text-slate-400">What we'll take care of, service by service. Fees follow below.</p>
        <div className="mt-6 space-y-7">
          {items.map((i, n) => {
            const qty = Number(i.quantity);
            return (
              <div key={n}>
                <h3 className="text-lg font-bold text-slate-900">
                  <span className="tabular-nums mr-2" style={{ color: accent }}>{n + 1}.</span>{i.name}
                </h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-slate-600 whitespace-pre-line">
                  {i.scope_text || 'Scope to be confirmed in your engagement letter.'}
                  {i.pricing_model === 'per_unit' && qty !== 1 && <span className="text-slate-400"> Sized for approximately {qty} units.</span>}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 4. YOUR INVESTMENT ──────────────────────────────────────────── */}
      <section className="mt-12">
        <SectionLabel accent={accent}>Your investment</SectionLabel>
        <div className="mt-4 rounded-2xl overflow-hidden border border-slate-200">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Fees</p>
            {hasMonthly && (
              <div className="flex rounded-lg bg-slate-200/70 p-0.5 text-xs font-medium">
                {(['monthly', 'annual'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3 py-1.5 rounded-md capitalize transition-colors ${view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {recurring.map((i, n) => {
              const line = Number(i.line_total_pence);
              const shown = view === 'annual' ? line * (ANNUALISE[i.frequency] || 1) : line;
              return (
                <div key={n} className="flex items-baseline justify-between px-5 py-3 text-sm">
                  <span className="text-slate-600">{i.name}{view === 'monthly' && i.frequency !== 'monthly' && <span className="text-slate-400"> ({FREQ[i.frequency].slice(1)})</span>}</span>
                  <span className="tabular-nums font-medium text-slate-800">
                    {money(shown)}<span className="text-slate-400 font-normal">{view === 'annual' ? '/year' : FREQ[i.frequency]}</span>
                  </span>
                </div>
              );
            })}
            {oneOff.map((i, n) => (
              <div key={`o${n}`} className="flex items-baseline justify-between px-5 py-3 text-sm">
                <span className="text-slate-600">{i.name} <span className="text-slate-400">(one-off)</span></span>
                <span className="tabular-nums font-medium text-slate-800">{money(i.line_total_pence)}</span>
              </div>
            ))}
            {d.discountPercent ? (
              <div className="flex items-baseline justify-between px-5 py-3 text-sm">
                <span className="font-medium" style={{ color: accent }}>Discount applied</span>
                <span className="font-medium" style={{ color: accent }}>−{d.discountPercent}%</span>
              </div>
            ) : null}
          </div>
          {/* Headline total — only a total that actually applies, never £0.00 */}
          <div className="px-5 py-4" style={{ background: `${accent}0d`, borderTop: `2px solid ${accent}` }}>
            {(hasMonthly || hasAnnual) && (
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-700">{view === 'annual' || !hasMonthly ? 'Annual investment' : 'Monthly total'}</span>
                <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>
                  {money(view === 'annual' || !hasMonthly ? d.annualTotalPence : d.monthlyTotalPence)}
                  <span className="text-sm font-medium text-slate-400">{view === 'annual' || !hasMonthly ? '/year' : '/month'}</span>
                </span>
              </div>
            )}
            {Number(d.oneoffTotalPence) > 0 && (
              (hasMonthly || hasAnnual)
                ? <p className="text-xs text-slate-500 mt-1 text-right">+ {money(d.oneoffTotalPence)} one-off</p>
                : <div className="flex items-baseline justify-between">
                    <span className="text-sm font-semibold text-slate-700">One-off total</span>
                    <span className="text-2xl font-bold tabular-nums" style={{ color: accent }}>{money(d.oneoffTotalPence)}</span>
                  </div>
            )}
          </div>
        </div>

        {d.scopeMd && (
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-500">Assumptions &amp; notes</p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400 whitespace-pre-line">{d.scopeMd}</p>
          </div>
        )}

        {pdfHref && (
          <a href={pdfHref} className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
            <Download size={15} />Download as PDF
          </a>
        )}
      </section>

      {/* ── 5. NEXT STEPS (live proposals; accepted view has its own) ───── */}
      {showNextSteps && (
        <section className="mt-12">
          <SectionLabel accent={accent}>Next steps</SectionLabel>
          <ol className="mt-4 space-y-2.5 text-[15px] text-slate-700">
            {[
              'Accept this proposal below — it takes under a minute.',
              'Your engagement letter arrives by email for a quick e-signature.',
              'We set up your client workspace, key dates and reminders.',
              'Where direct debit is offered, fees then take care of themselves.',
            ].map((s, n) => (
              <li key={n} className="flex gap-3">
                <span className="font-bold tabular-nums" style={{ color: accent }}>{n + 1}.</span>{s}
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

function Shell({ accent, firm, children }: { accent: string; firm?: Payload['firm']; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50" style={{ borderTop: `4px solid ${accent}` }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-8">{children}{firm ? null : null}</div>
    </div>
  );
}

function Terminal({ accent, icon: Icon, tone, title, body, firm }: {
  accent: string; icon: any; tone: string; title: string; body: string; firm?: Payload['firm'];
}) {
  return (
    <Shell accent={accent}>
      <div className="py-24 text-center">
        {firm?.logoUrl ? <img src={firm.logoUrl} alt="" className="h-10 object-contain mx-auto mb-8" />
          : firm?.name ? <p className="text-lg font-bold mb-8" style={{ color: NAVY }}>{firm.name}</p> : null}
        <Icon size={40} className={`mx-auto ${tone}`} />
        <h1 className="mt-4 text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">{body}</p>
      </div>
    </Shell>
  );
}

function SectionLabel({ accent, children }: { accent: string; children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold tracking-[0.18em] uppercase" style={{ color: accent }}>{children}</p>;
}


function AcceptPanel({ accent, token, firmName, onAccepted, onDeclined, onStale }: {
  accent: string; token: string; firmName: string;
  onAccepted: (email: string) => void; onDeclined: () => void; onStale: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const field = 'w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent';

  const accept = async () => {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`${API_ROOT}/p/${token}/accept`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), agree: agreed }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return onAccepted(email.trim());
      if (res.status === 409 || res.status === 410) return onStale(); // someone got there first / expired — refetch truth
      setError(json?.error || 'Something went wrong — please try again.');
    } catch {
      setError('Connection problem — please try again.');
    } finally {
      setBusy(false);
    }
  };

  const decline = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_ROOT}/p/${token}/decline`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      if (res.ok) return onDeclined();
      onStale();
    } catch {
      setError('Connection problem — please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-10 rounded-2xl bg-white border border-slate-200 shadow-sm p-5 sm:p-7">
      <h2 className="text-lg font-bold text-slate-900">Accept this proposal</h2>
      <p className="text-sm text-slate-500 mt-1">Takes under a minute — your name and email act as your signature.</p>
      <div className="mt-5 space-y-3.5">
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name"
          className={field} style={{ ['--tw-ring-color' as any]: accent }} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" type="email" autoComplete="email"
          className={field} style={{ ['--tw-ring-color' as any]: accent }} />
        <label className="flex items-start gap-3 text-sm text-slate-600 cursor-pointer select-none">
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-4.5 w-4.5 rounded" style={{ accentColor: accent }} />
          <span>I agree to the services and fees set out in this proposal and authorise {firmName || 'the practice'} to prepare our engagement letter.</span>
        </label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button onClick={accept} disabled={!name.trim() || !email.trim() || !agreed || busy}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white font-semibold shadow-sm disabled:opacity-40 transition-opacity inline-flex items-center justify-center gap-2"
          style={{ background: accent }}>
          {busy && <Loader2 size={16} className="animate-spin" />}Accept proposal
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-100">
        {!declining ? (
          <button onClick={() => setDeclining(true)} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
            Not right for you? Decline this proposal
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">We'd genuinely value knowing why (optional):</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} placeholder="e.g. going with another firm, timing, budget…"
              className={`${field} resize-none`} />
            <div className="flex gap-2">
              <button onClick={decline} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 border border-rose-100 hover:bg-rose-100 disabled:opacity-50">
                Confirm decline
              </button>
              <button onClick={() => setDeclining(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
