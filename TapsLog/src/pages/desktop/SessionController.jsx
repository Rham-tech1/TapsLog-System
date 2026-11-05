/**
 * SessionController — Column 2 of desktop dashboard (Sleek White UI)
 * Controls Live Attendance Scan sessions via Real Supabase API, Web NFC & Manual Fallback
 */
import { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useAttendance } from '../../hooks/useAttendance';
import { useWebNFC } from '../../hooks/useWebNFC';
import { activateSession, closeSession } from '../../api/teacherService';
import { attendanceService } from '../../api/attendanceService';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { formatTime } from '../../lib/utils';
import { Play, Square, ScanLine, Loader2, Zap, Clock, Wifi, WifiOff } from 'lucide-react';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parseTime(value) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return { hour, minute: Number(match[2]) };
}

function getScheduledClass(classes, now) {
  const weekday = WEEKDAYS[now.getDay()];
  return classes.find((cls) => {
    if (cls.day_of_week !== weekday) return false;
    const start = parseTime(cls.start_time);
    const end = parseTime(cls.end_time);
    if (!start || !end) return false;

    const startMinutes = start.hour * 60 + start.minute;
    const endMinutes = end.hour * 60 + end.minute;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }) || null;
}

export function SessionController() {
  const [manualUID, setManualUID] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const user = useAppStore((s) => s.user);
  const allSchedules = useAppStore((s) => s.allSchedules);
  const activeSession = useAppStore((s) => s.activeSession);
  const setActiveSession = useAppStore((s) => s.setActiveSession);
  const sessionStatus = useAppStore((s) => s.sessionStatus);
  const addToast = useAppStore((s) => s.addToast);
  const addNotification = useAppStore((s) => s.addNotification);
  const lastScan = useAppStore((s) => s.lastScan);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const { submitScan, loading: scanLoading } = useAttendance();
  const { isSupported: isNfcSupported, isScanning: isNfcScanning, startScanning: startNfcScanning, stopScanning: stopNfcScanning } = useWebNFC();

  // STRICT: Teacher only accesses their own subjects
  const teacherClasses = useMemo(() => user?.name && (user?.role === 'teacher' || user?.role === 'TEACHER')
    ? allSchedules.filter(
        (s) =>
          s.instructor?.toLowerCase().includes(user.name.toLowerCase()) ||
          user.name.toLowerCase().includes(s.instructor?.toLowerCase())
      )
    : allSchedules, [allSchedules, user]);

  const scheduledClass = useMemo(
    () => getScheduledClass(teacherClasses, currentTime),
    [teacherClasses, currentTime]
  );
  const sessionClass = sessionStatus === 'ACTIVE' ? activeSession : scheduledClass;

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sessionStatus === 'ACTIVE') return;
    if (activeSession?.session_id !== scheduledClass?.session_id) {
      setActiveSession(scheduledClass ? { ...scheduledClass, status: 'PENDING' } : null);
    }
  }, [activeSession?.session_id, scheduledClass, sessionStatus, setActiveSession]);

  // Web NFC auto-listen when session is ACTIVE
  useEffect(() => {
    const sId = sessionClass?.session_db_id || sessionClass?.session_id;
    if (sessionStatus === 'ACTIVE' && isNfcSupported && !isNfcScanning && sId) {
      startNfcScanning({
        onReading: ({ serialNumber, rawUid }) => {
          submitScan({
            session_id: sId,
            card_uid: serialNumber || rawUid,
          });
        }
      });
    } else if (sessionStatus !== 'ACTIVE' && isNfcScanning) {
      stopNfcScanning();
    }
  }, [sessionStatus, isNfcSupported, isNfcScanning, sessionClass?.session_id, sessionClass?.session_db_id]);

  const handleActivate = async () => {
    const courseId = sessionClass?.course_id || sessionClass?.id || sessionClass?.session_id;
    if (!courseId) return;
    setActionLoading('activate');
    const teacherId = user?.teacher_id || user?.id;

    try {
      const res = await attendanceService.startSession({
        course_id: courseId,
        teacher_id: teacherId
      });
      const sessionDbId = res.session?.id || sessionClass.session_id;
      useAppStore.setState({
        activeSession: {
          ...sessionClass,
          session_id: sessionDbId,
          session_db_id: sessionDbId,
          status: 'ACTIVE'
        },
        sessionStatus: 'ACTIVE',
      });
      addToast({ message: 'Attendance scan session activated!', type: 'success' });
      addNotification({ message: `${sessionClass.subject} session started`, type: 'success' });
    } catch (err) {
      try {
        await activateSession(sessionClass.session_id);
        useAppStore.setState({
          activeSession: { ...sessionClass, status: 'ACTIVE' },
          sessionStatus: 'ACTIVE',
        });
        addToast({ message: 'Session activated', type: 'success' });
      } catch (e2) {
        addToast({ message: err?.response?.data?.message || err?.message || 'Activation failed', type: 'error' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleClose = async () => {
    const sId = sessionClass?.session_db_id || sessionClass?.session_id;
    if (!sId) return;
    setActionLoading('close');
    try {
      await attendanceService.stopSession(sId);
      useAppStore.setState({
        activeSession: { ...sessionClass, status: 'CLOSED' },
        sessionStatus: 'CLOSED',
      });
      addToast({ message: 'Session concluded successfully.', type: 'info' });
      addNotification({ message: `${sessionClass.subject} session ended`, type: 'info' });
    } catch (err) {
      try {
        await closeSession(sId);
        useAppStore.setState({
          activeSession: { ...sessionClass, status: 'CLOSED' },
          sessionStatus: 'CLOSED',
        });
      } catch (e2) {
        addToast({ message: 'Failed to close session', type: 'error' });
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleManualScan = async (e) => {
    e.preventDefault();
    const sId = sessionClass?.session_db_id || sessionClass?.session_id;
    if (!manualUID.trim() || !sId) return;
    try {
      await submitScan({ session_id: sId, card_uid: manualUID.trim() });
      setManualUID('');
    } catch {}
  };

  return (
    <div className="flex flex-col h-full bg-white px-4 py-3.5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-brand-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Session Control</h2>
        </div>
        {isNfcSupported && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            <Wifi className="w-3 h-3" /> Web NFC
          </span>
        )}
      </div>

      {/* Active Session Info */}
      {sessionClass ? (
        <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900 leading-tight">{sessionClass.subject}</p>
              <p className="text-[11px] text-slate-500">{sessionClass.section} · {sessionClass.room || 'Room TBA'}</p>
            </div>
            <StatusBadge status={sessionStatus === 'ACTIVE' ? 'ACTIVE' : sessionClass.status} />
          </div>
          <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {sessionClass.start_time} – {sessionClass.end_time}
          </p>
        </div>
      ) : (
        <div className="p-4 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs">
          No class is scheduled for this time.
        </div>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        {sessionStatus !== 'ACTIVE' ? (
          <button
            onClick={handleActivate}
            disabled={!sessionClass || actionLoading === 'activate'}
            className="btn-primary w-full text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5"
          >
            {actionLoading === 'activate' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><Play className="w-3.5 h-3.5" /> Start Session</>
            )}
          </button>
        ) : (
          <button
            onClick={handleClose}
            disabled={actionLoading === 'close'}
            className="btn-danger w-full text-xs font-semibold py-2.5 flex items-center justify-center gap-1.5"
          >
            {actionLoading === 'close' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <><Square className="w-3.5 h-3.5" /> End Session</>
            )}
          </button>
        )}
      </div>

      {/* Last Tap */}
      {lastScan && (
        <div className="p-3 bg-white border border-slate-200 rounded-xl animate-slide-up space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Recent Tap</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-100 text-brand-700 flex items-center justify-center font-bold text-xs">
                {lastScan.student?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-800 leading-tight">{lastScan.student}</p>
                <p className="text-[10px] text-slate-400 font-mono">{formatTime(lastScan.scanned_at)}</p>
              </div>
            </div>
            <StatusBadge status={lastScan.status || lastScan.action} />
          </div>
        </div>
      )}

      {/* Manual UID Entry Fallback */}
      <div className="pt-1">
        <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5">Manual UID Entry</p>
        <form onSubmit={handleManualScan} className="flex gap-1.5">
          <input
            type="text"
            value={manualUID}
            onChange={(e) => setManualUID(e.target.value)}
            placeholder="e.g. 65:49:9D:00"
            className="input-field font-mono text-xs py-1.5"
            disabled={sessionStatus !== 'ACTIVE' || scanLoading}
          />
          <button
            type="submit"
            disabled={!manualUID.trim() || sessionStatus !== 'ACTIVE' || scanLoading}
            className="btn-primary text-xs px-3 py-1.5 shrink-0 flex items-center justify-center"
          >
            {scanLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}

export default SessionController;
