const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

/**
 * Utility: Compute SHA-256 hash of raw NFC UID
 */
const hashUid = (rawUid) => {
  return crypto.createHash('sha256').update(rawUid.trim().toLowerCase()).digest('hex');
};

/**
 * POST /api/attendance/session/start
 * Teacher initiates an active scanning session for a course.
 * Enforces Option A1 (Primary teacher check).
 */
router.post('/session/start', async (req, res) => {
  const course_id = req.body.course_id || req.body.courseId;
  const rawTeacherId = req.body.teacher_id || req.body.teacherId;

  if (!course_id || !rawTeacherId) {
    return res.status(400).json({
      success: false,
      message: 'course_id and teacher_id are required.'
    });
  }

  try {
    // Dual-resolve teacher_id: accept both teachers.id and users.id (user.id from JWT)
    let teacher_id = rawTeacherId;
    const directCheck = await db.query('SELECT id FROM teachers WHERE id = $1', [rawTeacherId]);
    if (directCheck.rowCount === 0) {
      const byUserCheck = await db.query('SELECT id FROM teachers WHERE user_id = $1', [rawTeacherId]);
      if (byUserCheck.rowCount > 0) {
        teacher_id = byUserCheck.rows[0].id;
      }
    }

    // 1. Option A1 Observer Verification: Confirm teacher is assigned and is PRIMARY
    const teacherCheck = await db.query(
      `SELECT role FROM course_teachers WHERE course_id = $1 AND teacher_id = $2`,
      [course_id, teacher_id]
    );

    if (teacherCheck.rowCount === 0) {
      return res.status(403).json({
        success: false,
        message: 'Teacher is not assigned to this course.'
      });
    }

    const teacherRole = teacherCheck.rows[0].role;
    if (teacherRole !== 'PRIMARY') {
      return res.status(403).json({
        success: false,
        message: `Action denied. You are assigned as ${teacherRole}. Only PRIMARY teachers can operate scanning sessions.`
      });
    }

    // 2. Close any prior unresolved active session for this course
    await db.query(
      `UPDATE attendance_sessions 
       SET is_active = FALSE, ended_at = NOW() 
       WHERE course_id = $1 AND is_active = TRUE`,
      [course_id]
    );

    // 3. Create new attendance session
    const sessionRes = await db.query(
      `INSERT INTO attendance_sessions (course_id, teacher_id, is_active, started_at)
       VALUES ($1, $2, TRUE, NOW())
       RETURNING id, course_id, teacher_id, is_active, started_at`,
      [course_id, teacher_id]
    );

    return res.status(201).json({
      success: true,
      message: 'Attendance scanning session activated.',
      session: sessionRes.rows[0]
    });
  } catch (error) {
    console.error('[Session Start Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to initiate attendance session.' });
  }
});

/**
 * POST /api/attendance/session/stop
 * Concludes an active session.
 */
router.post('/session/stop', async (req, res) => {
  const { session_id } = req.body;

  if (!session_id) {
    return res.status(400).json({ success: false, message: 'session_id is required.' });
  }

  try {
    const updateRes = await db.query(
      `UPDATE attendance_sessions 
       SET is_active = FALSE, ended_at = NOW() 
       WHERE id = $1 AND is_active = TRUE 
       RETURNING id, course_id, ended_at`,
      [session_id]
    );

    if (updateRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Active session not found or already closed.' });
    }

    return res.json({
      success: true,
      message: 'Attendance session successfully concluded.',
      session: updateRes.rows[0]
    });
  } catch (error) {
    console.error('[Session Stop Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to stop session.' });
  }
});

/**
 * GET /api/attendance/session/active/:course_id
 * Returns current active session metadata for a course.
 */
router.get('/session/active/:course_id', async (req, res) => {
  const { course_id } = req.params;

  try {
    const sessionRes = await db.query(
      `SELECT s.id, s.course_id, s.teacher_id, s.started_at, s.is_active,
              c.course_name, c.course_code, t.full_name AS teacher_name
       FROM attendance_sessions s
       JOIN courses c ON s.course_id = c.id
       JOIN teachers t ON s.teacher_id = t.id
       WHERE s.course_id = $1 AND s.is_active = TRUE
       LIMIT 1`,
      [course_id]
    );

    if (sessionRes.rowCount === 0) {
      return res.json({ success: true, active: false, session: null });
    }

    return res.json({ success: true, active: true, session: sessionRes.rows[0] });
  } catch (error) {
    console.error('[Get Active Session Error]:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving active session.' });
  }
});

/**
 * POST /api/attendance/scan
 * Core NFC tap ingestion endpoint.
 * Validates card UID hash, verifies student enrollment, and logs presence.
 */
router.post('/scan', async (req, res) => {
  const card_uid = req.body.card_uid || req.body.cardUid;
  const session_id = req.body.session_id || req.body.sessionId;

  if (!card_uid || !session_id) {
    return res.status(400).json({
      success: false,
      message: 'card_uid and session_id are required.'
    });
  }

  try {
    // 1. Verify session exists and is currently active
    const sessionRes = await db.query(
      `SELECT id, course_id, is_active FROM attendance_sessions WHERE id = $1`,
      [session_id]
    );

    if (sessionRes.rowCount === 0 || !sessionRes.rows[0].is_active) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or inactive attendance session.'
      });
    }

    const courseId = sessionRes.rows[0].course_id;

    // 2. Compute SHA-256 hash of incoming card UID
    const cardHash = hashUid(card_uid);

    // 3. Resolve user through active NFC card record
    const cardRes = await db.query(
      `SELECT user_id, is_active FROM nfc_cards WHERE card_uid_hash = $1`,
      [cardHash]
    );

    if (cardRes.rowCount === 0 || !cardRes.rows[0].is_active) {
      return res.status(404).json({
        success: false,
        message: 'Unrecognized or inactive NFC card.'
      });
    }

    const userId = cardRes.rows[0].user_id;

    // 4. Resolve student profile
    const studentRes = await db.query(
      `SELECT id, full_name, student_id, program, year_level 
       FROM students 
       WHERE user_id = $1`,
      [userId]
    );

    if (studentRes.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'NFC card is not registered to an active student account.'
      });
    }

    const student = studentRes.rows[0];

    // 5. Verify student is enrolled in the course
    const enrollmentRes = await db.query(
      `SELECT id, status FROM course_enrollments 
       WHERE course_id = $1 AND student_id = $2`,
      [courseId, student.id]
    );

    if (enrollmentRes.rowCount === 0 || enrollmentRes.rows[0].status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        message: `Student ${student.full_name} is not actively enrolled in this course.`
      });
    }

    // 6. Check for duplicate scan within this session
    const duplicateCheck = await db.query(
      `SELECT id, scanned_at FROM attendance_logs 
       WHERE session_id = $1 AND student_id = $2`,
      [session_id, student.id]
    );

    if (duplicateCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Student ${student.full_name} has already checked into this session.`,
        scanned_at: duplicateCheck.rows[0].scanned_at
      });
    }

    // 7. Insert attendance log
    const logRes = await db.query(
      `INSERT INTO attendance_logs (session_id, student_id, card_uid_hash, status, scanned_at)
       VALUES ($1, $2, $3, 'PRESENT', NOW())
       RETURNING id, session_id, student_id, status, scanned_at`,
      [session_id, student.id, cardHash]
    );

    return res.status(201).json({
      success: true,
      message: `Verified: ${student.full_name}`,
      student: {
        id: student.id,
        full_name: student.full_name,
        student_id: student.student_id,
        program: student.program,
        year_level: student.year_level
      },
      log: logRes.rows[0]
    });
  } catch (error) {
    console.error('[Attendance Scan Error]:', error);
    return res.status(500).json({ success: false, message: 'Internal attendance scanning error.' });
  }
});

/**
 * GET /api/attendance/session/:session_id/logs
 * Retrieves real-time tap stream for a live session.
 */
router.get('/session/:session_id/logs', async (req, res) => {
  const { session_id } = req.params;

  try {
    const logsRes = await db.query(
      `SELECT al.id, al.scanned_at, al.status,
              s.id AS student_id_uuid, s.full_name, s.student_id AS student_number,
              s.program, s.year_level
       FROM attendance_logs al
       JOIN students s ON al.student_id = s.id
       WHERE al.session_id = $1
       ORDER BY al.scanned_at DESC`,
      [session_id]
    );

    return res.json({
      success: true,
      count: logsRes.rowCount,
      logs: logsRes.rows
    });
  } catch (error) {
    console.error('[Get Session Logs Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve attendance logs.' });
  }
});

module.exports = router;