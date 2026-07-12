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
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_off'; vat_rate?: string | number;
}
interface Payload {
  status: string;
  title?: string; introMd?: string | null; scopeMd?: string | null;
  items?: Item[];
  discountPercent?: number | null;
  monthlyTotalPence?: number; annualTotalPence?: number; oneoffTotalPence?: number;
  monthlyVatPence?: number; monthlyGrossPence?: number;
  annualVatPence?: number; annualGrossPence?: number;
  oneoffVatPence?: number; oneoffGrossPence?: number;
  validUntil?: string | null;
  prospect?: { name: string | null; company: string | null };
  firm?: { name: string; logoUrl: string | null; accentColor: string | null; phone?: string | null };
  acceptedAt?: string | null; acceptedByName?: string | null; declinedAt?: string | null;
  hasPdf?: boolean;
  mandateUrl?: string | null; // step-6 seam: rendered when present
}

const money = (pence: any) => '£' + (Number(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const FREQ: Record<string, string> = { monthly: '/month', quarterly: '/quarter', annual: '/year', one_off: 'one-off' };
const FREQ_LABEL: Record<string, string> = { monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annually', one_off: 'One-off' };
const ANNUALISE: Record<string, number> = { monthly: 12, quarterly: 4, annual: 1 };
const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
const lineVat = (net: number, rate: any) => { const r = Number(rate); return Number.isFinite(r) && r > 0 ? Math.round(net * r / 100) : 0; };

// accent → very dark cover bg + a lighter complementary stripe tone
const HEX6 = /^#[0-9a-fA-F]{6}$/;
const hexRgb = (h: string): [number, number, number] => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgbHex = (r: number, g: number, b: number) => '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
const mixHex = (a: string, b: string, t: number) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); };
const coverBgOf = (accent: string) => mixHex(HEX6.test(accent) ? accent : NAVY, '#000000', 0.82);
const stripe2Of = (accent: string) => mixHex(HEX6.test(accent) ? accent : NAVY, '#ffffff', 0.28);

/** Render library scope copy: paragraphs, "What's included:" heading, "• " bullets. */
function ScopeCopy({ text, accent }: { text: string; accent: string }) {
  const lines = String(text).split('\n');
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = (key: string) => {
    if (bullets.length) {
      out.push(<ul key={key} className="mt-1.5 mb-3 space-y-1.5">{bullets.map((b, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] text-slate-600 leading-relaxed"><span style={{ color: accent }} className="mt-0.5">•</span>{b}</li>
      ))}</ul>);
      bullets = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) { flush(`f${i}`); return; }
    if (/^what'?s included:?$/i.test(line)) { flush(`f${i}`); out.push(<p key={`h${i}`} className="mt-3 text-sm font-semibold" style={{ color: accent }}>{line}</p>); return; }
    if (/^[•\-]\s+/.test(line)) { bullets.push(line.replace(/^[•\-]\s+/, '')); return; }
    flush(`f${i}`);
    out.push(<p key={`p${i}`} className="text-[15px] leading-relaxed text-slate-600 mb-2">{line}</p>);
  });
  flush('end');
  return <>{out}</>;
}

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
  const items = d.items || [];
  const coverBg = coverBgOf(accent);
  const stripe2 = stripe2Of(accent);
  const company = d.prospect?.company || d.prospect?.name || 'You';
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const hasVat = items.some(i => lineVat(Number(i.line_total_pence), i.vat_rate) > 0);
  const oneoffGross = Number(d.oneoffGrossPence ?? d.oneoffTotalPence);

  return (
    <>
      {/* ── 1. COVER — full-bleed, bold, no prices ──────────────────────── */}
      <div className="relative w-screen left-1/2 -translate-x-1/2 min-h-screen flex flex-col overflow-hidden" style={{ background: coverBg }}>
        {/* two diagonal accent stripes */}
        <div className="absolute pointer-events-none" style={{ width: '220%', height: 34, background: accent, top: '61%', left: '-60%', transform: 'rotate(-26deg)' }} />
        <div className="absolute pointer-events-none" style={{ width: '220%', height: 34, background: stripe2, top: 'calc(61% + 52px)', left: '-60%', transform: 'rotate(-26deg)' }} />
        <div className="relative max-w-2xl mx-auto w-full px-6 sm:px-10 flex flex-col flex-1 py-14 sm:py-16">
          {d.firm?.logoUrl
            ? <img src={d.firm.logoUrl} alt={d.firm?.name || ''} className="h-12 sm:h-14 object-contain self-start brightness-0 invert" />
            : <p className="text-xl sm:text-2xl font-bold text-white">{d.firm?.name}</p>}
          <div className="mt-auto">
            <p className="text-sm font-bold tracking-[0.35em]" style={{ color: stripe2 }}>PROPOSAL FOR</p>
            <h1 className="mt-3 text-5xl sm:text-6xl font-extrabold text-white uppercase leading-[1.02] break-words">{company}</h1>
          </div>
          <div className="mt-auto pt-16 text-sm text-white/80">
            {d.firm?.name}{d.firm?.phone ? <span className="mx-2">·</span> : null}{d.firm?.phone}
          </div>
        </div>
      </div>

      {/* body (constrained column) */}
      <div className="pt-12">
        {afterHero}

        {/* ── 2. narrative opens ────────────────────────────────────────── */}
        <div className="text-sm text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Prepared for <span className="font-medium text-slate-600">{d.prospect?.name || 'you'}</span>{d.prospect?.company && ` — ${d.prospect.company}`}</span>
          <span>·</span><span>{today}</span>
          {d.validUntil && showValidity && <><span>·</span><span className="inline-flex items-center gap-1"><Clock size={12} />Valid until {fmtDate(d.validUntil)}</span></>}
        </div>

        <section className="mt-8">
          <SectionLabel accent={accent}>About this proposal</SectionLabel>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">
            {d.introMd || `Thank you for the opportunity to work with ${d.prospect?.company || 'you'}. This proposal sets out the services we recommend, exactly what each one covers, and a clear, fixed view of your investment — no surprises, only the support you signed up for.`}
          </p>
        </section>

        {/* ── 3. SCOPE OF WORK — one section per service, rich copy ──────── */}
        <section className="mt-12">
          <SectionLabel accent={accent}>Scope of work</SectionLabel>
          <p className="mt-2 text-sm text-slate-400">What we'll take care of, service by service. Your investment is summarised at the end.</p>
          <div className="mt-7 space-y-9">
            {items.map((i, n) => (
              <div key={n} className={n < items.length - 1 ? 'pb-9 border-b border-slate-100' : ''}>
                <h3 className="text-xl font-bold mb-2.5" style={{ color: accent }}>{i.name}</h3>
                <ScopeCopy text={i.scope_text || 'Scope to be confirmed in your engagement letter.'} accent={accent} />
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. SUMMARY OF FEES — table + total bands ──────────────────── */}
        <section className="mt-12">
          <SectionLabel accent={accent}>Summary of fees</SectionLabel>
          <div className="mt-4 rounded-xl overflow-hidden border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: NAVY }} className="text-white text-[11px] uppercase tracking-wider">
                  <th className="text-left font-semibold px-4 py-3">Services</th>
                  <th className="text-left font-semibold px-3 py-3">Frequency</th>
                  {hasVat && <th className="text-right font-semibold px-3 py-3">Net</th>}
                  {hasVat && <th className="text-right font-semibold px-3 py-3">VAT</th>}
                  <th className="text-right font-semibold px-4 py-3">{hasVat ? 'Total' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i, n) => {
                  const net = Number(i.line_total_pence), vat = lineVat(net, i.vat_rate);
                  return (
                    <tr key={n} className={n % 2 ? 'bg-slate-50/60' : ''}>
                      <td className="px-4 py-3 text-slate-800 font-medium">{i.name}</td>
                      <td className="px-3 py-3 text-slate-500">{FREQ_LABEL[i.frequency] || i.frequency}</td>
                      {hasVat && <td className="px-3 py-3 text-right tabular-nums text-slate-600">{money(net)}</td>}
                      {hasVat && <td className="px-3 py-3 text-right tabular-nums text-slate-600">{money(vat)}</td>}
                      <td className="px-4 py-3 text-right tabular-nums font-semibold text-slate-900">{money(net + vat)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Recurring headline + monthly/annual toggle */}
          {(hasMonthly || hasAnnual) && (
            <div className="mt-5 rounded-xl overflow-hidden" style={{ background: `${accent}0f`, border: `1px solid ${accent}33` }}>
              <div className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your recurring investment</p>
                  <p className="text-3xl font-bold tabular-nums mt-1" style={{ color: accent }}>
                    {money(view === 'annual' || !hasMonthly ? (d.annualGrossPence ?? d.annualTotalPence) : (d.monthlyGrossPence ?? d.monthlyTotalPence))}
                    <span className="text-base font-medium text-slate-400">{view === 'annual' || !hasMonthly ? ' / year' : ' / month'}</span>
                  </p>
                  {hasVat && <p className="text-[11px] text-slate-400 mt-0.5">inclusive of VAT</p>}
                </div>
                {hasMonthly && hasAnnual && (
                  <div className="flex rounded-lg bg-white/70 p-0.5 text-xs font-medium shadow-sm">
                    {(['monthly', 'annual'] as const).map(v => (
                      <button key={v} onClick={() => setView(v)}
                        className={`px-3 py-1.5 rounded-md capitalize transition-colors ${view === v ? 'text-white' : 'text-slate-500'}`}
                        style={view === v ? { background: accent } : undefined}>{v}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* One-off band (only when non-zero) */}
          {oneoffGross > 0 && (
            <div className="mt-3 flex items-center justify-between px-5 py-4 rounded-xl text-white" style={{ background: NAVY }}>
              <span className="text-sm font-semibold">One-off Total</span>
              <span className="text-xl font-bold tabular-nums">{money(oneoffGross)}</span>
            </div>
          )}

          {(d.discountPercent || hasVat) && (
            <p className="mt-3 text-xs text-slate-400">
              {d.discountPercent ? `Includes a ${d.discountPercent}% discount. ` : ''}
              {hasVat ? 'Total figures are inclusive of VAT.' : ''}
            </p>
          )}

          {d.scopeMd && (
            <div className="mt-6">
              <p className="text-xs font-semibold text-slate-500">Assumptions &amp; notes</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400 whitespace-pre-line">{d.scopeMd}</p>
            </div>
          )}

          {pdfHref && (
            <a href={pdfHref} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
              <Download size={15} />Download as PDF
            </a>
          )}
        </section>

        {/* ── 5. NEXT STEPS ─────────────────────────────────────────────── */}
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
      </div>
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
