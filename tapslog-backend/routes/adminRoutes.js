const express = require('express');
const router = express.Router();
const db = require('../config/db');
const adminAuth = require('../middleware/adminAuth');

// Enforce admin privileges on all admin endpoints
router.use(adminAuth);

/**
 * GET /api/admin/telemetry
 * Gathers system-wide real-time metrics.
 */
router.get('/telemetry', async (req, res) => {
  try {
    // 1. Total users
    const usersCountRes = await db.query('SELECT COUNT(*)::int AS total FROM users');
    
    // 2. Active NFC cards
    const nfcCountRes = await db.query('SELECT COUNT(*)::int AS total FROM nfc_cards WHERE is_active = TRUE');

    // 3. Daily taps today (academic + RSO)
    const academicTapsRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM attendance_logs 
       WHERE scanned_at >= CURRENT_DATE`
    );
    const rsoTapsRes = await db.query(
      `SELECT COUNT(*)::int AS total FROM rso_event_attendance 
       WHERE tapped_at >= CURRENT_DATE`
    );
    const dailyTaps = (academicTapsRes.rows[0]?.total || 0) + (rsoTapsRes.rows[0]?.total || 0);

    // 4. Role breakdown
    const roleStatsRes = await db.query(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`
    );

    return res.json({
      success: true,
      telemetry: {
        totalUsers: usersCountRes.rows[0].total,
        activeNfcCards: nfcCountRes.rows[0].total,
        dailyTaps: dailyTaps,
        systemUptimeSeconds: Math.floor(process.uptime()),
        roleBreakdown: roleStatsRes.rows
      }
    });
  } catch (error) {
    console.error('[Admin Telemetry Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve telemetry.' });
  }
});

/**
 * GET /api/admin/users
 * Returns list of users with search and profile linking.
 */
router.get('/users', async (req, res) => {
  const { query, role } = req.query;

  try {
    let sql = `
      SELECT u.id, u.email, u.role, u.show_rso_badge, u.created_at,
             nc.id AS card_id, nc.is_active AS card_active, nc.bound_at,
             t.full_name AS teacher_name, t.department, t.employee_id,
             s.full_name AS student_name, s.student_id AS student_number, s.program, s.year_level
      FROM users u
      LEFT JOIN nfc_cards nc ON u.id = nc.user_id AND nc.is_active = TRUE
      LEFT JOIN teachers t ON u.id = t.user_id
      LEFT JOIN students s ON u.id = s.user_id
      WHERE 1=1
    `;
    const params = [];

    if (role) {
      params.push(role.toUpperCase());
      sql += ` AND u.role = $${params.length}`;
    }

    if (query) {
      params.push(`%${query.toLowerCase()}%`);
      sql += ` AND (LOWER(u.email) LIKE $${params.length} 
                 OR LOWER(COALESCE(t.full_name, '')) LIKE $${params.length} 
                 OR LOWER(COALESCE(s.full_name, '')) LIKE $${params.length}
                 OR LOWER(COALESCE(s.student_id, '')) LIKE $${params.length})`;
    }

    sql += ` ORDER BY u.created_at DESC LIMIT 100`;

    const usersRes = await db.query(sql, params);

    const formatted = usersRes.rows.map(row => ({
      id: row.id,
      email: row.email,
      role: row.role,
      name: row.teacher_name || row.student_name || 'System Admin',
      details: row.role === 'TEACHER' 
        ? { department: row.department, employee_id: row.employee_id }
        : row.role === 'STUDENT'
        ? { student_number: row.student_number, program: row.program, year_level: row.year_level }
        : null,
      nfcCard: row.card_id ? {
        card_id: row.card_id,
        is_active: row.card_active,
        bound_at: row.bound_at
      } : null,
      created_at: row.created_at
    }));

    return res.json({ success: true, count: formatted.length, users: formatted });
  } catch (error) {
    console.error('[Admin Get Users Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve user registry.' });
  }
});

/**
 * DELETE /api/admin/unbind-card/:userId
 * 1-Click NFC Card Unbinding with audit log tracking.
 */
router.delete('/unbind-card/:userId', async (req, res) => {
  const { userId } = req.params;
  const adminId = req.user.id;

  try {
    // 1. Verify user exists
    const userRes = await db.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (userRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Target user not found.' });
    }

    // 2. Remove or deactivate active cards for this user
    const cardRes = await db.query(
      `UPDATE nfc_cards 
       SET is_active = FALSE 
       WHERE user_id = $1 AND is_active = TRUE 
       RETURNING id, card_uid_hash`,
      [userId]
    );

    if (cardRes.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'User does not possess an active NFC card.' });
    }

    // 3. Clear nfc_card_id from users table
    await db.query('UPDATE users SET nfc_card_id = NULL WHERE id = $1', [userId]);

    // 4. Record to admin_audit_logs
    await db.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_user_id, details)
       VALUES ($1, 'UNBIND_NFC_CARD', $2, $3)`,
      [
        adminId,
        userId,
        JSON.stringify({
          unboundCardsCount: cardRes.rowCount,
          card_hashes: cardRes.rows.map(r => r.card_uid_hash)
        })
      ]
    );

    return res.json({
      success: true,
      message: `Successfully unbound NFC card from ${userRes.rows[0].email}.`,
      unbound_count: cardRes.rowCount
    });
  } catch (error) {
    console.error('[Admin Unbind Card Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to unbind NFC card.' });
  }
});

/**
 * PATCH /api/admin/user-role
 * Elevates or demotes a user's role.
 */
router.patch('/user-role', async (req, res) => {
  const { target_user_id, new_role } = req.body;
  const adminId = req.user.id;

  if (!target_user_id || !new_role) {
    return res.status(400).json({ success: false, message: 'target_user_id and new_role are required.' });
  }

  const validRoles = ['STUDENT', 'TEACHER', 'ADMIN'];
  if (!validRoles.includes(new_role)) {
    return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
  }

  try {
    // Prevent admin demoting themselves directly to avoid lockouts
    if (target_user_id === adminId && new_role !== 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Admins cannot remove their own administrative privileges.' });
    }

    const currentRes = await db.query('SELECT role, email FROM users WHERE id = $1', [target_user_id]);
    if (currentRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const oldRole = currentRes.rows[0].role;

    // Update role
    await db.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
      [new_role, target_user_id]
    );

    // Audit log
    await db.query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_user_id, details)
       VALUES ($1, 'UPDATE_USER_ROLE', $2, $3)`,
      [
        adminId,
        target_user_id,
        JSON.stringify({ old_role: oldRole, new_role: new_role })
      ]
    );

    return res.json({
      success: true,
      message: `User role updated from ${oldRole} to ${new_role}.`
    });
  } catch (error) {
    console.error('[Admin Update Role Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to update user role.' });
  }
});

module.exports = router;