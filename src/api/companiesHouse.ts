/**
 * Companies House API wrapper.
 * Calls the NextGen Brain backend which proxies to Companies House.
 */

const API_BASE = (import.meta as any).env?.VITE_NEXTGEN_API_URL || 'http://localhost:4000/api';

// --- Types ---

export interface CompanySearchResult {
    company_number: string;
    company_name: string;
    company_status: string | null;
    address_snippet: string | null;
}

export interface CompanyInfo {
    company_number: string;
    company_name: string;
    company_status: string | null;
    company_type: string | null;
    registered_address: string | null;
    registered_address_parts?: {
        address_line_1: string | null;
        address_line_2: string | null;
        locality: string | null;
        region: string | null;
        postal_code: string | null;
        country: string | null;
    } | null;
    date_of_creation: string | null;
    // CH's own computed next accounts period-end (accounts.next_accounts.period_end_on),
    // a full date. Null when CH hasn't computed it yet (e.g. brand-new company).
    accounting_year_end?: string | null;
    sic_codes: string[];
}

// --- API calls ---

/**
 * Search Companies House by name.
 * Returns up to 10 matching companies.
 */
export async function searchCompanies(query: string): Promise<CompanySearchResult[]> {
    if (!query || query.trim().length < 2) return [];

    try {
        const url = `${API_BASE}/companies-house/search?q=${encodeURIComponent(query.trim())}`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) return [];

        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
            return body.data as CompanySearchResult[];
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Look up a single company by its registered number.
 * Returns the full company profile or null on failure.
 */
export async function lookupCompany(companyNumber: string): Promise<CompanyInfo | null> {
    const cleaned = companyNumber.trim().toUpperCase();
    if (!cleaned) return null;

    try {
        const url = `${API_BASE}/companies-house/company/${encodeURIComponent(cleaned)}`;
        const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
        });

        if (!res.ok) return null;

        const body = await res.json();
        if (body.success && body.data) {
            return body.data as CompanyInfo;
        }
        return null;
    } catch {
        return null;
    }
}


export interface OfficerRow {
  name: string;
  role?: string | null;
  appointed_on?: string | null;
  resigned_on?: string | null;
  occupation?: string | null;
  nationality?: string | null;
}

/**
 * Officers for a company, INCLUDING resigned ones — the card collapses them
 * rather than hiding them. The backend route defaults to active-only for its
 * older caller, so the opt-in is explicit here.
 *
 * ⛔ NEVER THROWS. A failed officers call must not lose the company profile the
 * Refresh just fetched; the caller stores what succeeded and records why the
 * rest is missing. Same boundary the backend enrichment path draws.
 */
export async function lookupOfficers(companyNumber: string): Promise<{ officers?: OfficerRow[]; error?: string }> {
  const cleaned = String(companyNumber || '').trim().toUpperCase();
  if (!cleaned) return { officers: [] };
  try {
    const url = `${API_BASE}/companies-house/company/${encodeURIComponent(cleaned)}/officers?include_resigned=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const body = await res.json();
    return { officers: (body?.data || []) as OfficerRow[] };
  } catch (e: any) {
    return { error: e?.message || 'unreachable' };
  }
}
