export type DocumentCategory = 'Engagement' | 'HMRC' | 'Accounts' | 'Tax' | 'Correspondence' | 'Permanent' | 'Client Uploads';

export interface DocumentMetadata {
    taxYear?: string; // e.g., '2023/24'
    returnType?: 'SA100' | 'CT600' | 'VAT' | 'PAYE' | 'Other';
    linkedEntityId?: string;
    isImmutable: boolean;
}

export interface VaultDocument {
    id: string;
    name: string;
    type: string; // pdf, jpg, etc.
    size: string;
    dateAdded: string;
    category: DocumentCategory;
    metadata: DocumentMetadata;
    status: 'Draft' | 'Final' | 'Signed' | 'Submitted';
    uploadedBy: string;
}

export const FOLDERS: { id: DocumentCategory; label: string; icon: string }[] = [
    { id: 'Engagement', label: 'Engagement Letters', icon: 'FileSignature' },
    { id: 'HMRC', label: 'HMRC Authorisations', icon: 'ShieldCheck' },
    { id: 'Permanent', label: 'Permanent File', icon: 'Archive' },
    { id: 'Accounts', label: 'Annual Accounts', icon: 'BookOpen' },
    { id: 'Tax', label: 'Tax Returns', icon: 'Receipt' },
    { id: 'Correspondence', label: 'Correspondence', icon: 'Mail' },
    { id: 'Client Uploads', label: 'Client Uploads', icon: 'UploadCloud' },
];
