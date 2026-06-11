import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, User, Building2, Users, ArrowLeft, Info, HelpCircle, AlertCircle } from 'lucide-react';
import { createClient, patchClient } from '../hooks/useClients';

// --- Validation ---

export type WizardErrors = Record<string, string>;

function validateClient(d: any): WizardErrors {
    const e: WizardErrors = {};
    if (d.type === 'Individual') {
        if (!d.firstName?.trim()) e.firstName = 'First name is required';
        if (!d.lastName?.trim()) e.lastName = 'Last name is required';
    } else {
        if (!d.companyName?.trim()) e.companyName = 'Company name is required';
        if (!d.crn?.trim()) e.crn = 'Company number is required';
    }
    if (!d.email?.trim()) e.email = 'Email is required';
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) e.email = 'Enter a valid email address';
    if (!d.utr?.trim()) e.utr = 'UTR is required';
    else if (!/^\d{10}$/.test(d.utr.replace(/\s/g, ''))) e.utr = 'UTR must be 10 digits';
    return e;
}

const STEP_FIELDS = (type: string): Record<number, string[]> => ({
    2: type === 'Individual' ? ['firstName', 'lastName', 'email'] : ['companyName', 'crn', 'email'],
    4: ['utr'],
});

export function FieldError({ name, errors, touched }: { name: string; errors: WizardErrors; touched: Record<string, boolean> }) {
    if (!touched[name] || !errors[name]) return null;
    return (
        <p className="flex items-center gap-1 text-xs text-red-600 mt-1">
            <AlertCircle size={12} /> {errors[name]}
        </p>
    );
}

export const errorRing = (name: string, errors: WizardErrors, touched: Record<string, boolean>) =>
    touched[name] && errors[name] ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500' : '';

export function CreateClientWizard() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        type: 'Individual',
        firstName: '',
        lastName: '',
        companyName: '',
        dateMetadata: '', // DOB or Incorporation
        address: '',
        postcode: '',
        email: '',
        phone: '',
        utr: '',
        crn: '',
        vat: '',
        accountingPeriodEnd: '',
        vatRegistered: false,
        vatQuarterEnd: '',
        entities: []
    });

    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const errors = validateClient(formData);

    const updateData = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

    const touchFields = (fields: string[]) =>
        setTouched(prev => ({ ...prev, ...Object.fromEntries(fields.map(f => [f, true])) }));

    const handleNext = () => {
        const fields = STEP_FIELDS(formData.type)[step] || [];
        const stepHasErrors = fields.some(f => errors[f]);
        if (stepHasErrors) {
            touchFields(fields);
            return;
        }
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        // Mark every validated field touched so any outstanding errors surface.
        const allFields = Object.values(STEP_FIELDS(formData.type)).flat();
        if (Object.keys(errors).length > 0) {
            touchFields(allFields);
            // Jump back to the earliest step with an error.
            const firstBadStep = [2, 4].find(s => (STEP_FIELDS(formData.type)[s] || []).some(f => errors[f]));
            if (firstBadStep) setStep(firstBadStep);
            return;
        }
        try {
            const created = await createClient(formData);
            const newId = created?.data?.id || created?.id;

            // Persist compliance dates to their canonical columns (deadline engine input).
            if (newId) {
                const fields: Record<string, any> = {};
                if (formData.type === 'Company' && formData.dateMetadata) fields.incorporation_date = formData.dateMetadata;
                if (formData.accountingPeriodEnd) fields.accounting_period_end = formData.accountingPeriodEnd;
                if (formData.vatRegistered) {
                    fields.vat_registered = true;
                    if (formData.vatQuarterEnd) fields.vat_quarter_end = formData.vatQuarterEnd;
                }
                if (Object.keys(fields).length > 0) await patchClient(newId, fields).catch(() => {});
            }
            navigate('/clients');
        } catch (err: any) {
            alert(err.message || 'Failed to create client');
        }
    };

    const steps = ['Client Type', 'Identity', 'Entities', 'HMRC Refs', 'Review'];

    return (
        <div className="max-w-6xl mx-auto py-8 px-4">
            {/* Top Bar Navigation */}
            <div className="flex items-center justify-between mb-8">
                <button onClick={() => navigate('/clients')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft size={18} /> <span className="font-medium">Cancel & Exit</span>
                </button>
                <div className="text-sm text-slate-400 font-medium">New Client Onboarding</div>
            </div>

            {/* Stepper */}
            <div className="mb-10 px-4">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-100 -z-10 rounded-full"></div>
                    <div 
                        className="absolute top-1/2 left-0 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-500 ease-in-out"
                        style={{ width: `${((step - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>
                    
                    {steps.map((label, i) => {
                        const stepNum = i + 1;
                        const isActive = step >= stepNum;
                        const isCompleted = step > stepNum;
                        
                        return (
                            <div key={i} className="flex flex-col items-center gap-2 bg-slate-50 px-2 box-border min-w-[100px]">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${
                                    isActive 
                                        ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-110' 
                                        : 'bg-white border-slate-200 text-slate-400'
                                }`}>
                                    {isCompleted ? <Check size={16} strokeWidth={3} /> : stepNum}
                                </div>
                                <span className={`text-xs font-semibold tracking-wide uppercase transition-colors duration-300 ${
                                    isActive ? 'text-blue-700' : 'text-slate-400'
                                }`}>
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* Left Panel: Form Action */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="p-8 flex-1">
                        {step === 1 && <ClientTypeStep data={formData} update={updateData} />}
                        {step === 2 && <IdentityStep data={formData} update={updateData} errors={errors} touched={touched} markTouched={markTouched} />}
                        {step === 3 && <EntitiesStep data={formData} update={updateData} />}
                        {step === 4 && <HMRCRefsStep data={formData} update={updateData} errors={errors} touched={touched} markTouched={markTouched} />}
                        {step === 5 && <ReviewStep data={formData} />}
                    </div>

                    <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-center">
                        <button 
                            onClick={handleBack} 
                            disabled={step === 1}
                            className="px-6 py-2.5 text-slate-600 font-medium hover:bg-white hover:shadow-sm hover:text-slate-800 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
                        >
                            Back
                        </button>
                        
                        {step < 5 ? (
                             <button 
                                onClick={handleNext}
                                className="flex items-center gap-2 px-8 py-2.5 bg-brand-secondary text-white rounded-lg hover:bg-brand-primary font-medium shadow-lg shadow-brand-secondary/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                Continue <ChevronRight size={18} />
                            </button>
                        ) : (
                            <button 
                                onClick={handleSubmit}
                                className="flex items-center gap-2 px-8 py-2.5 bg-brand-accent text-white rounded-lg hover:bg-green-600 font-medium shadow-lg shadow-green-500/20 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                Complete Setup <Check size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Panel: Guidance */}
                <div className="hidden lg:block lg:col-span-1">
                    <GuidancePanel step={step} type={formData.type} />
                </div>
            </div>
        </div>
    );
}

// --- Step Components ---

function ClientTypeStep({ data, update }: any) {
    const types = [
        { id: 'Individual', icon: User, title: 'Individual', desc: 'Sole traders and personal tax clients.' },
        { id: 'Company', icon: Building2, title: 'Limited Company', desc: 'Registered companies (LTD, PLC).' },
        { id: 'Group', icon: Users, title: 'Group', desc: 'Connected entities and holdings.', disabled: true }
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Who are we onboarding?</h2>
                <p className="text-slate-500 mt-1">Select the primary entity type to configure the correct workflow.</p>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                {types.map(t => (
                    <button 
                        key={t.id}
                        disabled={t.disabled}
                        onClick={() => update('type', t.id)}
                        className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-200 flex items-start gap-4 ${
                            data.type === t.id 
                                ? 'border-brand-secondary bg-blue-50/30' 
                                : 'border-slate-100 hover:border-blue-200 bg-white hover:bg-slate-50'
                        } ${t.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                            data.type === t.id ? 'bg-brand-secondary text-white' : 'bg-slate-100 text-slate-400 group-hover:text-brand-secondary'
                        }`}>
                            <t.icon size={24} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg mb-1 ${data.type === t.id ? 'text-brand-secondary' : 'text-slate-900'}`}>{t.title}</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">{t.desc}</p>
                        </div>
                        {data.type === t.id && (
                            <div className="absolute top-6 right-6 text-brand-secondary">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 border border-blue-200">
                                    <Check size={14} strokeWidth={3} />
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}

function IdentityStep({ data, update, errors, touched, markTouched }: any) {
    const [searchQuery, setSearchQuery] = React.useState('');
    const [searchResults, setSearchResults] = React.useState<any[]>([]);
    const [isSearching, setIsSearching] = React.useState(false);
    const [showResults, setShowResults] = React.useState(false);
    const [autoFilled, setAutoFilled] = React.useState(false);
    const [apiFailed, setApiFailed] = React.useState(false);
    const [manualMode, setManualMode] = React.useState(false);
    const searchTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounced search handler
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        setApiFailed(false);

        if (searchTimeout.current) clearTimeout(searchTimeout.current);

        const cleaned = value.replace(/\s/g, '');

        // If it looks like a company number (6-8 digits or 2 letters + 6 digits), do direct lookup
        if (/^\d{6,8}$/.test(cleaned) || /^[A-Z]{2}\d{6}$/i.test(cleaned)) {
            searchTimeout.current = setTimeout(async () => {
                setIsSearching(true);
                const { lookupCompany } = await import('../api/companiesHouse');
                const result = await lookupCompany(cleaned);
                setIsSearching(false);
                if (result) {
                    applyCompanyResult(result.company_name, result.company_number, result.registered_address || '', result.date_of_creation || '');
                } else {
                    setApiFailed(true);
                }
            }, 300);
            return;
        }

        // Otherwise search by name
        if (value.trim().length < 3) {
            setSearchResults([]);
            setShowResults(false);
            return;
        }

        searchTimeout.current = setTimeout(async () => {
            setIsSearching(true);
            const { searchCompanies } = await import('../api/companiesHouse');
            const results = await searchCompanies(value);
            setIsSearching(false);
            if (results.length > 0) {
                setSearchResults(results);
                setShowResults(true);
            } else {
                setSearchResults([]);
                setShowResults(false);
                setApiFailed(true);
            }
        }, 400);
    };

    // Select a search result and do full lookup
    const handleSelectResult = async (result: any) => {
        setShowResults(false);
        setSearchResults([]);
        setIsSearching(true);
        const { lookupCompany } = await import('../api/companiesHouse');
        const info = await lookupCompany(result.company_number);
        setIsSearching(false);
        if (info) {
            applyCompanyResult(info.company_name, info.company_number, info.registered_address || '', info.date_of_creation || '');
        } else {
            // Fall back to search result data
            applyCompanyResult(result.company_name, result.company_number, result.address_snippet || '', '');
        }
    };

    // Apply company data to form
    const applyCompanyResult = (name: string, number: string, address: string, incorporationDate: string) => {
        update('companyName', name);
        update('crn', number);
        update('address', address);
        update('dateMetadata', incorporationDate);
        setAutoFilled(true);
        setManualMode(false);
        setSearchQuery(number + ' — ' + name);
    };

    // Reset auto-fill and switch to manual
    const switchToManual = () => {
        setAutoFilled(false);
        setManualMode(true);
        setApiFailed(false);
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Basic Information</h2>
                <p className="text-slate-500 mt-1">Enter the core details for this {data.type.toLowerCase()}.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
                {data.type === 'Individual' ? (
                    <>
                        <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">First Name</label>
                             <input
                                value={data.firstName}
                                onChange={e => update('firstName', e.target.value)}
                                onBlur={() => markTouched('firstName')}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium ${errorRing('firstName', errors, touched)}`}
                                placeholder="e.g. John"
                             />
                             <FieldError name="firstName" errors={errors} touched={touched} />
                        </div>
                        <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Last Name</label>
                             <input
                                value={data.lastName}
                                onChange={e => update('lastName', e.target.value)}
                                onBlur={() => markTouched('lastName')}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium ${errorRing('lastName', errors, touched)}`}
                                placeholder="e.g. Doe"
                             />
                             <FieldError name="lastName" errors={errors} touched={touched} />
                        </div>
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Date of Birth</label>
                             <input 
                                type="date" 
                                value={data.dateMetadata} 
                                onChange={e => update('dateMetadata', e.target.value)} 
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" 
                             />
                        </div>
                    </>
                ) : (
                    <>
                        {/* Companies House Search */}
                        <div className="col-span-2 space-y-2 relative">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Building2 size={14} className="text-blue-600" />
                                Search Companies House
                            </label>
                            <div className="relative">
                                <input 
                                    value={searchQuery}
                                    onChange={e => handleSearchChange(e.target.value)}
                                    className="w-full px-4 py-3 pl-11 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    placeholder='Type a company name or number, e.g. "Tesco" or "00445790"'
                                />
                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                                    {isSearching ? (
                                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                                            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                                        </svg>
                                    )}
                                </div>
                            </div>

                            {/* Search results dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-64 overflow-y-auto">
                                    {searchResults.map((r: any) => (
                                        <button
                                            key={r.company_number}
                                            type="button"
                                            onClick={() => handleSelectResult(r)}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-0 flex items-center gap-3"
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                r.company_status === 'active' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                <Building2 size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm text-slate-900 truncate">{r.company_name}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{r.company_number} • {r.company_status?.toUpperCase() || 'N/A'}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-slate-300" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Auto-filled success banner */}
                        {autoFilled && (
                            <div className="col-span-2 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Check size={16} className="text-emerald-600" />
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-emerald-800 text-sm">Auto-filled from Companies House</p>
                                    <p className="text-xs text-emerald-600 mt-1">
                                        {data.crn} • {data.companyName}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={switchToManual}
                                        className="text-xs text-emerald-700 underline mt-2 hover:text-emerald-900 transition-colors"
                                    >
                                        Edit details manually
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* API failed / not found banner */}
                        {apiFailed && !manualMode && (
                            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-amber-800 font-medium">Company not found or service unavailable.</p>
                                    <button
                                        type="button"
                                        onClick={switchToManual}
                                        className="text-sm text-amber-700 underline mt-1 hover:text-amber-900 transition-colors"
                                    >
                                        Enter details manually instead
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Manual entry fields (shown when autoFilled=false AND manualMode=true, or when nothing has happened yet) */}
                        {(manualMode || (!autoFilled && !isSearching && searchQuery === '')) && (
                            <>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Company Name</label>
                                    <input
                                        value={data.companyName}
                                        onChange={e => update('companyName', e.target.value)}
                                        onBlur={() => markTouched('companyName')}
                                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium ${errorRing('companyName', errors, touched)}`}
                                        placeholder="e.g. Acme Innovations Ltd"
                                    />
                                    <FieldError name="companyName" errors={errors} touched={touched} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Company Number (CRN)</label>
                                    <input
                                        value={data.crn}
                                        onChange={e => update('crn', e.target.value)}
                                        onBlur={() => markTouched('crn')}
                                        className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono ${errorRing('crn', errors, touched)}`}
                                        placeholder="e.g. 01234567"
                                    />
                                    <FieldError name="crn" errors={errors} touched={touched} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Incorporation Date</label>
                                    <input 
                                        type="date" 
                                        value={data.dateMetadata} 
                                        onChange={e => update('dateMetadata', e.target.value)} 
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-600" 
                                    />
                                </div>
                            </>
                        )}

                        {/* Read-only fields when auto-filled */}
                        {autoFilled && (
                            <>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Company Name</label>
                                    <input 
                                        value={data.companyName} 
                                        readOnly
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Company Number (CRN)</label>
                                    <input 
                                        value={data.crn} 
                                        readOnly
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600 cursor-not-allowed" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Incorporation Date</label>
                                    <input 
                                        value={data.dateMetadata} 
                                        readOnly
                                        className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-lg font-medium text-slate-600 cursor-not-allowed" 
                                    />
                                </div>
                            </>
                        )}
                    </>
                )}

                <div className="col-span-2 mt-4 pt-4 border-t border-slate-100">
                     <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wide">Contact Details</h3>
                     <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                             <label className="text-sm font-semibold text-slate-700">
                                 {data.type === 'Company' ? 'Registered Address' : 'Address Line 1'}
                             </label>
                             <input 
                                value={data.address} 
                                onChange={e => update('address', e.target.value)} 
                                readOnly={autoFilled && data.type === 'Company'}
                                className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg transition-all font-medium ${
                                    autoFilled && data.type === 'Company'
                                        ? 'bg-slate-100 text-slate-600 cursor-not-allowed'
                                        : 'bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'
                                }`}
                                placeholder="Street address" 
                             />
                        </div>
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Postcode</label>
                             <input 
                                value={data.postcode} 
                                onChange={e => update('postcode', e.target.value)} 
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium" 
                                placeholder="e.g. SW1A 1AA" 
                             />
                        </div>
                         <div className="space-y-2">
                             <label className="text-sm font-semibold text-slate-700">Email Address</label>
                             <input
                                type="email"
                                value={data.email}
                                onChange={e => update('email', e.target.value)}
                                onBlur={() => markTouched('email')}
                                className={`w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium ${errorRing('email', errors, touched)}`}
                                placeholder="john@example.com"
                             />
                             <FieldError name="email" errors={errors} touched={touched} />
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );

}

function EntitiesStep({ data, update }: any) {
    const addEntity = (type: string) => {
        const newEntity = { id: Date.now(), type, status: 'Active' };
        update('entities', [...data.entities, newEntity]);
    };

    const removeEntity = (id: number) => {
        update('entities', data.entities.filter((e: any) => e.id !== id));
    };

    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Legal Entities</h2>
                <p className="text-slate-500 mt-1">Which tax entities does this client operate?</p>
            </div>

            <div className="flex gap-3">
                 <button onClick={() => addEntity('Self Assessment')} className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg hover:border-brand-secondary hover:text-brand-secondary hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 shadow-sm">
                    + Self Assessment
                 </button>
                 <button onClick={() => addEntity('VAT')} className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg hover:border-brand-secondary hover:text-brand-secondary hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 shadow-sm">
                    + VAT Registration
                 </button>
                 {data.type === 'Company' && (
                    <button onClick={() => addEntity('Corporation Tax')} className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg hover:border-brand-secondary hover:text-brand-secondary hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 shadow-sm">
                        + Corporation Tax
                    </button>
                 )}
                 <button onClick={() => addEntity('PAYE')} className="px-4 py-2 bg-white border border-dashed border-slate-300 rounded-lg hover:border-brand-secondary hover:text-brand-secondary hover:bg-blue-50 transition-all text-sm font-semibold text-slate-600 shadow-sm">
                    + PAYE Scheme
                 </button>
            </div>

            <div className="space-y-3 mt-6">
                {data.entities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                        <Users size={32} className="mb-3 opacity-20" />
                        <p className="font-medium">No entities configured yet.</p>
                        <p className="text-sm">Click the buttons above to add tax services.</p>
                    </div>
                ) : (
                    data.entities.map((e: any) => (
                        <div key={e.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-brand-secondary/30 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                    <Check size={14} />
                                </div>
                                <span className="font-semibold text-slate-800">{e.type}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-medium bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full border border-emerald-200">Active</span>
                                <button onClick={() => removeEntity(e.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                                    <span className="sr-only">Remove</span>
                                    &times;
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function HMRCRefsStep({ data, update, errors, touched, markTouched }: any) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">HMRC References</h2>
                <p className="text-slate-500 mt-1">Add the references for the automated data fetch.</p>
            </div>

             <div className="grid grid-cols-1 gap-6 max-w-lg">
                <div className="space-y-2">
                     <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                         Unique Taxpayer Reference (UTR)
                         <span className="text-xs font-normal text-slate-400">10 digits</span>
                     </label>
                     <input
                        value={data.utr}
                        onChange={e => update('utr', e.target.value)}
                        onBlur={() => markTouched('utr')}
                        className={`w-full px-4 py-2.5 border border-slate-200 rounded-lg font-mono placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all ${errorRing('utr', errors, touched)}`}
                        placeholder="12345 67890"
                    />
                    <FieldError name="utr" errors={errors} touched={touched} />
                </div>
                {data.type === 'Company' && (
                     <div className="space-y-2">
                         <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                             Company Reg Number (CRN)
                             <span className="text-xs font-normal text-slate-400">8 digits</span>
                         </label>
                         <input 
                            value={data.crn} 
                            onChange={e => update('crn', e.target.value)} 
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg font-mono placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" 
                            placeholder="01234567" 
                        />
                    </div>
                )}
                 <div className="space-y-2">
                     <label className="text-sm font-semibold text-slate-700 flex items-center justify-between">
                         VAT Number (Optional)
                         <span className="text-xs font-normal text-slate-400">9 digits</span>
                     </label>
                     <input
                        value={data.vat}
                        onChange={e => update('vat', e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg font-mono placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        placeholder="GB 123 4567 89"
                    />
                </div>

                {/* Compliance dates — feed the deadline engine */}
                <div className="pt-4 mt-2 border-t border-slate-100 space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Compliance Dates</h3>

                    {data.type === 'Company' && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Accounting Period End <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                            <input
                                type="date"
                                value={data.accountingPeriodEnd}
                                onChange={e => update('accountingPeriodEnd', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-600"
                            />
                            <p className="text-xs text-slate-400">If left blank, derived from incorporation date.</p>
                        </div>
                    )}

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={data.vatRegistered}
                            onChange={e => update('vatRegistered', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm font-medium text-slate-700">VAT registered</span>
                    </label>

                    {data.vatRegistered && (
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">VAT Quarter End <span className="text-xs font-normal text-slate-400">(optional)</span></label>
                            <input
                                type="date"
                                value={data.vatQuarterEnd}
                                onChange={e => update('vatQuarterEnd', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-600"
                            />
                            <p className="text-xs text-slate-400">If left blank, calendar quarters are assumed.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ReviewStep({ data }: any) {
    return (
        <div className="space-y-6 animate-fadeIn">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">Review & Confirm</h2>
                <p className="text-slate-500 mt-1">Please double-check the details before onboarding.</p>
            </div>

            <div className="space-y-6">
                <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-brand-primary text-white rounded-lg flex items-center justify-center">
                                {data.type === 'Company' ? <Building2 size={20} /> : <User size={20} />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg">
                                    {data.type === 'Company' ? data.companyName : `${data.firstName} ${data.lastName}`}
                                </h3>
                                <p className="text-sm text-slate-500">{data.type} • {data.email}</p>
                            </div>
                        </div>
                        <div className="text-right">
                             {data.type === 'Company' ? (
                                <div className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">{data.crn || 'No CRN'}</div>
                             ) : (
                                <div className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">{data.dateMetadata || 'No DoB'}</div>
                             )}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">HMRC Reference (UTR)</span>
                            <span className="font-medium text-slate-900">{data.utr || 'Not provided'}</span>
                        </div>
                        <div>
                            <span className="text-slate-500 block mb-1">Tax Services</span>
                            <div className="flex flex-wrap gap-1">
                                {data.entities.length > 0 ? data.entities.map((e: any) => (
                                    <span key={e.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{e.type}</span>
                                )) : <span className="text-slate-400 italic">None selected</span>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 border border-blue-100">
                    <Info size={20} className="shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-semibold mb-1">What happens next?</p>
                        <ul className="list-disc pl-4 space-y-1 opacity-90">
                            <li>A client profile will be created immediately.</li>
                            <li>We will attempt to fetch data from HMRC if credentials are valid.</li>
                            <li>You can add staff members to this client after creation.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Guidance Panel ---

function GuidancePanel({ step, type }: { step: number, type: string }) {
    const content = [
        {
            title: "Choosing Client Type",
            body: "The client type determines the tax workflow. For most small businesses, 'Limited Company' includes both the company CT600 return and Director SA100 workflows.",
            tip: "Use 'Group' only if you need consolidated reporting."
        },
        {
            title: "Client Identity",
            body: type === 'Company'
                ? "Search for the company by name or number — we'll auto-fill details from Companies House. If the lookup fails, you can enter details manually."
                : "We use this data to perform Anti-Money Laundering (AML) checks. Ensure the spelling matches official documents (Passport / Companies House).",
            tip: type === 'Company'
                ? "Type the 8-digit company number for an instant match, or search by name."
                : "For Companies, the name must match the Certificate of Incorporation."
        },
        {
            title: "Tax Entities",
            body: "Entities represent the distinct tax obligations. A single client might have multiple entities (e.g., a Director who is also a Sole Trader).",
            tip: "You can add more entities later from the client dashboard."
        },
        {
            title: "HMRC References",
            body: "These references are crucial for the 'Brain' to connect to HMRC's API. Without them, we cannot fetch tax timelines or payment history.",
            tip: "The UTR is always 10 digits long."
        },
        {
            title: "Final Review",
            body: "Everything look correct? Once created, some structural elements (like Client Type) are hard to change.",
            tip: "Click 'Complete Setup' to finalize."
        }
    ];

    const current = content[step - 1];

    if (!current) return null;

    return (
        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 sticky top-8">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm border border-slate-100 mb-4">
                <HelpCircle size={20} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">{current.title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {current.body}
            </p>
            
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                    <Info size={14} /> Pro Tip
                </div>
                <p className="text-sm text-blue-800 font-medium">
                    {current.tip}
                </p>
            </div>
        </div>
    );
}
