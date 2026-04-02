export type AuditEventType = 
    | 'ENGAGEMENT_SENT'
    | 'ENGAGEMENT_SIGNED' 
    | 'AUTHORITY_REQUESTED'
    | 'AUTHORITY_GRANTED' 
    | 'DOCUMENT_UPLOADED' 
    | 'EMAIL_SENT' 
    | 'COMPLIANCE_CHECK_FAILED';

export interface AuditLogEntry {
    id: string;
    timestamp: string;
    type: AuditEventType;
    description: string;
    actor: string;
    metadata?: Record<string, any>;
}
