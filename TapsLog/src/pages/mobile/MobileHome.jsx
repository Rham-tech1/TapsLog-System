/**
 * MobileHome.jsx — Teacher Mobile Home (Sleek White UI)
 */
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime } from '../../lib/utils';
import { Clock, Wifi } from 'lucide-react';

export function MobileHome() {
  const user = useAppStore((s) => s.user);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const currentClass = useAppStore((s) => s.currentClass);
  const nextClass = useAppStore((s) => s.nextClass);
  const attendanceFeed = useAppStore((s) => s.attendanceFeed);

  const presentCount = attendanceFeed.filter((e) => e.status === 'PRESENT').length;
  const lateCount = attendanceFeed.filter((e) => e.status === 'LATE').length;

  return (
    <div className="p-4 space-y-4">
      {/* Greeting */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">{user?.name || 'Teacher'}</h2>
        <p className="text-xs text-slate-400">Faculty Dashboard</p>
      </div>

      {/* Current Class */}
      {currentClass ? (
        <div className="card p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-200">Current Class</span>
            <StatusBadge status={sessionStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING'} />
          </div>
          <h3 className="text-base font-bold text-white">{currentClass.subject}</h3>
          <p className="text-xs text-blue-100 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            {currentClass.start_time} – {currentClass.end_time} · {currentClass.section} · {currentClass.room}
          </p>
        </div>
      ) : (
        <div className="card p-4 text-center text-xs text-slate-400">
          No active class session
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        <div className="card p-2.5 text-center border-emerald-100 bg-emerald-50/50">
          <p className="text-lg font-bold text-emerald-700">{presentCount}</p>
          <p className="text-[10px] text-slate-500">Present</p>
        </div>
        <div className="card p-2.5 text-center border-amber-100 bg-amber-50/50">
          <p className="text-lg font-bold text-amber-700">{lateCount}</p>
          <p className="text-[10px] text-slate-500">Late</p>
        </div>
        <div className="card p-2.5 text-center border-blue-100 bg-blue-50/50">
          <p className="text-lg font-bold text-brand-700">{attendanceFeed.length}</p>
          <p className="text-[10px] text-slate-500">Total</p>
        </div>
      </div>

      {/* Recent Taps */}
      <div className="space-y-2">
        <p className="section-header">Recent Taps</p>
        {attendanceFeed.length === 0 ? (
          <div className="card p-6 text-center text-slate-400 text-xs">
            <Wifi className="w-6 h-6 mx-auto mb-1 opacity-40" />
            Waiting for NFC taps...
          </div>
        ) : (
          attendanceFeed.slice(0, 5).map((event, i) => (
            <div key={i} className="card p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                  {event.student?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{event.student}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{formatTime(event.scanned_at)}</p>
                </div>
              </div>
              <StatusBadge status={event.status || event.action} />
            </div>
          ))
        )}
      </div>

      {/* Next Class */}
      {nextClass && (
        <div className="card p-3 flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-slate-400">Up Next</p>
            <p className="font-semibold text-slate-800">{nextClass.subject}</p>
            <p className="text-[10px] text-slate-500">{nextClass.section} · {nextClass.start_time}</p>
          </div>
        </div>
      )}
    </div>
  );
}
