import api from './axiosInstance';

/**
 * RSO Service: Handles Registered Student Organizations, advisor claiming,
 * organizational hierarchy, event management, and NFC event terminals.
 */
const rsoService = {
  /**
   * Fetch all registered student organizations with current adviser status
   */
  getRsoList: async () => {
    const response = await api.get('/rso/list');
    return response.data;
  },

  /**
   * Check whether the current user has any active RSO membership or advisor role.
   * Used to conditionally show/hide the RSO Governance nav item.
   * @param {string} userId - UUID of the user (users.id)
   */
  getMyMembership: async (userId) => {
    const response = await api.get('/rso/my-membership', { params: { user_id: userId } });
    return response.data;
  },

  /**
   * Retrieve a student's active RSO membership with tier and organization details
   * @param {string} userId - UUID of the user or student
   */
  getStudentMembership: async (userId) => {
    const response = await api.get(`/rso/student-membership/${userId}`);
    return response.data;
  },

  /**
   * Admin creates a new RSO entity
   * @param {Object} rsoData - { name, abbreviation, description, department, advisor_passcode? }
   */
  createRso: async (rsoData) => {
    const response = await api.post('/rso/create', rsoData);
    return response.data;
  },

  /**
   * Admin assigns a faculty member as advisor for an RSO
   * @param {string} rsoId - UUID of the RSO
   * @param {string} userId - UUID of the faculty user
   */
  assignAdvisor: async (rsoId, userId) => {
    const response = await api.post(`/rso/${rsoId}/assign-advisor`, { user_id: userId });
    return response.data;
  },

  /**
   * Faculty claims leadership of an RSO using secret passcode
   * @param {string} rsoId - UUID of the RSO
   * @param {string} userId - UUID of the faculty user
   * @param {string} passcode - e.g. 'UA-ACM-ADVISOR-2026'
   */
  claimAdvisor: async (rsoId, userId, passcode) => {
    const response = await api.post(`/rso/${rsoId}/claim-advisor`, {
      user_id: userId,
      passcode: passcode
    });
    return response.data;
  },

  /**
   * Retrieve organizational hierarchy sorted by position rank
   * @param {string} rsoId - UUID of the RSO
   */
  getHierarchy: async (rsoId) => {
    const response = await api.get(`/rso/${rsoId}/hierarchy`);
    return response.data;
  },

  /**
   * Promote or update member role in an RSO
   * @param {string} rsoId - UUID of the RSO
   * @param {string} userId - UUID of member
   * @param {string} newPosition - 'Member' | 'Committee Head' | 'Vice President' | 'President' | 'Adviser'
   */
  updateMemberRole: async (rsoId, userId, newPosition) => {
    const response = await api.patch(`/rso/${rsoId}/member-role`, {
      user_id: userId,
      new_position: newPosition
    });
    return response.data;
  },

  /**
   * Create an event under an RSO
   * @param {string} rsoId - UUID of the RSO
   * @param {Object} eventData - { name, description, event_date, event_time, location, created_by }
   */
  createEvent: async (rsoId, eventData) => {
    const response = await api.post(`/rso/${rsoId}/events`, eventData);
    return response.data;
  },

  /**
   * Retrieve all events for an RSO
   * @param {string} rsoId - UUID of the RSO
   */
  getRsoEvents: async (rsoId) => {
    const response = await api.get(`/rso/${rsoId}/events`);
    return response.data;
  },

  /**
   * Log an NFC tap at an RSO event terminal
   * @param {string} eventId - UUID of the event
   * @param {string} cardUid - Raw NFC card UID
   */
  scanEventTap: async (eventId, cardUid) => {
    const response = await api.post(`/rso/events/${eventId}/scan`, {
      card_uid: cardUid
    });
    return response.data;
  },

  // ============================================================
  // TWO-TIER POSITION MANAGEMENT (Phase 3.1)
  // ============================================================

  /** Get all named positions for an RSO (two-tier structure) */
  getPositions: async (rsoId) => {
    const response = await api.get(`/rso/${rsoId}/positions`);
    return response.data;
  },

  /** Seed default Executive Board positions for a new RSO */
  seedPositions: async (rsoId) => {
    const response = await api.post(`/rso/${rsoId}/seed-positions`, {});
    return response.data;
  },

  /** Create a custom position (executive or coordinating) */
  addPosition: async (data) => {
    const response = await api.post('/rso/position/add', data);
    return response.data;
  },

  /** Update a position: title, tier, parent, or holder */
  updatePosition: async (positionId, data) => {
    const response = await api.patch(`/rso/position/${positionId}`, data);
    return response.data;
  },

  /** Delete custom position or vacate holder from default position */
  deletePosition: async (positionId) => {
    const response = await api.delete(`/rso/position/${positionId}`);
    return response.data;
  },

  // ============================================================
  // ADMIN LIFECYCLE MANAGEMENT
  // ============================================================

  /** Admin unassigns faculty adviser (End Term / Offboarding) */
  unassignAdvisor: async (rsoId) => {
    const response = await api.delete(`/rso/${rsoId}/advisor`);
    return response.data;
  },

  /** Admin permanently deletes an RSO entity */
  deleteRso: async (rsoId) => {
    const response = await api.delete(`/rso/${rsoId}`);
    return response.data;
  },
};

export default rsoService;
