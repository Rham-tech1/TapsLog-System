/**
 * mockData.js — Master Data for TapsLog
 * Contains user-specified test schedule, authorized faculty, and enrolled student registry.
 */

// ─── Faculty Database ────────────────────────────────────────────────────────
export const AUTHORIZED_FACULTY = [
  {
    faculty_id: 'FAC-MADALIPAY',
    card_uid: 'TCH-MAD-03',
    name: 'Mark Anthony Madalipay',
    department: 'College of Information Technology',
    email: 'm.madalipay@school.edu',
    title: 'Assistant Professor',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-ALFON',
    card_uid: 'TCH-ALFON-01',
    name: 'Mariecar Alfon',
    department: 'College of Information Technology',
    email: 'm.alfon@school.edu',
    title: 'Assistant Professor',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-DAVID',
    card_uid: 'TCH-DAVID-02',
    name: 'Richard Reine David',
    department: 'College of Information Technology',
    email: 'r.david@school.edu',
    title: 'Associate Professor',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-MABABA',
    card_uid: 'TCH-MAB-04',
    name: 'Jonilo Mababa',
    department: 'College of Information Technology',
    email: 'j.mababa@school.edu',
    title: 'Senior Lecturer',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-VELASCO',
    card_uid: 'TCH-VEL-05',
    name: 'Robert Velasco',
    department: 'College of Information Technology',
    email: 'r.velasco@school.edu',
    title: 'Assistant Professor',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-GARCIA',
    card_uid: 'TCH-GAR-06',
    name: 'Romenick Garcia',
    department: 'College of Information Technology',
    email: 'r.garcia@school.edu',
    title: 'Assistant Professor',
    role: 'teacher',
  },
  {
    faculty_id: 'FAC-LAYUG',
    card_uid: 'TCH-LAY-07',
    name: 'Fernand Layug',
    department: 'College of Information Technology',
    email: 'f.layug@school.edu',
    title: 'Department Coordinator',
    role: 'teacher',
  },
];

export const MADALIPAY_TEACHER = AUTHORIZED_FACULTY[0];
export const MOCK_TEACHER = AUTHORIZED_FACULTY[0];

// ─── Enrolled Students Database ──────────────────────────────────────────────
export const MOCK_STUDENT_SECTIONS = [
  'BSIT - WMD 3A',
  'BSIT - WMD 3B',
  'BSIT - DA 3A',
  'BSIT - DA 3B',
];

export const ENROLLED_STUDENTS = [
  {
    student_id: '2023-10492',
    card_uid: 'NFC-8A2F-1101',
    name: 'Juan dela Cruz',
    program: 'BSIT-3A',
    section: 'BSIT - WMD 3A',
    email: 'j.delacruz@student.school.edu',
    year: '3rd Year',
    attendance_rate: 96,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10493',
    card_uid: 'NFC-9B3C-2202',
    name: 'Maria Santos',
    program: 'BSIT-3A',
    section: 'BSIT - WMD 3A',
    email: 'm.santos@student.school.edu',
    year: '3rd Year',
    attendance_rate: 94,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10494',
    card_uid: 'NFC-1C4D-3303',
    name: 'Carlo Reyes',
    program: 'BSIT-3A',
    section: 'BSIT - WMD 3B',
    email: 'c.reyes@student.school.edu',
    year: '3rd Year',
    attendance_rate: 89,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10495',
    card_uid: 'NFC-2D5E-4404',
    name: 'Ana Gonzalez',
    program: 'BSIT-3A',
    section: 'BSIT - WMD 3B',
    email: 'a.gonzalez@student.school.edu',
    year: '3rd Year',
    attendance_rate: 98,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10496',
    card_uid: 'NFC-3E6F-5505',
    name: 'Miguel Torres',
    program: 'BSIT-3A',
    section: 'BSIT - DA 3A',
    email: 'm.torres@student.school.edu',
    year: '3rd Year',
    attendance_rate: 85,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10497',
    card_uid: 'NFC-4F7G-6606',
    name: 'Sofia Lim',
    program: 'BSIT-3A',
    section: 'BSIT - DA 3A',
    email: 's.lim@student.school.edu',
    year: '3rd Year',
    attendance_rate: 92,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10498',
    card_uid: 'NFC-5G8H-7707',
    name: 'Rafael Bautista',
    program: 'BSIT-3A',
    section: 'BSIT - DA 3B',
    email: 'r.bautista@student.school.edu',
    year: '3rd Year',
    attendance_rate: 91,
    status: 'ENROLLED',
  },
  {
    student_id: '2023-10499',
    card_uid: 'NFC-6H9I-8808',
    name: 'Isabella Cruz',
    program: 'BSIT-3A',
    section: 'BSIT - DA 3B',
    email: 'i.cruz@student.school.edu',
    year: '3rd Year',
    attendance_rate: 97,
    status: 'ENROLLED',
  },
];

export const MOCK_STUDENT = ENROLLED_STUDENTS[0];

// ─── Master Class Schedule (Exact User Test Schedule) ─────────────────────────
export const MOCK_SCHEDULES = [
  // ── MONDAY & FRIDAY BLOCK
  {
    session_id: 'ses-mon-01',
    code: 'C-PCIT7LEC',
    subject: 'Computer Networks 2 (C-PCIT7LEC)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Monday',
    start_time: '8:00 AM',
    end_time: '8:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'ACTIVE',
    total_students: 35,
  },
  {
    session_id: 'ses-mon-02',
    code: 'C-PCIT7LAB',
    subject: 'Computer Networks 2 Laboratory (C-PCIT7LAB)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Monday',
    start_time: '8:40 AM',
    end_time: '9:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-mon-03',
    code: 'C-PCIT9A',
    subject: 'Statistical Techniques and Data Analytics (C-PCIT9A)',
    section: 'BSIT-3A',
    room: 'C305',
    day_of_week: 'Monday',
    start_time: '11:00 AM',
    end_time: '12:00 PM',
    instructor: 'Richard Reine David',
    status: 'PENDING',
    total_students: 38,
  },
  {
    session_id: 'ses-mon-04',
    code: 'C-PCIT10LEC',
    subject: 'Information Assurance and Security 1 Lecture (C-PCIT10LEC)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Monday',
    start_time: '1:00 PM',
    end_time: '1:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },
  {
    session_id: 'ses-mon-05',
    code: 'C-PCIT10LAB',
    subject: 'Information Assurance and Security 1 Laboratory (C-PCIT10LAB)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Monday',
    start_time: '1:40 PM',
    end_time: '2:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },

  // ── TUESDAY BLOCK (TTH + TW)
  {
    session_id: 'ses-tue-01',
    code: 'C-PEITEL1BLEC',
    subject: 'Cloud Computing Lecture (C-PEITEL1BLEC)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Tuesday',
    start_time: '8:00 AM',
    end_time: '9:00 AM',
    instructor: 'Jonilo Mababa',
    status: 'PENDING',
    total_students: 32,
  },
  {
    session_id: 'ses-tue-02',
    code: 'C-PEITEL1BLAB',
    subject: 'Cloud Computing Laboratory (C-PEITEL1BLAB)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Tuesday',
    start_time: '9:00 AM',
    end_time: '10:30 AM',
    instructor: 'Jonilo Mababa',
    status: 'PENDING',
    total_students: 32,
  },
  {
    session_id: 'ses-tue-03',
    code: 'C-PCIT9LEC',
    subject: 'Systems Integration and Architecture Lecture (C-PCIT9LEC)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Tuesday',
    start_time: '10:30 AM',
    end_time: '11:30 AM',
    instructor: 'Robert Velasco',
    status: 'PENDING',
    total_students: 34,
  },
  {
    session_id: 'ses-tue-04',
    code: 'C-PCIT9LAB',
    subject: 'Systems Integration and Architecture Laboratory (C-PCIT9LAB)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Tuesday',
    start_time: '11:30 AM',
    end_time: '1:00 PM',
    instructor: 'Robert Velasco',
    status: 'PENDING',
    total_students: 34,
  },
  {
    session_id: 'ses-tue-05',
    code: 'C-PCIT8B',
    subject: 'Advanced Database System (C-PCIT8B)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Tuesday',
    start_time: '1:00 PM',
    end_time: '2:30 PM',
    instructor: 'Romenick Garcia',
    status: 'PENDING',
    total_students: 30,
  },
  {
    session_id: 'ses-tue-06',
    code: 'C-PCITEL2BLEC',
    subject: 'Dynamic Web Application and Development Lecture (C-PCITEL2BLEC)',
    section: 'BSIT-3A',
    room: 'P312',
    day_of_week: 'Tuesday',
    start_time: '3:00 PM',
    end_time: '4:00 PM',
    instructor: 'Fernand Layug',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-tue-07',
    code: 'C-PCITEL2BLAB',
    subject: 'Dynamic Web Application and Development Laboratory (C-PCITEL2BLAB)',
    section: 'BSIT-3A',
    room: 'P312',
    day_of_week: 'Tuesday',
    start_time: '4:00 PM',
    end_time: '5:30 PM',
    instructor: 'Fernand Layug',
    status: 'PENDING',
    total_students: 35,
  },

  // ── WEDNESDAY BLOCK
  {
    session_id: 'ses-wed-01',
    code: 'C-PCITEL2BLEC',
    subject: 'Dynamic Web Application and Development Lecture (C-PCITEL2BLEC)',
    section: 'BSIT-3A',
    room: 'P312',
    day_of_week: 'Wednesday',
    start_time: '3:00 PM',
    end_time: '4:00 PM',
    instructor: 'Fernand Layug',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-wed-02',
    code: 'C-PCITEL2BLAB',
    subject: 'Dynamic Web Application and Development Laboratory (C-PCITEL2BLAB)',
    section: 'BSIT-3A',
    room: 'P312',
    day_of_week: 'Wednesday',
    start_time: '4:00 PM',
    end_time: '5:30 PM',
    instructor: 'Fernand Layug',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-wed-03',
    code: 'C-PCIT7LEC',
    subject: 'Computer Networks 2 Lecture (C-PCIT7LEC)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Wednesday',
    start_time: '8:00 AM',
    end_time: '8:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-wed-04',
    code: 'C-PCIT7LAB',
    subject: 'Computer Networks 2 Laboratory (C-PCIT7LAB)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Wednesday',
    start_time: '8:40 AM',
    end_time: '9:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-wed-05',
    code: 'C-PCIT9A',
    subject: 'Statistical Techniques and Data Analytics (C-PCIT9A)',
    section: 'BSIT-3A',
    room: 'C305',
    day_of_week: 'Wednesday',
    start_time: '11:00 AM',
    end_time: '12:00 PM',
    instructor: 'Richard Reine David',
    status: 'PENDING',
    total_students: 38,
  },
  {
    session_id: 'ses-wed-06',
    code: 'C-PCIT10LEC',
    subject: 'Information Assurance and Security 1 Lecture (C-PCIT10LEC)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Wednesday',
    start_time: '1:00 PM',
    end_time: '1:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },
  {
    session_id: 'ses-wed-07',
    code: 'C-PCIT10LAB',
    subject: 'Information Assurance and Security 1 Laboratory (C-PCIT10LAB)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Wednesday',
    start_time: '1:40 PM',
    end_time: '2:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },

  // ── THURSDAY BLOCK (TTH)
  {
    session_id: 'ses-thu-01',
    code: 'C-PEITEL1BLEC',
    subject: 'Cloud Computing Lecture (C-PEITEL1BLEC)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Thursday',
    start_time: '8:00 AM',
    end_time: '9:00 AM',
    instructor: 'Jonilo Mababa',
    status: 'PENDING',
    total_students: 32,
  },
  {
    session_id: 'ses-thu-02',
    code: 'C-PEITEL1BLAB',
    subject: 'Cloud Computing Laboratory (C-PEITEL1BLAB)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Thursday',
    start_time: '9:00 AM',
    end_time: '10:30 AM',
    instructor: 'Jonilo Mababa',
    status: 'PENDING',
    total_students: 32,
  },
  {
    session_id: 'ses-thu-03',
    code: 'C-PCIT9LEC',
    subject: 'Systems Integration and Architecture Lecture (C-PCIT9LEC)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Thursday',
    start_time: '10:30 AM',
    end_time: '11:30 AM',
    instructor: 'Robert Velasco',
    status: 'PENDING',
    total_students: 34,
  },
  {
    session_id: 'ses-thu-04',
    code: 'C-PCIT9LAB',
    subject: 'Systems Integration and Architecture Laboratory (C-PCIT9LAB)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Thursday',
    start_time: '11:30 AM',
    end_time: '1:00 PM',
    instructor: 'Robert Velasco',
    status: 'PENDING',
    total_students: 34,
  },
  {
    session_id: 'ses-thu-05',
    code: 'C-PCIT8B',
    subject: 'Advanced Database System (C-PCIT8B)',
    section: 'BSIT-3A',
    room: 'P311',
    day_of_week: 'Thursday',
    start_time: '1:00 PM',
    end_time: '2:30 PM',
    instructor: 'Romenick Garcia',
    status: 'PENDING',
    total_students: 30,
  },

  // ── FRIDAY BLOCK
  {
    session_id: 'ses-fri-01',
    code: 'C-PCIT7LEC',
    subject: 'Computer Networks 2 (C-PCIT7LEC)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Friday',
    start_time: '8:00 AM',
    end_time: '8:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-fri-02',
    code: 'C-PCIT7LAB',
    subject: 'Computer Networks 2 Laboratory (C-PCIT7LAB)',
    section: 'BSIT-3A',
    room: 'C301',
    day_of_week: 'Friday',
    start_time: '8:40 AM',
    end_time: '9:40 AM',
    instructor: 'Mariecar Alfon',
    status: 'PENDING',
    total_students: 35,
  },
  {
    session_id: 'ses-fri-03',
    code: 'C-PCIT9A',
    subject: 'Statistical Techniques and Data Analytics (C-PCIT9A)',
    section: 'BSIT-3A',
    room: 'C305',
    day_of_week: 'Friday',
    start_time: '11:00 AM',
    end_time: '12:00 PM',
    instructor: 'Richard Reine David',
    status: 'PENDING',
    total_students: 38,
  },
  {
    session_id: 'ses-fri-04',
    code: 'C-PCIT10LEC',
    subject: 'Information Assurance and Security 1 Lecture (C-PCIT10LEC)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Friday',
    start_time: '1:00 PM',
    end_time: '1:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },
  {
    session_id: 'ses-fri-05',
    code: 'C-PCIT10LAB',
    subject: 'Information Assurance and Security 1 Laboratory (C-PCIT10LAB)',
    section: 'BSIT-3A',
    room: 'C302',
    day_of_week: 'Friday',
    start_time: '1:40 PM',
    end_time: '2:40 PM',
    instructor: 'Mark Anthony Madalipay',
    status: 'PENDING',
    total_students: 36,
  },
];

export const MOCK_SCHEDULE_RESPONSE = {
  current_class: MOCK_SCHEDULES.find((s) => s.instructor === 'Mark Anthony Madalipay') || MOCK_SCHEDULES[0],
  next_class: MOCK_SCHEDULES.find((s) => s.instructor === 'Mark Anthony Madalipay' && s.session_id.includes('lab')) || MOCK_SCHEDULES[1],
  all_schedules: MOCK_SCHEDULES,
};

/**
 * Filter schedule strictly for a given teacher (by name, ID, or card UID)
 * Ensures no teacher can access or view another professor's subjects.
 */
export function getScheduleForTeacher(teacherQuery) {
  if (!teacherQuery) {
    const defaultClasses = MOCK_SCHEDULES.filter((s) => s.instructor === 'Mark Anthony Madalipay');
    return {
      current_class: defaultClasses[0] || null,
      next_class: defaultClasses[1] || null,
      all_schedules: defaultClasses,
    };
  }

  const query = String(teacherQuery).toLowerCase().trim();

  // 1. Resolve faculty member
  const faculty = AUTHORIZED_FACULTY.find(
    (f) =>
      f.faculty_id.toLowerCase() === query ||
      f.card_uid.toLowerCase() === query ||
      f.name.toLowerCase() === query ||
      f.name.toLowerCase().includes(query) ||
      query.includes(f.name.toLowerCase())
  );

  const teacherName = faculty ? faculty.name : teacherQuery;

  // 2. Strict filter: only subjects assigned to this instructor
  const teacherClasses = MOCK_SCHEDULES.filter((s) =>
    s.instructor.toLowerCase().includes(teacherName.toLowerCase()) ||
    teacherName.toLowerCase().includes(s.instructor.toLowerCase())
  );

  const current = teacherClasses.find((s) => s.status === 'ACTIVE') || teacherClasses[0] || null;
  const next = teacherClasses.find((s) => s.session_id !== current?.session_id) || null;

  return {
    current_class: current,
    next_class: next,
    all_schedules: teacherClasses,
  };
}

// ─── Mock Tap Events ─────────────────────────────────────────────────────────
const STATUS_OPTIONS = ['PRESENT', 'PRESENT', 'PRESENT', 'LATE', 'PRESENT'];

export function makeMockScanEvent(index = 0) {
  const student = ENROLLED_STUDENTS[index % ENROLLED_STUDENTS.length];
  const status = STATUS_OPTIONS[index % STATUS_OPTIONS.length];
  const minutesAgo = index * 2;
  const scanned_at = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();

  return {
    success: true,
    action: status === 'PRESENT' ? 'STUDENT_TIME_IN' : status === 'LATE' ? 'STUDENT_TIME_IN' : 'STUDENT_TIME_OUT',
    status,
    student: student.name,
    student_id: student.student_id,
    program: student.program,
    session_id: 'ses-mon-01',
    scanned_at,
  };
}

export function generateInitialFeed() {
  return [];
}
