import React, { useState, useEffect, useRef } from 'react';
import { Loader2, UploadCloud, Building2, Check } from 'lucide-react';
import { useFirmSettings, updateFirmSettings, uploadFirmLogo, FirmSettings } from '../../hooks/useFirmSettings';
import { errMsg } from '../../lib/errMsg';

const field = 'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400';

export function FirmSettingsTab() {
  const { firm, isLoading, mutate } = useFirmSettings();
  const [form, setForm] = useState<Partial<FirmSettings>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (firm) setForm(firm); }, [firm]);
  const set = (k: keyof FirmSettings, v: string) => { setForm(p => ({ ...p, [k]: v })); setSaved(false); };

  const save = async () => {
    setSaving(true); setError(null); setSaved(false);
    try {
      await updateFirmSettings({
        name: form.name, address_line1: form.address_line1, address_line2: form.address_line2,
        city: form.city, postcode: form.postcode, phone: form.phone,
        email: form.email, practice_license_number: form.practice_license_number, website: form.website,
        brand_accent_color: form.brand_accent_color || null,
      });
      await mutate(); setSaved(true);
    } catch (e: any) { setError(errMsg(e, 'Failed to save firm settings')); }
    finally { setSaving(false); }
  };

  const onLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\/(png|jpe?g)$/i.test(f.type)) { setError('Logo must be a PNG or JPG image'); return; }
    if (f.size > 2 * 1024 * 1024) { setError('Logo must be under 2MB'); return; }
    setUploading(true); setError(null);
    try { await uploadFirmLogo(f); await mutate(); }
    catch (err: any) { setError(errMsg(err, 'Logo upload failed')); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  if (isLoading) return <div className="py-12 text-center text-slate-400"><Loader2 className="animate-spin inline mr-2" /> Loading firm settings…</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Firm Settings</h3>
        <p className="text-slate-500 text-sm">Your firm details appear on engagement letters and the client signing page.</p>
      </div>

      {/* Logo */}
      <div>
        <label className="text-sm font-semibold text-slate-700 block mb-2">Firm Logo</label>
        <div className="flex items-center gap-5">
          <div className="w-32 h-20 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
            {form.logo_url
              ? <img src={form.logo_url} alt="Firm logo" className="max-h-16 max-w-28 object-contain" />
              : <Building2 className="text-slate-300" size={28} />}
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg" onChange={onLogo} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {form.logo_url ? 'Change logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-slate-400 mt-1.5">PNG or JPG, max 2MB.</p>
          </div>
        </div>
      </div>

      {/* Firm details */}
      <div className="grid grid-cols-2 gap-4">
        <Labeled label="Firm name" full><input value={form.name || ''} onChange={e => set('name', e.target.value)} className={field} /></Labeled>
        <Labeled label="Address line 1" full><input value={form.address_line1 || ''} onChange={e => set('address_line1', e.target.value)} className={field} /></Labeled>
        <Labeled label="Address line 2" full><input value={form.address_line2 || ''} onChange={e => set('address_line2', e.target.value)} className={field} /></Labeled>
        <Labeled label="City"><input value={form.city || ''} onChange={e => set('city', e.target.value)} className={field} /></Labeled>
        <Labeled label="Postcode"><input value={form.postcode || ''} onChange={e => set('postcode', e.target.value)} className={field} /></Labeled>
        <Labeled label="Phone"><input value={form.phone || ''} onChange={e => set('phone', e.target.value)} className={field} /></Labeled>
        <Labeled label="Email"><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="hello@taxxdigital.co.uk" className={field} /></Labeled>
        <Labeled label="Practice reference (ICAEW/ACCA)" full><input value={form.practice_license_number || ''} onChange={e => set('practice_license_number', e.target.value)} className={field} /></Labeled>
        <Labeled label="Brand accent colour" full>
          {/* ONE accent applied to a designed palette (proposal hero/totals/buttons) — not a theme editor. */}
          <div className="flex items-center gap-3">
            <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(form.brand_accent_color || '') ? form.brand_accent_color! : '#1a365d'}
              onChange={e => set('brand_accent_color', e.target.value)}
              className="h-9 w-12 rounded-lg border border-slate-200 cursor-pointer bg-white p-1" />
            <input value={form.brand_accent_color || ''} onChange={e => set('brand_accent_color', e.target.value)}
              placeholder="#1a365d (default navy)" className={`${field} font-mono max-w-[160px]`} />
            <div className="flex-1 rounded-lg border border-slate-200 overflow-hidden">
              <div className="h-2" style={{ background: /^#[0-9a-fA-F]{6}$/.test(form.brand_accent_color || '') ? form.brand_accent_color! : '#1a365d' }} />
              <p className="px-3 py-1.5 text-[11px] text-slate-400">Live preview — proposal hero rule, totals and buttons use this.</p>
            </div>
          </div>
        </Labeled>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save firm settings'}
        </button>
        {saved && <span className="text-sm text-emerald-600 inline-flex items-center gap-1"><Check size={15} /> Saved</span>}
      </div>
    </div>
  );
}

function Labeled({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return <div className={`space-y-1 ${full ? 'col-span-2' : ''}`}><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>{children}</div>;
}
