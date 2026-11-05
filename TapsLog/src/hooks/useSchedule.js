/**
 * useSchedule — fetches and refreshes teacher schedule
 */
import { useState, useEffect, useCallback } from 'react';
import { getTeacherSchedule } from '../api/teacherService';
import { useAppStore } from '../store/useAppStore';

export function useSchedule(teacherId, pollInterval = 60000) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const setSchedule           = useAppStore((s) => s.setSchedule);

  const fetchSchedule = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    try {
      setError(null);
      const data = await getTeacherSchedule(teacherId);
      // Normalize — handle both wrapped and unwrapped responses
      setSchedule({
        current_class:  data.current_class  ?? null,
        next_class:     data.next_class     ?? null,
        all_schedules:  data.all_schedules  ?? (Array.isArray(data) ? data : []),
      });
    } catch (err) {
      setError(err.friendlyMessage || err.message);
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    fetchSchedule();
    const interval = setInterval(fetchSchedule, pollInterval);
    return () => clearInterval(interval);
  }, [fetchSchedule, pollInterval]);

  return { loading, error, refresh: fetchSchedule };
}
