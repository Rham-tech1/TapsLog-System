/**
 * MobileSchedule.jsx — Teacher Mobile Schedule (Sleek White UI)
 */
import { useAppStore } from '../../store/useAppStore';
import { useSchedule } from '../../hooks/useSchedule';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { Clock, MapPin, RefreshCw, Loader2 } from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function MobileSchedule() {
  const user = useAppStore((s) => s.user);
  const allSchedules = useAppStore((s) => s.allSchedules);
  const currentClass = useAppStore((s) => s.currentClass);
  const { loading, refresh } = useSchedule(user?.faculty_id || user?.id || user?.name);

  const teacherClasses = user?.name && user?.role === 'teacher'
    ? (allSchedules || []).filter(
        (s) =>
          s.instructor.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(s.instructor.toLowerCase())
      )
    : allSchedules || [];

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = teacherClasses.filter((s) => s.day_of_week === day);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Schedule</h2>
          <p className="text-xs text-slate-500">Weekly class roster</p>
        </div>
        <button onClick={refresh} disabled={loading} className="text-slate-400 hover:text-slate-700 p-1">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </button>
      </div>

      <div className="space-y-3">
        {DAYS.map((day) => {
          const classes = grouped[day] || [];
          const isToday = day === today;
          return (
            <div key={day} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span className={isToday ? 'text-brand-600' : ''}>{day}</span>
                {isToday && (
                  <span className="text-[10px] bg-blue-50 text-brand-700 px-1.5 py-0.2 rounded font-semibold border border-blue-100">
                    Today
                  </span>
                )}
              </div>

              {classes.length === 0 ? (
                <p className="text-[11px] text-slate-400 pl-1">No classes scheduled</p>
              ) : (
                classes.map((cls, idx) => {
                  const isActive = currentClass?.session_id === cls.session_id;
                  return (
                    <div
                      key={idx}
                      className={`card p-3 border transition-all ${
                        isActive ? 'border-emerald-300 bg-emerald-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{cls.subject}</p>
                          <p className="text-[11px] text-slate-500">{cls.section}</p>
                        </div>
                        <StatusBadge status={isActive ? 'ACTIVE' : cls.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-brand-600" /> {cls.start_time} - {cls.end_time}</span>
                        {cls.room && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-brand-600" /> {cls.room}</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
