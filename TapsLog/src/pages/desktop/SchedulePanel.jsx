/**
 * SchedulePanel — Column 3 of desktop dashboard (Sleek White UI)
 * Restored: Live PST Clock Banner, NOW active card with Start Session quick action,
 * Next Preload card, Weekly Load Bar Visualizer, and Chronological Class List.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSchedule } from '../../hooks/useSchedule';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { attendanceService } from '../../api/attendanceService';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Calendar, Clock, RefreshCw, Loader2, ChevronRight, Play } from 'lucide-react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs shadow-md">
        <p className="text-slate-500 font-medium">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} style={{ color: entry.color }} className="font-bold">
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function SchedulePanel() {
  const user = useAppStore((s) => s.user);
  const allSchedules = useAppStore((s) => s.allSchedules);
  const currentClassStore = useAppStore((s) => s.currentClass);
  const nextClassStore = useAppStore((s) => s.nextClass);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const setSessionStatus = useAppStore((s) => s.setSessionStatus);
  const addToast = useAppStore((s) => s.addToast);

  const { loading, refresh } = useSchedule(user?.faculty_id || user?.id || user?.name);
  const [starting, setStarting] = useState(false);
  const [pstTime, setPstTime] = useState('');

  // Live Philippine Standard Time (PST) Clock
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setPstTime(now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Manila',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
      }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Filter subjects only taught by this professor
  const teacherClasses = user?.name && user?.role === 'teacher'
    ? allSchedules.filter(
        (s) =>
          s.instructor?.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(s.instructor?.toLowerCase())
      )
    : allSchedules;

  const currentClass =
    currentClassStore && teacherClasses.some((s) => s.session_id === currentClassStore.session_id)
      ? currentClassStore
      : teacherClasses[0] || null;

  const nextClass =
    nextClassStore && teacherClasses.some((s) => s.session_id === nextClassStore.session_id)
      ? nextClassStore
      : teacherClasses.find((s) => s.session_id !== currentClass?.session_id) || null;

  const barData = DAYS.map((day) => {
    const count = teacherClasses.filter((s) => s.day_of_week?.startsWith(day)).length;
    return { day, Classes: count };
  });

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);

  const handleStartSession = async (cls) => {
    if (!cls) return;
    setStarting(true);
    try {
      const res = await attendanceService.startSession({
        course_id: cls.course_id || cls.id || cls.session_id,
        teacher_id: user?.teacher_id || user?.id,
        grace_period_minutes: 15
      });
      setActiveSession({
        id: cls.course_id || cls.id || cls.session_id,
        session_db_id: res.session?.id,
        subject: cls.subject || cls.course_name,
        section: cls.section,
        course_code: cls.course_code,
        room: cls.room || cls.room_assignment
      });
      setSessionStatus('ACTIVE');
      addToast({ message: `Live scanning session activated for ${cls.subject || cls.course_name}`, type: 'success' });
    } catch (err) {
      console.error('[SchedulePanel] Start session error:', err);
      // Fallback: set active session locally
      setActiveSession(cls);
      setSessionStatus('ACTIVE');
      addToast({ message: `Session started for ${cls.subject || cls.course_name}`, type: 'info' });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white px-4 py-3.5 space-y-4 overflow-y-auto">
      {/* Header with Live PST Clock */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">My Schedule</h2>
        </div>
        <div className="flex items-center gap-2">
          {pstTime && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-[10px] font-mono font-bold text-blue-700">
              <Clock className="w-3 h-3 text-blue-600" />
              <span>{pstTime} PST</span>
            </div>
          )}
          <button onClick={refresh} disabled={loading} className="text-slate-400 hover:text-slate-700 p-1">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Current / Next Class Pills */}
      <div className="space-y-2">
        {currentClass && (
          <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-brand-700 uppercase bg-blue-100 px-1.5 py-0.5 rounded">Now</span>
                <span className="text-[10px] text-slate-400">{currentClass.start_time} - {currentClass.end_time}</span>
              </div>
              <p className="text-xs font-bold text-slate-900 leading-tight mt-1 truncate">{currentClass.subject}</p>
              <p className="text-[11px] text-slate-500">{currentClass.section}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => handleStartSession(currentClass)}
                disabled={starting}
                className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
              >
                {starting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                Start
              </button>
              <button
                onClick={() => setActiveSession(currentClass)}
                className="text-xs font-semibold text-slate-600 hover:text-brand-700 px-2 py-1.5 rounded-lg hover:bg-white/80 transition-all"
              >
                Select
              </button>
            </div>
          </div>
        )}

        {nextClass && (
          <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
            <div>
              <p className="text-slate-400 text-[10px]">Next</p>
              <p className="font-semibold text-slate-800">{nextClass.subject}</p>
              <p className="text-[10px] text-slate-500">{nextClass.start_time}</p>
            </div>
            <button
              onClick={() => setActiveSession(nextClass)}
              className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-white border border-transparent hover:border-slate-200 transition-all"
            >
              Preload
            </button>
          </div>
        )}
      </div>

      {/* Weekly Load Chart */}
      <div className="p-3 border border-slate-200 rounded-xl space-y-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase">Weekly Load (Mon - Sat)</p>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -32, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Classes" radius={[3, 3, 0, 0]}>
                {barData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.day === today ? '#2563eb' : '#93c5fd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chronological Class Roster with Status Pills */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase">My Classes ({teacherClasses.length})</p>
        {teacherClasses.map((cls, i) => (
          <button
            key={i}
            onClick={() => setActiveSession(cls)}
            className="w-full p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white text-left transition-all"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-800 truncate">{cls.subject}</p>
              <StatusBadge status={cls.status || 'PENDING'} />
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {cls.day_of_week} · {cls.start_time || 'TBA'} - {cls.end_time || 'TBA'} · {cls.section || 'General'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default SchedulePanel;
