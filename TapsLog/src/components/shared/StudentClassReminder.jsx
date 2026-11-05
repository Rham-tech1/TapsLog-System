import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { MOCK_SCHEDULES } from '../../lib/mockData';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getPreferenceKey(user) {
  return `tapslog_student_preferences_${user?.student_id || user?.id || user?.name || 'student'}`;
}

function parseClassTime(value) {
  const match = value?.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return { hour, minute: Number(match[2]) };
}

function getNextClassOccurrence(schedules, user, now) {
  const matchingSchedules = schedules.filter((item) =>
    item.section === user?.section || item.section === user?.program
  );
  const candidates = matchingSchedules.length ? matchingSchedules : schedules;
  let nextOccurrence = null;

  for (const schedule of candidates) {
    const time = parseClassTime(schedule.start_time);
    const weekday = WEEKDAYS.indexOf(schedule.day_of_week);
    if (!time || weekday < 0) continue;

    for (let daysAhead = 0; daysAhead < 7; daysAhead += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + daysAhead);
      if (date.getDay() !== weekday) continue;
      date.setHours(time.hour, time.minute, 0, 0);
      if (date <= now) continue;
      if (!nextOccurrence || date < nextOccurrence.date) {
        nextOccurrence = { schedule, date };
      }
    }
  }

  return nextOccurrence;
}

export function StudentClassReminder() {
  const user = useAppStore((state) => state.user);
  const addNotification = useAppStore((state) => state.addNotification);
  const addToast = useAppStore((state) => state.addToast);
  const schedules = useAppStore((state) => state.allSchedules);
  const reminderSchedules = schedules.length ? schedules : MOCK_SCHEDULES;

  useEffect(() => {
    if (user?.role !== 'student') return undefined;

    const checkReminder = () => {
      const prefix = getPreferenceKey(user);
      const enabled = localStorage.getItem(`${prefix}_classAlerts`) !== 'false';
      const reminderMinutes = Number(localStorage.getItem(`${prefix}_reminderMinutes`) || 10);
      if (!enabled || !Number.isFinite(reminderMinutes) || reminderMinutes <= 0) return;

      const now = new Date();
      const occurrence = getNextClassOccurrence(reminderSchedules, user, now);
      if (!occurrence) return;

      const millisecondsUntilClass = occurrence.date.getTime() - now.getTime();
      const reminderWindow = reminderMinutes * 60 * 1000;
      if (millisecondsUntilClass > reminderWindow) return;

      const scheduleId = occurrence.schedule.session_id || occurrence.schedule.subject;
      const dateKey = `${occurrence.date.getFullYear()}-${occurrence.date.getMonth()}-${occurrence.date.getDate()}`;
      const firedKey = `${prefix}_lastReminder_${scheduleId}_${dateKey}`;
      if (localStorage.getItem(firedKey)) return;

      localStorage.setItem(firedKey, 'true');
      const message = `Reminder: ${occurrence.schedule.subject} starts in ${reminderMinutes} minutes (${occurrence.schedule.start_time}).`;
      addNotification({ message, type: 'info' });
      addToast({ message, type: 'info', duration: 7000 });
    };

    checkReminder();
    const interval = setInterval(checkReminder, 15000);
    return () => clearInterval(interval);
  }, [user, reminderSchedules, addNotification, addToast]);

  return null;
}
