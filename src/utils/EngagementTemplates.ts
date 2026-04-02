import { format } from 'date-fns';

export interface EngagementTemplate {
    id: string;
    name: string;
    description: string;
    content: string; // HTML content with {{placeholders}}
    defaultServices: string[];
}

export const TEMPLATES: EngagementTemplate[] = [
    {
        id: 'ltd_company',
        name: 'Limited Company (Standard)',
        description: 'Comprehensive engagement for LTDs including Accounts, CT, and Director SA.',
        defaultServices: ['Annual Accounts', 'Corporation Tax', 'Payroll', 'Director Self Assessment'],
        content: `
            <h1>Engagement Letter</h1>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>To:</strong> The Directors of {{clientName}}</p>
            <p><strong>Re:</strong> Engagement of Professional Services</p>

            <h2>1. Scope of Services</h2>
            <p>We will provide the following services to {{clientName}}:</p>
            <ul>
                {{servicesList}}
            </ul>

            <h2>2. Responsibilities</h2>
            <p><strong>Your Responsibilities:</strong> You are responsible for ensuring that the company maintains proper accounting records and for preparing accounts which give a true and fair view.</p>
            <p><strong>Our Responsibilities:</strong> We will compile your annual accounts based on the information and explanations you provide to us.</p>

            <h2>3. HMRC Authorisation</h2>
            <p>You authorise us to act as your agent for the taxes listed above. This includes communicating with HMRC on your behalf.</p>

            <h2>4. Fees</h2>
            <p>Our fees are computed on the basis of time spent on your affairs and the level of skill and responsibility involved.</p>

            <h2>5. Data Protection</h2>
            <p>We plan to communicate with you and with third parties via email or by other electronic means. You accept the risks associated with such communications.</p>

            <hr />
            
            <h2>Acceptance</h2>
            <p>I confirm that I have read and understood the terms of this engagement letter and agree to them on behalf of {{clientName}}.</p>
            
            <div class="signature-block">
                <p><strong>Signed by:</strong> {{signerName}}</p>
                <p><strong>Position:</strong> Director</p>
                <p><strong>Date:</strong> {{signDate}}</p>
                <div class="digital-signature-placeholder">[Signature Will Appear Here]</div>
            </div>
        `
    },
    {
        id: 'sole_trader',
        name: 'Sole Trader / Individual',
        description: 'For self-employed individuals and personal tax clients.',
        defaultServices: ['Self Assessment Tax Return', 'Sole Trader Accounts'],
        content: `
            <h1>Engagement Letter</h1>
            <p><strong>Date:</strong> {{date}}</p>
            <p><strong>To:</strong> {{clientName}}</p>
            <p><strong>Re:</strong> Engagement of Personal Tax Services</p>

            <h2>1. Scope of Services</h2>
            <p>We will prepare your Self Assessment Tax Return for the year ended 5th April {{currentTaxYear}}.</p>

            <h2>2. HMRC Authorisation (64-8)</h2>
            <p>You authorise us to deal with HMRC on your behalf for Individual Tax affairs.</p>

            <h2>3. Data Protection & Privacy</h2>
            <p>We are committed to protecting your privacy and data in accordance with GDPR.</p>

            <hr />
            
            <h2>Acceptance</h2>
            <p>I agree to the terms of engagement.</p>
            
            <div class="signature-block">
                 <p><strong>Signed by:</strong> {{signerName}}</p>
                 <p><strong>Date:</strong> {{signDate}}</p>
                 <div class="digital-signature-placeholder">[Signature Will Appear Here]</div>
            </div>
        `
    }
];

export function generateLetterHtml(templateId: string, clientData: any, selectedServices?: string[]): string {
    const template = TEMPLATES.find(t => t.id === templateId);
    if (!template) return 'Template not found';

    let html = template.content;

    // 1. Basic Injections
    html = html.replace(/{{clientName}}/g, clientData.legalName || 'Client Name');
    html = html.replace(/{{date}}/g, format(new Date(), 'do MMMM yyyy'));
    html = html.replace(/{{currentTaxYear}}/g, '2025/26'); // Dynamic in real app

    // 2. Services List
    const services = selectedServices || template.defaultServices;
    const servicesHtml = services.map(s => `<li>${s}</li>`).join('');
    html = html.replace(/{{servicesList}}/g, servicesHtml);

    // 3. Placeholders for Signing (Left blank until signed)
    html = html.replace(/{{signerName}}/g, '<span class="placeholder">[Name]</span>');
    html = html.replace(/{{signDate}}/g, '<span class="placeholder">[Date]</span>');

    return html;
}
