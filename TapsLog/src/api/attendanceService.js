import api from './axiosInstance';

export const startSession = async (arg1, arg2) => {
  let course_id;
  let teacher_id;
  let grace_period_minutes = 15;

  if (typeof arg1 === 'object' && arg1 !== null) {
    course_id = arg1.course_id || arg1.courseId || arg1.id;
    teacher_id = arg1.teacher_id || arg1.teacherId || arg1.user_id;
    if (arg1.grace_period_minutes) grace_period_minutes = arg1.grace_period_minutes;
  } else {
    course_id = arg1;
    teacher_id = arg2;
  }

  const response = await api.post('/attendance/session/start', {
    course_id,
    teacher_id,
    grace_period_minutes
  });
  return response.data;
};

export const stopSession = async (arg) => {
  const session_id = typeof arg === 'object' && arg !== null ? (arg.session_id || arg.sessionId || arg.id) : arg;
  const response = await api.post('/attendance/session/stop', {
    session_id
  });
  return response.data;
};

export const getActiveSession = async (courseId) => {
  const response = await api.get(`/attendance/session/active/${courseId}`);
  return response.data;
};

export const scanTap = async (arg1, arg2) => {
  let session_id;
  let card_uid;

  if (typeof arg1 === 'object' && arg1 !== null) {
    session_id = arg1.session_id || arg1.sessionId;
    card_uid = arg1.card_uid || arg1.cardUid || arg1.uid;
  } else {
    session_id = arg1;
    card_uid = arg2;
  }

  const response = await api.post('/attendance/scan', {
    session_id,
    card_uid
  });
  return response.data;
};

export const scanCard = async (arg1, arg2) => {
  return scanTap(arg1, arg2);
};

export const getSessionLogs = async (sessionId) => {
  const response = await api.get(`/attendance/session/${sessionId}/logs`);
  return response.data;
};

export const getSessionAttendance = async (sessionId) => {
  const response = await api.get(`/attendance/session/${sessionId}/logs`);
  return response.data;
};

export const getCourseSessions = async (courseId) => {
  const response = await api.get(`/attendance/sessions/course/${courseId}`);
  return response.data;
};

export const attendanceService = {
  startSession,
  stopSession,
  getActiveSession,
  scanTap,
  scanCard,
  getSessionLogs,
  getSessionAttendance,
  getCourseSessions
};

export default attendanceService;
