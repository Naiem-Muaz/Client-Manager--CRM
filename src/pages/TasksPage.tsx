import React from 'react';
import { CheckSquare, Filter, Plus, Calendar, User, Loader2 } from 'lucide-react';
import { useTasks, updateTask } from '../hooks/useTasks';

export function TasksPage() {
    // SWR hook connecting to Node platform
    const { tasks: rawTasks, isLoading, mutate } = useTasks();
    const tasks = Array.isArray(rawTasks) ? rawTasks : [];

    const handleComplete = async (taskId: string) => {
        await updateTask(taskId, { status: 'Complete' });
        mutate(undefined);
    };

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Work Tasks</h1>
                    <p className="text-slate-500 mt-1">
                        Auto-generated tasks linked to active accounting periods.
                    </p>
                </div>
                {/* No "New Task" button - Enforcing Non-detachable rule */}
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Live Sync Active
                </div>
            </div>

            <div className="flex gap-6">
                {/* Filters Sidebar */}
                <div className="w-64 bg-white rounded-xl border border-slate-200 p-4 h-fit hidden xl:block">
                    <div className="flex items-center gap-2 text-slate-900 font-semibold mb-4">
                        <Filter size={18} /> Filters
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Assignee</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" className="rounded text-blue-600" defaultChecked /> Assigned to Me
                                </label>
                                 <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" className="rounded text-blue-600" /> Waiting on Client
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Priority</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" className="rounded text-blue-600" /> High
                                </label>
                                 <label className="flex items-center gap-2 text-sm text-slate-700">
                                    <input type="checkbox" className="rounded text-blue-600" /> Medium
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-3">
                    {isLoading && (
                        <div className="flex justify-center items-center py-12 text-slate-400">
                            <Loader2 className="animate-spin mr-2" /> Syncing workflows...
                        </div>
                    )}
                    {tasks.map((task: any) => (
                        <div key={task.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 group hover:border-blue-300 transition-all cursor-pointer">
                            <button 
                                onClick={() => handleComplete(task.id)}
                                className="w-5 h-5 rounded border border-slate-300 hover:border-blue-500 flex items-center justify-center text-white hover:text-blue-500 transition-colors"
                            >
                                <CheckSquare size={14} className="opacity-0 hover:opacity-100" />
                            </button>
                            
                            <div className="flex-1">
                                <h3 className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-2 mt-0.5">
                                    <span className="font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-xs">
                                        Linked to: {task.context || 'General'}
                                    </span>
                                </p>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                                    <Calendar size={14} /> {task.due || 'Ongoing'}
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                                    task.assignee === 'Me' 
                                        ? 'bg-blue-100 text-blue-700 border-blue-200' 
                                        : 'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                    {task.assignee || 'Unassigned'}
                                </div>
                            </div>
                        </div>
                    ))}
                    
                    <div className="text-center py-8 text-slate-400 text-sm">
                        <p>All tasks are automatically generated from your active workflows.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
