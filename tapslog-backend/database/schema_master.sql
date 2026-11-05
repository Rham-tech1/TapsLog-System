-- ============================================================
--  TapsLog Master Schema â€” Phase 3
--  University of Assumption Smart Attendance & NFC System
--
--  File   : database/schema_master.sql
--  Author : TapsLog Dev Team
--  Safe   : Fully idempotent â€” safe to re-run on existing DB
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE 1: users
-- Core identity table. Supports STUDENT, TEACHER, and ADMIN.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  email           VARCHAR(255)  UNIQUE NOT NULL,
  password_hash   VARCHAR(255)  NOT NULL,
  role            VARCHAR(20)   NOT NULL DEFAULT 'STUDENT',
  nfc_card_id     UUID,
  show_rso_badge  BOOLEAN       DEFAULT TRUE,
  created_at      TIMESTAMPTZ   DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Drop old role constraint (may not include ADMIN), re-add with ADMIN
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('STUDENT', 'TEACHER', 'ADMIN'));

-- ============================================================
-- TABLE 2: teachers
-- Linked profile for users with role TEACHER.
-- ============================================================
CREATE TABLE IF NOT EXISTS teachers (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(255)  NOT NULL,
  department    VARCHAR(100),
  employee_id   VARCHAR(50)   UNIQUE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE 3: students
-- Linked profile for users with role STUDENT.
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name     VARCHAR(255)  NOT NULL,
  student_id    VARCHAR(50)   UNIQUE NOT NULL,
  program       VARCHAR(100),
  year_level    INT           CHECK (year_level BETWEEN 1 AND 6),
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE 4: nfc_cards
-- Binds 1 physical NFC card to 1 user (immutable after binding).
-- card_uid_hash  = SHA-256 hex of raw UID (fast lookup)
-- card_uid_encrypted = AES-256-GCM ciphertext (secure storage)
-- ============================================================
CREATE TABLE IF NOT EXISTS nfc_cards (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uid_hash       VARCHAR(64)   UNIQUE NOT NULL,
  card_uid_encrypted  TEXT          NOT NULL,
  is_active           BOOLEAN       DEFAULT TRUE,
  bound_at            TIMESTAMPTZ   DEFAULT NOW(),
  created_at          TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE 5: courses
-- Google-Classroom-style courses with TAPS join codes.
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_code     VARCHAR(50)   UNIQUE NOT NULL,
  course_name     VARCHAR(255)  NOT NULL,
  join_code       VARCHAR(20)   UNIQUE,
  section         VARCHAR(50),
  semester        VARCHAR(20),
  academic_year   VARCHAR(20),
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- Phase 3 additions: schedule columns (safe, idempotent)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS time_in      TIME;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS time_out     TIME;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS day_of_week  VARCHAR(50);
-- day_of_week stores comma-separated values e.g. 'Monday,Wednesday,Friday'

-- ============================================================
-- TABLE 6: course_teachers
-- Assigns teachers to courses with role (PRIMARY/CO_TEACHER/OBSERVER).
-- Only PRIMARY teacher can operate NFC scanner (Option A1).
-- ============================================================
CREATE TABLE IF NOT EXISTS course_teachers (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id  UUID          NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  role        VARCHAR(20)   DEFAULT 'PRIMARY' CHECK (role IN ('PRIMARY', 'CO_TEACHER', 'OBSERVER')),
  created_at  TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (course_id, teacher_id)
);

-- ============================================================
-- TABLE 7: course_enrollments
-- Active student-course memberships (joined via TAPS code or invite).
-- ============================================================
CREATE TABLE IF NOT EXISTS course_enrollments (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id  UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ   DEFAULT NOW(),
  status      VARCHAR(20)   DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DROPPED', 'COMPLETED')),
  UNIQUE (course_id, student_id)
);

-- ============================================================
-- TABLE 8: enrollment_invitations  [NEW â€” Phase 3]
-- GSuite-style teacher-to-student course invitations.
-- Student accepts/declines from their portal.
-- ============================================================
CREATE TABLE IF NOT EXISTS enrollment_invitations (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id     UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  student_id    UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  invited_by    UUID          NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  status        VARCHAR(20)   DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
  invited_at    TIMESTAMPTZ   DEFAULT NOW(),
  responded_at  TIMESTAMPTZ,
  UNIQUE (course_id, student_id)
);

-- ============================================================
-- TABLE 9: attendance_sessions
-- A teacher-opened NFC scan window for a specific course.
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id   UUID          NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id  UUID          NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ   DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  is_active   BOOLEAN       DEFAULT TRUE,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE 10: attendance_logs
-- One row per NFC tap event. Linked to session, student, card hash.
-- Uses card_uid_hash for O(1) lookup â€” no decryption needed.
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance_logs (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID          NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  student_id      UUID          NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  card_uid_hash   VARCHAR(64)   NOT NULL,
  scanned_at      TIMESTAMPTZ   DEFAULT NOW(),
  status          VARCHAR(20)   DEFAULT 'PRESENT' CHECK (status IN ('PRESENT', 'LATE', 'ABSENT'))
);

-- ============================================================
-- TABLE 11: rso_entities
-- Registered Student Organizations (seeded with 3 defaults).
-- ============================================================
CREATE TABLE IF NOT EXISTS rso_entities (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100)  UNIQUE NOT NULL,
  abbreviation  VARCHAR(20)   UNIQUE NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- Phase 3 additions: advisor claim columns
ALTER TABLE rso_entities ADD COLUMN IF NOT EXISTS advisor_passcode  VARCHAR(100) UNIQUE;
ALTER TABLE rso_entities ADD COLUMN IF NOT EXISTS advisor_id        UUID REFERENCES users(id) ON DELETE SET NULL;

-- ============================================================
-- TABLE 12: rso_memberships
-- Tracks which users belong to which RSO and at what rank.
-- ============================================================
CREATE TABLE IF NOT EXISTS rso_memberships (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  rso_id      UUID          NOT NULL REFERENCES rso_entities(id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position    VARCHAR(50)   DEFAULT 'Member',
  joined_at   TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (rso_id, user_id)
);

-- Drop old position constraint (if any), add hierarchy constraint
ALTER TABLE rso_memberships DROP CONSTRAINT IF EXISTS rso_memberships_position_check;
ALTER TABLE rso_memberships
  ADD CONSTRAINT rso_memberships_position_check
  CHECK (position IN ('Member', 'Committee Head', 'Vice President', 'President', 'Adviser'));

-- ============================================================
-- TABLE 12b: rso_positions [PHASE 3.1 — Two-Tier Hierarchy]
-- Defines named positions within an RSO with tier classification.
-- tier: 'EXECUTIVE' (President, VP, Secretary, Treasurer, Auditor)
--       'COORDINATING' (sub-roles under an executive lead)
-- ============================================================
CREATE TABLE IF NOT EXISTS rso_positions (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  rso_id            UUID          NOT NULL REFERENCES rso_entities(id) ON DELETE CASCADE,
  position_title    VARCHAR(100)  NOT NULL,
  tier              VARCHAR(20)   NOT NULL DEFAULT 'EXECUTIVE'
                      CHECK (tier IN ('EXECUTIVE', 'COORDINATING')),
  parent_officer_id UUID          REFERENCES rso_positions(id) ON DELETE SET NULL,
  holder_user_id    UUID          REFERENCES users(id) ON DELETE SET NULL,
  is_custom         BOOLEAN       DEFAULT FALSE,
  sort_order        INT           DEFAULT 99,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);
ALTER TABLE rso_positions DROP CONSTRAINT IF EXISTS rso_positions_title_rso_unique;
ALTER TABLE rso_positions ADD CONSTRAINT rso_positions_title_rso_unique UNIQUE (rso_id, position_title);

-- Default executive positions seeded per RSO when created
CREATE INDEX IF NOT EXISTS idx_rso_positions_rso_id ON rso_positions(rso_id);

-- ============================================================
-- TABLE 13: rso_events  [NEW â€” Phase 3]
-- Events organized by an RSO, with NFC attendance terminal.
-- ============================================================
CREATE TABLE IF NOT EXISTS rso_events (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  rso_id        UUID          NOT NULL REFERENCES rso_entities(id) ON DELETE CASCADE,
  name          VARCHAR(255)  NOT NULL,
  description   TEXT,
  event_date    DATE          NOT NULL,
  event_time    TIME,
  location      VARCHAR(255),
  created_by    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- TABLE 14: rso_event_attendance  [NEW â€” Phase 3]
-- NFC tap log for RSO events. One tap per user per event.
-- ============================================================
CREATE TABLE IF NOT EXISTS rso_event_attendance (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id        UUID          NOT NULL REFERENCES rso_events(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_uid_hash   VARCHAR(64),
  tapped_at       TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (event_id, user_id)
);

-- ============================================================
-- TABLE 15: admin_audit_logs  [NEW â€” Phase 3]
-- Immutable log of every admin action (unbind, role change, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action          VARCHAR(100)  NOT NULL,
  target_user_id  UUID          REFERENCES users(id) ON DELETE SET NULL,
  details         JSONB,
  performed_at    TIMESTAMPTZ   DEFAULT NOW()
);

-- ============================================================
-- PERFORMANCE INDEXES
-- Critical for fast NFC hash lookup and report queries.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email);

CREATE INDEX IF NOT EXISTS idx_nfc_cards_uid_hash
  ON nfc_cards(card_uid_hash);

CREATE INDEX IF NOT EXISTS idx_nfc_cards_user_id
  ON nfc_cards(user_id);

CREATE INDEX IF NOT EXISTS idx_nfc_cards_active
  ON nfc_cards(user_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_attendance_logs_session
  ON attendance_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_student
  ON attendance_logs(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_logs_hash
  ON attendance_logs(card_uid_hash);

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active
  ON attendance_sessions(course_id) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course
  ON course_enrollments(course_id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_student
  ON course_enrollments(student_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_invitations_student
  ON enrollment_invitations(student_id);

CREATE INDEX IF NOT EXISTS idx_enrollment_invitations_status
  ON enrollment_invitations(student_id, status);

CREATE INDEX IF NOT EXISTS idx_rso_memberships_user
  ON rso_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_rso_memberships_rso
  ON rso_memberships(rso_id);

CREATE INDEX IF NOT EXISTS idx_rso_event_attendance_event
  ON rso_event_attendance(event_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_admin
  ON admin_audit_logs(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_time
  ON admin_audit_logs(performed_at DESC);

-- ============================================================
-- SEED DATA â€” RSO Entities
-- (ON CONFLICT = safe to re-run, won't duplicate)
-- ============================================================
INSERT INTO rso_entities (name, abbreviation, description, advisor_passcode)
VALUES
  (
    'UA Association for Computing Machinery',
    'UA-ACM',
    'Computing and technology organization of University of Assumption',
    'UA-ACM-ADVISOR-2026'
  ),
  (
    'Junior Philippine Computer Society',
    'JPCS',
    'Official student organization for Computer Science and IT students',
    'JPCS-ADVISOR-2026'
  ),
  (
    'Google Developer Student Club - UA',
    'GDSC-UA',
    'Google-supported developer community at University of Assumption',
    'GDSC-UA-ADVISOR-2026'
  )
ON CONFLICT (abbreviation) DO UPDATE
  SET advisor_passcode = EXCLUDED.advisor_passcode;

-- ============================================================
-- SEED DATA â€” Root Admin Account
--
-- Email    : admin@ua.edu.ph
-- Password : TapsAdmin2026!
--
-- Hash below is bcrypt (cost 12) of 'TapsAdmin2026!'
-- âš ï¸  CHANGE THIS PASSWORD immediately after first login!
-- ============================================================
INSERT INTO users (email, password_hash, role)
VALUES (
  'admin@ua.edu.ph',
  '$2b$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- VERIFICATION QUERY
-- Run this after the script to confirm all 15 tables exist.
-- ============================================================
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;