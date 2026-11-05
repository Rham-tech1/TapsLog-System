/**
 * App.jsx — Root Application
 * Displays Authentication & NFC Verification Portal first.
 * Upon login, renders either Teacher Command Center or Student Portal.
 */
import { useBreakpoint } from './hooks/useBreakpoint';
import { MobileLayout } from './components/mobile/MobileLayout';
import { DesktopLayout } from './components/desktop/DesktopLayout';
import { ToastContainer } from './components/shared/ToastContainer';
import { TapFeedbackOverlay } from './components/shared/TapFeedbackOverlay';
import { StudentClassReminder } from './components/shared/StudentClassReminder';
import { AuthModal } from './components/auth/AuthModal';
import { useSocket } from './hooks/useSocket';
import { useAppStore } from './store/useAppStore';
import { useEffect, useState } from 'react';
import { probeBackend, installMockInterceptors, isMockActive } from './api/mockApi';
import {
  MOCK_SCHEDULE_RESPONSE,
  getScheduleForTeacher,
  generateInitialFeed,
  makeMockScanEvent,
} from './lib/mockData';
import { playBeep } from './lib/utils';
import { ScanLine } from 'lucide-react';

// ─── Mock live-scan ticker (for active class sessions) ──────────────────────
let _mockTickerRef = null;
let _mockScanIndex = 6;

function startMockTicker() {}
function stopMockTicker() {}

// ─── Inner application (mounted with role-based layout) ────────────────────
function AppInner() {
  const { isMobile } = useBreakpoint();
  const user = useAppStore((s) => s.user);
  const activeSession = useAppStore((s) => s.activeSession);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const addScanEvent = useAppStore((s) => s.addScanEvent);
  const addAttendanceNotification = useAppStore((s) => s.addAttendanceNotification);
  const setTapFeedback = useAppStore((s) => s.setTapFeedback);
  const addToast = useAppStore((s) => s.addToast);

  // Real-time socket listener
  useSocket(activeSession?.session_id);

  // Live mock ticker only runs for teachers when session is active
  useEffect(() => {
    if (isMockActive() && sessionStatus === 'ACTIVE' && user?.role === 'teacher') {
      startMockTicker(addScanEvent, addAttendanceNotification, setTapFeedback, addToast);
    } else {
      stopMockTicker();
    }
    return () => stopMockTicker();
  }, [sessionStatus, user?.role, addAttendanceNotification, addScanEvent, setTapFeedback, addToast]);

  return (
    <>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
      <StudentClassReminder />
      <ToastContainer />
      <TapFeedbackOverlay />
    </>
  );
}

// ─── Root bootstrap component ──────────────────────────────────────────────
function App() {
  const user = useAppStore((s) => s.user);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const setUser = useAppStore((s) => s.setUser);
  const setSchedule = useAppStore((s) => s.setSchedule);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const addScanEvent = useAppStore((s) => s.addScanEvent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      // 1. Probe backend
      const backendUp = await probeBackend();

      if (!backendUp) {
        installMockInterceptors();
        setSchedule(MOCK_SCHEDULE_RESPONSE);
        setActiveSession(MOCK_SCHEDULE_RESPONSE.current_class);
        // Mock initial feed seeding disabled
      }

      // 2. Check for existing session in localStorage
      try {
        const stored = localStorage.getItem('tapslog_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.role) {
            setUser(parsed);
            if (parsed.role === 'teacher') {
              const teacherSched = getScheduleForTeacher(parsed.faculty_id || parsed.name);
              setSchedule(teacherSched);
              setActiveSession(teacherSched.current_class);
            }
          }
        }
      } catch (err) {
        localStorage.removeItem('tapslog_user');
      }

      // Smooth initial loading splash duration
      setTimeout(() => setLoading(false), 900);
    }

    bootstrap();
  }, []);

  // Initial Loading Splash Screen
  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-slate-50 text-slate-900">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <img src="/tapslog-logo.png" alt="TapsLog" className="h-10 sm:h-12 object-contain" />
          <div className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-600 animate-ping" />
            <span>Initializing NFC Attendance...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not logged in, display the Login / Registration Modal
  if (!user || !isAuthenticated) {
    return (
      <div className="h-dvh app-surface relative overflow-hidden">
        <AuthModal />
        <ToastContainer />
        <TapFeedbackOverlay />
      </div>
    );
  }

  // Once authenticated, load the full role-specific application
  return <AppInner />;
}

export default App;
