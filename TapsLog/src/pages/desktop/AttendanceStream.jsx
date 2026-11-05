/**
 * AttendanceStream — Column 1 of desktop dashboard (Sleek White UI)
 */
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime, cn } from '../../lib/utils';
import { Activity, Wifi, Trash2 } from 'lucide-react';

export function AttendanceStream() {
  const attendanceFeed = useAppStore((s) => s.attendanceFeed);
  const clearFeed = useAppStore((s) => s.clearFeed);
  const sessionStatus = useAppStore((s) => s.sessionStatus);

  const presentCount = attendanceFeed.filter((e) => e.status === 'PRESENT').length;
  const lateCount = attendanceFeed.filter((e) => e.status === 'LATE').length;
  const timeOutCount = attendanceFeed.filter((e) => e.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-600" />
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Live Stream</h2>
            {sessionStatus === 'ACTIVE' && (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping-slow" />
            )}
          </div>
          <button
            onClick={clearFeed}
            disabled={attendanceFeed.length === 0}
            className="text-slate-400 hover:text-red-500 p-1 disabled:opacity-30 transition-colors"
            title="Clear stream"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-emerald-700 leading-none">{presentCount}</p>
            <p className="text-[10px] text-emerald-600 mt-1">Present</p>
          </div>
          <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-amber-700 leading-none">{lateCount}</p>
            <p className="text-[10px] text-amber-600 mt-1">Late</p>
          </div>
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-2 text-center">
            <p className="text-lg font-bold text-blue-700 leading-none">{timeOutCount}</p>
            <p className="text-[10px] text-blue-600 mt-1">Time Out</p>
          </div>
        </div>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {attendanceFeed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-16">
            <Wifi className="w-8 h-8 opacity-40" />
            <p className="text-xs">
              {sessionStatus === 'ACTIVE' ? 'Listening for NFC taps…' : 'No active session'}
            </p>
          </div>
        ) : (
          attendanceFeed.map((event, i) => (
            <div
              key={`${event.student}-${event.scanned_at}-${i}`}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-xl border transition-all animate-slide-up',
                i === 0
                  ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              )}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                {event.student?.[0]?.toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{event.student}</p>
                <p className="text-[10px] text-slate-400 truncate">{event.program || 'BSIT-3A'}</p>
              </div>

              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <StatusBadge status={event.status || event.action} />
                <span className="text-[10px] text-slate-400 font-mono">
                  {formatTime(event.scanned_at)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
