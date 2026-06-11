import React, { useState, useEffect } from 'react';
import { errMsg } from '../../lib/errMsg';
import { X, Loader2 } from 'lucide-react';
import { patchClient } from '../../hooks/useClients';
import { useTeamMembers } from '../../hooks/useTeam';

const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

export function ClientQuickEditDrawer({ client, onClose, onSaved }: { client: any; onClose: () => void; onSaved: () => void }) {
  const { members } = useTeamMembers();
  const [name, setName] = useState(client.legalName || '');
  const [email, setEmail] = useState(client.email || '');
  const [phone, setPhone] = useState(client.phone || '');
  const [entityType, setEntityType] = useState(client.entityType || 'Individual');
  const [assignedStaffId, setAssignedStaffId] = useState(client.assigned_staff_id || '');
  const [assignedManagerId, setAssignedManagerId] = useState(client.assigned_manager_id || '');
  const [riskLevel, setRiskLevel] = useState(client.risk_level || 'low');
  const [mtdStatus, setMtdStatus] = useState(client.mtd_status || 'not-enrolled');
  const [incomeBand, setIncomeBand] = useState(client.income_band || '');
  const [tags, setTags] = useState<string[]>(Array.isArray(client.tags) ? client.tags : []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const addTag = () => { const t = tagInput.trim(); if (t && !tags.includes(t)) setTags([...tags, t]); setTagInput(''); };

  const save = async () => {
    setSaving(true); setError(null);
    try {
      await patchClient(client.id, {
        name, legal_name: name, email: email || null, phone: phone || null,
        entity_type: entityType, assigned_staff_id: assignedStaffId || null, assigned_manager_id: assignedManagerId || null,
        risk_level: riskLevel, mtd_status: mtdStatus, income_band: incomeBand || null, tags,
      });
      onSaved();
    } catch (e: any) { setError(errMsg(e, 'Failed to save')); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Quick edit</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <Field label="Name"><input value={name} onChange={e => setName(e.target.value)} className={field} /></Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} className={field} /></Field>
            <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} className={field} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Entity type">
              <select value={entityType} onChange={e => setEntityType(e.target.value)} className={field}>
                <option value="Individual">Individual</option><option value="Company">Company</option>
              </select>
            </Field>
            <Field label="Risk level">
              <select value={riskLevel} onChange={e => setRiskLevel(e.target.value)} className={field}>
                <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assigned partner">
              <select value={assignedStaffId} onChange={e => setAssignedStaffId(e.target.value)} className={field}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
            <Field label="Assigned manager">
              <select value={assignedManagerId} onChange={e => setAssignedManagerId(e.target.value)} className={field}>
                <option value="">Unassigned</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="MTD status">
              <select value={mtdStatus} onChange={e => setMtdStatus(e.target.value)} className={field}>
                <option value="not-enrolled">Not enrolled</option><option value="mandated">Mandated</option>
                <option value="voluntary">Voluntary</option><option value="exempt">Exempt</option>
              </select>
            </Field>
            <Field label="Income band">
              <select value={incomeBand} onChange={e => setIncomeBand(e.target.value)} className={field}>
                <option value="">Not set</option><option value="under-30k">Under £30k</option>
                <option value="30k-50k">£30k–£50k</option><option value="50k-plus">Over £50k</option>
              </select>
            </Field>
          </div>
          <Field label="Tags">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-xs text-slate-600">
                  {t}<button onClick={() => setTags(tags.filter(x => x !== t))} className="text-slate-400 hover:text-red-500"><X size={11} /></button>
                </span>
              ))}
            </div>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Type a tag, press Enter" className={field} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving} className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2">
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>{children}</div>;
}
