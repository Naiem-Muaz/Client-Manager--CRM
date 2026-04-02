import React from 'react';
import { CheckSquare, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export function OutstandingWorkSection() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckSquare size={20} className="text-amber-500" />
                Outstanding Work
            </h3>
            
            <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-amber-900">Missing Bank Statement (Dec 2023)</p>
                        <p className="text-xs text-amber-700 mt-0.5">Requested 3 days ago</p>
                    </div>
                </div>
                 <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <FileText size={16} className="text-slate-500 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-slate-700">Review Draft Accounts</p>
                        <p className="text-xs text-slate-500 mt-0.5">Due Tomorrow</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ComplianceHistorySection() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
             <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-teal-500" />
                Compliance History
            </h3>
            
            <div className="relative border-l border-slate-200 ml-2 space-y-6">
                <div className="pl-6 relative">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white"></div>
                    <p className="text-sm font-medium text-slate-900">VAT Return Submitted</p>
                    <p className="text-xs text-slate-500">Jan 15, 2024</p>
                </div>
                 <div className="pl-6 relative">
                    <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white"></div>
                    <p className="text-sm font-medium text-slate-900">Accounts Approved</p>
                    <p className="text-xs text-slate-500">Dec 20, 2023</p>
                </div>
            </div>
        </div>
    );
}
