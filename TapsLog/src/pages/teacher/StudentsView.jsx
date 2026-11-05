/**
 * StudentsView.jsx — Teacher POV: Course Studio, Join Codes, Student Rosters & Course Analytics Archive
 * Phase 3.1 Integrated: Real Supabase API, GSuite Invites, Excel Export, Two-Tier RSO Appointment & Analytics
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Users,
  Search,
  Clock,
  Send,
  Download,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  X,
  KeyRound,
  ShieldCheck,
  BarChart2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Filter,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import courseService from '../../api/courseService';
import reportService from '../../api/reportService';
import { attendanceService } from '../../api/attendanceService';
import { StudentProfileModal } from '../../components/student/StudentProfileModal';

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatDate(dateStr) {
  if (!dateStr) return 'TBA';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function StudentsView() {
  const user = useAppStore((s) => s.user);
  const addToast = useAppStore((s) => s.addToast);
  const teacherId = user?.teacher_id || user?.id;

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Tabs: 'roster' | 'analytics'
  const [activeCourseTab, setActiveCourseTab] = useState('roster');

  // Historical Session Archive & Analytics State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [sessionSearch, setSessionSearch] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);

  // GSuite Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteStatus, setInviteStatus] = useState({ state: 'idle', message: '' });

  // Create Course Form
  const [createForm, setCreateForm] = useState({
    course_code: '',
    course_name: '',
    section: '',
    semester: '1st Semester',
    academic_year: '2026-2027',
    time_in: '08:00',
    time_out: '09:30',
    selectedDays: ['Monday', 'Wednesday']
  });
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // Load courses on mount
  useEffect(() => {
    if (teacherId) loadCourses();
  }, [teacherId]);

  // Load roster & sessions whenever a course is selected
  useEffect(() => {
    if (selectedCourse?.id) {
      loadRoster(selectedCourse.id);
      loadSessions(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await courseService.getTeacherCourses(teacherId);
      if (res.success && res.courses) {
        setCourses(res.courses);
        if (res.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(res.courses[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loadRoster = async (courseId) => {
    setLoadingRoster(true);
    try {
      const res = await courseService.getCourseRoster(courseId);
      if (res.success && res.roster) {
        setRoster(res.roster);
      }
    } catch (err) {
      console.error('Failed to load roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const loadSessions = async (courseId) => {
    setLoadingSessions(true);
    try {
      const res = await attendanceService.getCourseSessions(courseId);
      if (res.success && res.sessions) {
        setSessions(res.sessions);
      }
    } catch (err) {
      console.error('Failed to load course sessions:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (addToast) addToast({ message: `Copied Join Code: ${code}`, type: 'success' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setSubmittingCourse(true);

    try {
      const payload = {
        course_code: createForm.course_code.trim().toUpperCase(),
        course_name: createForm.course_name.trim(),
        section: createForm.section.trim(),
        semester: createForm.semester,
        academic_year: createForm.academic_year,
        teacher_id: teacherId,
        time_in: createForm.time_in,
        time_out: createForm.time_out,
        day_of_week: createForm.selectedDays.join(', ')
      };

      const res = await courseService.createCourse(payload);
      if (res.success) {
        if (addToast) addToast({ message: 'Course created successfully with Join Code!', type: 'success' });
        setShowCreateModal(false);
        setCreateForm({
          course_code: '',
          course_name: '',
          section: '',
          semester: '1st Semester',
          academic_year: '2026-2027',
          time_in: '08:00',
          time_out: '09:30',
          selectedDays: ['Monday', 'Wednesday']
        });
        await loadCourses();
      }
    } catch (err) {
      if (addToast) {
        addToast({ message: err?.response?.data?.message || 'Failed to create course.', type: 'error' });
      }
    } finally {
      setSubmittingCourse(false);
    }
  };

  const handleInviteStudent = async (e) => {
    e.preventDefault();
    if (!inviteEmail.toLowerCase().endsWith('@ua.edu.ph')) {
      setInviteStatus({ state: 'error', message: 'Only @ua.edu.ph institutional emails are permitted.' });
      return;
    }
    try {
      setInviteStatus({ state: 'sending', message: 'Dispatching course invitation...' });
      const res = await courseService.inviteStudent(selectedCourse.id, inviteEmail, teacherId);
      if (res.success) {
        setInviteStatus({ state: 'success', message: res.message });
        setInviteEmail('');
        setTimeout(() => setInviteStatus({ state: 'idle', message: '' }), 4000);
      }
    } catch (err) {
      setInviteStatus({ state: 'error', message: err?.response?.data?.message || 'Failed to send invite.' });
    }
  };

  const handleExportExcel = async () => {
    if (!selectedCourse) return;
    try {
      setExportingExcel(true);
      await reportService.downloadCourseExcel(selectedCourse.id, selectedCourse.course_code);
      if (addToast) addToast({ message: 'Course master report downloaded as Excel!', type: 'success' });
    } catch (err) {
      if (addToast) addToast({ message: 'Failed to export course roster Excel file.', type: 'error' });
    } finally {
      setExportingExcel(false);
    }
  };

  const toggleDay = (day) => {
    setCreateForm((prev) => {
      const exists = prev.selectedDays.includes(day);
      const updated = exists ? prev.selectedDays.filter((d) => d !== day) : [...prev.selectedDays, day];
      return { ...prev, selectedDays: updated };
    });
  };

  // Filtered Roster
  const filteredRoster = useMemo(() => {
    if (!search.trim()) return roster;
    const q = search.toLowerCase();
    return roster.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.student_number?.toLowerCase().includes(q) ||
        s.student_id?.toLowerCase().includes(q)
    );
  }, [roster, search]);

  // Filtered Historical Sessions
  const filteredSessions = useMemo(() => {
    if (!sessionSearch.trim()) return sessions;
    const q = sessionSearch.toLowerCase();
    return sessions.filter(
      (s) =>
        formatDate(s.started_at).toLowerCase().includes(q) ||
        (s.is_active ? 'active' : 'concluded').includes(q)
    );
  }, [sessions, sessionSearch]);

  // Analytics Metrics Calculation
  const totalEnrolled = roster.length;
  const totalSessionsCount = sessions.length;
  const totalTaps = useMemo(() => {
    return sessions.reduce((acc, s) => acc + (s.total_taps || 0), 0);
  }, [sessions]);
  const avgAttendanceRate = useMemo(() => {
    if (!totalEnrolled || !totalSessionsCount) return 0;
    const expectedTaps = totalEnrolled * totalSessionsCount;
    return Math.min(100, Math.round((totalTaps / expectedTaps) * 100));
  }, [totalEnrolled, totalSessionsCount, totalTaps]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto h-full overflow-y-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Course Studio & Rosters</h1>
            <p className="text-xs text-slate-500">Manage classroom sections, student rosters & analytics</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white text-xs font-semibold shadow-xs transition-all"
        >
          <Plus className="w-4 h-4" /> Create Course
        </button>
      </div>

      {/* Main Course Grid / Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Course Selector List */}
        <div className={`lg:col-span-4 space-y-3 ${selectedCourse ? "hidden lg:block" : "block"}`}>
          {/* Mobile Back Button */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Courses</p>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {courses.length}
            </span>
          </div>

          {loadingCourses ? (
            <div className="space-y-2 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-slate-100 border border-slate-200" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
              No courses created yet. Click "+ Create Course" above.
            </div>
          ) : (
            <div className="space-y-2.5">
              {courses.map((c) => {
                const isSelected = selectedCourse?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCourse(c)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {c.course_code}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1 truncate">{c.course_name}</h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Section: {c.section || 'General'}</p>
                      </div>

                      <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg shrink-0">
                        {c.enrolled_count || 0} enrolled
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Join Code:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyCode(c.join_code);
                        }}
                        className="font-mono font-semibold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1 transition-all"
                      >
                        {copiedCode === c.join_code ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> {c.join_code}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Selected Course Workspace */}
        <div className="lg:col-span-8 space-y-4">
          {selectedCourse ? (
            <>
              {/* Mobile Back to Courses Navigation */}
              <button
                onClick={() => setSelectedCourse(null)}
                className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 rounded-xl bg-blue-50 border border-blue-200 transition shadow-xs w-full sm:w-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Course Directory
              </button>
              {/* Selected Course Action Header Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        {selectedCourse.course_code}
                      </span>
                      <span className="text-xs text-slate-500">
                        {selectedCourse.semester} • {selectedCourse.academic_year}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-slate-900 mt-1">{selectedCourse.course_name}</h2>
                    <p className="text-xs text-slate-500">
                      Section: {selectedCourse.section || 'General'}
                      {selectedCourse.time_in && ` • ${selectedCourse.time_in} - ${selectedCourse.time_out}`}
                      {selectedCourse.day_of_week && ` • ${selectedCourse.day_of_week}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleExportExcel}
                      disabled={exportingExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all disabled:opacity-50"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      {exportingExcel ? 'Exporting...' : 'Export Excel'}
                    </button>
                  </div>
                </div>

                {/* GSuite Student Invite Bar */}
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-100 flex flex-col sm:flex-row items-center gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Invite student by institutional email: student@ua.edu.ph"
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleInviteStudent}
                    disabled={inviteStatus.state === 'sending' || !inviteEmail}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shrink-0 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Invite
                  </button>
                </div>

                {inviteStatus.message && (
                  <p
                    className={`text-xs ${
                      inviteStatus.state === 'error' ? 'text-red-500 font-semibold' : 'text-emerald-600 font-semibold'
                    }`}
                  >
                    {inviteStatus.message}
                  </p>
                )}
              </div>

              {/* Tab Selector: Enrolled Roster vs Reports & Analytics */}
              <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setActiveCourseTab('roster')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeCourseTab === 'roster'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> 👥 Enrolled Roster & Co-Teachers ({roster.length})
                </button>
                <button
                  onClick={() => {
                    setActiveCourseTab('analytics');
                    if (selectedCourse?.id) loadSessions(selectedCourse.id);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeCourseTab === 'analytics'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" /> 📊 Reports & Analytics
                </button>
                <button
                  onClick={() => {
                    setActiveCourseTab('history');
                    if (selectedCourse?.id) loadSessions(selectedCourse.id);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    activeCourseTab === 'history'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" /> 📜 Session History ({sessions.length})
                </button>
              </div>

              {/* Tab 1: Enrolled Roster & Co-Teachers Content */}
              {activeCourseTab === 'roster' && (
                <div className="space-y-4">
                  {/* Co-Teachers & Faculty Leadership Card */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{user?.name || 'Primary Faculty'}</p>
                        <p className="text-[11px] text-slate-400">{user?.email || 'Instructor of Record'}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      PRIMARY INSTRUCTOR
                    </span>
                  </div>
                  {/* Roster Search Bar */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-3 shadow-xs">
                    <div>
                      <p className="text-[11px] text-slate-400">Class Enrolled Roster</p>
                      <p className="text-sm font-bold text-slate-900">{roster.length} Students</p>
                    </div>
                    <div className="relative w-48 sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search students..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Roster Grid */}
                  {loadingRoster ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading student roster...</div>
                  ) : filteredRoster.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No students found. Invite via GSuite above or share join code{' '}
                      <span className="font-mono font-bold text-blue-600">{selectedCourse.join_code}</span>.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredRoster.map((student) => (
                        <div
                          key={student.student_id}
                          onClick={() => setSelectedStudentForModal(student)}
                          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 transition-all cursor-pointer shadow-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                              {student.full_name?.[0] || 'S'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{student.full_name}</p>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {student.student_number || student.student_id}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            {student.attended_sessions_count || 0} Taps
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Reports & Analytics */}
              {activeCourseTab === 'analytics' && (
                <div className="space-y-4">
                  {/* Real-time Summary Counts */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Enrolled</p>
                      <p className="text-xl font-bold text-slate-900 mt-1">{totalEnrolled}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Students on roster</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Sessions</p>
                      <p className="text-xl font-bold text-blue-600 mt-1">{totalSessionsCount}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Held scan windows</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total NFC Taps</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{totalTaps}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Scanned check-ins</p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
                      <p className="text-xl font-bold text-indigo-600 mt-1">{avgAttendanceRate}%</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Average engagement</p>
                    </div>
                  </div>

                  {/* Real-Time Distribution Breakdown */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900">Aggregate Session Metrics</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Presents</p>
                        <p className="text-xl font-bold text-emerald-900 mt-1">
                          {sessions.reduce((acc, s) => acc + (s.present_count || 0), 0)}
                        </p>
                        <p className="text-[10px] text-emerald-600">On-time taps</p>
                      </div>

                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-center">
                        <p className="text-[10px] font-bold text-amber-700 uppercase">Lates</p>
                        <p className="text-xl font-bold text-amber-900 mt-1">
                          {sessions.reduce((acc, s) => acc + (s.late_count || 0), 0)}
                        </p>
                        <p className="text-[10px] text-amber-600">Past grace period</p>
                      </div>

                      <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-center">
                        <p className="text-[10px] font-bold text-red-700 uppercase">Calculated Absents</p>
                        <p className="text-xl font-bold text-red-900 mt-1">
                          {sessions.reduce((acc, s) => {
                            const p = s.present_count || 0;
                            const l = s.late_count || 0;
                            return acc + Math.max(0, totalEnrolled - (p + l));
                          }, 0)}
                        </p>
                        <p className="text-[10px] text-red-600">Enrolled - (Present + Late)</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Session History Archive */}
              {activeCourseTab === 'history' && (
                <div className="space-y-4">

                  {/* Search and Archive Header */}
                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div>
                      <h3 className="text-xs font-bold text-slate-900">Historical Attendance Session Archive</h3>
                      <p className="text-[11px] text-slate-400">Date-filtered breakdown of closed & active scan logs</p>
                    </div>

                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={sessionSearch}
                        onChange={(e) => setSessionSearch(e.target.value)}
                        placeholder="Search by date or status..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Sessions List */}
                  {loadingSessions ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading historical sessions...</div>
                  ) : filteredSessions.length === 0 ? (
                    <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                      No attendance sessions recorded yet for this course. Start a live session from the Dashboard.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredSessions.map((s) => {
                        const presents = s.present_count || 0;
                        const lates = s.late_count || 0;
                        const absents = Math.max(0, totalEnrolled - (presents + lates));

                        return (
                          <div
                            key={s.id}
                            className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                  s.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {s.is_active ? 'ACTIVE SCANNER' : 'CONCLUDED'}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {formatDate(s.started_at)}
                                </span>
                              </div>
                              {s.ended_at && (
                                <p className="text-[10px] text-slate-400 mt-1">
                                  Closed: {formatDate(s.ended_at)}
                                </p>
                              )}
                            </div>

                            {/* Session Metrics Pills */}
                            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {presents} Present
                              </span>
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                                {lates} Late
                              </span>
                              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200">
                                {absents} Absent
                              </span>
                              <button
                                onClick={handleExportExcel}
                                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                              >
                                Export
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-12 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
              Select or create a course to inspect roster & analytics.
            </div>
          )}
        </div>
      </div>

      {/* CREATE COURSE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                <h3 className="text-sm font-bold">Create Academic Course</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-white/80 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="p-4 space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. IT311, CS101"
                  value={createForm.course_code}
                  onChange={(e) => setCreateForm({ ...createForm, course_code: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none uppercase font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced Database Systems"
                  value={createForm.course_name}
                  onChange={(e) => setCreateForm({ ...createForm, course_name: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Section</label>
                  <input
                    type="text"
                    placeholder="e.g. BSIT-3A"
                    value={createForm.section}
                    onChange={(e) => setCreateForm({ ...createForm, section: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Semester</label>
                  <select
                    value={createForm.semester}
                    onChange={(e) => setCreateForm({ ...createForm, semester: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none"
                  >
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                    <option value="Summer">Summer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Time In</label>
                  <input
                    type="time"
                    value={createForm.time_in}
                    onChange={(e) => setCreateForm({ ...createForm, time_in: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Time Out</label>
                  <input
                    type="time"
                    value={createForm.time_out}
                    onChange={(e) => setCreateForm({ ...createForm, time_out: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Schedule Days</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((d) => {
                    const active = createForm.selectedDays.includes(d);
                    return (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                          active
                            ? 'bg-blue-600 border-blue-600 text-white font-semibold'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 rounded-xl text-blue-800 text-[11px] flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-blue-600 shrink-0" />
                <span>A 6-character Join Code (TAPS-XXXXXX) will be generated automatically.</span>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-600 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCourse}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  {submittingCourse ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE POPUP MODAL (WITH RSO APPOINTMENT ACTION) */}
      {selectedStudentForModal && (
        <StudentProfileModal
          student={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
        />
      )}
    </div>
  );
}

export { StudentsView as CourseStudio };
export default StudentsView;
