import api from './axiosInstance';

/**
 * Admin Service: Manages university telemetry, user accounts, NFC card bindings, and roles.
 */
const adminService = {
  /**
   * Fetch real-time system metrics (total users, active cards, daily taps, uptime)
   */
  getTelemetry: async () => {
    const response = await api.get('/admin/telemetry');
    return response.data;
  },

  /**
   * Fetch users list with optional search query and role filter
   * @param {string} query - Optional search string (email, name, student number)
   * @param {string} role - Optional role filter ('STUDENT', 'TEACHER', 'ADMIN')
   */
  getUsers: async (query = '', role = '') => {
    const params = {};
    if (query) params.query = query;
    if (role) params.role = role;

    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  /**
   * Unbind an active NFC card from a user account (1-Click Action)
   * @param {string} userId - UUID of user whose card is to be released
   */
  unbindCard: async (userId) => {
    const response = await api.delete(`/admin/unbind-card/${userId}`);
    return response.data;
  },

  /**
   * Elevate or change a user's role (STUDENT, TEACHER, ADMIN)
   * @param {string} targetUserId - UUID of target user
   * @param {string} newRole - 'STUDENT' | 'TEACHER' | 'ADMIN'
   */
  updateUserRole: async (targetUserId, newRole) => {
    const response = await api.patch('/admin/user-role', {
      target_user_id: targetUserId,
      new_role: newRole
    });
    return response.data;
  }
};

export default adminService;