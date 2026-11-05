/**
 * Zustand global store for TapsLog
 * Manages: auth state, active session, live attendance feed, toasts, role-based navigation views
 */
import { create } from 'zustand';
import { ENROLLED_STUDENTS } from '../lib/mockData';

export const useAppStore = create((set, get) => ({
  // ─── Auth / User ──────────────────────────────────────────────────────────
  user: null, // { id, name, role: 'teacher'|'student', student_id?, faculty_id?, program?, card_uid?, email }
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  clearUser: () => {
    localStorage.removeItem('tapslog_user');
    set({
      user: null,
      isAuthenticated: false,
      currentView: 'dashboard',
      studentView: 'livetime',
      activeSession: null,
      sessionStatus: 'IDLE',
      notifications: [],
    });
  },

  // ─── Navigation Views ─────────────────────────────────────────────────────
  // Teacher Desktop Views: 'dashboard' | 'livestream' | 'schedule' | 'students' | 'settings'
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),

  // Student Views: 'livetime' | 'schedule' | 'account' | 'settings'
  studentView: 'livetime',
  setStudentView: (view) => set({ studentView: view }),

  // ─── Student Directory & Rosters ──────────────────────────────────────────
  enrolledStudents: ENROLLED_STUDENTS,
  addEnrolledStudent: (student) =>
    set((state) => ({ enrolledStudents: [student, ...state.enrolledStudents] })),

  // ─── Student Personal Tap Status ──────────────────────────────────────────
  studentAttendanceToday: null, // { status: 'PRESENT'|'LATE'|null, time_in: ISO, session_name: string }
  setStudentAttendanceToday: (attendance) => set({ studentAttendanceToday: attendance }),

  // ─── Session State ────────────────────────────────────────────────────────
  activeSession: null, // { session_id, subject, section, room, status }
  sessionStatus: 'IDLE', // 'IDLE' | 'ACTIVE' | 'CLOSED'

  setActiveSession: (session) =>
    set((state) => ({
      activeSession: session,
      sessionStatus: session
        ? (session.status === 'ACTIVE' || session.status === 'CLOSED'
            ? session.status
            : state.sessionStatus !== 'ACTIVE' ? (session.status || 'IDLE') : state.sessionStatus)
        : 'IDLE',
    })),

  setSessionStatus: (status) => set({ sessionStatus: status }),

  // ─── Schedule ─────────────────────────────────────────────────────────────
  currentClass: null,
  nextClass: null,
  allSchedules: [],

  setSchedule: ({ current_class, next_class, all_schedules }) =>
    set({
      currentClass: current_class,
      nextClass: next_class,
      allSchedules: all_schedules,
    }),

  // ─── Live Attendance Feed ─────────────────────────────────────────────────
  attendanceFeed: [], // Array of scan events (most recent first)
  lastScan: null, // The most recent scan result (drives tap feedback)

  addScanEvent: (event) =>
    set((state) => {
      // If this scan belongs to the current logged-in student, update their today state
      if (
        state.user?.role === 'student' &&
        (event.student === state.user.name || event.card_uid === state.user.card_uid)
      ) {
        state.studentAttendanceToday = {
          status: event.status || 'PRESENT',
          time_in: event.scanned_at || new Date().toISOString(),
          session_name: state.activeSession?.subject || 'Current Class',
        };
      }

      return {
        attendanceFeed: [event, ...state.attendanceFeed].slice(0, 250),
        lastScan: event,
        studentAttendanceToday: state.studentAttendanceToday,
      };
    }),

  clearFeed: () => set({ attendanceFeed: [], lastScan: null }),

  // ─── Toast Notifications ──────────────────────────────────────────────────
  toasts: [],

  addToast: ({ id, message, type = 'info', duration = 4000 }) => {
    const toastId = id || `toast-${Date.now()}`;
    set((state) => ({
      toasts: [...state.toasts, { id: toastId, message, type, duration }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== toastId),
      }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  notifications: [],
  addNotification: ({ id, message, type = 'info', createdAt = new Date().toISOString() }) =>
    set((state) => {
      if (id && state.notifications.some((notification) => notification.id === id)) return state;

      const notificationId = id || `notification-${Date.now()}`;
      return {
        notifications: [
          { id: notificationId, message, type, createdAt, read: false },
          ...state.notifications,
        ].slice(0, 50),
      };
    }),
  addAttendanceNotification: (event) => {
    const user = get().user;
    const studentName = event.student || event.student_name || 'A student';
    const status = (event.status || event.action || 'updated').toString().toLowerCase().replaceAll('_', ' ');
    const belongsToStudent = user?.role === 'student' && (
      event.student === user.name || event.card_uid === user.card_uid
    );

    if (user?.role === 'teacher') {
      get().addNotification({
        id: event.event_id || event.id,
        message: `${studentName} — ${status}`,
        type: status.includes('late') ? 'warning' : 'success',
        createdAt: event.scanned_at || new Date().toISOString(),
      });
    } else if (belongsToStudent) {
      get().addNotification({
        id: event.event_id || event.id,
        message: `Your attendance was marked ${status}`,
        type: status.includes('late') ? 'warning' : 'success',
        createdAt: event.scanned_at || new Date().toISOString(),
      });
    }
  },
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({ ...notification, read: true })),
    })),
  clearNotifications: () => set({ notifications: [] }),
  isNotificationPanelOpen: false,
  setNotificationPanelOpen: (isOpen) => set({ isNotificationPanelOpen: isOpen }),

  // ─── UI State ─────────────────────────────────────────────────────────────
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  tapFeedback: null, // 'success' | 'warning' | 'error' | null
  setTapFeedback: (feedback) => {
    set({ tapFeedback: feedback });
    setTimeout(() => set({ tapFeedback: null }), 1500);
  },
}));
