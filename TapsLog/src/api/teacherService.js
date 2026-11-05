/**
 * Teacher Service — wraps /api/teacher endpoints
 */
import api from './axiosInstance';

/**
 * Fetch full schedule info for a teacher.
 * GET /api/teacher/schedule/:teacher_id
 *
 * @param {string|number} teacherId
 * @returns {Promise<ScheduleResponse>}
 *
 * @typedef {Object} ScheduleResponse
 * @property {ClassInfo|null} current_class
 * @property {ClassInfo|null} next_class
 * @property {ClassInfo[]} all_schedules
 *
 * @typedef {Object} ClassInfo
 * @property {string} session_id
 * @property {string} subject
 * @property {string} section
 * @property {string} room
 * @property {string} start_time
 * @property {string} end_time
 * @property {string} day_of_week
 * @property {string} status  - "ACTIVE" | "PENDING" | "CLOSED"
 */
export async function getTeacherSchedule(teacherId) {
  const response = await api.get(`/api/teacher/schedule/${teacherId}`);
  return response.data;
}

/**
 * Activate a class session.
 * POST /api/teacher/session/:session_id/activate
 *
 * @param {string} sessionId
 * @returns {Promise<any>}
 */
export async function activateSession(sessionId) {
  const response = await api.post(`/api/teacher/session/${sessionId}/activate`);
  return response.data;
}

/**
 * Close a class session.
 * POST /api/teacher/session/:session_id/close
 *
 * @param {string} sessionId
 * @returns {Promise<any>}
 */
export async function closeSession(sessionId) {
  const response = await api.post(`/api/teacher/session/${sessionId}/close`);
  return response.data;
}

/**
 * Trigger auto-absent for a session.
 * POST /api/teacher/session/:session_id/auto-absent
 *
 * @param {string} sessionId
 * @returns {Promise<any>}
 */
export async function triggerAutoAbsent(sessionId) {
  const response = await api.post(`/api/teacher/session/${sessionId}/auto-absent`);
  return response.data;
}
