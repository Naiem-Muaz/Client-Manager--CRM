// NextGen Brain API Client for Client Manager
const NEXTGEN_API_BASE = import.meta.env.VITE_NEXTGEN_API_URL || 'http://localhost:3000/api';

export class NextGenAPI {
  private baseUrl: string;

  constructor(baseUrl: string = NEXTGEN_API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }

  // Clients
  async getClients() {
    return this.fetch<Client[]>('/brain/clients');
  }

  async getClient(id: string) {
    return this.fetch<Client>(`/brain/clients/${id}`);
  }

  async getClientFullData(id: string) {
    return this.fetch<any>(`/brain/clients/${id}/full-data`);
  }

  async approveClient(id: string) {
    const response = await fetch(`${this.baseUrl}/brain/clients/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async checkHmrcReadiness() {
    return this.fetch<any>('/brain/hmrc/readiness');
  }

  async submitQuarter(clientId: string) {
    const response = await fetch(`${this.baseUrl}/brain/hmrc/submit-quarter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId }),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async createClient(data: Partial<Client>) {
    const response = await fetch(`${this.baseUrl}/brain/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async updateClient(id: string, data: Partial<Client>) {
    const response = await fetch(`${this.baseUrl}/brain/clients/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async deleteClient(id: string) {
    const response = await fetch(`${this.baseUrl}/brain/clients/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  // Entities
  async getEntities() {
    return this.fetch<Entity[]>('/brain/entities');
  }

  async getEntity(id: string) {
    return this.fetch<Entity>(`/brain/entities/${id}`);
  }

  async getEntitiesForClient(clientId: string) {
    return this.fetch<Entity[]>(`/brain/entities?clientId=${clientId}`);
  }

  async createEntity(data: Partial<Entity>) {
    const response = await fetch(`${this.baseUrl}/brain/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async updateEntity(id: string, data: Partial<Entity>) {
    const response = await fetch(`${this.baseUrl}/brain/entities/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async deleteEntity(id: string) {
    const response = await fetch(`${this.baseUrl}/brain/entities/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  // Accounting Periods
  async getPeriods() {
    return this.fetch<AccountingPeriod[]>('/brain/periods');
  }

  async getPeriod(id: string) {
    return this.fetch<AccountingPeriod>(`/brain/periods/${id}`);
  }

  async getPeriodsForEntity(entityId: string) {
    return this.fetch<AccountingPeriod[]>(`/brain/periods?entityId=${entityId}`);
  }

  async createPeriod(data: Partial<AccountingPeriod>) {
    const response = await fetch(`${this.baseUrl}/brain/periods`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async updatePeriod(id: string, data: Partial<AccountingPeriod>) {
    const response = await fetch(`${this.baseUrl}/brain/periods/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  async deletePeriod(id: string) {
    const response = await fetch(`${this.baseUrl}/brain/periods/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
    return response.json();
  }

  // Accounts Snapshots
  async getAccountsSnapshot(id: string) {
    return this.fetch<AccountsSnapshot>(`/brain/accounts/snapshots/${id}`);
  }

  async getAccountsSnapshotsForEntity(entityId: string) {
    return this.fetch<AccountsSnapshot[]>(`/brain/accounts/snapshots/entity/${entityId}`);
  }

  // Tax Calculations
  async getTaxCalculation(id: string) {
    return this.fetch<TaxCalculation>(`/brain/tax/calculations/${id}`);
  }

  async getTaxCalculationsForEntity(entityId: string) {
    return this.fetch<TaxCalculation[]>(`/brain/tax/calculations/entity/${entityId}`);
  }

  // Tax Returns
  async getTaxReturn(id: string) {
    return this.fetch<TaxReturn>(`/brain/tax/returns/${id}`);
  }

  async getTaxReturnsForEntity(entityId: string) {
    return this.fetch<TaxReturn[]>(`/brain/tax/returns/entity/${entityId}`);
  }

  // Company Lookup (migrated from api/client.ts)
  async lookupCompany(query: string) {
    const response = await fetch(`${this.baseUrl}/brain/companies/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Company lookup failed: ${response.statusText}`);
    }

    const json = await response.json();
    return json.data;
  }

}

export const nextgenApi = new NextGenAPI();

// Types
export interface Client {
  id: string;
  clientType: 'individual' | 'business';
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'archived';
}

export interface Entity {
  id: string;
  clientId: string;
  entityType: 'individual' | 'limited_company' | 'partnership' | 'trust';
  legalName: string;
  utr: string;
  crn: string;
  vatNumber: string;
}

export interface AccountingPeriod {
  id: string;
  entityId: string;
  startDate: string;
  endDate: string;
  periodType: 'SA' | 'CT' | 'Trust';
  status: 'draft' | 'review' | 'submitted';
}

export interface AccountsSnapshot {
  id: string;
  entityId: string;
  periodId: string;
  snapshotData: any;
  sha256Hash: string;
  createdAt: string;
}

export interface TaxCalculation {
  id: string;
  entityId: string;
  periodId: string;
  taxType: string;
  totalTax: number;
  calculatedAt: string;
}

export interface TaxReturn {
  id: string;
  entityId: string;
  periodId: string;
  returnType: string;
  status: string;
  submittedAt: string;
}
