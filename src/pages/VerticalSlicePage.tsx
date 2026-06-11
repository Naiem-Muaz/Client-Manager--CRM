import React, { useState } from 'react';
import {
  useVSClients, useVSClient, createVSClient,
  useVSTransactions, createVSTransaction,
  useVSAccounting, useVSTax,
  useVSSnapshots, generateVSSnapshot, finaliseVSSnapshot,
  useVSSubmissions, submitVSQuarter,
} from '../hooks/useVerticalSlice';

// ============================================================================
// TAB DEFINITIONS
// ============================================================================
const TABS = ['Clients', 'Transactions', 'Accounting', 'Tax', 'Submission'] as const;
type Tab = typeof TABS[number];

// ============================================================================
// MAIN PAGE
// ============================================================================
export function VerticalSlicePage() {
  const [activeTab, setActiveTab] = useState<Tab>('Clients');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>
        MTD ITSA — Vertical Slice
      </h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        End-to-end flow: Client → Transactions → P&L → Tax → HMRC Submission
      </p>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '2px', marginBottom: '24px', borderBottom: '2px solid #e5e7eb' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: activeTab === tab ? '#1e40af' : 'transparent',
              color: activeTab === tab ? '#fff' : '#374151',
              fontWeight: activeTab === tab ? 600 : 400,
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Selected Client Banner */}
      {selectedClientId && activeTab !== 'Clients' && (
        <SelectedClientBanner clientId={selectedClientId} onClear={() => setSelectedClientId(null)} />
      )}

      {/* Tab Content */}
      {activeTab === 'Clients' && (
        <ClientsTab selectedClientId={selectedClientId} onSelectClient={(id) => { setSelectedClientId(id); setActiveTab('Transactions'); }} />
      )}
      {activeTab === 'Transactions' && selectedClientId && (
        <TransactionsTab clientId={selectedClientId} />
      )}
      {activeTab === 'Accounting' && selectedClientId && (
        <AccountingTab clientId={selectedClientId} />
      )}
      {activeTab === 'Tax' && selectedClientId && (
        <TaxTab clientId={selectedClientId} />
      )}
      {activeTab === 'Submission' && selectedClientId && (
        <SubmissionTab clientId={selectedClientId} />
      )}

      {activeTab !== 'Clients' && !selectedClientId && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          Please select a client from the Clients tab first.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SELECTED CLIENT BANNER
// ============================================================================
function SelectedClientBanner({ clientId, onClear }: { clientId: string; onClear: () => void }) {
  const { client } = useVSClient(clientId);
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 16px', background: '#eff6ff', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bfdbfe'
    }}>
      <span style={{ fontSize: '14px' }}>
        <strong>Client:</strong> {client?.legal_name || clientId} &nbsp;
        <span style={{ color: '#6b7280' }}>({client?.email})</span>
      </span>
      <button onClick={onClear} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px' }}>
        Change Client
      </button>
    </div>
  );
}

// ============================================================================
// 1. CLIENTS TAB
// ============================================================================
function ClientsTab({ selectedClientId, onSelectClient }: { selectedClientId: string | null; onSelectClient: (id: string) => void }) {
  const { clients, isLoading } = useVSClients();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', business_type: 'sole_trader' });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.name || !form.email) return;
    setCreating(true);
    try {
      await createVSClient(form);
      setForm({ name: '', email: '', phone: '', business_type: 'sole_trader' });
      setShowForm(false);
    } catch (err: any) {
      alert('Error: ' + (err?.error || err?.message || 'Unknown'));
    }
    setCreating(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Clients</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
        >
          {showForm ? 'Cancel' : '+ New Client'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input placeholder="Name *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle} />
            <input placeholder="Email *" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={inputStyle} />
            <input placeholder="Phone" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
              style={inputStyle} />
            <select value={form.business_type} onChange={e => setForm({ ...form, business_type: e.target.value })}
              style={inputStyle}>
              <option value="sole_trader">Sole Trader</option>
              <option value="partnership">Partnership</option>
              <option value="limited_company">Limited Company</option>
            </select>
          </div>
          <button onClick={handleCreate} disabled={creating || !form.name || !form.email}
            style={{ ...btnPrimary, opacity: (creating || !form.name || !form.email) ? 0.5 : 1 }}>
            {creating ? 'Creating...' : 'Create Client'}
          </button>
        </div>
      )}

      {isLoading ? (
        <p>Loading clients...</p>
      ) : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Ref</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(clients || []).map((c: any) => (
              <tr key={c.id} style={{ background: c.id === selectedClientId ? '#eff6ff' : undefined }}>
                <td style={tdStyle}>{c.legal_name}</td>
                <td style={tdStyle}>{c.email}</td>
                <td style={tdStyle}>{c.entity_type}</td>
                <td style={tdStyle}><code>{c.client_reference}</code></td>
                <td style={tdStyle}>
                  <button onClick={() => onSelectClient(c.id)}
                    style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                    Select →
                  </button>
                </td>
              </tr>
            ))}
            {(!clients || clients.length === 0) && (
              <tr><td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No clients yet. Create one above.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================================
// 2. TRANSACTIONS TAB
// ============================================================================
function TransactionsTab({ clientId }: { clientId: string }) {
  const { transactions, isLoading } = useVSTransactions(clientId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ date: '2026-06-15', description: '', amount: '', type: 'expense' as 'income' | 'expense', is_disallowable: false });
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!form.description || !form.amount) return;
    setCreating(true);
    try {
      await createVSTransaction(clientId, form);
      setForm({ date: '2026-06-15', description: '', amount: '', type: 'expense', is_disallowable: false });
      setShowForm(false);
    } catch (err: any) {
      alert('Error: ' + (err?.error || err?.message || 'Unknown'));
    }
    setCreating(false);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Transactions</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
          {showForm ? 'Cancel' : '+ Add Transaction'}
        </button>
      </div>

      {showForm && (
        <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={inputStyle} />
            <input placeholder="Description *" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={inputStyle} />
            <input placeholder="Amount (£) *" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} style={inputStyle} />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })} style={inputStyle}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '13px' }}>
            <input type="checkbox" checked={form.is_disallowable} onChange={e => setForm({ ...form, is_disallowable: e.target.checked })} />
            Disallowable expense (e.g., personal use)
          </label>
          <button onClick={handleCreate} disabled={creating || !form.description || !form.amount}
            style={{ ...btnPrimary, opacity: (creating || !form.description || !form.amount) ? 0.5 : 1 }}>
            {creating ? 'Adding...' : 'Add Transaction'}
          </button>
        </div>
      )}

      {isLoading ? <p>Loading...</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Description</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Amount</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Disallowable</th>
            </tr>
          </thead>
          <tbody>
            {(transactions || []).map((t: any) => (
              <tr key={t.id}>
                <td style={tdStyle}>{t.transaction_date?.substring(0, 10)}</td>
                <td style={tdStyle}>{t.description}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                    background: t.type === 'income' ? '#dcfce7' : '#fee2e2',
                    color: t.type === 'income' ? '#166534' : '#991b1b' }}>
                    {t.type}
                  </span>
                </td>
                <td style={tdStyle}>£{t.amount_display}</td>
                <td style={tdStyle}>{t.hmrc_category || t.category}</td>
                <td style={tdStyle}>{t.is_disallowable ? '⚠️ Yes' : '—'}</td>
              </tr>
            ))}
            {(!transactions || transactions.length === 0) && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================================
// 3. ACCOUNTING TAB (P&L)
// ============================================================================
function AccountingTab({ clientId }: { clientId: string }) {
  const { accounting, isLoading } = useVSAccounting(clientId);

  if (isLoading) return <p>Loading P&L...</p>;
  if (!accounting) return <p style={{ color: '#999' }}>No data available. Add transactions first.</p>;

  const a = accounting;
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Profit & Loss Statement</h2>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Period: {a.period?.start} to {a.period?.end}</p>

      <table style={{ ...tableStyle, maxWidth: '500px' }}>
        <tbody>
          <tr style={{ background: '#dcfce7' }}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>Turnover (Income)</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>£{a.turnover?.pounds}</td>
          </tr>
          <tr style={{ background: '#fee2e2' }}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>Total Expenses</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>£{a.expenses?.pounds}</td>
          </tr>
          <tr style={{ borderTop: '2px solid #111' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Net Profit</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>£{a.net_profit?.pounds}</td>
          </tr>
          <tr style={{ background: '#fef3c7' }}>
            <td style={tdStyle}>Disallowable Expenses</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>£{a.disallowables?.pounds}</td>
          </tr>
          <tr style={{ background: '#dbeafe', borderTop: '2px solid #111' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Adjusted Profit</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>£{a.adjusted_profit?.pounds}</td>
          </tr>
        </tbody>
      </table>

      {a.expense_breakdown && a.expense_breakdown.length > 0 && (
        <>
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>Expense Breakdown</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>HMRC Category</th>
                <th style={thStyle}>Amount</th>
                <th style={thStyle}>Transactions</th>
              </tr>
            </thead>
            <tbody>
              {a.expense_breakdown.map((b: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{b.hmrc_category}</td>
                  <td style={tdStyle}>£{b.total_pounds}</td>
                  <td style={tdStyle}>{b.transaction_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ============================================================================
// 4. TAX TAB
// ============================================================================
function TaxTab({ clientId }: { clientId: string }) {
  const { tax, isLoading } = useVSTax(clientId);

  if (isLoading) return <p>Calculating tax...</p>;
  if (!tax) return <p style={{ color: '#999' }}>No data available.</p>;

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Tax Calculation (MTD ITSA Basic)</h2>
      <p style={{ color: '#666', fontSize: '13px', marginBottom: '16px' }}>Period: {tax.period?.start} to {tax.period?.end}</p>

      <table style={{ ...tableStyle, maxWidth: '500px' }}>
        <tbody>
          <tr>
            <td style={tdStyle}>Turnover</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>£{tax.turnover}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Allowable Expenses</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>£{tax.allowable_expenses}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Disallowable Expenses</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>£{tax.disallowable_expenses}</td>
          </tr>
          <tr style={{ borderTop: '2px solid #ccc' }}>
            <td style={{ ...tdStyle, fontWeight: 600 }}>Net Profit</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>£{tax.net_profit}</td>
          </tr>
          <tr>
            <td style={{ ...tdStyle, fontWeight: 600 }}>Adjusted Profit</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>£{tax.adjusted_profit}</td>
          </tr>
          <tr style={{ background: '#f3f4f6' }}>
            <td style={tdStyle}>Personal Allowance</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>-£{tax.personal_allowance}</td>
          </tr>
          <tr style={{ borderTop: '2px solid #111' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>Taxable Income</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>£{tax.taxable_income}</td>
          </tr>
          <tr>
            <td style={tdStyle}>Tax Rate</td>
            <td style={{ ...tdStyle, textAlign: 'right' }}>{tax.basic_rate}</td>
          </tr>
          <tr style={{ background: '#dbeafe', borderTop: '2px solid #111' }}>
            <td style={{ ...tdStyle, fontWeight: 700, fontSize: '16px' }}>Income Tax Due</td>
            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, fontSize: '16px', color: '#1e40af' }}>£{tax.income_tax}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// 5. SUBMISSION TAB
// ============================================================================
function SubmissionTab({ clientId }: { clientId: string }) {
  const { snapshots, isLoading: snapsLoading } = useVSSnapshots(clientId);
  const { submissions, isLoading: subsLoading } = useVSSubmissions(clientId);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [periodStart, setPeriodStart] = useState('2026-04-06');
  const [periodEnd, setPeriodEnd] = useState('2026-07-05');

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateVSSnapshot(clientId, periodStart, periodEnd);
    } catch (err: any) {
      alert('Error: ' + (err?.error || err?.message || 'Unknown'));
    }
    setGenerating(false);
  };

  const handleFinalise = async (snapshotId: string) => {
    try {
      await finaliseVSSnapshot(clientId, snapshotId);
    } catch (err: any) {
      alert('Error: ' + (err?.error || err?.message || 'Unknown'));
    }
  };

  const handleSubmit = async (snapshotId: string) => {
    setSubmitting(snapshotId);
    try {
      const result = await submitVSQuarter(clientId, snapshotId);
      alert('✅ Submission accepted! Correlation ID: ' + result?.data?.hmrc_response?.correlationId);
    } catch (err: any) {
      alert('Error: ' + (err?.error || err?.message || 'Unknown'));
    }
    setSubmitting(null);
  };

  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>HMRC Submission</h2>

      {/* Generate Snapshot */}
      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Generate Quarterly Snapshot</h3>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '13px' }}>
            Start: <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ fontSize: '13px' }}>
            End: <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} style={inputStyle} />
          </label>
          <button onClick={handleGenerate} disabled={generating} style={btnPrimary}>
            {generating ? 'Generating...' : 'Generate Snapshot'}
          </button>
        </div>
      </div>

      {/* Snapshots List */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>Snapshots</h3>
      {snapsLoading ? <p>Loading...</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Turnover</th>
              <th style={thStyle}>Expenses</th>
              <th style={thStyle}>Profit</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(snapshots || []).map((s: any) => (
              <tr key={s.id}>
                <td style={tdStyle}>{s.period_start?.substring(0, 10)} — {s.period_end?.substring(0, 10)}</td>
                <td style={tdStyle}>£{(s.turnover / 100).toFixed(2)}</td>
                <td style={tdStyle}>£{(s.expenses / 100).toFixed(2)}</td>
                <td style={tdStyle}>£{(s.adjusted_profit / 100).toFixed(2)}</td>
                <td style={tdStyle}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                    background: s.status === 'submitted' ? '#dcfce7' : s.status === 'finalised' ? '#dbeafe' : '#f3f4f6',
                    color: s.status === 'submitted' ? '#166534' : s.status === 'finalised' ? '#1e40af' : '#374151',
                  }}>
                    {s.status}
                  </span>
                </td>
                <td style={tdStyle}>
                  {s.status === 'draft' && (
                    <button onClick={() => handleFinalise(s.id)}
                      style={{ padding: '4px 10px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '6px' }}>
                      Finalise
                    </button>
                  )}
                  {s.status === 'finalised' && (
                    <button onClick={() => handleSubmit(s.id)} disabled={submitting === s.id}
                      style={{ padding: '4px 10px', background: '#059669', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                      {submitting === s.id ? 'Submitting...' : 'Submit to HMRC'}
                    </button>
                  )}
                  {s.status === 'submitted' && <span style={{ color: '#059669', fontSize: '12px' }}>✅ Submitted</span>}
                </td>
              </tr>
            ))}
            {(!snapshots || snapshots.length === 0) && (
              <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No snapshots yet. Generate one above.</td></tr>
            )}
          </tbody>
        </table>
      )}

      {/* Submissions History */}
      <h3 style={{ fontSize: '15px', fontWeight: 600, marginTop: '24px', marginBottom: '12px' }}>Submission History</h3>
      {subsLoading ? <p>Loading...</p> : (
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>Period</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Correlation ID</th>
              <th style={thStyle}>Submitted At</th>
            </tr>
          </thead>
          <tbody>
            {(submissions || []).map((s: any) => (
              <tr key={s.id}>
                <td style={tdStyle}>{s.period_start?.substring(0, 10)} — {s.period_end?.substring(0, 10)}</td>
                <td style={tdStyle}>
                  <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500, background: '#dcfce7', color: '#166534' }}>
                    {s.status}
                  </span>
                </td>
                <td style={tdStyle}><code style={{ fontSize: '11px' }}>{s.correlation_id}</code></td>
                <td style={tdStyle}>{new Date(s.submitted_at).toLocaleString()}</td>
              </tr>
            ))}
            {(!submissions || submissions.length === 0) && (
              <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>No submissions yet.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const inputStyle: React.CSSProperties = {
  padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', width: '100%', boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  padding: '8px 16px', background: '#1e40af', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
};

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '14px',
};

const thStyle: React.CSSProperties = {
  textAlign: 'left', padding: '10px 12px', background: '#f3f4f6', borderBottom: '2px solid #e5e7eb', fontWeight: 600, fontSize: '13px',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 12px', borderBottom: '1px solid #e5e7eb',
};
