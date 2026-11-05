/**
 * MobileDashboard.jsx — Mobile-optimized Dashboard for Teachers
 * Stacks Session Controller, Live Stream, and Schedule into a manageable, sleek view.
 */
import { useState } from 'react';
import { SessionController } from '../desktop/SessionController';
import { AttendanceStream } from '../desktop/AttendanceStream';
import { SchedulePanel } from '../desktop/SchedulePanel';
import { Sliders, Activity, Calendar } from 'lucide-react';

export function MobileDashboard() {
  const [activeTab, setActiveTab] = useState('control'); // 'control' | 'stream' | 'schedule'

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Segment Switcher */}
      <div className="p-3 bg-white border-b border-slate-200">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('control')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'control'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Control</span>
          </button>

          <button
            onClick={() => setActiveTab('stream')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'stream'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Stream</span>
          </button>

          <button
            onClick={() => setActiveTab('schedule')}
            className={`py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'schedule'
                ? 'bg-white text-brand-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Schedule</span>
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'control' && <SessionController />}
        {activeTab === 'stream' && <AttendanceStream />}
        {activeTab === 'schedule' && <SchedulePanel />}
      </div>
    </div>
  );
}
