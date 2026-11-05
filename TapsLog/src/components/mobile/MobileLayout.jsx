/**
 * MobileLayout.jsx — Synchronized Native Mobile Layout
 * Tri-role nav with dynamic RSO visibility guard matching DesktopLayout.
 */
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import {
  ScanLine,
  LayoutDashboard,
  Calendar,
  Activity,
  Settings,
  Clock,
  IdCard,
  BookOpen,
  Award,
  ShieldAlert,
  LogOut,
} from 'lucide-react';
import { NotificationBell } from '../shared/NotificationBell';
import rsoService from '../../api/rsoService';

// Teacher Views
import { MobileDashboard } from '../../pages/mobile/MobileDashboard';
import { LiveStreamView } from '../../pages/teacher/LiveStreamView';
import { ScheduleView } from '../../pages/teacher/ScheduleView';
import { StudentsView } from '../../pages/teacher/StudentsView';
import { SettingsView } from '../../pages/teacher/SettingsView';

// Student Views
import { StudentLiveTime } from '../../pages/student/StudentLiveTime';
import { StudentSchedule } from '../../pages/student/StudentSchedule';
import { StudentAccount } from '../../pages/student/StudentAccount';
import { StudentSettings } from '../../pages/student/StudentSettings';

// Admin & RSO Views
import { AdminDashboard } from '../../pages/admin/AdminDashboard';
import { RsoGovernance } from '../../pages/rso/RsoGovernance';

const RSO_NAV_ITEM = { id: 'rso', label: 'RSO', Icon: Award };

const ADMIN_NAV = [
  { id: 'admin',    label: 'Admin',    Icon: ShieldAlert },
  { id: 'rso',      label: 'RSO',      Icon: Award       },
  { id: 'settings', label: 'Settings', Icon: Settings    },
];

const BASE_TEACHER_NAV = [
  { id: 'dashboard',  label: 'Live',     Icon: LayoutDashboard },
  { id: 'livestream', label: 'Stream',   Icon: Activity        },
  { id: 'schedule',   label: 'Schedule', Icon: Calendar        },
  { id: 'students',   label: 'Courses',  Icon: BookOpen        },
  { id: 'settings',   label: 'Settings', Icon: Settings        },
];

const BASE_STUDENT_NAV = [
  { id: 'livetime', label: 'Live Time', Icon: Clock    },
  { id: 'schedule', label: 'Schedule',  Icon: Calendar },
  { id: 'account',  label: 'Account',   Icon: IdCard   },
];

const ALL_COMPONENTS = {
  admin:      AdminDashboard,
  rso:        RsoGovernance,
  settings:   SettingsView,
  dashboard:  MobileDashboard,
  livestream: LiveStreamView,
  schedule:   ScheduleView,
  students:   StudentsView,
  livetime:   StudentLiveTime,
  account:    StudentAccount,
  // Student sub-pages (accessible via nav on student role)
  studentschedule: StudentSchedule,
  studentsettings: StudentSettings,
};

export function MobileLayout() {
  const user = useAppStore((s) => s.user);
  const clearUser = useAppStore((s) => s.clearUser);
  const sessionStatus = useAppStore((s) => s.sessionStatus);

  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER' || user?.role === 'teacher';

  const [showRsoNav, setShowRsoNav] = useState(false);
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin' : isTeacher ? 'dashboard' : 'livetime');

  // RSO membership check
  useEffect(() => {
    if (!user?.id) return;
    if (isAdmin) {
      setShowRsoNav(true);
      return;
    }
    rsoService.getMyMembership(user.id)
      .then((res) => setShowRsoNav(res.hasMembership === true))
      .catch(() => setShowRsoNav(false));
  }, [user?.id, isAdmin]);

  // If RSO tab was active but membership was lost, redirect
  useEffect(() => {
    if (!showRsoNav && activeTab === 'rso') {
      setActiveTab(isTeacher ? 'dashboard' : 'livetime');
    }
  }, [showRsoNav]);

  // Build nav arrays dynamically
  const navItems = isAdmin
    ? ADMIN_NAV
    : isTeacher
    ? (showRsoNav ? [...BASE_TEACHER_NAV, RSO_NAV_ITEM] : BASE_TEACHER_NAV)
    : (showRsoNav ? [...BASE_STUDENT_NAV, RSO_NAV_ITEM] : BASE_STUDENT_NAV);

  const ActiveComponent = 
    (activeTab === 'schedule' && !isTeacher && !isAdmin) ? StudentSchedule :
    (activeTab === 'settings' && !isTeacher && !isAdmin) ? StudentSettings :
    ALL_COMPONENTS[activeTab] ||
    (isAdmin ? AdminDashboard : isTeacher ? MobileDashboard : StudentLiveTime);

  return (
    <div className="flex h-dvh flex-col overflow-hidden app-surface text-slate-800 pt-safe">
      {/* ── Top Header Bar ───────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/tapslog-logo.png" alt="TapsLog" className="h-6 max-h-6 object-contain" />
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
              isAdmin
                ? 'bg-red-50 text-red-700 border-red-200'
                : isTeacher
                ? 'bg-blue-50 text-brand-700 border-blue-100'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {isAdmin ? 'Admin' : isTeacher ? 'Faculty' : 'Student'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isTeacher && sessionStatus === 'ACTIVE' && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping-slow" />
                LIVE
              </span>
            )}
            <NotificationBell />
            <button
              onClick={clearUser}
              className="text-slate-400 hover:text-red-500 p-1 rounded-lg"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Active Screen View ───────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        <ActiveComponent />
      </main>

      {/* ── Bottom Navigation Bar ────────────────────────────────────── */}
      <nav className="bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 flex items-center justify-around shrink-0 pb-safe z-40">
        {navItems.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex flex-col items-center justify-center py-1 px-2 min-w-[50px] rounded-xl transition-all',
                isActive
                  ? 'text-brand-600 font-semibold'
                  : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] mt-0.5">{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export default MobileLayout;
