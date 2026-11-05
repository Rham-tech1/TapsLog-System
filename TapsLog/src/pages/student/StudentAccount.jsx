import React, { useState, useEffect } from 'react';
import { IdCard, ShieldCheck, Wifi, Award, BookOpen } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import courseService from '../../api/courseService';
import rsoService from '../../api/rsoService';

export function StudentAccount() {
  const user = useAppStore((s) => s.user);
  const studentId = user?.student_id || user?.id;

  const [courses, setCourses] = useState([]);
  const [hasRsoMembership, setHasRsoMembership] = useState(false);

  useEffect(() => {
    if (studentId) {
      courseService.getStudentCourses(studentId).then((res) => {
        if (res.success && res.courses) setCourses(res.courses);
      }).catch(() => {});
    }
  }, [studentId]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    rsoService.getMyMembership(userId)
      .then(res => { if (res.success) setHasRsoMembership(res.hasMembership); })
      .catch(() => {});
  }, [user?.id]);

  const showRsoBadge = user?.show_rso_badge !== false && hasRsoMembership;
  const rsoBadge = user?.rso_badge || 'UA-ACM';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200">
        <div className="w-8 h-8 rounded-xl bg-blue-100 text-brand-700 flex items-center justify-center shrink-0">
          <IdCard className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Student Account</h1>
          <p className="text-xs text-slate-500">Digital student card & semester enrollments</p>
        </div>
      </div>

      {/* Digital Student Card */}
      <div className="p-6 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white rounded-2xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/20">
          <div>
            <p className="text-xs font-bold tracking-wider uppercase">University of Assumption</p>
            <p className="text-[10px] text-blue-200">OFFICIAL STUDENT IDENTITY</p>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/20 text-white">
            <Wifi className="w-3 h-3" /> NFC Active
          </span>
        </div>

        <div className="pt-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center font-bold text-2xl text-white shrink-0">
            {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'S'}
          </div>

          <div className="space-y-0.5 min-w-0">
            <h2 className="text-lg font-bold text-white truncate">{user?.name || user?.email}</h2>
            <p className="text-xs text-blue-200">{user?.program || 'BSIT'} • Year {user?.year_level || '3'}</p>
            <p className="text-xs text-blue-100 font-mono">
              ID: {user?.student_number || user?.student_id || '2026-UA-001'}
            </p>
          </div>
        </div>

        {/* RSO Badge Pill */}
        {showRsoBadge && (
          <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] text-blue-200 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-300" /> Affiliated Organization:
            </span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 border border-amber-300/30">
              {rsoBadge}
            </span>
          </div>
        )}
      </div>

      {/* Enrolled Courses Quick Summary */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" /> Enrolled Courses ({courses.length})
        </h3>

        {courses.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No enrolled classes recorded.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {courses.map((c) => (
              <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                    {c.course_code}
                  </span>
                  <span className="text-[11px] text-slate-500">{c.section}</span>
                </div>
                <div className="font-semibold text-slate-900 text-xs mt-1 truncate">{c.course_name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Prof. {c.teacher_name || 'Faculty'}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default StudentAccount;