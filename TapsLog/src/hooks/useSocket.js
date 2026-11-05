/**
 * useSocket — manages socket lifecycle and live attendance events
 */
import { useEffect } from 'react';
import { connectSocket, disconnectSocket, joinSessionRoom, leaveSessionRoom, getSocket } from '../api/socketService';
import { useAppStore } from '../store/useAppStore';
import { playBeep } from '../lib/utils';

export function useSocket(sessionId) {
  const addScanEvent = useAppStore((s) => s.addScanEvent);
  const addAttendanceNotification = useAppStore((s) => s.addAttendanceNotification);
  const addToast     = useAppStore((s) => s.addToast);
  const setTapFeedback = useAppStore((s) => s.setTapFeedback);

  useEffect(() => {
    const socket = connectSocket();

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      if (sessionId) joinSessionRoom(sessionId);
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    socket.on('attendance_event', (event) => {
      addScanEvent(event);
      addAttendanceNotification(event);

      if (event.status === 'PRESENT' || event.action === 'STUDENT_TIME_IN') {
        setTapFeedback('success');
        playBeep('success');
      } else if (event.status === 'LATE') {
        setTapFeedback('warning');
        playBeep('warning');
      }
    });

    socket.on('error_event', (err) => {
      setTapFeedback('error');
      playBeep('error');
      addToast({ message: err.message, type: 'error' });
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    return () => {
      if (sessionId) leaveSessionRoom(sessionId);
      socket.off('attendance_event');
      socket.off('error_event');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      disconnectSocket();
    };
  }, [sessionId, addAttendanceNotification, addScanEvent, addToast, setTapFeedback]);
}
