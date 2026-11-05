const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const db = require('../config/db');

/**
 * GET /api/reports/course/:course_id/excel
 * Exports complete course attendance roster as .xlsx spreadsheet.
 */
router.get('/course/:course_id/excel', async (req, res) => {
  const { course_id } = req.params;

  try {
    // 1. Fetch course details
    const courseRes = await db.query(
      `SELECT c.*, t.full_name AS teacher_name 
       FROM courses c
       LEFT JOIN course_teachers ct ON c.id = ct.course_id AND ct.role = 'PRIMARY'
       LEFT JOIN teachers t ON ct.teacher_id = t.id
       WHERE c.id = $1`,
      [course_id]
    );

    if (courseRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const course = courseRes.rows[0];

    // 2. Fetch attendance logs for all sessions of this course
    const logsRes = await db.query(
      `SELECT al.scanned_at, al.status,
              s.student_id AS student_number, s.full_name, s.program, s.year_level,
              u.email, sess.started_at AS session_date
       FROM attendance_logs al
       JOIN attendance_sessions sess ON al.session_id = sess.id
       JOIN students s ON al.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE sess.course_id = $1
       ORDER BY al.scanned_at DESC`,
      [course_id]
    );

    // 3. Construct Excel Workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TapsLog Smart Attendance';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Course Attendance');

    // Header styling
    sheet.columns = [
      { header: 'Student ID', key: 'student_number', width: 16 },
      { header: 'Full Name', key: 'full_name', width: 28 },
      { header: 'Program', key: 'program', width: 18 },
      { header: 'Year Level', key: 'year_level', width: 12 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Session Date', key: 'session_date', width: 20 },
      { header: 'Scanned At', key: 'scanned_at', width: 20 },
      { header: 'Status', key: 'status', width: 14 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' } // UA Blue
    };

    logsRes.rows.forEach(row => {
      sheet.addRow({
        student_number: row.student_number,
        full_name: row.full_name,
        program: row.program || 'N/A',
        year_level: row.year_level || 'N/A',
        email: row.email,
        session_date: row.session_date ? new Date(row.session_date).toLocaleDateString() : 'N/A',
        scanned_at: row.scanned_at ? new Date(row.scanned_at).toLocaleTimeString() : 'N/A',
        status: row.status
      });
    });

    const filename = `Attendance_${course.course_code}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Course Excel Export Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate course Excel report.' });
  }
});

/**
 * GET /api/reports/rso-event/:event_id/excel
 * Exports RSO event attendance log as .xlsx.
 */
router.get('/rso-event/:event_id/excel', async (req, res) => {
  const { event_id } = req.params;

  try {
    const eventRes = await db.query(
      `SELECT e.*, r.name AS rso_name, r.abbreviation 
       FROM rso_events e
       JOIN rso_entities r ON e.rso_id = r.id
       WHERE e.id = $1`,
      [event_id]
    );

    if (eventRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'RSO event not found.' });
    }

    const event = eventRes.rows[0];

    const logsRes = await db.query(
      `SELECT ea.tapped_at, u.email,
              COALESCE(s.full_name, t.full_name, 'N/A') AS full_name,
              s.student_id AS student_number, s.program
       FROM rso_event_attendance ea
       JOIN users u ON ea.user_id = u.id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN teachers t ON u.id = t.user_id
       WHERE ea.event_id = $1
       ORDER BY ea.tapped_at ASC`,
      [event_id]
    );

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Event Tap List');

    sheet.columns = [
      { header: 'Student ID', key: 'student_number', width: 16 },
      { header: 'Full Name', key: 'full_name', width: 28 },
      { header: 'Program', key: 'program', width: 18 },
      { header: 'Email Address', key: 'email', width: 30 },
      { header: 'Tapped At', key: 'tapped_at', width: 22 }
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF065F46' } // Emerald Green
    };

    logsRes.rows.forEach(r => {
      sheet.addRow({
        student_number: r.student_number || 'N/A',
        full_name: r.full_name,
        program: r.program || 'N/A',
        email: r.email,
        tapped_at: r.tapped_at ? new Date(r.tapped_at).toLocaleString() : 'N/A'
      });
    });

    const filename = `RSO_Event_${event.abbreviation}_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[RSO Event Excel Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate event report.' });
  }
});

/**
 * GET /api/reports/master/excel
 * Master administrative Excel export across entire university registry.
 */
router.get('/master/excel', async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'TapsLog Master Audit';

    // 1. Users Sheet
    const usersSheet = workbook.addWorksheet('All Users');
    usersSheet.columns = [
      { header: 'Email', key: 'email', width: 32 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Name', key: 'name', width: 28 },
      { header: 'NFC Bound?', key: 'has_nfc', width: 14 },
      { header: 'Created At', key: 'created_at', width: 22 }
    ];
    usersSheet.getRow(1).font = { bold: true };

    const usersRes = await db.query(
      `SELECT u.email, u.role, u.created_at,
              COALESCE(t.full_name, s.full_name, 'System') AS name,
              CASE WHEN nc.id IS NOT NULL THEN 'YES' ELSE 'NO' END AS has_nfc
       FROM users u
       LEFT JOIN teachers t ON u.id = t.user_id
       LEFT JOIN students s ON u.id = s.user_id
       LEFT JOIN nfc_cards nc ON u.id = nc.user_id AND nc.is_active = TRUE
       ORDER BY u.created_at DESC`
    );

    usersRes.rows.forEach(u => {
      usersSheet.addRow({
        email: u.email,
        role: u.role,
        name: u.name,
        has_nfc: u.has_nfc,
        created_at: new Date(u.created_at).toLocaleString()
      });
    });

    const filename = `TapsLog_Master_Export_${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('[Master Excel Export Error]:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate master report.' });
  }
});

module.exports = router;