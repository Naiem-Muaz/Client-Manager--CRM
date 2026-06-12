import React, { useState, useRef, useMemo } from 'react';
import { mutate as globalMutate } from 'swr';
import Papa from 'papaparse';
import { X, UploadCloud, FileText, ChevronRight, ChevronLeft, Loader2, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { NextGenAPI } from '../../api/NextGenAPI';
import { errMsg } from '../../lib/errMsg';

// CRM target fields for the mapping dropdown.
const FIELDS: { value: string; label: string }[] = [
  { value: 'skip', label: 'Skip this column' },
  { value: 'name', label: 'Name' },
  { value: 'legal_name', label: 'Legal name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'entity_type', label: 'Entity type' },
  { value: 'utr', label: 'UTR' },
  { value: 'nino', label: 'NINO' },
  { value: 'company_number', label: 'Company number' },
  { value: 'vat_number', label: 'VAT number' },
  { value: 'address_line1', label: 'Address line 1' },
  { value: 'address_line2', label: 'Address line 2' },
  { value: 'city', label: 'City' },
  { value: 'postcode', label: 'Postcode' },
  { value: 'partner', label: 'Assigned partner' },
  { value: 'services', label: 'Services (→ tags)' },
];
const ALIASES: Record<string, string[]> = {
  name: ['name', 'client name', 'full name'], legal_name: ['legal name', 'company name'],
  email: ['email', 'email address'], phone: ['phone', 'telephone', 'tel'], entity_type: ['type', 'client type', 'entity type'],
  utr: ['utr', 'tax ref', 'unique taxpayer reference'], nino: ['nino', 'national insurance', 'ni number'],
  company_number: ['crn', 'company number', 'registration number'], vat_number: ['vat', 'vat number', 'vat reg'],
  address_line1: ['address', 'address line 1'], address_line2: ['address line 2'], city: ['city', 'town'],
  postcode: ['postcode', 'post code'], partner: ['partner', 'assigned partner'], services: ['services'],
};
const autoMap = (h: string): string => {
  const k = h.trim().toLowerCase();
  for (const [field, al] of Object.entries(ALIASES)) if (al.includes(k)) return field;
  return 'skip';
};

const SAMPLE = 'Client Name,Legal Name,Email,Phone,Entity Type,UTR,NINO,Company Number,VAT Number,Address Line 1,Address Line 2,City,Postcode,Partner,Services\nAcme Trading Ltd,Acme Trading Limited,info@acme.co.uk,020 7946 0000,Limited,1234567890,,12345678,GB123456789,1 High Street,,London,EC1A 1BB,Jane Partner,"Corporation Tax, VAT Returns"\nJohn Smith,,john@example.com,07700 900000,Individual,9876543210,QQ123456C,,,,,Manchester,M1 1AA,Jane Partner,Self Assessment';

type Summary = { total: number; imported: number; skipped: number; errors: { row: number; reason: string }[] };

export function ImportClientsModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const parseFile = (f: File) => {
    setError(null);
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: (res) => {
        const hs = res.meta.fields || [];
        if (!hs.length) { setError('Could not read columns from this file.'); return; }
        setFile(f); setHeaders(hs); setRows(res.data);
        const m: Record<string, string> = {}; hs.forEach(h => { m[h] = autoMap(h); }); setMapping(m);
      },
      error: () => setError('Failed to parse the file. Please upload a valid CSV.'),
    });
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) parseFile(f); };
  const downloadSample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = 'client-import-template.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const missingName = useMemo(() => {
    const nameCol = Object.entries(mapping).find(([, f]) => f === 'name')?.[0];
    if (!nameCol) return rows.length; // no name column mapped → all rows invalid
    return rows.filter(r => !(r[nameCol] || '').trim()).length;
  }, [rows, mapping]);

  const runImport = async () => {
    if (!file) return;
    setImporting(true); setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      const res = await NextGenAPI.post('/brain/clients/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSummary((res.data.data ?? res.data) as Summary);
      globalMutate('/brain/clients');
    } catch (e: any) { setError(errMsg(e, 'Import failed')); }
    finally { setImporting(false); }
  };

  const inputCls = 'px-2 py-1.5 bg-white border border-slate-200 rounded text-sm';

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-900">Import clients</h3>
            <p className="text-xs text-slate-400">Step {summary ? 3 : step} of 3 — {summary ? 'Done' : step === 1 ? 'Upload' : step === 2 ? 'Map columns' : 'Review & import'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Result screen */}
          {summary ? (
            <div className="text-center py-6">
              <CheckCircle className="text-emerald-500 mx-auto mb-3" size={44} />
              <h4 className="text-lg font-bold text-slate-900">{summary.imported} client{summary.imported === 1 ? '' : 's'} imported successfully</h4>
              <p className="text-slate-500 text-sm mt-1">{summary.total} rows processed · {summary.skipped} skipped (duplicates) · {summary.errors.length} error{summary.errors.length === 1 ? '' : 's'}</p>
              {summary.errors.length > 0 && (
                <div className="mt-4 text-left bg-red-50 border border-red-100 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {summary.errors.map((e, i) => <div key={i} className="text-xs text-red-700">Row {e.row}: {e.reason}</div>)}
                </div>
              )}
              <button onClick={onClose} className="mt-5 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm">View clients</button>
            </div>
          ) : step === 1 ? (
            <div>
              <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${drag ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}>
                <UploadCloud className="mx-auto text-slate-400 mb-3" size={36} />
                <p className="font-medium text-slate-700">Drag & drop a CSV file, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">CSV with a header row</p>
                <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
              </div>
              {file && <div className="mt-4 flex items-center gap-2 text-sm text-slate-700"><FileText size={16} className="text-blue-600" /> {file.name} — <strong>{rows.length}</strong> rows</div>}
              <button onClick={downloadSample} className="mt-4 text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"><Download size={14} /> Download sample CSV</button>
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
          ) : step === 2 ? (
            <div>
              <p className="text-sm text-slate-500 mb-3">Map each column to a CRM field. We've pre-filled likely matches — adjust as needed.</p>
              <div className="space-y-2 mb-5">
                {headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <div className="w-1/2 text-sm font-medium text-slate-700 truncate">{h}</div>
                    <ChevronRight size={14} className="text-slate-300" />
                    <select value={mapping[h]} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))} className={`${inputCls} w-1/2`}>
                      {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500"><tr>{headers.map(h => <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.slice(0, 5).map((r, i) => <tr key={i}>{headers.map(h => <td key={h} className="px-3 py-1.5 text-slate-600 whitespace-nowrap max-w-[160px] truncate">{r[h]}</td>)}</tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm text-slate-700"><strong>{rows.length - missingName}</strong> rows ready to import.</p>
              {missingName > 0 && <p className="text-sm text-amber-700 mt-2 inline-flex items-center gap-1"><AlertTriangle size={14} /> {missingName} row{missingName === 1 ? '' : 's'} missing a Name will be reported as errors.</p>}
              <p className="text-xs text-slate-400 mt-3">Duplicates (matching email, company number or UTR of an existing client) are detected and skipped during import. Companies with a company number are enriched from Companies House.</p>
              {importing && <div className="mt-5"><div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} /></div><p className="text-xs text-slate-500 mt-2">Importing… this may take a moment for Companies House lookups.</p></div>}
              {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
            </div>
          )}
        </div>

        {!summary && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
            <button onClick={() => step === 1 ? onClose() : setStep((step - 1) as 1 | 2)} className="px-4 py-2 text-slate-600 font-medium hover:bg-white rounded-lg text-sm inline-flex items-center gap-1">
              {step === 1 ? 'Cancel' : <><ChevronLeft size={16} /> Back</>}
            </button>
            {step === 1 && <button onClick={() => setStep(2)} disabled={!file || rows.length === 0} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 text-sm inline-flex items-center gap-1">Next <ChevronRight size={16} /></button>}
            {step === 2 && <button onClick={() => setStep(3)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm inline-flex items-center gap-1">Review <ChevronRight size={16} /></button>}
            {step === 3 && <button onClick={runImport} disabled={importing} className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 text-sm inline-flex items-center gap-2">{importing ? <><Loader2 size={16} className="animate-spin" /> Importing…</> : `Import ${rows.length - missingName} clients`}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
