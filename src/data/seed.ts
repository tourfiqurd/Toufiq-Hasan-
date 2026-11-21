import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE } from '../lib/grading/scale';
import type { AcademiaDatabase, Mark, ResultPublication, Student, Submission, User } from '../types/domain';

export function hashPasswordSync(plain: string): string {
  // Deterministic client-side digest tag for demo verification; passwords are never displayed in UI
  let h = 5381;
  for (let i = 0; i < plain.length; i += 1) {
    h = (h * 33) ^ plain.charCodeAt(i);
  }
  return `scrypt_demo$${Math.abs(h >>> 0).toString(16)}`;
}

const BD_BOYS_FIRST = [
  'তানভীর', 'রাফি', 'মাহমুদুল', 'সাকিব', 'নাফিস', 'আরিফ', 'জাহিদ', 'ফারহান', 'সাইফুল', 'মেহেদী',
  'আশিক', 'ইমরান', 'রাকিব', 'সাব্বির', 'ফাহিম', 'তৌহিদ', 'শরিফ', 'মোস্তফা', 'আবির', 'সাদমান',
  'নাবিল', 'তাহমিদ', 'হাসিব', 'শাকিল', 'অনিক', 'কামাল', 'নোমান', 'মুশফিক', 'তাইমুর', 'রেদওয়ান',
];
const BD_GIRLS_FIRST = [
  'নুসরাত', 'তাসনিম', 'ফারজানা', 'মেহেরীন', 'সুমাইয়া', 'জান্নাতুল', 'সাদিয়া', 'তাবাসসুম', 'আফসানা', 'নাবিলা',
  'মাহিমা', 'রাইসা', 'আয়েশা', 'মিম', 'তানিয়া', 'সাবরিনা', 'মারিয়া', 'নাওশিন', 'লামিয়া', 'ইসরাত',
  'প্রিয়ন্তী', 'অর্পিতা', 'রুবাইয়াত', 'মালিহা', 'হুমায়রা', 'নাফিসা', 'ফাতিমা', 'তিথি', 'আনিকা', 'সামিরা',
];
const BD_LAST = [
  'ইসলাম', 'হাসান', 'আহমেদ', 'রহমান', 'হোসেন', 'করিম', 'চৌধুরী', 'মজুমদার', 'তালুকদার', 'সরকার',
  'খান', 'আক্তার', 'সুলতানা', 'জামান', 'আলম', 'বিশ্বাস', 'ভূঁইয়া', 'সিদ্দিকী', 'পারভীন', 'মাহমুদ',
];

function deterministicRand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

export function createSeedDatabase(): AcademiaDatabase {
  const inst1Id = 'inst-1';
  const inst2Id = 'inst-2';
  const inst3Id = 'inst-3';

  const institutions = [
    {
      id: inst1Id,
      code: 'ACD-00001',
      name: 'আদর্শ উচ্চ বিদ্যালয় ও কলেজ',
      type: 'school' as const,
      eiin: '108452',
      address: 'মিরপুর-১০, ঢাকা-১২১৬',
      district: 'ঢাকা',
      phone: '01711-234567',
      email: 'info@adarsha.edu.bd',
      status: 'approved' as const,
      createdAt: '2025-01-12',
    },
    {
      id: inst2Id,
      code: 'ACD-00002',
      name: 'সবুজবাগ ইসলামিয়া আলিম মাদ্রাসা',
      type: 'madrasa' as const,
      eiin: '105918',
      address: 'কান্দিরপাড়, কুমিল্লা-৩৫০০',
      district: 'কুমিল্লা',
      phone: '01819-456123',
      email: 'office@sabujbagmadrasa.edu.bd',
      status: 'approved' as const,
      createdAt: '2025-03-04',
    },
    {
      id: inst3Id,
      code: 'ACD-00003',
      name: 'নবদিগন্ত মডেল কলেজ',
      type: 'college' as const,
      eiin: '132089',
      address: 'জিন্দাবাজার, সিলেট-৩১০০',
      district: 'সিলেট',
      phone: '01912-887766',
      email: 'apply@nabodiganta.edu.bd',
      status: 'pending' as const,
      createdAt: '2026-11-18',
    },
  ];

  const settings = [
    {
      institutionId: inst1Id,
      numeralLocale: 'bn' as const,
      fourthConfig: { ...DEFAULT_FOURTH_CONFIG },
      gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
    },
    {
      institutionId: inst2Id,
      numeralLocale: 'bn' as const,
      fourthConfig: { ...DEFAULT_FOURTH_CONFIG },
      gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
    },
    {
      institutionId: inst3Id,
      numeralLocale: 'bn' as const,
      fourthConfig: { ...DEFAULT_FOURTH_CONFIG },
      gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
    },
  ];

  const users: User[] = [
    {
      id: 'u-super',
      institutionId: null,
      name: 'মোঃ রাশেদুল ইসলাম',
      email: 'superadmin@academia.edu.bd',
      phone: '01700-000001',
      passwordHash: hashPasswordSync('admin123'),
      role: 'super_admin',
      isActive: true,
      createdAt: '2025-01-01',
    },
    {
      id: 'u-principal-1',
      institutionId: inst1Id,
      name: 'অধ্যক্ষ ড. কামরুল হাসান',
      email: 'principal@adarsha.edu.bd',
      phone: '01711-234567',
      passwordHash: hashPasswordSync('principal123'),
      role: 'institution_admin',
      isActive: true,
      createdAt: '2025-01-12',
    },
    {
      id: 'u-principal-2',
      institutionId: inst2Id,
      name: 'মাওলানা শফিকুল ইসলাম',
      email: 'principal@sabujbagmadrasa.edu.bd',
      phone: '01819-456123',
      passwordHash: hashPasswordSync('principal123'),
      role: 'institution_admin',
      isActive: true,
      createdAt: '2025-03-04',
    },
    {
      id: 'u-principal-3',
      institutionId: inst3Id,
      name: 'অধ্যক্ষ ফারহানা ইয়াসমিন',
      email: 'apply@nabodiganta.edu.bd',
      phone: '01912-887766',
      passwordHash: hashPasswordSync('principal123'),
      role: 'institution_admin',
      isActive: false,
      createdAt: '2026-11-18',
    },
    // 4 Teachers in inst1
    {
      id: 'u-t1',
      institutionId: inst1Id,
      name: 'মোঃ আনোয়ার হোসেন',
      email: 'teacher1@adarsha.edu.bd',
      phone: '01712-111222',
      passwordHash: hashPasswordSync('teacher123'),
      role: 'teacher',
      isActive: true,
      createdAt: '2025-01-15',
    },
    {
      id: 'u-t2',
      institutionId: inst1Id,
      name: 'শামীমা আক্তার',
      email: 'teacher2@adarsha.edu.bd',
      phone: '01713-222333',
      passwordHash: hashPasswordSync('teacher123'),
      role: 'teacher',
      isActive: true,
      createdAt: '2025-01-15',
    },
    {
      id: 'u-t3',
      institutionId: inst1Id,
      name: 'সঞ্জয় কুমার রায়',
      email: 'teacher3@adarsha.edu.bd',
      phone: '01714-333444',
      passwordHash: hashPasswordSync('teacher123'),
      role: 'teacher',
      isActive: true,
      createdAt: '2025-01-16',
    },
    {
      id: 'u-t4',
      institutionId: inst1Id,
      name: 'নাজমুন নাহার',
      email: 'teacher4@adarsha.edu.bd',
      phone: '01715-444555',
      passwordHash: hashPasswordSync('teacher123'),
      role: 'teacher',
      isActive: true,
      createdAt: '2025-01-16',
    },
    // Parent user linked to 2 children
    {
      id: 'u-parent-1',
      institutionId: inst1Id,
      name: 'জনাব আব্দুল করিম (অভিভাবক)',
      email: 'parent@adarsha.edu.bd',
      phone: '01720-998877',
      passwordHash: hashPasswordSync('parent123'),
      role: 'parent',
      isActive: true,
      createdAt: '2026-01-10',
    },
  ];

  const academicYears = [
    { id: 'ay-1-2025', institutionId: inst1Id, year: 2025, isCurrent: false },
    { id: 'ay-1-2026', institutionId: inst1Id, year: 2026, isCurrent: true },
    { id: 'ay-2-2026', institutionId: inst2Id, year: 2026, isCurrent: true },
  ];

  // Classes for inst1 (2026 & 2025)
  const classes = [
    { id: 'cls-9-2026', institutionId: inst1Id, academicYear: 2026, name: 'নবম শ্রেণি', code: '09', classTeacherId: 'u-t1' },
    { id: 'cls-6-2026', institutionId: inst1Id, academicYear: 2026, name: 'ষষ্ঠ শ্রেণি', code: '06', classTeacherId: 'u-t2' },
    { id: 'cls-10-2026', institutionId: inst1Id, academicYear: 2026, name: 'দশম শ্রেণি', code: '10', classTeacherId: 'u-t3' },
    { id: 'cls-9-2025', institutionId: inst1Id, academicYear: 2025, name: 'নবম শ্রেণি', code: '09', classTeacherId: 'u-t1' },
    { id: 'cls-2-9-2026', institutionId: inst2Id, academicYear: 2026, name: 'দাখিল নবম', code: 'D09', classTeacherId: null },
  ];

  const sections = [
    { id: 'sec-9a-2026', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', name: 'ক (বিজ্ঞান)' },
    { id: 'sec-9b-2026', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', name: 'খ (ব্যবসায় শিক্ষা)' },
    { id: 'sec-6a-2026', institutionId: inst1Id, academicYear: 2026, classId: 'cls-6-2026', name: 'ক' },
    { id: 'sec-10a-2026', institutionId: inst1Id, academicYear: 2026, classId: 'cls-10-2026', name: 'ক (বিজ্ঞান)' },
    { id: 'sec-9a-2025', institutionId: inst1Id, academicYear: 2025, classId: 'cls-9-2025', name: 'ক' },
    { id: 'sec-2-9a-2026', institutionId: inst2Id, academicYear: 2026, classId: 'cls-2-9-2026', name: 'ক' },
  ];

  // Subjects for Class 9 (2026): Bangla 1st, Bangla 2nd, English 1st, English 2nd, Math, Physics, Higher Math (4th)
  const subjects = [
    {
      id: 'sub-bn1', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'বাংলা ১ম পত্র', code: '101', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-bn2', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'বাংলা ২য় পত্র', code: '102', isFourth: false, passRule: 'total_only' as const,
      hasCq: true, cqFull: 70, cqPass: 0, hasMcq: true, mcqFull: 30, mcqPass: 0,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-en1', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'ইংরেজি ১ম পত্র', code: '107', isFourth: false, passRule: 'total_only' as const,
      hasCq: true, cqFull: 100, cqPass: 0, hasMcq: false, mcqFull: 0, mcqPass: 0,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-en2', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'ইংরেজি ২য় পত্র', code: '108', isFourth: false, passRule: 'total_only' as const,
      hasCq: true, cqFull: 100, cqPass: 0, hasMcq: false, mcqFull: 0, mcqPass: 0,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-math', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'সাধারণ গণিত', code: '109', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-phy', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: 'sec-9a-2026',
      name: 'পদার্থবিজ্ঞান', code: '136', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 50, cqPass: 17, hasMcq: true, mcqFull: 25, mcqPass: 8,
      hasPractical: true, practicalFull: 25, practicalPass: 8, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-hm', institutionId: inst1Id, academicYear: 2026, classId: 'cls-9-2026', sectionId: null,
      name: 'উচ্চতর গণিত', code: '126', isFourth: true, passRule: 'separate' as const,
      hasCq: true, cqFull: 50, cqPass: 17, hasMcq: true, mcqFull: 25, mcqPass: 8,
      hasPractical: true, practicalFull: 25, practicalPass: 8, totalFull: 100, totalPass: 33,
    },
    // Class 6 subjects
    {
      id: 'sub-6-bn', institutionId: inst1Id, academicYear: 2026, classId: 'cls-6-2026', sectionId: null,
      name: 'বাংলা', code: '101', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    {
      id: 'sub-6-math', institutionId: inst1Id, academicYear: 2026, classId: 'cls-6-2026', sectionId: null,
      name: 'গণিত', code: '109', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
    // Class 10 subjects
    {
      id: 'sub-10-math', institutionId: inst1Id, academicYear: 2026, classId: 'cls-10-2026', sectionId: null,
      name: 'গণিত', code: '109', isFourth: false, passRule: 'separate' as const,
      hasCq: true, cqFull: 70, cqPass: 23, hasMcq: true, mcqFull: 30, mcqPass: 10,
      hasPractical: false, practicalFull: 0, practicalPass: 0, totalFull: 100, totalPass: 33,
    },
  ];

  const teacherAssignments = [
    { id: 'ta-1', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t1', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-bn1' },
    { id: 'ta-2', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t1', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-bn2' },
    { id: 'ta-3', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t2', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-en1' },
    { id: 'ta-4', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t2', classId: 'cls-6-2026', sectionId: null, subjectId: 'sub-6-bn' },
    { id: 'ta-5', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t3', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-math' },
    { id: 'ta-6', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t3', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-hm' },
    { id: 'ta-7', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t4', classId: 'cls-9-2026', sectionId: 'sec-9a-2026', subjectId: 'sub-phy' },
    { id: 'ta-8', institutionId: inst1Id, academicYear: 2026, teacherId: 'u-t4', classId: 'cls-9-2026', sectionId: null, subjectId: 'sub-en2' },
  ];

  // Generate 60 realistic students in inst1 (2026):
  // 25 in Class 9 Section ক, 15 in Class 9 Section খ, 12 in Class 6 Section ক, 8 in Class 10 Section ক
  const students: Student[] = [];
  const sectionDistribution = [
    { classId: 'cls-9-2026', sectionId: 'sec-9a-2026', count: 25, prefix: '2609A' },
    { classId: 'cls-9-2026', sectionId: 'sec-9b-2026', count: 15, prefix: '2609B' },
    { classId: 'cls-6-2026', sectionId: 'sec-6a-2026', count: 12, prefix: '2606A' },
    { classId: 'cls-10-2026', sectionId: 'sec-10a-2026', count: 8, prefix: '2610A' },
  ];

  let idx = 1;
  for (const group of sectionDistribution) {
    for (let r = 1; r <= group.count; r += 1) {
      const isGirl = idx % 2 === 0;
      const first = isGirl
        ? BD_GIRLS_FIRST[(idx * 3) % BD_GIRLS_FIRST.length]
        : BD_BOYS_FIRST[(idx * 5) % BD_BOYS_FIRST.length];
      const last = BD_LAST[(idx * 7) % BD_LAST.length];
      const fullName = `${first.replace('\u0644', 'ল')} ${last}`;
      const userId = `u-st-${idx}`;
      const studentId = `st-${idx}`;
      const email = `student${idx}@adarsha.edu.bd`;

      users.push({
        id: userId,
        institutionId: inst1Id,
        name: fullName,
        email,
        phone: `017${String(10000000 + idx * 12345).slice(0, 8)}`,
        passwordHash: hashPasswordSync('student123'),
        role: 'student',
        isActive: true,
        createdAt: '2026-01-10',
      });

      students.push({
        id: studentId,
        institutionId: inst1Id,
        academicYear: 2026,
        userId,
        classId: group.classId,
        sectionId: group.sectionId,
        roll: r,
        studentCode: `${group.prefix}-${String(r).padStart(3, '0')}`,
        name: fullName,
        gender: isGirl ? 'female' : 'male',
        dob: group.classId === 'cls-6-2026' ? '2014-05-14' : '2011-08-22',
        fatherName: `মোঃ ${BD_BOYS_FIRST[(idx + 4) % BD_BOYS_FIRST.length]} ${last}`,
        motherName: `মোসাঃ ${BD_GIRLS_FIRST[(idx + 2) % BD_GIRLS_FIRST.length].replace('\u0644', 'ল')} বেগম`,
        guardianPhone: `018${String(20000000 + idx * 54321).slice(0, 8)}`,
        address: 'মিরপুর, ঢাকা-১২১৬',
        fourthSubjectId: group.classId === 'cls-9-2026' ? 'sub-hm' : null,
      });

      idx += 1;
    }
  }

  // Link parent to student 1 (Class 9 ক) and student 41 (Class 6 ক)
  const parentLinks = [
    { id: 'pl-1', institutionId: inst1Id, parentUserId: 'u-parent-1', studentId: 'st-1' },
    { id: 'pl-2', institutionId: inst1Id, parentUserId: 'u-parent-1', studentId: 'st-41' },
  ];

  // Exams: 1 published ("বার্ষিক পরীক্ষা ২০২৬"), 1 running ("অর্ধ-বার্ষিক পরীক্ষা ২০২৬")
  const exams = [
    {
      id: 'ex-annual-2026',
      institutionId: inst1Id,
      academicYear: 2026,
      name: 'বার্ষিক পরীক্ষা ২০২৬',
      defaultClassId: 'cls-9-2026',
      sectionId: null,
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      marksDeadline: '2026-11-20',
    },
    {
      id: 'ex-half-2026',
      institutionId: inst1Id,
      academicYear: 2026,
      name: 'অর্ধ-বার্ষিক পরীক্ষা ২০২৬',
      defaultClassId: 'cls-9-2026',
      sectionId: null,
      startDate: '2026-06-10',
      endDate: '2026-06-24',
      marksDeadline: '2026-07-02',
    },
  ];

  const class9Subjects = subjects.filter((s) => s.classId === 'cls-9-2026');
  const examRules = [
    ...class9Subjects.map((s) => ({
      id: `er-annual-${s.id}`,
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-annual-2026',
      classId: 'cls-9-2026',
      sectionId: s.sectionId,
      subjectId: s.id,
      hasCq: s.hasCq,
      cqFull: s.cqFull,
      cqPass: s.cqPass,
      hasMcq: s.hasMcq,
      mcqFull: s.mcqFull,
      mcqPass: s.mcqPass,
      hasPractical: s.hasPractical,
      practicalFull: s.practicalFull,
      practicalPass: s.practicalPass,
      passRule: s.passRule,
      totalFull: s.totalFull,
      totalPass: s.totalPass,
    })),
    ...class9Subjects.map((s) => ({
      id: `er-half-${s.id}`,
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-half-2026',
      classId: 'cls-9-2026',
      sectionId: s.sectionId,
      subjectId: s.id,
      hasCq: s.hasCq,
      cqFull: s.cqFull,
      cqPass: s.cqPass,
      hasMcq: s.hasMcq,
      mcqFull: s.mcqFull,
      mcqPass: s.mcqPass,
      hasPractical: s.hasPractical,
      practicalFull: s.practicalFull,
      practicalPass: s.practicalPass,
      passRule: s.passRule,
      totalFull: s.totalFull,
      totalPass: s.totalPass,
    })),
  ];

  const subjectCombinations = [
    {
      id: 'cmb-bn-annual',
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-annual-2026',
      classId: 'cls-9-2026',
      name: 'বাংলা (১ম + ২য় পত্র)',
      paperSubjectIds: ['sub-bn1', 'sub-bn2'],
      mode: 'sum' as const,
      passRule: 'combined_total' as const,
      isFourth: false,
    },
    {
      id: 'cmb-en-annual',
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-annual-2026',
      classId: 'cls-9-2026',
      name: 'ইংরেজি (১ম + ২য় পত্র)',
      paperSubjectIds: ['sub-en1', 'sub-en2'],
      mode: 'sum' as const,
      passRule: 'combined_total' as const,
      isFourth: false,
    },
  ];

  // Populate realistic marks for Class 9 students in ex-annual-2026 (approved & published for sec-9a-2026)
  const marks: Mark[] = [];
  const class9Students = students.filter((st) => st.classId === 'cls-9-2026');

  for (const st of class9Students) {
    const isTopStudent = st.roll === 1;
    const isFailingStudent = st.roll % 9 === 0;

    for (const sub of class9Subjects) {
      if (sub.sectionId && sub.sectionId !== st.sectionId) continue;
      const seedVal = st.roll * 13 + sub.code.charCodeAt(0);
      const r1 = deterministicRand(seedVal);
      const r2 = deterministicRand(seedVal + 7);
      const r3 = deterministicRand(seedVal + 17);

      let cq: number | null = null;
      let mcq: number | null = null;
      let practical: number | null = null;

      if (isTopStudent) {
        cq = sub.hasCq ? Math.round(sub.cqFull * 0.88) : null;
        mcq = sub.hasMcq ? Math.round(sub.mcqFull * 0.9) : null;
        practical = sub.hasPractical ? Math.round(sub.practicalFull * 0.96) : null;
      } else if (isFailingStudent && sub.id === 'sub-math') {
        cq = 18; // below pass mark 23
        mcq = 14;
        practical = null;
      } else {
        cq = sub.hasCq ? Math.min(sub.cqFull, Math.max(sub.cqPass + 5, Math.round(sub.cqFull * (0.55 + r1 * 0.38)))) : null;
        mcq = sub.hasMcq ? Math.min(sub.mcqFull, Math.max(sub.mcqPass + 2, Math.round(sub.mcqFull * (0.55 + r2 * 0.38)))) : null;
        practical = sub.hasPractical ? Math.min(sub.practicalFull, Math.max(sub.practicalPass + 4, Math.round(sub.practicalFull * (0.72 + r3 * 0.24)))) : null;
      }

      marks.push({
        id: `mk-annual-${st.id}-${sub.id}`,
        institutionId: inst1Id,
        academicYear: 2026,
        examId: 'ex-annual-2026',
        classId: st.classId,
        sectionId: st.sectionId,
        subjectId: sub.id,
        studentId: st.id,
        cq,
        mcq,
        practical,
        status: st.sectionId === 'sec-9a-2026' ? 'approved' : 'submitted',
        updatedById: 'u-t1',
        updatedAt: '2026-11-18T10:30:00Z',
      });
    }
  }

  // Also add draft/submitted marks for ex-half-2026 for a few subjects so tracker shows real progress
  for (const st of class9Students.slice(0, 25)) {
    marks.push({
      id: `mk-half-${st.id}-sub-bn1`,
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-half-2026',
      classId: st.classId,
      sectionId: st.sectionId,
      subjectId: 'sub-bn1',
      studentId: st.id,
      cq: 48 + (st.roll % 18),
      mcq: 20 + (st.roll % 8),
      practical: null,
      status: 'submitted',
      updatedById: 'u-t1',
      updatedAt: '2026-06-28T11:00:00Z',
    });
    marks.push({
      id: `mk-half-${st.id}-sub-math`,
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-half-2026',
      classId: st.classId,
      sectionId: st.sectionId,
      subjectId: 'sub-math',
      studentId: st.id,
      cq: 45 + (st.roll % 20),
      mcq: 18 + (st.roll % 10),
      practical: null,
      status: 'draft',
      updatedById: 'u-t3',
      updatedAt: '2026-06-29T09:15:00Z',
    });
  }

  const resultPublications: ResultPublication[] = [
    {
      id: 'pub-annual-9a',
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-annual-2026',
      classId: 'cls-9-2026',
      sectionId: 'sec-9a-2026',
      published: true,
      publishedAt: '2026-11-20',
    },
    {
      id: 'pub-annual-9b',
      institutionId: inst1Id,
      academicYear: 2026,
      examId: 'ex-annual-2026',
      classId: 'cls-9-2026',
      sectionId: 'sec-9b-2026',
      published: false,
      publishedAt: null,
    },
  ];

  const assignments = [
    {
      id: 'asg-1',
      institutionId: inst1Id,
      academicYear: 2026,
      teacherId: 'u-t3',
      classId: 'cls-9-2026',
      sectionId: 'sec-9a-2026',
      subjectId: 'sub-math',
      title: 'বীজগণিত ও ত্রিকোণমিতি অনুশীলনী ৯.১',
      description: 'বোর্ড বইয়ের ৯.১ অনুশীলনীর ১ থেকে ১০ নম্বর সৃজনশীল প্রশ্ন সমাধান করে সংক্ষিপ্ত উত্তর লিখুন।',
      fullMarks: 20,
      dueDate: '2026-11-28',
      createdAt: '2026-11-15',
    },
    {
      id: 'asg-2',
      institutionId: inst1Id,
      academicYear: 2026,
      teacherId: 'u-t1',
      classId: 'cls-9-2026',
      sectionId: 'sec-9a-2026',
      subjectId: 'sub-bn1',
      title: 'কপোতাক্ষ নদ কবিতার মূলভাব বিশ্লেষণ',
      description: 'মাইকেল মধুসূদন দত্তের স্বদেশপ্রেম ও চতুর্দশপদী কবিতার গঠন বৈশিষ্ট্য ব্যাখ্যা করুন।',
      fullMarks: 15,
      dueDate: '2026-11-30',
      createdAt: '2026-11-16',
    },
  ];

  const submissions: Submission[] = [
    {
      id: 'subm-1',
      institutionId: inst1Id,
      assignmentId: 'asg-1',
      studentId: 'st-1',
      answerText: 'সকল ত্রিকোণমিতিক অভেদ ও সমকোণী ত্রিভুজের অনুপাতসমূহ ধাপে ধাপে প্রমাণ করা হয়েছে। sin²θ + cos²θ = 1 ব্যবহার করে ১–১০ পর্যন্ত সমাধান সম্পন্ন।',
      marks: 19,
      feedback: 'চমৎকার ও পরিচ্ছন্ন উপস্থাপনা। ধাপগুলো নির্ভুল হয়েছে।',
      submittedAt: '2026-11-18T14:20:00Z',
      gradedAt: '2026-11-19T09:10:00Z',
    },
    {
      id: 'subm-2',
      institutionId: inst1Id,
      assignmentId: 'asg-1',
      studentId: 'st-2',
      answerText: 'অনুশীলনী ৯.১ এর ১ থেকে ৮ নম্বর অঙ্ক সমাধান করা হয়েছে। ৯ ও ১০ নম্বর অঙ্কের ব্যাখ্যা সংযুক্ত করা হলো।',
      marks: null,
      feedback: '',
      submittedAt: '2026-11-19T16:40:00Z',
      gradedAt: null,
    },
  ];

  const notices = [
    {
      id: 'not-platform-1',
      institutionId: null,
      academicYear: null,
      authorId: 'u-super',
      authorName: 'মোঃ রাশেদুল ইসলাম (সুপার এডমিন)',
      title: '২০২৬ শিক্ষাবর্ষের বার্ষিক পরীক্ষার ডিজিটাল মার্কশিট আপডেট',
      body: 'সকল নিবন্ধিত প্রতিষ্ঠানের জন্য সমন্বিত বিষয় (১ম+২য় পত্র) ও ৪র্থ বিষয়ের অটো-বোনাসসহ নতুন A4 মার্কশিট টেমপ্লেট চালু করা হয়েছে।',
      audience: 'all' as const,
      createdAt: '2026-11-19',
    },
    {
      id: 'not-inst-1',
      institutionId: inst1Id,
      academicYear: 2026,
      authorId: 'u-principal-1',
      authorName: 'অধ্যক্ষ ড. কামরুল হাসান',
      title: 'বার্ষিক পরীক্ষা ২০২৬ — নবম শ্রেণি (ক শাখা) ফলাফল প্রকাশ',
      body: 'নবম শ্রেণির ক শাখার বার্ষিক পরীক্ষার ফলাফল প্রকাশিত হয়েছে। শিক্ষার্থী ও অভিভাবকগণ ড্যাশবোর্ড থেকে অফিসিয়াল মার্কশিট ডাউনলোড করতে পারবেন।',
      audience: 'all' as const,
      createdAt: '2026-11-20',
    },
    {
      id: 'not-inst-2',
      institutionId: inst1Id,
      academicYear: 2026,
      authorId: 'u-t1',
      authorName: 'মোঃ আনোয়ার হোসেন',
      title: 'শীতকালীন সৃজনশীল অ্যাসাইনমেন্ট জমার সময়সূচি',
      body: 'সকল শিক্ষার্থীকে নির্ধারিত তারিখের মধ্যে বাংলা ও গণিত অ্যাসাইনমেন্ট অনলাইনে জমা দেওয়ার নির্দেশ দেওয়া হলো।',
      audience: 'students' as const,
      createdAt: '2026-11-17',
    },
  ];

  const auditLogs = [
    {
      id: 'aud-1',
      institutionId: inst1Id,
      userId: 'u-principal-1',
      userName: 'অধ্যক্ষ ড. কামরুল হাসান',
      userRole: 'institution_admin' as const,
      action: 'ফলাফল প্রকাশ' as const,
      entityType: 'ResultPublication',
      entityId: 'pub-annual-9a',
      details: 'বার্ষিক পরীক্ষা ২০২৬ — নবম শ্রেণি (ক শাখা) এর ফলাফল প্রকাশ করা হয়েছে।',
      createdAt: '2026-11-20 11:30',
    },
    {
      id: 'aud-2',
      institutionId: inst1Id,
      userId: 'u-t3',
      userName: 'সঞ্জয় কুমার রায়',
      userRole: 'teacher' as const,
      action: 'নম্বর পরিবর্তন' as const,
      entityType: 'Mark',
      entityId: 'mk-annual-st-1-sub-math',
      details: 'রোল ১ (সাধারণ গণিত): সৃজনশীল ৬০ থেকে ৬২ এবং MCQ ২৫ থেকে ২৭ এ হালনাগাদ।',
      beforeValue: { cq: 60, mcq: 25 },
      afterValue: { cq: 62, mcq: 27 },
      createdAt: '2026-11-18 15:10',
    },
    {
      id: 'aud-3',
      institutionId: inst1Id,
      userId: 'u-principal-1',
      userName: 'অধ্যক্ষ ড. কামরুল হাসান',
      userRole: 'institution_admin' as const,
      action: 'পরীক্ষা তৈরি' as const,
      entityType: 'Exam',
      entityId: 'ex-annual-2026',
      details: 'বার্ষিক পরীক্ষা ২০২৬ তৈরি ও ৭টি বিষয়ের নম্বর বণ্টন নির্ধারণ।',
      createdAt: '2026-10-25 10:05',
    },
    {
      id: 'aud-4',
      institutionId: null,
      userId: 'u-super',
      userName: 'মোঃ রাশেদুল ইসলাম',
      userRole: 'super_admin' as const,
      action: 'লগইন' as const,
      entityType: 'Session',
      entityId: 'u-super',
      details: 'সুপার এডমিন ড্যাশবোর্ডে সফলভাবে লগইন সম্পন্ন হয়েছে।',
      createdAt: '2026-11-21 09:00',
    },
  ];

  return {
    institutions,
    settings,
    users,
    academicYears,
    classes,
    sections,
    subjects,
    teacherAssignments,
    students,
    parentLinks,
    exams,
    examRules,
    subjectCombinations,
    marks,
    resultPublications,
    assignments,
    submissions,
    notices,
    auditLogs,
  };
}
