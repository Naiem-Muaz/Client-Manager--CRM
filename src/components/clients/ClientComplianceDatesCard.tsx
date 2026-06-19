import React, { useState } from 'react';
import { entityKey } from '../../lib/entityType';
import { errMsg } from '../../lib/errMsg';
import { CalendarClock, Check, Loader2 } from 'lucide-react';
import { patchClient } from '../../hooks/useClients';
import { useTeamMembers } from '../../hooks/useTeam';

/**
 * Editable compliance dates that feed the deadline engine. Persists directly to the
 * canonical columns on the client (incorporation_date, accounting_period_end,
 * vat_registered, vat_quarter_end) via PATCH /brain/clients/:id.
 */
export function ClientComplianceDatesCard({ client, onSaved }: { client: any; onSaved?: () => void }) {
  const isCompany = entityKey(client.entityType) === 'limited_company';
  const toDateInput = (v: any) => (v ? String(v).slice(0, 10) : '');

  const [incorporationDate, setIncorporationDate] = useState(toDateInput(client.incorporation_date || client.incorporationDate));
  const [accountingPeriodEnd, setAccountingPeriodEnd] = useState(toDateInput(client.accounting_period_end));
  const [vatRegistered, setVatRegistered] = useState(!!client.vat_registered);
  const [vatQuarterEnd, setVatQuarterEnd] = useState(toDateInput(client.vat_quarter_end));
  const [vatStagger, setVatStagger] = useState<string>(client.vat_stagger || '');
  const [vatScheme, setVatScheme] = useState<string>(client.vat_scheme || '');
  const [isEmployer, setIsEmployer] = useState(!!client.is_employer);
  const [payeReference, setPayeReference] = useState<string>(client.paye_reference || '');
  const [payrollFrequency, setPayrollFrequency] = useState<string>(client.payroll_frequency || '');
  const [assignedStaffId, setAssignedStaffId] = useState<string>(client.assigned_staff_id || '');
  const { members } = useTeamMembers();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await patchClient(client.id, {
        incorporation_date: isCompany ? (incorporationDate || null) : undefined,
        accounting_period_end: isCompany ? (accountingPeriodEnd || null) : undefined,
        vat_registered: vatRegistered,
        vat_quarter_end: vatRegistered ? (vatQuarterEnd || null) : null,
        vat_stagger: vatRegistered ? (vatStagger || null) : null,
        vat_scheme: vatRegistered ? (vatScheme || null) : null,
        is_employer: isEmployer,
        paye_reference: isEmployer ? (payeReference || null) : null,
        payroll_frequency: isEmployer ? (payrollFrequency || null) : null,
        assigned_staff_id: assignedStaffId || null,
      });
      setSaved(true);
      onSaved?.();
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(errMsg(e, 'Failed to save'));
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
        <CalendarClock size={18} className="text-slate-400" /> Compliance Dates
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isCompany && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Incorporation date</label>
              <input type="date" value={incorporationDate} onChange={e => setIncorporationDate(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Accounting period end</label>
              <input type="date" value={accountingPeriodEnd} onChange={e => setAccountingPeriodEnd(e.target.value)} className={inputCls} />
            </div>
          </>
        )}

        <div className="space-y-1 flex items-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={vatRegistered} onChange={e => setVatRegistered(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-slate-700">VAT registered</span>
          </label>
        </div>

        {vatRegistered && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VAT quarter end</label>
              <input type="date" value={vatQuarterEnd} onChange={e => setVatQuarterEnd(e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VAT stagger</label>
              <select value={vatStagger} onChange={e => setVatStagger(e.target.value)} className={inputCls}>
                <option value="">— set quarter group —</option>
                <option value="group_1">Group 1 (Mar/Jun/Sep/Dec)</option>
                <option value="group_2">Group 2 (Apr/Jul/Oct/Jan)</option>
                <option value="group_3">Group 3 (May/Aug/Nov/Feb)</option>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual scheme</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">VAT scheme</label>
              <select value={vatScheme} onChange={e => setVatScheme(e.target.value)} className={inputCls}>
                <option value="">— select —</option>
                <option value="standard">Standard</option>
                <option value="annual">Annual accounting</option>
                <option value="flat_rate">Flat rate</option>
              </select>
            </div>
          </>
        )}

        {/* Employer / payroll */}
        <div className="space-y-1 flex items-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isEmployer} onChange={e => setIsEmployer(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
            <span className="text-sm font-medium text-slate-700">Employer (operates PAYE)</span>
          </label>
        </div>
        {isEmployer && (
          <>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PAYE reference</label>
              <input value={payeReference} onChange={e => setPayeReference(e.target.value)} placeholder="123/AB456" className={inputCls} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Payroll frequency</label>
              <select value={payrollFrequency} onChange={e => setPayrollFrequency(e.target.value)} className={inputCls}>
                <option value="">— select —</option>
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Assigned staff</label>
          <select value={assignedStaffId} onChange={e => setAssignedStaffId(e.target.value)} className={inputCls}>
            <option value="">Unassigned</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save dates'}
        </button>
        {saved && <span className="text-emerald-600 text-sm font-medium flex items-center gap-1"><Check size={14} /> Saved</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </div>
  );
}
