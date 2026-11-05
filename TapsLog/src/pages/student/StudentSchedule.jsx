import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  BookOpen,
  Mail,
  Check,
  X,
  Plus
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import courseService from '../../api/courseService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function StudentSchedule({ onRefreshCourses }) {
  const user = useAppStore((s) => s.user);
  const studentId = user?.student_id || user?.id;

  const [courses, setCourses] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinStatus, setJoinStatus] = useState({ state: 'idle', message: '' });

  const [pstTime, setPstTime] = useState('');
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

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

  // Request notification permission on mount
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().then(p => setNotifPermission(p));
    }
  }, []);

  // 10-minute before class native desktop reminder
  useEffect(() => {
    if (!courses.length || notifPermission !== 'granted') return;
    const checkReminders = () => {
      const now = new Date();
      const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
      const nowMin = now.getHours() * 60 + now.getMinutes();
      courses.forEach(course => {
        const days = (course.day_of_week || '').split(',').map(d => d.trim());
        if (!days.includes(todayName)) return;
        if (!course.time_in) return;
        const [h, m] = course.time_in.split(':').map(Number);
        const classMin = h * 60 + m;
        if (nowMin === classMin - 10) {
          new Notification('Class starts in 10 minutes', {
            body: `${course.course_name} (${course.section || 'General'}) at ${course.time_in}`,
            icon: '/favicon.ico'
          });
        }
      });
    };
    const id = setInterval(checkReminders, 60000);
    return () => clearInterval(id);
  }, [courses, notifPermission]);

  useEffect(() => {
    if (studentId) loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, invitesRes] = await Promise.all([
        courseService.getStudentCourses(studentId),
        courseService.getStudentInvitations(studentId)
      ]);

      if (coursesRes.success) setCourses(coursesRes.courses || []);
      if (invitesRes.success) setInvitations(invitesRes.invitations || []);
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespondInvitation = async (invitationId, action) => {
    try {
      const res = await courseService.respondToInvitation(invitationId, action);
      if (res.success) {
        await loadData();
        if (onRefreshCourses) onRefreshCourses();
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to process invitation.');
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;

    try {
      setJoinStatus({ state: 'loading', message: 'Verifying join code...' });
      const res = await courseService.joinCourse(joinCodeInput.trim().toUpperCase(), studentId);
      if (res.success) {
        setJoinStatus({ state: 'success', message: res.message });
        setJoinCodeInput('');
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinStatus({ state: 'idle', message: '' });
          loadData();
          if (onRefreshCourses) onRefreshCourses();
        }, 1500);
      }
    } catch (err) {
      setJoinStatus({ state: 'error', message: err?.response?.data?.message || 'Invalid join code.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
      {/* Live PST Clock Banner & Desktop Reminder Alert */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-200 animate-pulse" />
          <span className="text-xs font-semibold text-blue-100 uppercase tracking-wide">Philippine Standard Time</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-mono font-bold text-white tabular-nums tracking-wider">{pstTime}</span>
          {notifPermission !== 'granted' && typeof Notification !== 'undefined' && (
            <button
              onClick={() => Notification.requestPermission().then(p => setNotifPermission(p))}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white transition font-medium"
            >
              Enable Reminders
            </button>
          )}
        </div>
      </div>
      {/* Pending GSuite Course Invitations Card */}
      {invitations.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-blue-50 border border-blue-200 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900 text-sm">Pending Course Invitations</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold">
              {invitations.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {invitations.map((inv) => (
              <div
                key={inv.invitation_id}
                className="p-3.5 rounded-xl bg-white border border-blue-100 flex flex-col justify-between shadow-xs"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                      {inv.course_code}
                    </span>
                    <span className="text-[11px] text-slate-500">Prof. {inv.teacher_name}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{inv.course_name}</h4>
                  <p className="text-xs text-slate-500">Section: {inv.section || 'General'}</p>
                </div>

                <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100">
                  <button
                    onClick={() => handleRespondInvitation(inv.invitation_id, 'ACCEPT')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept
                  </button>
                  <button
                    onClick={() => handleRespondInvitation(inv.invitation_id, 'DECLINE')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Weekly Academic Timetable
          </h2>
          <p className="text-xs text-slate-500">Scheduled class times based on active enrolled courses</p>
        </div>

        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" /> Join Class Code
        </button>
      </div>

      {/* Timetable Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-slate-100 border border-slate-200" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs text-slate-500">You are not currently enrolled in any classes.</p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="mt-2 text-xs text-blue-600 font-semibold hover:underline"
          >
            Enter a join code (TAPS-XXXXXX)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DAYS.map((day) => {
            const dayCourses = courses.filter((c) => c.day_of_week && c.day_of_week.includes(day));

            return (
              <div
                key={day}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{day}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {dayCourses.length} {dayCourses.length === 1 ? 'class' : 'classes'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {dayCourses.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No scheduled lectures</p>
                    ) : (
                      dayCourses.map((c) => (
                        <div
                          key={c.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-blue-700 font-mono">
                              {c.course_code}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-500" />
                              {c.time_in?.slice(0, 5)} - {c.time_out?.slice(0, 5)}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 text-xs mt-1 truncate">{c.course_name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Prof. {c.teacher_name || 'Assigned Instructor'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* JOIN COURSE MODAL */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Join with Class Code</h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter the 6-character code given by your instructor (e.g., TAPS-AB3K8Q).
            </p>

            <form onSubmit={handleJoinByCode} className="space-y-4">
              <input
                type="text"
                required
                placeholder="TAPS-XXXXXX"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                className="w-full text-center tracking-widest font-mono text-base font-bold py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:border-blue-500 focus:bg-white outline-none"
              />

              {joinStatus.message && (
                <p
                  className={`text-xs text-center ${
                    joinStatus.state === 'error' ? 'text-red-500' : 'text-emerald-600 font-medium'
                  }`}
                >
                  {joinStatus.message}
                </p>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joinStatus.state === 'loading'}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
                >
                  Join Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentSchedule;