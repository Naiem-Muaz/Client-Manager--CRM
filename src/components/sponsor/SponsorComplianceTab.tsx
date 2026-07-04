import React, { useState } from 'react';
import { Users, Bell, Building2, Lock } from 'lucide-react';
import { WorkerList } from './WorkerList';
import { WorkerDetail } from './WorkerDetail';
import { SponsorAlertDashboard } from './SponsorAlertDashboard';
import { SponsorOrgRecord } from './SponsorOrgRecord';

type View = 'alerts' | 'workers' | 'organisation';

/**
 * Sponsor Compliance — super-admin-only Practice Settings tab. The parent
 * (SetupPage) already gates rendering to super_admin; every backend route is also
 * requireRole('super_admin') + org-locked, so this is defense-in-depth UI only.
 * Lands on the Alerts view — proactive "what needs attention now" is the point.
 */
export function SponsorComplianceTab() {
  const [view, setView] = useState<View>('alerts');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);

  const NAV: { id: View; label: string; icon: any }[] = [
    { id: 'alerts', label: 'Alerts', icon: Bell },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'organisation', label: 'Organisation', icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-600">
        <span className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[#2F4A7D] flex-shrink-0"><Lock size={14} /></span>
        <p className="text-sm pt-1">Sensitive immigration data — visible to super-admins only. All access to documents is logged.</p>
      </div>

      {!selectedWorker && (
        <div className="flex gap-1 border-b border-slate-200">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${view === n.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
              <n.icon size={16} /> {n.label}
            </button>
          ))}
        </div>
      )}

      {selectedWorker
        ? <WorkerDetail id={selectedWorker} onBack={() => setSelectedWorker(null)} />
        : view === 'alerts' ? <SponsorAlertDashboard onSelect={setSelectedWorker} />
        : view === 'workers' ? <WorkerList onSelect={setSelectedWorker} />
        : <SponsorOrgRecord />}
    </div>
  );
}
