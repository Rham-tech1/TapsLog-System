/**
 * ScheduleView.jsx — Teacher POV: Live Class Schedule from Supabase
 * Loads teacher's actual created courses via courseService.getTeacherCourses()
 * and plots them in a filterable day-pill grid.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import courseService from '../../api/courseService';
import { attendanceService } from '../../api/attendanceService';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  Square,
  RefreshCw,
  BookOpen,
  Loader2,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseDays(dayOfWeekStr) {
  if (!dayOfWeekStr) return [];
  return dayOfWeekStr.split(',').map((d) => d.trim()).filter(Boolean);
}

function formatTime(timeStr) {
  if (!timeStr) return 'TBA';
  // Handle HH:MM:SS or HH:MM
  const parts = timeStr.split(':');
  let hour = parseInt(parts[0], 10);
  const min = parts[1] || '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour > 12) hour -= 12;
  if (hour === 0) hour = 12;
  return `${hour}:${min} ${ampm}`;
}

function isCurrentlyInSession(course, now) {
  const days = parseDays(course.day_of_week);
  const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  if (!days.includes(todayName)) return false;

  if (!course.time_in || !course.time_out) return false;
  const [inH, inM] = course.time_in.split(':').map(Number);
  const [outH, outM] = course.time_out.split(':').map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return nowMin >= inH * 60 + inM && nowMin < outH * 60 + outM;
}

export function ScheduleView() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const addNotification = useAppStore((s) => s.addNotification);
  const activeSession = useAppStore((s) => s.activeSession);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const setSessionStatus = useAppStore((s) => s.setSessionStatus);

  const teacherId = user?.teacher_id || user?.id;

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [now, setNow] = useState(() => new Date());
  const [togglingId, setTogglingId] = useState(null);

  // Live clock tick (every 30s)
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (teacherId) loadCourses();
  }, [teacherId]);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await courseService.getTeacherCourses(teacherId);
      if (res.success && res.courses) {
        setCourses(res.courses);
      }
    } catch (err) {
      console.error('[ScheduleView] Failed to load courses:', err);
      addToast({ message: 'Could not load schedule. Check your connection.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter courses by selected day
  const filteredCourses = selectedDay === 'ALL'
    ? courses
    : courses.filter((c) => parseDays(c.day_of_week).includes(selectedDay));

  const handleActivateToggle = async (course) => {
    const isLive = activeSession?.id === course.id && sessionStatus === 'ACTIVE';

    if (isLive) {
      // Stop session
      try {
        setTogglingId(course.id);
        if (activeSession?.session_db_id) {
          await attendanceService.stopSession(activeSession.session_db_id);
        }
        setSessionStatus('CLOSED');
        setActiveSession(null);
        addToast({ message: `${course.course_name} session ended.`, type: 'info' });
        addNotification({ message: `${course.course_name} session ended`, type: 'info' });
      } catch (err) {
        addToast({ message: 'Failed to stop session.', type: 'error' });
      } finally {
        setTogglingId(null);
      }
    } else {
      // Start session
      if (!isCurrentlyInSession(course, now)) {
        const days = parseDays(course.day_of_week).join(', ');
        addToast({
          message: `Notice: Scheduled ${days} (${formatTime(course.time_in)} - ${formatTime(course.time_out)}). Starting live session.`,
          type: 'info'
        });
      }
      try {
        setTogglingId(course.id);
        const res = await attendanceService.startSession({
          course_id: course.id,
          teacher_id: teacherId
        });
        setActiveSession({
          id: course.id,
          session_db_id: res.session?.id,
          subject: course.course_name,
          section: course.section,
          course_code: course.course_code,
          room: course.room_assignment
        });
        setSessionStatus('ACTIVE');
        addToast({ message: `Session LIVE: ${course.course_name}`, type: 'success' });
        addNotification({ message: `${course.course_name} session started`, type: 'success' });
      } catch (err) {
        addToast({ message: err?.response?.data?.message || 'Failed to start session.', type: 'error' });
      } finally {
        setTogglingId(null);
      }
    }
  };

  const renderCourseCard = (course) => {
    const days = parseDays(course.day_of_week);
    const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const isToday = days.includes(todayName);
    const isLive = activeSession?.id === course.id && sessionStatus === 'ACTIVE';
    const canStart = isToday && isCurrentlyInSession(course, now);
    const isToggling = togglingId === course.id;

    return (
      <div
        key={course.id}
        className={`card flex flex-col justify-between border p-4 transition-all ${
          isLive
            ? 'border-emerald-300 bg-emerald-50/40 shadow-sm'
            : 'hover:border-slate-300 hover:shadow-xs'
        }`}
      >
        {/* Header */}
        <div className="space-y-2.5">
          {/* Day pills + live badge */}
          <div className="flex items-center justify-between gap-1 flex-wrap">
            <div className="flex gap-1 flex-wrap">
              {days.map((d) => (
                <span
                  key={d}
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    d === todayName
                      ? 'bg-brand-50 text-brand-700 border-brand-200'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                  }`}
                >
                  {d.slice(0, 3)}
                </span>
              ))}
            </div>
            {isLive && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                LIVE
              </span>
            )}
          </div>

          {/* Course title */}
          <div>
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wide">
              {course.course_code}
            </p>
            <h3 className="text-sm font-bold leading-snug text-slate-900">{course.course_name}</h3>
            {course.section && (
              <p className="text-[11px] text-slate-500 mt-0.5">{course.section}</p>
            )}
          </div>

          {/* Meta */}
          <div className="space-y-1 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span>
                {course.time_in && course.time_out
                  ? `${formatTime(course.time_in)} – ${formatTime(course.time_out)}`
                  : 'Time TBA'}
              </span>
            </div>
            {course.room_assignment && (
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                <span>{course.room_assignment}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 shrink-0 text-brand-500" />
              <span>{course.enrolled_count ?? 0} Enrolled</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 pt-2.5 border-t border-slate-100">
          {isLive ? (
            <button
              onClick={() => handleActivateToggle(course)}
              disabled={isToggling}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-all disabled:opacity-60"
            >
              {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
              End Session
            </button>
          ) : canStart ? (
            <button
              onClick={() => handleActivateToggle(course)}
              disabled={isToggling}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 shadow-xs transition-all disabled:opacity-60"
            >
              {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Start Session
            </button>
          ) : (
            <div className="text-center text-[10px] text-slate-400 py-1">
              {!isToday
                ? `Runs on ${days.join(', ')}`
                : `Starts at ${formatTime(course.time_in)}`}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="sticky -top-4 sm:-top-6 z-30 -mx-4 sm:-mx-6 -mt-4 sm:-mt-6 flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 pb-3 pt-4 sm:flex-row sm:items-center sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">My Class Schedule</h1>
            <p className="text-[11px] text-slate-500">
              {courses.length} course{courses.length !== 1 ? 's' : ''} assigned
            </p>
          </div>
        </div>

        {/* Day filter pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
              selectedDay === 'ALL'
                ? 'bg-brand-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                selectedDay === day
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {day.slice(0, 3)}
            </button>
          ))}
          <button
            onClick={loadCourses}
            disabled={loading}
            aria-label="Refresh schedule"
            title="Refresh schedule"
            className="ml-1 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-brand-700 disabled:opacity-50 transition-all shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          <p className="text-sm">Loading your schedule…</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <BookOpen className="h-10 w-10 text-slate-200" />
          <p className="text-sm font-medium">
            {selectedDay === 'ALL'
              ? 'No courses found. Create your first course in the Courses tab.'
              : `No classes scheduled for ${selectedDay}.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCourses.map(renderCourseCard)}
        </div>
      )}
    </div>
  );
}

export default ScheduleView;
