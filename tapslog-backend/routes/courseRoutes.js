const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../config/db');

/**
 * Generate formatted join code: TAPS-XXXXXX
 * Omits ambiguous characters: 0, O, 1, I
 */
const generateJoinCode = () => {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(crypto.randomInt(0, chars.length));
  }
  return `TAPS-${randomStr}`;
};

/**
 * POST /api/courses/create
 * Teacher creates a course. Uses a DB transaction to prevent orphaned course rows.
 * Resolves teacher_id from the teachers table using user_id to avoid FK mismatches.
 */
router.post('/create', async (req, res) => {
  const {
    course_code,
    course_name,
    section,
    semester,
    academic_year,
    teacher_id,   // Expected: teachers.id UUID (from user.teacher_id in login response)
    time_in,
    time_out,
    day_of_week
  } = req.body;

  if (!course_code || !course_name || !teacher_id) {
    return res.status(400).json({
      success: false,
      message: 'course_code, course_name, and teacher_id are required.'
    });
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // ── Resolve the teacher record ────────────────────────────────────────
    // Try teachers.id directly first (happy path: teacher_id is correct FK)
    let teacherCheck = await client.query(
      'SELECT id FROM teachers WHERE id = $1',
      [teacher_id]
    );

    // Fallback: teacher_id might actually be users.id — resolve via user_id column
    if (teacherCheck.rowCount === 0) {
      teacherCheck = await client.query(
        'SELECT id FROM teachers WHERE user_id = $1',
        [teacher_id]
      );
    }

    if (teacherCheck.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Teacher record not found. Please sign out and sign back in.'
      });
    }

    const resolvedTeacherId = teacherCheck.rows[0].id;

    // ── Generate a unique join code ───────────────────────────────────────
    let joinCode = generateJoinCode();
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      const check = await client.query('SELECT id FROM courses WHERE join_code = $1', [joinCode]);
      if (check.rowCount === 0) {
        isUnique = true;
      } else {
        joinCode = generateJoinCode();
        attempts++;
      }
    }

    // ── Insert course ─────────────────────────────────────────────────────
    const courseRes = await client.query(
      `INSERT INTO courses
        (course_code, course_name, join_code, section, semester, academic_year, time_in, time_out, day_of_week)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        course_code.trim().toUpperCase(),
        course_name.trim(),
        joinCode,
        section || null,
        semester || '1st Semester',
        academic_year || '2026-2027',
        time_in || null,
        time_out || null,
        day_of_week || null
      ]
    );

    const newCourse = courseRes.rows[0];

    // ── Assign creating teacher as PRIMARY ────────────────────────────────
    await client.query(
      `INSERT INTO course_teachers (course_id, teacher_id, role)
       VALUES ($1, $2, 'PRIMARY')`,
      [newCourse.id, resolvedTeacherId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Course created successfully.',
      course: newCourse
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A course with this course_code already exists.' });
    }
    console.error('[Course Creation Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/courses/invite
 * GSuite Course Invitation: Teacher invites student via @ua.edu.ph email.
 */
router.post('/invite', async (req, res) => {
  const { course_id, student_email, teacher_id } = req.body;

  if (!course_id || !student_email || !teacher_id) {
    return res.status(400).json({
      success: false,
      message: 'course_id, student_email, and teacher_id are required.'
    });
  }

  const emailClean = student_email.trim().toLowerCase();
  if (!emailClean.endsWith('@ua.edu.ph')) {
    return res.status(400).json({
      success: false,
      message: 'Only University of Assumption emails (@ua.edu.ph) are permitted.'
    });
  }

  try {
    // 1. Resolve student record from email
    const studentQuery = await db.query(
      `SELECT s.id, s.full_name
       FROM students s
       JOIN users u ON s.user_id = u.id
       WHERE LOWER(u.email) = $1`,
      [emailClean]
    );

    if (studentQuery.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'No student account found with this institutional email.'
      });
    }

    const student = studentQuery.rows[0];

    // 2. Check if already enrolled
    const enrolledCheck = await db.query(
      `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
      [course_id, student.id]
    );
    if (enrolledCheck.rowCount > 0) {
      return res.status(409).json({
        success: false,
        message: `${student.full_name} is already enrolled in this course.`
      });
    }

    // 3. Resolve teacher record (same dual-resolution as course create)
    let teacherRecord = await db.query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
    if (teacherRecord.rowCount === 0) {
      teacherRecord = await db.query('SELECT id FROM teachers WHERE user_id = $1', [teacher_id]);
    }
    const resolvedTeacherId = teacherRecord.rowCount > 0 ? teacherRecord.rows[0].id : teacher_id;

    // 4. Insert or update invitation
    // NOTE: Table name is "course_invitations" per schema_master.sql
    // If your Supabase table is named "enrollment_invitations", change both references below.
    await db.query(
      `INSERT INTO course_invitations (course_id, student_id, invited_by, status, invited_at)
       VALUES ($1, $2, $3, 'PENDING', NOW())
       ON CONFLICT (course_id, student_id)
       DO UPDATE SET status = 'PENDING', invited_at = NOW()`,
      [course_id, student.id, resolvedTeacherId]
    );

    return res.status(200).json({
      success: true,
      message: `Invitation successfully sent to ${student.full_name} (${emailClean}).`
    });
  } catch (error) {
    console.error('[Course Invite Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to dispatch course invitation.' });
  }
});

/**
 * GET /api/courses/invitations/student/:student_id
 * Retrieves pending invitations for a student.
 */
router.get('/invitations/student/:student_id', async (req, res) => {
  const { student_id } = req.params;

  try {
    const invitesRes = await db.query(
      `SELECT ci.id AS invitation_id, ci.invited_at, ci.status,
              c.id AS course_id, c.course_name, c.course_code, c.section, c.time_in, c.time_out, c.day_of_week,
              t.full_name AS teacher_name
       FROM course_invitations ci
       JOIN courses c ON ci.course_id = c.id
       JOIN teachers t ON ci.invited_by = t.id
       WHERE ci.student_id = $1 AND ci.status = 'PENDING'
       ORDER BY ci.invited_at DESC`,
      [student_id]
    );

    return res.json({ success: true, invitations: invitesRes.rows });
  } catch (error) {
    console.error('[Get Student Invites Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve invitations.' });
  }
});

/**
 * POST /api/courses/invitations/respond
 * Student responds to an invitation (ACCEPT or DECLINE).
 */
router.post('/invitations/respond', async (req, res) => {
  const { invitation_id, action } = req.body;

  if (!invitation_id || !['ACCEPT', 'DECLINE'].includes(action)) {
    return res.status(400).json({ success: false, message: 'Valid invitation_id and action (ACCEPT/DECLINE) required.' });
  }

  try {
    const inviteRes = await db.query(
      `SELECT id, course_id, student_id, status FROM course_invitations WHERE id = $1`,
      [invitation_id]
    );

    if (inviteRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invitation not found.' });
    }

    const invite = inviteRes.rows[0];

    if (action === 'ACCEPT') {
      await db.query(
        `INSERT INTO course_enrollments (course_id, student_id, status, enrolled_at)
         VALUES ($1, $2, 'ACTIVE', NOW())
         ON CONFLICT (course_id, student_id) DO UPDATE SET status = 'ACTIVE'`,
        [invite.course_id, invite.student_id]
      );

      await db.query(
        `UPDATE course_invitations
         SET status = 'ACCEPTED', responded_at = NOW()
         WHERE id = $1`,
        [invitation_id]
      );

      return res.json({ success: true, message: 'Course invitation accepted. You are now enrolled.' });
    } else {
      await db.query(
        `UPDATE course_invitations
         SET status = 'DECLINED', responded_at = NOW()
         WHERE id = $1`,
        [invitation_id]
      );

      return res.json({ success: true, message: 'Course invitation declined.' });
    }
  } catch (error) {
    console.error('[Respond Invite Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to process response.' });
  }
});

/**
 * POST /api/courses/join
 * Student joins course using join code (TAPS-XXXXXX).
 */
router.post('/join', async (req, res) => {
  const { join_code, student_id } = req.body;

  if (!join_code || !student_id) {
    return res.status(400).json({ success: false, message: 'join_code and student_id are required.' });
  }

  const cleanCode = join_code.trim().toUpperCase();

  try {
    const courseRes = await db.query(
      `SELECT id, course_name, course_code, is_join_locked FROM courses WHERE join_code = $1`,
      [cleanCode]
    );

    if (courseRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Invalid course join code.' });
    }

    const course = courseRes.rows[0];

    if (course.is_join_locked) {
      return res.status(403).json({ success: false, message: 'Enrollment for this course is currently locked by the instructor.' });
    }

    // Resolve student record (dual: students.id or users.id)
    let studentCheck = await db.query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (studentCheck.rowCount === 0) {
      studentCheck = await db.query('SELECT id FROM students WHERE user_id = $1', [student_id]);
    }

    if (studentCheck.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Student record not found. Please sign out and sign back in.' });
    }

    const resolvedStudentId = studentCheck.rows[0].id;

    const enrollmentCheck = await db.query(
      `SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2`,
      [course.id, resolvedStudentId]
    );

    if (enrollmentCheck.rowCount > 0) {
      return res.status(409).json({ success: false, message: 'You are already enrolled in this course.' });
    }

    await db.query(
      `INSERT INTO course_enrollments (course_id, student_id, status, enrolled_at)
       VALUES ($1, $2, 'ACTIVE', NOW())`,
      [course.id, resolvedStudentId]
    );

    return res.status(201).json({
      success: true,
      message: `Enrolled successfully into ${course.course_name} (${course.course_code}).`,
      course
    });
  } catch (error) {
    console.error('[Course Join Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to join course.' });
  }
});

/**
 * GET /api/courses/teacher/:teacher_id
 * Retrieves all courses taught by a teacher.
 * Accepts both teachers.id and users.id (dual resolution).
 */
router.get('/teacher/:teacher_id', async (req, res) => {
  const { teacher_id } = req.params;

  try {
    // Dual-resolve teacher
    let teacherCheck = await db.query('SELECT id FROM teachers WHERE id = $1', [teacher_id]);
    if (teacherCheck.rowCount === 0) {
      teacherCheck = await db.query('SELECT id FROM teachers WHERE user_id = $1', [teacher_id]);
    }

    if (teacherCheck.rowCount === 0) {
      return res.json({ success: true, courses: [] });
    }

    const resolvedTeacherId = teacherCheck.rows[0].id;

    const coursesRes = await db.query(
      `SELECT c.*, ct.role AS teacher_role,
              COUNT(DISTINCT ce.student_id)::int AS enrolled_count
       FROM courses c
       JOIN course_teachers ct ON c.id = ct.course_id
       LEFT JOIN course_enrollments ce ON c.id = ce.course_id AND ce.status = 'ACTIVE'
       WHERE ct.teacher_id = $1
       GROUP BY c.id, ct.role
       ORDER BY c.created_at DESC`,
      [resolvedTeacherId]
    );

    return res.json({ success: true, courses: coursesRes.rows });
  } catch (error) {
    console.error('[Get Teacher Courses Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve courses.' });
  }
});

/**
 * GET /api/courses/student/:student_id
 * Retrieves all courses a student is actively enrolled in.
 */
router.get('/student/:student_id', async (req, res) => {
  const { student_id } = req.params;

  try {
    // Dual-resolve student
    let studentCheck = await db.query('SELECT id FROM students WHERE id = $1', [student_id]);
    if (studentCheck.rowCount === 0) {
      studentCheck = await db.query('SELECT id FROM students WHERE user_id = $1', [student_id]);
    }

    if (studentCheck.rowCount === 0) {
      return res.json({ success: true, courses: [] });
    }

    const resolvedStudentId = studentCheck.rows[0].id;

    const coursesRes = await db.query(
      `SELECT c.*, t.full_name AS teacher_name, ce.enrolled_at
       FROM courses c
       JOIN course_enrollments ce ON c.id = ce.course_id
       LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.role = 'PRIMARY'
       LEFT JOIN teachers t ON ct.teacher_id = t.id
       WHERE ce.student_id = $1 AND ce.status = 'ACTIVE'
       ORDER BY c.course_name ASC`,
      [resolvedStudentId]
    );

    return res.json({ success: true, courses: coursesRes.rows });
  } catch (error) {
    console.error('[Get Student Courses Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve enrolled courses.' });
  }
});

/**
 * GET /api/courses/:course_id/roster
 * Retrieves enrolled student roster for a course.
 */
router.get('/:course_id/roster', async (req, res) => {
  const { course_id } = req.params;

  try {
    const rosterRes = await db.query(
      `SELECT s.id AS student_id, s.full_name, s.student_id AS student_number,
              s.program, s.year_level, u.email, ce.enrolled_at,
              COALESCE(att.attended_count, 0)::int AS attended_sessions_count
       FROM course_enrollments ce
       JOIN students s ON ce.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN (
         SELECT student_id, COUNT(DISTINCT session_id) AS attended_count
         FROM attendance_logs
         GROUP BY student_id
       ) att ON s.id = att.student_id
       WHERE ce.course_id = $1 AND ce.status = 'ACTIVE'
       ORDER BY s.full_name ASC`,
      [course_id]
    );

    return res.json({ success: true, roster: rosterRes.rows });
  } catch (error) {
    console.error('[Get Roster Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve roster.' });
  }
});

module.exports = router;
