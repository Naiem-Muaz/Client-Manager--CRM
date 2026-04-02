export type AuthorityStatus = 'None' | 'Requested' | 'Authorized' | 'Rejected' | 'Expired';

export interface ClientAuthority {
    sa: AuthorityStatus;
    ct: AuthorityStatus;
    vat: AuthorityStatus;
    paye: AuthorityStatus;
    mtd_itsa: AuthorityStatus;
    lastUpdated: string;
    agentCode?: string;
}

export const DEFAULT_AUTHORITY: ClientAuthority = {
    sa: 'None',
    ct: 'None',
    vat: 'None',
    paye: 'None',
    mtd_itsa: 'None',
    lastUpdated: new Date().toISOString()
};
