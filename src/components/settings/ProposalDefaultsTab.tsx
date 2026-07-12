import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { useFirmSettings, updateFirmSettings } from '../../hooks/useFirmSettings';
import { errMsg } from '../../lib/errMsg';

/**
 * Proposal defaults — the firm's standard intro + assumptions wording, edited
 * once. Every NEW proposal pre-fills its intro / scope-notes from these (with
 * {firm} {company} {first_name} resolved), and the builder lets them be
 * adjusted per proposal. Blank ⇒ the built-in default is used.
 */

const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 resize-y';

// Mirror of the server-side defaults (shown as the placeholder / reset target).
const DEFAULT_INTRO =
  "Thank you for considering {firm}. It was a pleasure to learn more about {company}, and we're delighted to put this proposal forward.\n\n"
  + "Below you'll find exactly what we recommend, what each service covers, and a clear, fixed view of your investment — no surprises, only the support you need. If anything here needs adjusting, just let us know.";
const DEFAULT_SCOPE =
  "This proposal is based on the information shared with us to date and assumes your records are provided in good order and on time. Our fees are fixed for the period shown and reviewed annually.\n\n"
  + "Anything falling outside the services described will always be discussed and agreed with you before any additional work begins.";

export function ProposalDefaultsTab() {
  const { firm, isLoading, mutate } = useFirmSettings();
  const [intro, setIntro] = useState('');
  const [scope, setScope] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (firm) { setIntro(firm.proposal_intro_template ?? ''); setScope(firm.proposal_scope_template ?? ''); }
  }, [firm]);

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateFirmSettings({ proposal_intro_template: intro.trim() || null, proposal_scope_template: scope.trim() || null });
      await mutate(); setSaved(true);
    } catch (e: any) { setError(errMsg(e, 'Failed to save proposal defaults')); }
    finally { setSaving(false); }
  };

  if (isLoading) return <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-base font-bold text-slate-900">Proposal defaults</h3>
        <p className="text-sm text-slate-500">Your standard wording. Every new proposal starts from this — the builder lets you adjust it per proposal.
          Use <code className="text-xs bg-slate-100 px-1 rounded">{'{firm}'}</code>, <code className="text-xs bg-slate-100 px-1 rounded">{'{company}'}</code>, <code className="text-xs bg-slate-100 px-1 rounded">{'{first_name}'}</code> — they fill in automatically.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-slate-700">Introduction</label>
          <button onClick={() => setIntro(DEFAULT_INTRO)} className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"><RotateCcw size={11} />Use suggested</button>
        </div>
        <textarea value={intro} onChange={e => { setIntro(e.target.value); setSaved(false); }} rows={5} placeholder={DEFAULT_INTRO} className={field} />
        <p className="text-[11px] text-slate-400 mt-1">Blank uses our built-in default. This becomes the “About this proposal” section.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-semibold text-slate-700">Assumptions &amp; notes</label>
          <button onClick={() => setScope(DEFAULT_SCOPE)} className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1"><RotateCcw size={11} />Use suggested</button>
        </div>
        <textarea value={scope} onChange={e => { setScope(e.target.value); setSaved(false); }} rows={4} placeholder={DEFAULT_SCOPE} className={field} />
        <p className="text-[11px] text-slate-400 mt-1">The small print shown under the fee summary (information relied on, validity, how fees are reviewed).</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save proposal defaults'}
        </button>
        {saved && <span className="text-sm text-emerald-600">Saved.</span>}
      </div>
    </div>
  );
}
