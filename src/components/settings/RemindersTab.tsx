import React, { useState } from 'react';
import { Bell, Loader2, Check, AlertTriangle, FileCheck, Send } from 'lucide-react';
import { useReminderSettings, setRemindersEnabled, setTypeOffsets, ReminderTypeSetting } from '../../hooks/useReminders';
import { useFirmSettings, updateFirmSettings } from '../../hooks/useFirmSettings';
import { errMsg } from '../../lib/errMsg';

/**
 * Practice Settings → Reminders: the firm-level on/off (opt-in, default OFF) and
 * the per-deadline-type "days before due" offset editor. The offsets are the
 * source of truth the daily cron scans — editing them here changes when reminders
 * are generated for every client with that deadline type.
 */
export function RemindersTab() {
  const { settings, isLoading } = useReminderSettings();
  const [saving, setSaving] = useState(false);

  if (isLoading || !settings) return <div className="text-slate-400 text-sm flex items-center gap-2 py-6"><Loader2 size={16} className="animate-spin" /> Loading…</div>;

  const toggle = async () => { setSaving(true); try { await setRemindersEnabled(!settings.enabled); } finally { setSaving(false); } };

  const byCategory = settings.types.reduce<Record<string, ReminderTypeSetting[]>>((acc, t) => { (acc[t.category] ||= []).push(t); return acc; }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3"><Bell className="text-blue-600" size={20} /><h3 className="text-lg font-semibold text-slate-900">Client Deadline Reminders</h3></div>

      {/* Firm on/off */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div>
          <div className="font-medium text-slate-900">Enable deadline reminders</div>
          <div className="text-sm text-slate-500">When on, a daily job builds a review queue of reminder emails. Nothing is sent automatically — staff approve each from the Reminders page.</div>
        </div>
        <button role="switch" aria-checked={settings.enabled} onClick={toggle} disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${settings.enabled ? 'bg-blue-600' : 'bg-slate-300'} disabled:opacity-50`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {!settings.enabled && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>Reminders are off. Turn them on once you've reviewed the templates and your clients' contact emails are up to date.</span>
        </div>
      )}

      <DocumentChaseCard />

      {/* Per-type offset editor */}
      <div>
        <div className="font-medium text-slate-900 mb-1">Reminder timing</div>
        <p className="text-sm text-slate-500 mb-3">Days before the due date to generate a reminder, per deadline type. Highest first (e.g. 30, 14, 7, 1).</p>
        <div className="space-y-4">
          {Object.entries(byCategory).map(([cat, types]) => (
            <div key={cat}>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{cat.replace(/_/g, ' ')}</div>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                {types.map((t) => <OffsetRow key={t.id} type={t} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OffsetRow({ type }: { type: ReminderTypeSetting }) {
  const [val, setVal] = useState((type.reminder_offsets_days || []).join(', '));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = val.replace(/\s/g, '') !== (type.reminder_offsets_days || []).join(',');

  const save = async () => {
    const offsets = val.split(',').map((s) => parseInt(s.trim(), 10)).filter((n) => Number.isInteger(n) && n >= 0);
    setSaving(true); setSaved(false);
    try { await setTypeOffsets(type.id, offsets); setSaved(true); setTimeout(() => setSaved(false), 2000); } finally { setSaving(false); }
  };

  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="flex-1 min-w-0"><div className="text-sm font-medium text-slate-800 truncate">{type.name}</div></div>
      <input value={val} onChange={(e) => setVal(e.target.value)} placeholder="30, 14, 7, 1"
        className="w-40 text-sm px-2 py-1.5 border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-100" />
      <button onClick={save} disabled={!dirty || saving}
        className="text-xs font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-300 inline-flex items-center gap-1 w-16 justify-end">
        {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <><Check size={13} /> Saved</> : dirty ? 'Save' : ''}
      </button>
    </div>
  );
}

/**
 * Document-request auto-chase — the firm opt-in for the 08:00 UTC cron.
 *
 * It lives on THIS tab, beside deadline reminders, because the two are the same
 * question to a practice owner: "what do we email clients automatically?" But
 * the copy has to keep them apart, because they are NOT the same promise —
 * deadline reminders build a queue a human approves, and this one SENDS. A
 * toggle that read like its neighbour would be the most expensive kind of
 * ambiguity, so the difference is the first thing the card says.
 */
function DocumentChaseCard() {
  const { firm, isLoading, mutate } = useFirmSettings();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const on = !!firm?.document_chase_enabled;

  const toggle = async () => {
    setSaving(true); setError(null);
    try {
      await updateFirmSettings({ document_chase_enabled: !on });
      await mutate();
    } catch (e) { setError(errMsg(e, 'Could not change that setting.')); }
    finally { setSaving(false); }
  };

  if (isLoading || !firm) return null;

  return (
    <div className="pt-2">
      <div className="flex items-center gap-3 mb-3">
        <FileCheck className="text-blue-600" size={20} />
        <h3 className="text-lg font-semibold text-slate-900">Document Request Chasing</h3>
      </div>

      <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-4">
        <div className="pr-4">
          <div className="font-medium text-slate-900">Chase clients automatically</div>
          <div className="text-sm text-slate-500">
            When on, clients with outstanding document requests are emailed a reminder
            <strong> 3, 7 and 14 days</strong> after the request was sent, then never again.
            {/* Said plainly, because it is the difference from the setting above. */}
            <span className="text-slate-700"> Unlike deadline reminders, these send without review.</span>
            {' '}Chasing stops as soon as a request is complete, cancelled, or turned off on the request itself.
          </div>
        </div>
        <button role="switch" aria-checked={on} onClick={toggle} disabled={saving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-300'} disabled:opacity-50`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      {error && <div className="mt-2 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{error}</div>}

      {on && (
        <div className="mt-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
          <Send size={16} className="mt-0.5 shrink-0" />
          <span>Chase emails are going out automatically. Turn chasing off for a single client from that request's drawer.</span>
        </div>
      )}
    </div>
  );
}
