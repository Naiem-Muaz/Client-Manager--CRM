import React, { useState } from 'react';
import { Inbox, Copy, Check, RefreshCw, Loader2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { useInboxSettings, updateInboxSettings, rotateInboxToken } from '../../hooks/useInbox';
import { errMsg } from '../../lib/errMsg';

/**
 * Shared-inbox settings (design §10): the per-firm ingest address, forwarding
 * instructions, retention, and token rotation. The tab only renders for roles
 * holding inbox.settings (SetupPage gates it, sponsor-tab idiom); enforcement
 * stays the backend's job (requireCapability('inbox.settings')).
 */
export function InboxSettingsTab() {
  const { settings, isLoading, mutate } = useInboxSettings();
  const [copied, setCopied] = useState(false);
  const [retention, setRetention] = useState<string | null>(null); // null = untouched
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gmailOpen, setGmailOpen] = useState(false);
  const [m365Open, setM365Open] = useState(false);

  if (isLoading || !settings) {
    return <div className="text-slate-400 text-sm flex items-center gap-2 py-8"><Loader2 className="animate-spin" size={16} /> Loading…</div>;
  }

  const copyAddress = async () => {
    if (!settings.address) return;
    try {
      await navigator.clipboard.writeText(settings.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable — the address is still visible to select */ }
  };

  const retentionValue = retention !== null ? retention : (settings.retentionDays === null ? '' : String(settings.retentionDays));

  const saveRetention = async () => {
    setSaving(true);
    setError(null);
    try {
      const v = retentionValue.trim() === '' ? null : parseInt(retentionValue, 10);
      await updateInboxSettings({ retentionDays: v });
      setRetention(null);
      setNotice('Retention updated.');
      setTimeout(() => setNotice(null), 2500);
      mutate();
    } catch (e) {
      setError(errMsg(e, 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const rotate = async () => {
    // The consequence must be read before the click lands anywhere.
    const sure = window.confirm(
      'Rotate the ingest address token?\n\n' +
      'The CURRENT address stops working IMMEDIATELY. Mail forwarded to it will bounce ' +
      'until you update the forwarding rule in your shared mailbox to the NEW address.\n\n' +
      'Continue?'
    );
    if (!sure) return;
    setRotating(true);
    setError(null);
    try {
      const r = await rotateInboxToken();
      setNotice(r.message || 'Token rotated — update your mailbox forwarding rule.');
      mutate();
    } catch (e) {
      setError(errMsg(e, 'Rotation failed'));
    } finally {
      setRotating(false);
    }
  };

  const field = 'px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <div className="flex items-center gap-2 mb-1"><Inbox size={18} className="text-blue-600" /><h2 className="text-lg font-bold text-slate-900">Shared Inbox</h2></div>
        <p className="text-sm text-slate-500">Forward your practice mailbox to the ingest address below and every email becomes a triageable item in the Inbox.</p>
      </div>

      {/* Ingest address */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ingest address</p>
        {settings.address ? (
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm font-mono bg-white border border-slate-200 rounded-lg px-3 py-2 select-all">{settings.address}</code>
            <button onClick={copyAddress} className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">
              {copied ? <><Check size={14} className="text-emerald-500" /> Copied</> : <><Copy size={14} /> Copy</>}
            </button>
          </div>
        ) : (
          <p className="text-sm text-amber-700">No ingest address configured yet — apply migration 257 and its backfill first.</p>
        )}
        {!settings.webhookSecretConfigured && (
          <p className="text-xs text-amber-700 flex items-center gap-1"><AlertTriangle size={12} /> Webhook secret is not configured on the server — inbound mail will be rejected until it is.</p>
        )}
      </div>

      {/* Forwarding instructions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forwarding setup</p>
        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
          <div>
            <button onClick={() => setGmailOpen(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {gmailOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Google Workspace (Gmail)
            </button>
            {gmailOpen && (
              <ol className="list-decimal ml-10 mr-4 mb-3 text-sm text-slate-600 space-y-1">
                <li>Admin console → Apps → Google Workspace → Gmail → <em>Routing</em>.</li>
                <li>Add a routing rule for the shared mailbox: <em>Also deliver to</em> → the ingest address above.</li>
                <li>Or per-mailbox: Gmail Settings → <em>Forwarding and POP/IMAP</em> → Add forwarding address → paste the ingest address → confirm the verification email (it will appear in the Inbox here) → choose <em>Forward a copy… and keep a copy</em>.</li>
              </ol>
            )}
          </div>
          <div>
            <button onClick={() => setM365Open(v => !v)} className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
              {m365Open ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Microsoft 365 (Outlook)
            </button>
            {m365Open && (
              <ol className="list-decimal ml-10 mr-4 mb-3 text-sm text-slate-600 space-y-1">
                <li>Exchange admin center → Mail flow → <em>Rules</em> → Add a rule.</li>
                <li>Condition: recipient is the shared mailbox. Action: <em>Bcc the message to</em> → the ingest address above.</li>
                <li>Allow external forwarding for that rule if your outbound spam policy blocks it (Defender → Anti-spam outbound policy).</li>
              </ol>
            )}
          </div>
        </div>
      </div>

      {/* Retention */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Retention</p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="number" min={30} max={3650} value={retentionValue} placeholder="keep forever"
            onChange={e => setRetention(e.target.value)} className={`${field} w-36`} />
          <span className="text-sm text-slate-500">days (30–3650; blank = keep forever)</span>
          <button onClick={saveRetention} disabled={saving || retention === null}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
          </button>
        </div>
        <p className="text-xs text-slate-400">Emails older than this are permanently deleted — including attachments and Done items — by a nightly purge.</p>
      </div>

      {/* Rotation */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Rotate address</p>
        <button onClick={rotate} disabled={rotating || !settings.address}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 disabled:opacity-50">
          {rotating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Rotate ingest token
        </button>
        <p className="text-xs text-slate-400">Generates a new address and invalidates the current one immediately. Use if the address leaks or starts receiving junk directly.</p>
      </div>

      {notice && <p className="text-sm text-emerald-600">{notice}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
