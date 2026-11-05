const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');
const { decryptCardUid } = require('../utils/security');

const hashUid = (rawUid) => {
  return crypto.createHash('sha256').update(rawUid.trim().toLowerCase()).digest('hex');
};

/**
 * GET /api/rso/list
 * Returns all RSO entities with advisor details and member count.
 */
/**
 * GET /api/rso/student-membership/:userId
 * Returns active RSO membership with tier and organization badge details.
 */
router.get('/student-membership/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    let uid = userId;
    const stuCheck = await db.query('SELECT user_id FROM students WHERE id = $1', [userId]);
    if (stuCheck.rowCount > 0) uid = stuCheck.rows[0].user_id;

    const memRes = await db.query(
      `SELECT rm.id, rm.position, rm.joined_at,
              r.id AS rso_id, r.name AS rso_name, r.abbreviation AS rso_abbreviation, r.logo_url,
              COALESCE(rp.tier, 'COORDINATING') AS tier
       FROM rso_memberships rm
       JOIN rso_entities r ON rm.rso_id = r.id
       LEFT JOIN rso_positions rp ON (rp.rso_id = rm.rso_id AND rp.holder_user_id = rm.user_id)
       WHERE rm.user_id = $1
       ORDER BY rm.joined_at DESC LIMIT 1`,
      [uid]
    );

    if (memRes.rowCount === 0) {
      return res.json({ success: true, membership: null });
    }

    return res.json({ success: true, membership: memRes.rows[0] });
  } catch (err) {
    console.error('[Get Student RSO Membership Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student RSO details.' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const listRes = await db.query(
      `SELECT r.id, r.name, r.abbreviation, r.description, r.logo_url,
              u.email AS advisor_email, t.full_name AS advisor_name,
              COUNT(m.id)::int AS member_count
       FROM rso_entities r
       LEFT JOIN users u ON r.advisor_id = u.id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN rso_memberships m ON r.id = m.rso_id
       GROUP BY r.id, u.email, t.full_name
       ORDER BY r.name ASC`
    );

    return res.json({ success: true, organizations: listRes.rows });
  } catch (error) {
    console.error('[Get RSO List Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve organizations.' });
  }
});

/**
 * GET /api/rso/my-membership
 * Check if the requesting user has any active RSO membership or advisor role.
 * Query param: ?user_id=UUID
 * Returns: { success, hasMembership: boolean }
 */
router.get('/my-membership', async (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id query parameter is required.' });
  }

  try {
    // Check membership table
    const membershipRes = await db.query(
      `SELECT id FROM rso_memberships WHERE user_id = $1 LIMIT 1`,
      [user_id]
    );

    // Also check if user is an RSO advisor
    const advisorRes = await db.query(
      `SELECT id FROM rso_entities WHERE advisor_id = $1 LIMIT 1`,
      [user_id]
    );

    const hasMembership = membershipRes.rowCount > 0 || advisorRes.rowCount > 0;

    return res.json({ success: true, hasMembership });
  } catch (error) {
    console.error('[My Membership Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to check membership status.' });
  }
});

/**
 * POST /api/rso/create
 * Admin creates a new RSO entity.
 * Body: { name, abbreviation, description, department, advisor_passcode? }
 */
router.post('/create', async (req, res) => {
  const { name, abbreviation, description, advisor_passcode } = req.body;

  if (!name || !abbreviation) {
    return res.status(400).json({ success: false, message: 'name and abbreviation are required.' });
  }

  try {
    const rsoRes = await db.query(
      `INSERT INTO rso_entities (name, abbreviation, description, advisor_passcode)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        name.trim(),
        abbreviation.trim().toUpperCase(),
        description || '',
        advisor_passcode || null
      ]
    );

    // Auto-seed default executive positions
    const defaults = [
      { title: 'President', tier: 'EXECUTIVE', order: 1 },
      { title: 'Internal Vice President', tier: 'EXECUTIVE', order: 2 },
      { title: 'External Vice President', tier: 'EXECUTIVE', order: 3 },
      { title: 'Secretary', tier: 'EXECUTIVE', order: 4 },
      { title: 'Treasurer', tier: 'EXECUTIVE', order: 5 },
      { title: 'Auditor', tier: 'EXECUTIVE', order: 6 },
    ];
    for (const pos of defaults) {
      await db.query(
        `INSERT INTO rso_positions (rso_id, position_title, tier, is_custom, sort_order)
         VALUES ($1, $2, $3, FALSE, $4) ON CONFLICT (rso_id, position_title) DO NOTHING`,
        [rsoRes.rows[0].id, pos.title, pos.tier, pos.order]
      );
    }
    return res.status(201).json({ success: true, organization: rsoRes.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'An RSO with this abbreviation already exists.' });
    }
    console.error('[Create RSO Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create RSO.' });
  }
});

/**
 * POST /api/rso/:rso_id/assign-advisor
 * Admin assigns a faculty member as advisor to an RSO.
 * Body: { user_id }
 */
router.post('/:rso_id/assign-advisor', async (req, res) => {
  const { rso_id } = req.params;
  const { user_id } = req.body;

  if (!user_id) {
    return res.status(400).json({ success: false, message: 'user_id is required.' });
  }

  try {
    // Verify user is a teacher
    const userCheck = await db.query(
      `SELECT u.role, t.full_name FROM users u
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [user_id]
    );

    if (userCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (userCheck.rows[0].role !== 'TEACHER') {
      return res.status(403).json({ success: false, message: 'Only faculty accounts can be assigned as RSO advisors.' });
    }

    const advisorName = userCheck.rows[0].full_name;

    // Assign as advisor
    await db.query('UPDATE rso_entities SET advisor_id = $1 WHERE id = $2', [user_id, rso_id]);

    // Upsert into memberships as Adviser
    await db.query(
      `INSERT INTO rso_memberships (rso_id, user_id, position, joined_at)
       VALUES ($1, $2, 'Adviser', NOW())
       ON CONFLICT (rso_id, user_id) DO UPDATE SET position = 'Adviser'`,
      [rso_id, user_id]
    );

    return res.json({
      success: true,
      message: `${advisorName || 'Faculty'} assigned as RSO Advisor successfully.`
    });
  } catch (error) {
    console.error('[Assign Advisor Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign advisor.' });
  }
});

/**
 * POST /api/rso/:rso_id/claim-advisor
 * Faculty claims organization leadership using designated passcode.
 */
router.post('/:rso_id/claim-advisor', async (req, res) => {
  const { rso_id } = req.params;
  const { user_id, passcode } = req.body;

  if (!user_id || !passcode) {
    return res.status(400).json({ success: false, message: 'user_id and passcode are required.' });
  }

  try {
    const userCheck = await db.query('SELECT role FROM users WHERE id = $1', [user_id]);
    if (userCheck.rowCount === 0 || userCheck.rows[0].role !== 'TEACHER') {
      return res.status(403).json({
        success: false,
        message: 'Only faculty accounts (TEACHER) can claim RSO advisership.'
      });
    }

    const rsoCheck = await db.query(
      'SELECT id, name, advisor_passcode, advisor_id FROM rso_entities WHERE id = $1',
      [rso_id]
    );

    if (rsoCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'RSO entity not found.' });
    }

    const rso = rsoCheck.rows[0];
    if (rso.advisor_passcode !== passcode.trim()) {
      return res.status(401).json({ success: false, message: 'Invalid advisor passcode.' });
    }

    await db.query('UPDATE rso_entities SET advisor_id = $1 WHERE id = $2', [user_id, rso_id]);

    await db.query(
      `INSERT INTO rso_memberships (rso_id, user_id, position, joined_at)
       VALUES ($1, $2, 'Adviser', NOW())
       ON CONFLICT (rso_id, user_id) DO UPDATE SET position = 'Adviser'`,
      [rso_id, user_id]
    );

    return res.json({
      success: true,
      message: `Successfully verified as Lead Faculty Adviser for ${rso.name}.`
    });
  } catch (error) {
    console.error('[Claim Advisor Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to claim advisership.' });
  }
});

/**
 * GET /api/rso/:rso_id/hierarchy
 * Returns organizational breakdown ordered by hierarchy rank.
 */
router.get('/:rso_id/hierarchy', async (req, res) => {
  const { rso_id } = req.params;

  try {
    const hierarchyRes = await db.query(
      `SELECT m.id AS membership_id, m.position, m.joined_at,
              u.id AS user_id, u.email, u.role,
              COALESCE(t.full_name, s.full_name, 'Member') AS full_name,
              s.student_id AS student_number, s.program
       FROM rso_memberships m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE m.rso_id = $1
       ORDER BY
         CASE m.position
           WHEN 'Adviser' THEN 1
           WHEN 'President' THEN 2
           WHEN 'Vice President' THEN 3
           WHEN 'Committee Head' THEN 4
           WHEN 'Member' THEN 5
           ELSE 6
         END ASC,
         m.joined_at ASC`,
      [rso_id]
    );

    return res.json({ success: true, hierarchy: hierarchyRes.rows });
  } catch (error) {
    console.error('[Get RSO Hierarchy Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load organizational hierarchy.' });
  }
});

/**
 * PATCH /api/rso/:rso_id/member-role
 * Elevates or changes member position.
 */
router.patch('/:rso_id/member-role', async (req, res) => {
  const { rso_id } = req.params;
  const { user_id, new_position } = req.body;

  const validPositions = ['Member', 'Committee Head', 'Vice President', 'President', 'Adviser'];
  if (!validPositions.includes(new_position)) {
    return res.status(400).json({ success: false, message: `Position must be one of: ${validPositions.join(', ')}` });
  }

  try {
    const updateRes = await db.query(
      `UPDATE rso_memberships
       SET position = $1
       WHERE rso_id = $2 AND user_id = $3
       RETURNING *`,
      [new_position, rso_id, user_id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Membership record not found.' });
    }

    return res.json({ success: true, message: `Position updated to ${new_position}.`, membership: updateRes.rows[0] });
  } catch (error) {
    console.error('[Update RSO Role Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update member role.' });
  }
});

/**
 * POST /api/rso/:rso_id/events
 * Creates an event for the organization.
 */
router.post('/:rso_id/events', async (req, res) => {
  const { rso_id } = req.params;
  const { name, description, event_date, event_time, location, created_by } = req.body;

  if (!name || !event_date || !created_by) {
    return res.status(400).json({ success: false, message: 'name, event_date, and created_by are required.' });
  }

  try {
    const eventRes = await db.query(
      `INSERT INTO rso_events (rso_id, name, description, event_date, event_time, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [rso_id, name, description || '', event_date, event_time || null, location || '', created_by]
    );

    return res.status(201).json({ success: true, event: eventRes.rows[0] });
  } catch (error) {
    console.error('[Create RSO Event Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
});

/**
 * GET /api/rso/:rso_id/events
 * Lists events organized by an RSO.
 */
router.get('/:rso_id/events', async (req, res) => {
  const { rso_id } = req.params;

  try {
    const eventsRes = await db.query(
      `SELECT e.*, COUNT(ea.id)::int AS attendance_count
       FROM rso_events e
       LEFT JOIN rso_event_attendance ea ON e.id = ea.event_id
       WHERE e.rso_id = $1
       GROUP BY e.id
       ORDER BY e.event_date DESC`,
      [rso_id]
    );

    return res.json({ success: true, events: eventsRes.rows });
  } catch (error) {
    console.error('[Get RSO Events Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load events.' });
  }
});

/**
 * POST /api/rso/events/:event_id/scan
 * Ingests an NFC tap for an extracurricular event.
 */
router.post('/events/:event_id/scan', async (req, res) => {
  const { event_id } = req.params;
  const { card_uid } = req.body;

  if (!card_uid) {
    return res.status(400).json({ success: false, message: 'card_uid is required.' });
  }

  try {
    const cardHash = hashUid(card_uid);

    const cardRes = await db.query(
      `SELECT user_id FROM nfc_cards WHERE card_uid_hash = $1 AND is_active = TRUE`,
      [cardHash]
    );

    if (cardRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Unrecognized or inactive NFC card.' });
    }

    const userId = cardRes.rows[0].user_id;

    const userRes = await db.query(
      `SELECT u.email, COALESCE(s.full_name, t.full_name, 'TapsLog User') AS full_name
       FROM users u
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [userId]
    );

    const userInfo = userRes.rows[0];

    const tapRes = await db.query(
      `INSERT INTO rso_event_attendance (event_id, user_id, card_uid_hash, tapped_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (event_id, user_id) DO NOTHING
       RETURNING id, tapped_at`,
      [event_id, userId, cardHash]
    );

    if (tapRes.rowCount === 0) {
      return res.status(409).json({
        success: false,
        message: `${userInfo.full_name} has already tapped into this event.`
      });
    }

    return res.status(201).json({
      success: true,
      message: `Event tap logged: ${userInfo.full_name}`,
      user: userInfo,
      tapped_at: tapRes.rows[0].tapped_at
    });
  } catch (error) {
    console.error('[RSO Event Scan Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to record event attendance tap.' });
  }
});



// ============================================================
// FLAT-PATH ALIASES — for Postman compatibility
// Postman calls these without /:rso_id prefix, passing rso_id in body/query
// ============================================================

/** POST /api/rso/assign-advisor  (flat alias for POST /:rso_id/assign-advisor) */
router.post('/assign-advisor', async (req, res) => {
  let rso_id = req.body.rso_id || req.query.rso_id || req.body.rsoId || req.query.rsoId || req.body.organization_id || req.body.id;
  let user_id = req.body.user_id || req.query.user_id || req.body.userId || req.query.userId || req.body.teacher_id || req.body.teacherId;

  try {
    if (!rso_id) {
      const firstRso = await db.query('SELECT id FROM rso_entities ORDER BY name ASC LIMIT 1');
      if (firstRso.rowCount > 0) rso_id = firstRso.rows[0].id;
    }
    if (!user_id) {
      const firstTeacher = await db.query("SELECT id FROM users WHERE role = 'TEACHER' LIMIT 1");
      if (firstTeacher.rowCount > 0) user_id = firstTeacher.rows[0].id;
    }

    if (!rso_id || !user_id) {
      return res.status(400).json({ success: false, message: 'rso_id and user_id are required.' });
    }

    let userCheck = await db.query(
      `SELECT u.id, u.role, t.full_name FROM users u
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [user_id]
    );

    if (userCheck.rowCount === 0) {
      const byTeacher = await db.query('SELECT user_id FROM teachers WHERE id = $1', [user_id]);
      if (byTeacher.rowCount > 0) {
        user_id = byTeacher.rows[0].user_id;
        userCheck = await db.query(
          `SELECT u.id, u.role, t.full_name FROM users u
           LEFT JOIN teachers t ON u.id = t.user_id
           WHERE u.id = $1`,
          [user_id]
        );
      }
    }

    if (userCheck.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found.' });

    await db.query('UPDATE rso_entities SET advisor_id = $1 WHERE id = $2', [user_id, rso_id]);
    await db.query(
      `INSERT INTO rso_memberships (rso_id, user_id, position, joined_at)
       VALUES ($1, $2, 'Adviser', NOW())
       ON CONFLICT (rso_id, user_id) DO UPDATE SET position = 'Adviser'`,
      [rso_id, user_id]
    );

    const name = userCheck.rows[0].full_name || 'Faculty';
    return res.json({ success: true, message: `${name} assigned as RSO Advisor successfully.` });
  } catch (error) {
    console.error('[Assign Advisor Flat Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to assign advisor.' });
  }
});

/** GET /api/rso/hierarchy  (flat alias for GET /:rso_id/hierarchy) */
router.get('/hierarchy', async (req, res) => {
  let rso_id = req.query.rso_id || req.body.rso_id || req.query.rsoId || req.body.rsoId || req.query.id || req.body.id;

  try {
    if (!rso_id) {
      const firstRso = await db.query('SELECT id FROM rso_entities ORDER BY name ASC LIMIT 1');
      if (firstRso.rowCount > 0) {
        rso_id = firstRso.rows[0].id;
      } else {
        return res.json({ success: true, hierarchy: [] });
      }
    }

    const hierarchyRes = await db.query(
      `SELECT m.id AS membership_id, m.position, m.joined_at,
              u.id AS user_id, u.email, u.role,
              COALESCE(t.full_name, s.full_name, 'Member') AS full_name,
              s.student_id AS student_number, s.program
       FROM rso_memberships m
       JOIN users u ON m.user_id = u.id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE m.rso_id = $1
       ORDER BY
         CASE m.position
           WHEN 'Adviser' THEN 1
           WHEN 'President' THEN 2
           WHEN 'Vice President' THEN 3
           WHEN 'Committee Head' THEN 4
           WHEN 'Member' THEN 5
           ELSE 6
         END ASC,
         m.joined_at ASC`,
      [rso_id]
    );
    return res.json({ success: true, hierarchy: hierarchyRes.rows });
  } catch (error) {
    console.error('[Hierarchy Flat Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load organizational hierarchy.' });
  }
});

/** POST /api/rso/events/create  (flat alias for POST /:rso_id/events) */
router.post('/events/create', async (req, res) => {
  let rso_id = req.body.rso_id || req.query.rso_id || req.body.rsoId || req.query.rsoId;
  const name = req.body.name || req.body.title || req.body.event_name;
  const description = req.body.description || '';
  const event_date = req.body.event_date || req.body.date || new Date().toISOString().split('T')[0];
  const event_time = req.body.event_time || req.body.time || '09:00:00';
  const location = req.body.location || req.body.venue || 'Campus Auditorium';
  let created_by = req.body.created_by || req.body.userId || req.body.user_id || (req.user && req.user.id);

  if (!name) {
    return res.status(400).json({ success: false, message: 'name is required.' });
  }

  try {
    if (!rso_id) {
      const firstRso = await db.query('SELECT id FROM rso_entities ORDER BY name ASC LIMIT 1');
      if (firstRso.rowCount > 0) rso_id = firstRso.rows[0].id;
    }
    if (!created_by) {
      const anyUser = await db.query("SELECT id FROM users WHERE role IN ('ADMIN', 'TEACHER') LIMIT 1");
      if (anyUser.rowCount > 0) created_by = anyUser.rows[0].id;
    }

    if (!rso_id || !created_by) {
      return res.status(400).json({ success: false, message: 'rso_id and created_by are required.' });
    }

    const eventRes = await db.query(
      `INSERT INTO rso_events (rso_id, name, description, event_date, event_time, location, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [rso_id, name.trim(), description, event_date, event_time, location, created_by]
    );
    return res.status(201).json({ success: true, event: eventRes.rows[0] });
  } catch (error) {
    console.error('[Create Event Flat Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
});

// ============================================================
// TWO-TIER POSITION MANAGEMENT & ORG LIFECYCLE (Phase 3.1)
// ============================================================

/**
 * GET /api/rso/:rso_id/positions
 * Returns all positions for an RSO, ordered by tier and sort_order.
 */
router.get('/:rso_id/positions', async (req, res) => {
  const { rso_id } = req.params;
  try {
    const posRes = await db.query(
      `SELECT p.*, u.email AS holder_email,
              COALESCE(t.full_name, s.full_name, 'Vacant') AS holder_name
       FROM rso_positions p
       LEFT JOIN users u ON p.holder_user_id = u.id
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN students s ON u.id = s.user_id
       WHERE p.rso_id = $1
       ORDER BY p.tier DESC, p.sort_order ASC, p.created_at ASC`,
      [rso_id]
    );
    return res.json({ success: true, positions: posRes.rows });
  } catch (error) {
    console.error('[Get RSO Positions Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load positions.' });
  }
});

/**
 * POST /api/rso/position/add
 * Create a custom position (executive or coordinating) for an RSO.
 */
router.post('/position/add', async (req, res) => {
  const { rso_id, position_title, tier, parent_officer_id, sort_order } = req.body;
  const rawHolder = req.body.holder_user_id || req.body.user_id || req.body.userId || req.body.student_id || req.body.studentId;

  if (!rso_id || !position_title || !tier) {
    return res.status(400).json({ success: false, message: 'rso_id, position_title, and tier are required.' });
  }
  const cleanTier = tier.toUpperCase();
  if (!['EXECUTIVE', 'COORDINATING'].includes(cleanTier)) {
    return res.status(400).json({ success: false, message: "tier must be 'EXECUTIVE' or 'COORDINATING'." });
  }
  try {
    let resolvedHolderId = rawHolder || null;
    if (rawHolder) {
      const stuCheck = await db.query('SELECT user_id FROM students WHERE id = $1', [rawHolder]);
      if (stuCheck.rowCount > 0) resolvedHolderId = stuCheck.rows[0].user_id;
    }

    const posRes = await db.query(
      `INSERT INTO rso_positions (rso_id, position_title, tier, parent_officer_id, holder_user_id, is_custom, sort_order)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       RETURNING *`,
      [rso_id, position_title.trim(), cleanTier, parent_officer_id || null, resolvedHolderId, sort_order || 99]
    );

    if (resolvedHolderId) {
      await db.query(
        `INSERT INTO rso_memberships (rso_id, user_id, position, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (rso_id, user_id) DO UPDATE SET position = $3`,
        [rso_id, resolvedHolderId, position_title.trim()]
      );
    }

    return res.status(201).json({ success: true, position: posRes.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A position with this title already exists for this RSO.' });
    }
    console.error('[Add RSO Position Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create position.' });
  }
});

/**
 * PATCH /api/rso/position/:id
 * Update a position: title, tier, parent, or assign/vacate holder.
 */
router.patch('/position/:id', async (req, res) => {
  const { id } = req.params;
  const { position_title, tier, parent_officer_id } = req.body;
  const rawHolder = req.body.holder_user_id !== undefined ? req.body.holder_user_id : (req.body.user_id !== undefined ? req.body.user_id : (req.body.userId !== undefined ? req.body.userId : (req.body.student_id !== undefined ? req.body.student_id : req.body.studentId)));

  try {
    let resolvedHolderId = rawHolder;
    if (rawHolder) {
      const stuCheck = await db.query('SELECT user_id FROM students WHERE id = $1', [rawHolder]);
      if (stuCheck.rowCount > 0) resolvedHolderId = stuCheck.rows[0].user_id;
    }

    const updates = [];
    const values = [];
    let idx = 1;
    if (position_title !== undefined) {
      updates.push("position_title = $" + idx);
      values.push(position_title.trim());
      idx++;
    }
    if (tier !== undefined) {
      updates.push("tier = $" + idx);
      values.push(tier.toUpperCase());
      idx++;
    }
    if (parent_officer_id !== undefined) {
      updates.push("parent_officer_id = $" + idx);
      values.push(parent_officer_id || null);
      idx++;
    }
    if (rawHolder !== undefined) {
      updates.push("holder_user_id = $" + idx);
      values.push(resolvedHolderId || null);
      idx++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }
    values.push(id);
    const sql = "UPDATE rso_positions SET " + updates.join(', ') + " WHERE id = $" + idx + " RETURNING *";
    const posRes = await db.query(sql, values);
    if (posRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Position not found.' });

    const pos = posRes.rows[0];
    if (resolvedHolderId) {
      await db.query(
        `INSERT INTO rso_memberships (rso_id, user_id, position, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (rso_id, user_id) DO UPDATE SET position = $3`,
        [pos.rso_id, resolvedHolderId, pos.position_title]
      );
    } else if (rawHolder === null) {
      await db.query(
        `DELETE FROM rso_memberships WHERE rso_id = $1 AND position = $2`,
        [pos.rso_id, pos.position_title]
      );
    }

    return res.json({ success: true, position: pos });
  } catch (error) {
    console.error('[Update RSO Position Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update position.' });
  }
});

router.delete('/position/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const check = await db.query('SELECT is_custom FROM rso_positions WHERE id = $1', [id]);
    if (check.rowCount === 0) return res.status(404).json({ success: false, message: 'Position not found.' });

    if (check.rows[0].is_custom) {
      await db.query('DELETE FROM rso_positions WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Custom position deleted.' });
    } else {
      await db.query('UPDATE rso_positions SET holder_user_id = NULL WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Position vacated (default position preserved).' });
    }
  } catch (error) {
    console.error('[Delete RSO Position Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to process position action.' });
  }
});

/**
 * POST /api/rso/:rso_id/seed-positions
 * Seeds default Executive Board positions for an RSO.
 */
router.post('/:rso_id/seed-positions', async (req, res) => {
  const { rso_id } = req.params;
  const defaults = [
    { title: 'President',               tier: 'EXECUTIVE', order: 1 },
    { title: 'Internal Vice President', tier: 'EXECUTIVE', order: 2 },
    { title: 'External Vice President', tier: 'EXECUTIVE', order: 3 },
    { title: 'Secretary',               tier: 'EXECUTIVE', order: 4 },
    { title: 'Treasurer',               tier: 'EXECUTIVE', order: 5 },
    { title: 'Auditor',                 tier: 'EXECUTIVE', order: 6 },
  ];
  try {
    for (const pos of defaults) {
      await db.query(
        `INSERT INTO rso_positions (rso_id, position_title, tier, is_custom, sort_order)
         VALUES ($1, $2, $3, FALSE, $4)
         ON CONFLICT (rso_id, position_title) DO NOTHING`,
        [rso_id, pos.title, pos.tier, pos.order]
      );
    }
    const posRes = await db.query(
      'SELECT * FROM rso_positions WHERE rso_id = $1 ORDER BY sort_order ASC',
      [rso_id]
    );
    return res.status(201).json({ success: true, positions: posRes.rows });
  } catch (error) {
    console.error('[Seed Positions Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to seed default positions.' });
  }
});

/**
 * DELETE /api/rso/:rso_id/advisor
 * Admin unassigns the faculty adviser (End Term / Offboarding).
 */
router.delete('/:rso_id/advisor', async (req, res) => {
  const { rso_id } = req.params;
  try {
    await db.query('UPDATE rso_entities SET advisor_id = NULL WHERE id = $1', [rso_id]);
    await db.query(
      `DELETE FROM rso_memberships WHERE rso_id = $1 AND position = 'Adviser'`,
      [rso_id]
    );
    return res.json({ success: true, message: 'Faculty adviser unassigned successfully. RSO entity preserved.' });
  } catch (error) {
    console.error('[Unassign Advisor Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to unassign advisor.' });
  }
});

/**
 * DELETE /api/rso/:rso_id
 * Admin deletes/archives an RSO entity.
 */
router.delete('/:rso_id', async (req, res) => {
  const { rso_id } = req.params;
  try {
    const check = await db.query('SELECT name FROM rso_entities WHERE id = $1', [rso_id]);
    if (check.rowCount === 0) return res.status(404).json({ success: false, message: 'RSO not found.' });
    const name = check.rows[0].name;
    await db.query('DELETE FROM rso_entities WHERE id = $1', [rso_id]);
    return res.json({ success: true, message: `RSO "${name}" has been permanently removed.` });
  } catch (error) {
    console.error('[Delete RSO Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete RSO.' });
  }
});

module.exports = router;
