export type MessageType = 'Email' | 'SecureMessage' | 'SMS';
export type MessageDirection = 'Inbound' | 'Outbound';
export type MessageStatus = 'Draft' | 'Sent' | 'Delivered' | 'Read' | 'Failed';

export interface Communication {
    id: string;
    subject: string;
    body: string;
    type: MessageType;
    direction: MessageDirection;
    status: MessageStatus;
    timestamp: string;
    recipient?: string;
    sender?: string;
    attachments?: { name: string; size: string }[];
}

export interface EmailTemplate {
    id: string;
    name: string;
    subjectTemplate: string;
    bodyTemplate: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'hmrc_auth',
        name: 'HMRC Authorisation Request',
        subjectTemplate: 'Action Required: Authorise us to act as your agent',
        bodyTemplate: "Dear {{clientName}},\n\nPlease click the link below to authorise us to act as your agent for HMRC services.\n\n[Link]\n\nThis will allow us to file returns on your behalf.\n\nBest regards,\n{{agentName}}"
    },
    {
        id: 'engagement',
        name: 'Engagement Letter Signature',
        subjectTemplate: 'Please sign: Engagement Letter',
        bodyTemplate: "Dear {{clientName}},\n\nPlease review and sign the attached engagement letter to formalise our relationship.\n\nBest regards,\n{{agentName}}"
    },
    {
        id: 'info_request',
        name: 'Information Request',
        subjectTemplate: 'Information Needed: {{subject}}',
        bodyTemplate: "Dear {{clientName}},\n\nWe require the following information to proceed with your work:\n\n- [List items]\n\nPlease provide these at your earliest convenience.\n\nBest regards,\n{{agentName}}"
    }
];
