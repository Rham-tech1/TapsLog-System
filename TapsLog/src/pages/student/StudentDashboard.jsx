import { useState } from 'react';
import { StudentLiveTime } from './StudentLiveTime';
import { StudentSchedule } from './StudentSchedule';
import { Clock, Calendar } from 'lucide-react';

export function StudentDashboard() {
  const [tab, setTab] = useState('livetime');

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex border-b border-slate-200 bg-white px-6 py-2 gap-2 shrink-0">
        <button
          onClick={() => setTab('livetime')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            tab === 'livetime' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" /> Live Time & Tap
        </button>
        <button
          onClick={() => setTab('schedule')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
            tab === 'schedule' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" /> Enrolled Schedule
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {tab === 'livetime' ? <StudentLiveTime /> : <StudentSchedule />}
      </div>
    </div>
  );
}

export default StudentDashboard;
