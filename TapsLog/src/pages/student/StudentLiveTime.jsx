/**
 * StudentLiveTime.jsx — Student POV: Live Time & Tap-In (Sleek White UI)
 */
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime } from '../../lib/utils';
import { Clock, CheckCircle2, AlertCircle, MapPin } from 'lucide-react';

export function StudentLiveTime() {
  const user = useAppStore((s) => s.user);
  const activeSession = useAppStore((s) => s.activeSession);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const studentAttendanceToday = useAppStore((s) => s.studentAttendanceToday);
  const attendanceFeed = useAppStore((s) => s.attendanceFeed);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const personalScans = attendanceFeed.filter(
    (e) => e.student === user?.name || e.student_id === user?.student_id
  );

  const hasTimedIn = studentAttendanceToday || personalScans.length > 0;
  const currentAttendance = studentAttendanceToday || personalScans[0];

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto h-full overflow-y-auto">
      {/* Clock Card */}
      <div className="card p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-200">Standard Time</span>
            <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight mt-0.5">
              {currentTime.toLocaleTimeString('en-US', { hour12: true })}
            </div>
            <p className="text-xs text-blue-100 mt-1">
              {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 rounded-xl sm:text-right">
            <p className="text-xs font-semibold">{user?.name || 'Student'}</p>
            <p className="text-[11px] text-blue-200">{user?.program || 'BSIT-3A'} · ID: {user?.student_id || '2023-10492'}</p>
          </div>
        </div>
      </div>

      {/* Class Session */}
      <div className="grid grid-cols-1 gap-4">
        {/* Class Details */}
        <div className="card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Class</span>
            <StatusBadge status={sessionStatus === 'ACTIVE' ? 'ACTIVE' : 'PENDING'} />
          </div>

          {activeSession ? (
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 leading-snug">{activeSession.subject}</h2>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-brand-600" /> {activeSession.start_time} - {activeSession.end_time}
                </span>
                <span className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                  <MapPin className="w-3.5 h-3.5 text-brand-600" /> {activeSession.room}
                </span>
              </div>
              <p className="text-xs text-slate-400 pt-1">Instructor: {activeSession.instructor || 'Faculty'}</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-3">No active class session</p>
          )}

          {/* Today's Status Banner */}
          <div className={`p-3 rounded-xl border flex items-center justify-between ${
            hasTimedIn ? 'bg-emerald-50/70 border-emerald-200' : 'bg-amber-50/70 border-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              {hasTimedIn ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-600" />
              )}
              <div>
                <p className={`text-xs font-bold ${hasTimedIn ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {hasTimedIn ? 'Timed In (Present)' : 'Pending Check-In'}
                </p>
                {hasTimedIn && (
                  <p className="text-[10px] text-emerald-700 font-mono">
                    {formatTime(currentAttendance?.time_in || currentAttendance?.scanned_at)}
                  </p>
                )}
              </div>
            </div>
            <StatusBadge status={hasTimedIn ? 'PRESENT' : 'PENDING'} />
          </div>
        </div>

      </div>
    </div>
  );
}
