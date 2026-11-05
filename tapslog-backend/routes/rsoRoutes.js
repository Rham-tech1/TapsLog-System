const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

const hashUid = (rawUid) => {
  return crypto.createHash('sha256').update(rawUid.trim().toLowerCase()).digest('hex');
};

/**
 * GET /api/rso/list
 * Returns all RSO entities with advisor details and member count.
 */
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
  const rso_id = req.body.rso_id || req.query.rso_id;
  if (!rso_id) {
    return res.status(400).json({ success: false, message: 'rso_id is required in body or query.' });
  }
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ success: false, message: 'user_id is required.' });
  try {
    const userCheck = await db.query(
      `SELECT u.role, t.full_name FROM users u
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE u.id = $1`,
      [user_id]
    );
    if (userCheck.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found.' });
    if (userCheck.rows[0].role !== 'TEACHER') {
      return res.status(403).json({ success: false, message: 'Only faculty accounts can be assigned as RSO advisors.' });
    }
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
  const rso_id = req.query.rso_id || req.body.rso_id;
  if (!rso_id) return res.status(400).json({ success: false, message: 'rso_id is required as a query parameter.' });
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
    console.error('[Hierarchy Flat Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to load organizational hierarchy.' });
  }
});

/** POST /api/rso/events/create  (flat alias for POST /:rso_id/events) */
router.post('/events/create', async (req, res) => {
  const { rso_id, name, description, event_date, event_time, location, created_by } = req.body;
  if (!rso_id || !name || !event_date || !created_by) {
    return res.status(400).json({ success: false, message: 'rso_id, name, event_date, and created_by are required.' });
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
    console.error('[Create Event Flat Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
});

module.exports = router;
