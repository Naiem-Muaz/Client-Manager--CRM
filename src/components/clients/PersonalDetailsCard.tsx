import React, { useState } from 'react';
import { mutate } from 'swr';
import { User, Pencil, Check, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';
import { patchClient } from '../../hooks/useClients';
import { validateNino, normaliseNino, formatNino, validateDob, formatDob } from '../../lib/personalIdentity';

const inputCls = 'w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

/**
 * ── PERSONAL DETAILS (individuals and sole traders) ─────────────────────────
 *
 * ⚠️ EDITABLE, UNLIKE BUSINESS DETAILS, AND FOR A REASON. A company's record is
 * Companies House's — we display it and refuse to hand-edit it. A person's NINO,
 * date of birth, VAT number and PAYE reference have no external registry: they
 * are first-party facts the practice collects, so the practice must be able to
 * correct them. Same one-input edit pattern as the CRN and UTR fields.
 *
 * The read-only strip below is platform-derived and deliberately NOT editable —
 * it is the client's standing, not a field.
 */
export function PersonalDetailsCard({ client, clientId, onSaved }: {
  client: any; clientId?: string; onSaved?: () => void;
}) {
  const id = clientId || client?.id;
  const [edit, setEdit] = useState(false);
  const [nino, setNino] = useState('');
  const [dob, setDob] = useState('');
  const [vat, setVat] = useState('');
  const [paye, setPaye] = useState('');
  const [errNino, setErrNino] = useState<string | null>(null);
  const [errDob, setErrDob] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * ⛔ A DUPLICATE NINO WARNS. IT DOES NOT BLOCK.
   *
   * Two clients sharing a National Insurance number is usually a transcription
   * error and occasionally a correct record of one — exactly the shape of the
   * four company UTRs found sitting in a personal column, where the VALUES were
   * right and the COLUMN was wrong. Blocking would have refused correct data
   * there. Whether NINO becomes unique is the identity work's ruling; this
   * surface's job is to make the collision visible at the moment it is created.
   */
  const [dupe, setDupe] = useState<{ id: string; name: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const checkDuplicate = async (value: string) => {
    const v = normaliseNino(value);
    setDupe(null);
    if (validateNino(v) || !v) return;          // only ask about a well-formed one
    setChecking(true);
    try {
      const res = await NextGenAPI.get(`/brain/clients/nino-in-use`, { params: { nino: v, exclude: id } });
      const d = res.data?.data;
      setDupe(d?.inUse ? d.client : null);
    } catch {
      // A failed check must not look like "no duplicate found" — it looks like
      // nothing, and the save proceeds. Silence is honest here; a false all-clear
      // would not be.
      setDupe(null);
    } finally { setChecking(false); }
  };

  const start = () => {
    setNino(formatNino(client?.nino) || '');
    setDob(client?.date_of_birth ? String(client.date_of_birth).slice(0, 10) : '');
    setVat(client?.vat_number || '');
    setPaye(client?.paye_reference || '');
    setErr(null); setErrNino(null); setErrDob(null); setDupe(null); setEdit(true);
  };

  const save = async () => {
    const nErr = validateNino(nino); setErrNino(nErr);
    const dErr = validateDob(dob);   setErrDob(dErr);
    if (nErr || dErr) { setErr(null); return; }

    const body = {
      nino: normaliseNino(nino) || null,
      date_of_birth: dob || null,
      vat_number: vat.trim() || null,
      paye_reference: paye.trim() || null,
    };
    setSaving(true); setErr(null);
    try {
      await patchClient(id, body);
      // Repaint the card and the header at once — the shared SWR entry, same
      // approach the CRN/UTR fields use. The refetch stays authoritative.
      await mutate(`/brain/clients/${id}`,
        (cur: any) => (cur ? { ...cur, ...body } : cur), { revalidate: false });
      setEdit(false); onSaved?.();
    } catch (e: any) {
      setErr(e?.response?.data?.error || 'Could not save.');
    } finally { setSaving(false); }
  };

  const Row = ({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) => (
    <div className="space-y-1">
      <span className="text-slate-500 text-xs block">{label}</span>
      <span className={`text-slate-800 ${mono ? 'font-mono' : ''}`}>{value || <span className="text-slate-400">Not provided</span>}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <User size={20} className="text-blue-500" /> Personal Details
        </h3>
        {!edit && (
          <button onClick={start} className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
            <Pencil size={12} /> Edit details
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 text-sm">
        {edit ? (
          <>
            <div className="space-y-1">
              <label className="text-slate-500 text-xs block">National Insurance number</label>
              <input
                value={nino}
                onChange={(e) => { setNino(e.target.value); if (errNino) setErrNino(null); }}
                onBlur={(e) => checkDuplicate(e.target.value)}
                placeholder="AB 12 34 56 C" className={inputCls} autoCapitalize="characters" spellCheck={false}
              />
              {errNino && <p className="mt-1 text-[11px] text-red-600">{errNino}</p>}
              {checking && <p className="mt-1 text-[11px] text-slate-400">Checking…</p>}
              {dupe && (
                <p className="mt-1 text-[11px] text-amber-700 flex items-start gap-1">
                  <AlertTriangle size={12} className="mt-0.5 flex-shrink-0" />
                  <span>Also on <strong>{dupe.name}</strong>. Saving is allowed — check it is not a typo.</span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 text-xs block">Date of birth</label>
              <input type="date" value={dob}
                onChange={(e) => { setDob(e.target.value); if (errDob) setErrDob(null); }}
                className={inputCls} />
              {errDob && <p className="mt-1 text-[11px] text-red-600">{errDob}</p>}
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 text-xs block">VAT number</label>
              <input value={vat} onChange={(e) => setVat(e.target.value)} placeholder="GB123456789" className={inputCls} spellCheck={false} />
            </div>
            <div className="space-y-1">
              <label className="text-slate-500 text-xs block">PAYE reference</label>
              <input value={paye} onChange={(e) => setPaye(e.target.value)} placeholder="123/AB456" className={inputCls} spellCheck={false} />
            </div>
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 pt-1">
              <button onClick={save} disabled={saving}
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded disabled:opacity-40 inline-flex items-center gap-1">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save details
              </button>
              <button onClick={() => { setEdit(false); setErr(null); }}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1.5 inline-flex items-center gap-1">
                <X size={12} /> Cancel
              </button>
              {err && <p className="text-xs text-red-600">{err}</p>}
            </div>
          </>
        ) : (
          <>
            <Row label="National Insurance number" value={formatNino(client?.nino)} mono />
            <Row label="Date of birth" value={formatDob(client?.date_of_birth)} />
            <Row label="VAT number" value={client?.vat_number} mono />
            <Row label="PAYE reference" value={client?.paye_reference} mono />
          </>
        )}
      </div>

      {/* ── Platform standing — derived, never editable here ────────────────── */}
      <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-slate-500 text-xs block mb-1 flex items-center gap-1">
            <ShieldCheck size={12} className="text-slate-400" /> MTD status
          </span>
          <span className="text-slate-800">{client?.mtd_status || <span className="text-slate-400">Not enrolled</span>}</span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">VAT registered</span>
          <span className="text-slate-800">{client?.vat_registered === true ? 'Yes' : client?.vat_registered === false ? 'No' : <span className="text-slate-400">Unknown</span>}</span>
        </div>
        <div>
          <span className="text-slate-500 text-xs block mb-1">Payroll frequency</span>
          <span className="text-slate-800">{client?.payroll_frequency || <span className="text-slate-400">None</span>}</span>
        </div>
      </div>
    </div>
  );
}
