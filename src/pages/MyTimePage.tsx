import React from 'react';
import { MyAttendance } from '../components/hr/MyAttendance';
import { MyLeave } from '../components/hr/MyLeave';
import { MyRoster } from '../components/hr/MyRoster';

/**
 * Staff self-service time page (/my-time). Reachable by any signed-in staff member
 * WITHOUT going through Practice Settings. Shows ONLY the user's own attendance
 * (and, chunk 2, their own leave) — no team data, no compliance.
 */
export default function MyTimePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1E3A]">My time</h1>
        <p className="text-slate-500 text-sm mt-0.5">Clock in and out, and track your hours.</p>
      </div>
      <MyAttendance />
      <MyRoster />
      <div className="pt-2">
        <h2 className="text-lg font-bold text-[#0F1E3A] mb-3">My leave</h2>
        <MyLeave />
      </div>
    </div>
  );
}
