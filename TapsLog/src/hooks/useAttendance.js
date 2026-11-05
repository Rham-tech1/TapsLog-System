/**
 * useAttendance — handles manual scan submission (teacher/kiosk mode)
 */
import { useState } from 'react';
import { scanCard } from '../api/attendanceService';
import { useAppStore } from '../store/useAppStore';
import { playBeep } from '../lib/utils';

export function useAttendance() {
  const [loading, setLoading]   = useState(false);
  const addScanEvent             = useAppStore((s) => s.addScanEvent);
  const addAttendanceNotification = useAppStore((s) => s.addAttendanceNotification);
  const addToast                 = useAppStore((s) => s.addToast);
  const setTapFeedback           = useAppStore((s) => s.setTapFeedback);

  const submitScan = async ({ session_id, card_uid }) => {
    setLoading(true);
    try {
      const result = await scanCard({ session_id, card_uid });
      const scanEvent = { ...result, scanned_at: result.scanned_at || new Date().toISOString() };
      addScanEvent(scanEvent);
      addAttendanceNotification(scanEvent);

      if (result.status === 'PRESENT') {
        addToast({ message: `✅ ${result.student} — Time In (PRESENT)`, type: 'success' });
        setTapFeedback('success');
        playBeep('success');
      } else if (result.status === 'LATE') {
        addToast({ message: `⏰ ${result.student} — Time In (LATE)`, type: 'warning' });
        setTapFeedback('warning');
        playBeep('warning');
      } else if (result.status === 'COMPLETED') {
        addToast({ message: `🔵 ${result.student} — Time Out`, type: 'info' });
        setTapFeedback('success');
        playBeep('success');
      }

      return result;
    } catch (err) {
      const msg = err.friendlyMessage || err.message;
      addToast({ message: `❌ ${msg}`, type: 'error' });
      setTapFeedback('error');
      playBeep('error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { submitScan, loading };
}
