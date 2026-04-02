// Custom hooks for fetching data from NextGen Brain
import useSWR from 'swr';
import { nextgenApi, Client, Entity, AccountingPeriod, AccountsSnapshot, TaxCalculation, TaxReturn } from '../utils/nextgenApi';

// Clients
export function useClients() {
  const { data, error, isLoading } = useSWR(
    '/clients',
    () => nextgenApi.getClients()
  );

  return {
    clients: data,
    isLoading,
    error,
  };
}

export function useClient(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/clients/${id}` : null,
    () => id ? nextgenApi.getClient(id) : null
  );

  return {
    client: data,
    isLoading,
    error,
  };
}

// Entities
export function useEntities() {
  const { data, error, isLoading } = useSWR(
    '/entities',
    () => nextgenApi.getEntities()
  );

  return {
    entities: data,
    isLoading,
    error,
  };
}

export function useEntity(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/entities/${id}` : null,
    () => id ? nextgenApi.getEntity(id) : null
  );

  return {
    entity: data,
    isLoading,
    error,
  };
}

export function useEntitiesForClient(clientId: string | null) {
  const { data, error, isLoading } = useSWR(
    clientId ? `/entities/client/${clientId}` : null,
    () => clientId ? nextgenApi.getEntitiesForClient(clientId) : null
  );

  return {
    entities: data,
    isLoading,
    error,
  };
}

// Accounting Periods
export function usePeriods() {
  const { data, error, isLoading } = useSWR(
    '/periods',
    () => nextgenApi.getPeriods()
  );

  return {
    periods: data,
    isLoading,
    error,
  };
}

export function usePeriod(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/periods/${id}` : null,
    () => id ? nextgenApi.getPeriod(id) : null
  );

  return {
    period: data,
    isLoading,
    error,
  };
}

export function usePeriodsForEntity(entityId: string | null) {
  const { data, error, isLoading } = useSWR(
    entityId ? `/periods/entity/${entityId}` : null,
    () => entityId ? nextgenApi.getPeriodsForEntity(entityId) : null
  );

  return {
    periods: data,
    isLoading,
    error,
  };
}

// Accounts Snapshots
export function useAccountsSnapshot(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/accounts/snapshots/${id}` : null,
    () => id ? nextgenApi.getAccountsSnapshot(id) : null
  );

  return {
    snapshot: data,
    isLoading,
    error,
  };
}

export function useAccountsSnapshotsForEntity(entityId: string | null) {
  const { data, error, isLoading } = useSWR(
    entityId ? `/accounts/snapshots/entity/${entityId}` : null,
    () => entityId ? nextgenApi.getAccountsSnapshotsForEntity(entityId) : null
  );

  return {
    snapshots: data,
    isLoading,
    error,
  };
}

// Tax Calculations
export function useTaxCalculation(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/tax/calculations/${id}` : null,
    () => id ? nextgenApi.getTaxCalculation(id) : null
  );

  return {
    calculation: data,
    isLoading,
    error,
  };
}

export function useTaxCalculationsForEntity(entityId: string | null) {
  const { data, error, isLoading } = useSWR(
    entityId ? `/tax/calculations/entity/${entityId}` : null,
    () => entityId ? nextgenApi.getTaxCalculationsForEntity(entityId) : null
  );

  return {
    calculations: data,
    isLoading,
    error,
  };
}

// Tax Returns
export function useTaxReturn(id: string | null) {
  const { data, error, isLoading } = useSWR(
    id ? `/tax/returns/${id}` : null,
    () => id ? nextgenApi.getTaxReturn(id) : null
  );

  return {
    taxReturn: data,
    isLoading,
    error,
  };
}

export function useTaxReturnsForEntity(entityId: string | null) {
  const { data, error, isLoading } = useSWR(
    entityId ? `/tax/returns/entity/${entityId}` : null,
    () => entityId ? nextgenApi.getTaxReturnsForEntity(entityId) : null
  );

  return {
    taxReturns: data,
    isLoading,
    error,
  };
}
// Company Lookup
export function useCompanyLookup(query: string) {
  const { data, error, isLoading } = useSWR(
    query ? ['/companies/lookup', query] : null,
    () => nextgenApi.lookupCompany(query)
  );

  return {
    results: data,
    isLoading,
    error,
  };
}
