import React from 'react';
import { Building2, Calendar, FileText, Settings, Shield } from 'lucide-react';

export function EntityOverviewTab({ entity }: { entity: any }) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Legal Status & Method */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-500" />
                        Legal Configuration
                    </h3>
                    <div className="space-y-4">
                        <div className="border-b border-slate-100 pb-2">
                            <span className="text-xs text-slate-500 block">Formation Date</span>
                            <span className="font-medium text-slate-900">01 Apr 2018</span>
                        </div>
                        <div className="border-b border-slate-100 pb-2">
                            <span className="text-xs text-slate-500 block">Accounting Method</span>
                            <span className="font-medium text-slate-900 flex items-center gap-2">
                                <Settings size={14} className="text-slate-400" />
                                Accrual Basis (FRS 102)
                            </span>
                        </div>
                         <div>
                            <span className="text-xs text-slate-500 block">Year End</span>
                            <span className="font-medium text-slate-900">31 March</span>
                        </div>
                    </div>
                </div>

                {/* Filing Obligations */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                     <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText size={20} className="text-purple-500" />
                        Filing Obligations
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex items-center gap-2">
                                <Shield size={16} className="text-green-600" />
                                <span className="text-sm font-medium text-slate-800">Corporation Tax (CT600)</span>
                             </div>
                             <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Active</span>
                        </div>
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex items-center gap-2">
                                <Shield size={16} className="text-blue-600" />
                                <span className="text-sm font-medium text-slate-800">VAT Returns (MTD)</span>
                             </div>
                             <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded">Active</span>
                        </div>
                         <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex items-center gap-2">
                                <Shield size={16} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-600">PAYE (Payroll)</span>
                             </div>
                             <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">Exempt</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
