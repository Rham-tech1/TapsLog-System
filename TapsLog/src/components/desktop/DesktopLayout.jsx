/**
 * DesktopLayout.jsx — Clean White & Blue Command Center
 * Tri-role nav (Admin / Faculty / Student) with dynamic RSO visibility guard.
 */
import { useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import {
  ScanLine,
  LayoutDashboard,
  Calendar,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Activity,
  LogOut,
  Clock,
  IdCard,
  BookOpen,
  Award,
  ShieldAlert,
} from 'lucide-react';
import { NotificationBell } from '../shared/NotificationBell';
import rsoService from '../../api/rsoService';

// Teacher Views
import { AttendanceStream } from '../../pages/desktop/AttendanceStream';
import { SessionController } from '../../pages/desktop/SessionController';
import { SchedulePanel } from '../../pages/desktop/SchedulePanel';
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

const RSO_NAV_ITEM = { id: 'rso', label: 'RSO Governance', Icon: Award };

const BASE_ADMIN_NAV = [
  { id: 'admin',    label: 'Admin Portal',   Icon: ShieldAlert },
  { id: 'rso',      label: 'RSO Governance', Icon: Award       },
  { id: 'settings', label: 'Settings',       Icon: Settings    },
];

const BASE_TEACHER_NAV = [
  { id: 'dashboard',  label: 'Dashboard',   Icon: LayoutDashboard },
  { id: 'livestream', label: 'Live Stream', Icon: Activity        },
  { id: 'schedule',   label: 'Schedule',    Icon: Calendar        },
  { id: 'students',   label: 'Courses',     Icon: BookOpen        },
  { id: 'settings',   label: 'Settings',    Icon: Settings        },
];

const BASE_STUDENT_NAV = [
  { id: 'livetime', label: 'Live Time', Icon: Clock    },
  { id: 'schedule', label: 'Schedule',  Icon: Calendar },
  { id: 'account',  label: 'Account',   Icon: IdCard   },
  { id: 'settings', label: 'Settings',  Icon: Settings },
];

export function DesktopLayout() {
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const user = useAppStore((s) => s.user);
  const clearUser = useAppStore((s) => s.clearUser);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const activeSession = useAppStore((s) => s.activeSession);

  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const studentView = useAppStore((s) => s.studentView);
  const setStudentView = useAppStore((s) => s.setStudentView);

  // RSO membership visibility state
  const [showRsoNav, setShowRsoNav] = useState(false);
  const [pstTime, setPstTime] = useState('');

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

  // Role detection
  const role = (user?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';
  const isTeacher = role === 'TEACHER' || user?.role === 'teacher';
  const isStudent = !isAdmin && !isTeacher;

  // Active Role Guard: non-admins cannot stay in admin views
  useEffect(() => {
    if (!isAdmin && currentView === 'admin') {
      setCurrentView(isTeacher ? 'dashboard' : 'schedule');
    }
  }, [isAdmin, currentView, isTeacher, setCurrentView]);

  // RSO membership check: determines whether RSO nav tab is shown
  useEffect(() => {
    if (!user?.id) return;
    if (isAdmin) {
      setShowRsoNav(true); // Admin always sees RSO
      return;
    }
    rsoService.getMyMembership(user.id)
      .then((res) => {
        setShowRsoNav(res.hasMembership === true);
      })
      .catch(() => {
        setShowRsoNav(false);
      });
  }, [user?.id, isAdmin]);

  // If RSO nav was active but membership was revoked, redirect to default
  useEffect(() => {
    if (!showRsoNav && (currentView === 'rso' || studentView === 'rso')) {
      if (isTeacher) setCurrentView('dashboard');
      else if (isStudent) setStudentView('livetime');
    }
  }, [showRsoNav]);

  // Build nav arrays dynamically based on RSO membership
  const navItems = isAdmin
    ? BASE_ADMIN_NAV
    : isTeacher
    ? (showRsoNav
        ? [...BASE_TEACHER_NAV.slice(0, 4), RSO_NAV_ITEM, BASE_TEACHER_NAV[4]]
        : BASE_TEACHER_NAV)
    : (showRsoNav
        ? [...BASE_STUDENT_NAV.slice(0, 3), RSO_NAV_ITEM, BASE_STUDENT_NAV[3]]
        : BASE_STUDENT_NAV);

  const activeNavId = isAdmin
    ? (currentView === 'dashboard' ? 'admin' : currentView)
    : isTeacher
    ? currentView
    : studentView;

  const handleNavClick = (id) => {
    if (isAdmin || isTeacher) {
      setCurrentView(id);
    } else {
      setStudentView(id);
    }
  };

  return (
    <div className="flex h-dvh app-surface text-slate-800 overflow-hidden">
      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className={cn(
          'flex flex-col bg-white border-r border-slate-200/90',
          'transition-all duration-200 ease-in-out shrink-0 select-none z-30',
          sidebarCollapsed ? 'w-16' : 'w-56'
        )}
      >
        {/* Brand Header */}
        <div className="flex items-center gap-2 px-3 py-3.5 border-b border-slate-100 min-h-[58px]">
          {sidebarCollapsed ? (
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-brand-600 mx-auto shadow-xs">
              <ScanLine className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center justify-between w-full px-1">
              <img src="/tapslog-logo.png" alt="TapsLog" className="h-6 max-w-[125px] object-contain" />
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
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, Icon }) => {
            const isActive = activeNavId === id;
            return (
              <button
                key={id}
                onClick={() => handleNavClick(id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left text-xs font-medium',
                  isActive
                    ? 'bg-blue-50 text-brand-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                )}
                title={sidebarCollapsed ? label : undefined}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-brand-600' : 'text-slate-500'
                  )}
                />
                {!sidebarCollapsed && <span>{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* User Profile Snippet & Logout */}
        <div className="border-t border-slate-100 p-2.5 space-y-1.5">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-7 h-7 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-brand-700">
                  {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {user?.name || user?.email || 'User'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize">
                  {isAdmin ? 'Administrator' : isTeacher ? 'Faculty Member' : 'Student'}
                </p>
              </div>
              <button
                onClick={clearUser}
                title="Sign Out"
                className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Collapse sidebar button */}
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all text-xs"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <>
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="text-[11px]">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* ── Main Content Area ─────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200/80 bg-white shrink-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-slate-900">
              {isAdmin ? (
                activeNavId === 'admin'
                  ? 'Admin Control Portal'
                  : activeNavId === 'rso'
                  ? 'RSO Governance Suite'
                  : 'System Settings'
              ) : isTeacher ? (
                activeNavId === 'dashboard'
                  ? activeSession
                    ? `${activeSession.subject} — ${activeSession.section}`
                    : 'Dashboard'
                  : activeNavId === 'livestream'
                  ? 'Live Stream'
                  : activeNavId === 'schedule'
                  ? 'Class Schedule'
                  : activeNavId === 'students'
                  ? 'Courses & Rosters'
                  : activeNavId === 'rso'
                  ? 'RSO Governance'
                  : 'Settings'
              ) : (
                activeNavId === 'livetime'
                  ? 'Live Time'
                  : activeNavId === 'schedule'
                  ? 'Class Schedule'
                  : activeNavId === 'account'
                  ? 'Student Account'
                  : activeNavId === 'rso'
                  ? 'RSO Governance'
                  : 'Settings'
              )}
            </h1>

            {isTeacher && sessionStatus === 'ACTIVE' && (
              <span className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping-slow" />
                LIVE
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                {pstTime} <span className="text-[9px] font-sans text-slate-400 font-semibold">PST</span>
              </span>
            </div>
            <NotificationBell />
          </div>
        </header>

        {/* Main Body Render */}
        <main className="flex-1 overflow-hidden relative">
          {isAdmin ? (
            activeNavId === 'admin' ? (
              <AdminDashboard />
            ) : activeNavId === 'rso' ? (
              <RsoGovernance />
            ) : (
              <SettingsView />
            )
          ) : isTeacher ? (
            activeNavId === 'dashboard' ? (
              <div className="grid grid-cols-12 h-full overflow-hidden">
                <div className="col-span-5 border-r border-slate-200/80 overflow-y-auto">
                  <AttendanceStream />
                </div>
                <div className="col-span-3 border-r border-slate-200/80 overflow-y-auto">
                  <SessionController />
                </div>
                <div className="col-span-4 overflow-y-auto">
                  <SchedulePanel />
                </div>
              </div>
            ) : activeNavId === 'livestream' ? (
              <LiveStreamView />
            ) : activeNavId === 'schedule' ? (
              <ScheduleView />
            ) : activeNavId === 'students' ? (
              <StudentsView />
            ) : activeNavId === 'rso' ? (
              <RsoGovernance />
            ) : (
              <SettingsView />
            )
          ) : (
            activeNavId === 'livetime' ? (
              <StudentLiveTime />
            ) : activeNavId === 'schedule' ? (
              <StudentSchedule />
            ) : activeNavId === 'account' ? (
              <StudentAccount />
            ) : activeNavId === 'rso' ? (
              <RsoGovernance />
            ) : (
              <StudentSettings />
            )
          )}
        </main>
      </div>
    </div>
  );
}

export default DesktopLayout;
