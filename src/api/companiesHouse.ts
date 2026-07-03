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
