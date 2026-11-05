import api from './axiosInstance';

/**
 * Course Service: Google Classroom style course management, schedules, and GSuite invitations.
 */
const courseService = {
  /**
   * Create a new course with optional timetable schedules
   * @param {Object} courseData
   * { course_code, course_name, section, semester, academic_year, teacher_id, time_in, time_out, day_of_week }
   */
  createCourse: async (courseData) => {
    const response = await api.post('/courses/create', courseData);
    return response.data;
  },

  /**
   * Dispatch a GSuite invitation to a student via their @ua.edu.ph email
   * @param {string} courseId - UUID of the course
   * @param {string} studentEmail - @ua.edu.ph institutional email
   * @param {string} teacherId - UUID of the inviting teacher
   */
  inviteStudent: async (courseId, studentEmail, teacherId) => {
    const response = await api.post('/courses/invite', {
      course_id: courseId,
      student_email: studentEmail,
      teacher_id: teacherId
    });
    return response.data;
  },

  /**
   * Retrieve all pending course invitations for a student
   * @param {string} studentId - UUID of the student
   */
  getStudentInvitations: async (studentId) => {
    const response = await api.get(`/courses/invitations/student/${studentId}`);
    return response.data;
  },

  /**
   * Respond to a course invitation (ACCEPT or DECLINE)
   * @param {string} invitationId - UUID of the invitation
   * @param {string} action - 'ACCEPT' | 'DECLINE'
   */
  respondToInvitation: async (invitationId, action) => {
    const response = await api.post('/courses/invitations/respond', {
      invitation_id: invitationId,
      action: action
    });
    return response.data;
  },

  /**
   * Enroll a student into a course using a Join Code (e.g., TAPS-AB3X9K)
   * @param {string} joinCode - 6-character alphanumeric code
   * @param {string} studentId - UUID of the student
   */
  joinCourse: async (joinCode, studentId) => {
    const response = await api.post('/courses/join', {
      join_code: joinCode,
      student_id: studentId
    });
    return response.data;
  },

  /**
   * Retrieve all courses taught by a teacher
   * @param {string} teacherId - UUID of the teacher
   */
  getTeacherCourses: async (teacherId) => {
    const response = await api.get(`/courses/teacher/${teacherId}`);
    return response.data;
  },

  /**
   * Retrieve all courses a student is actively enrolled in
   * @param {string} studentId - UUID of the student
   */
  getStudentCourses: async (studentId) => {
    const response = await api.get(`/courses/student/${studentId}`);
    return response.data;
  },

  /**
   * Fetch complete enrolled student roster for a course
   * @param {string} courseId - UUID of the course
   */
  getCourseRoster: async (courseId) => {
    const response = await api.get(`/courses/${courseId}/roster`);
    return response.data;
  }
};

export default courseService;