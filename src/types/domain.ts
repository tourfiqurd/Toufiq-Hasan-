import type {
  CombineMode,
  CombinePassRule,
  FourthSubjectConfig,
  GradingScaleRule,
  NumeralLocale,
  PassRuleType,
} from '../lib/grading/types';

export type InstitutionStatus = 'pending' | 'approved' | 'suspended' | 'rejected';
export type InstitutionType = 'school' | 'college' | 'madrasa';
export type UserRole = 'super_admin' | 'institution_admin' | 'teacher' | 'student' | 'parent';
export type MarkStatus = 'draft' | 'submitted' | 'approved';
export type NoticeAudience = 'all' | 'teachers' | 'students' | 'parents';

export interface InstitutionApplication {
  id: string;
  institutionName: string;
  type: InstitutionType;
  eiin: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  principalName: string;
  logoDataUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectedReason?: string | null;
  approvedCode?: string | null;
  reviewedByUid?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export interface Institution {
  id: string;
  code?: string;
  name: string;
  type: InstitutionType;
  eiin: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  logoDataUrl?: string;
  status: InstitutionStatus;
  rejectedReason?: string;
  createdAt: string;
}

export interface InstitutionSettings {
  institutionId: string;
  numeralLocale: NumeralLocale;
  fourthConfig: FourthSubjectConfig;
  gradingScale: GradingScaleRule[];
}

export interface User {
  id: string;
  institutionId: string | null; // null for super_admin
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface AcademicYear {
  id: string;
  institutionId: string;
  year: number;
  isCurrent: boolean;
}

export interface ClassRoom {
  id: string;
  institutionId: string;
  academicYear: number;
  name: string;
  code: string;
  classTeacherId: string | null;
}

export interface Section {
  id: string;
  institutionId: string;
  academicYear: number;
  classId: string;
  name: string;
}

export interface Subject {
  id: string;
  institutionId: string;
  academicYear: number;
  classId: string;
  sectionId: string | null; // null = all sections
  name: string;
  code: string;
  isFourth: boolean;
  passRule: PassRuleType;
  hasCq: boolean;
  cqFull: number;
  cqPass: number;
  hasMcq: boolean;
  mcqFull: number;
  mcqPass: number;
  hasPractical: boolean;
  practicalFull: number;
  practicalPass: number;
  totalFull: number;
  totalPass: number;
}

export interface TeacherAssignment {
  id: string;
  institutionId: string;
  academicYear: number;
  teacherId: string;
  classId: string;
  sectionId: string | null; // null = all sections
  subjectId: string;
}

export interface Student {
  id: string;
  institutionId: string;
  academicYear: number;
  userId: string;
  classId: string;
  sectionId: string;
  roll: number;
  studentCode: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  fatherName: string;
  motherName: string;
  guardianPhone: string;
  address: string;
  fourthSubjectId: string | null;
}

export interface ParentStudentLink {
  id: string;
  institutionId: string;
  parentUserId: string;
  studentId: string;
}

export interface Exam {
  id: string;
  institutionId: string;
  academicYear: number;
  name: string;
  defaultClassId: string;
  sectionId: string | null; // null = all sections
  startDate: string;
  endDate: string;
  marksDeadline: string;
}

export interface ExamRule {
  id: string;
  institutionId: string;
  academicYear: number;
  examId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string;
  hasCq: boolean;
  cqFull: number;
  cqPass: number;
  hasMcq: boolean;
  mcqFull: number;
  mcqPass: number;
  hasPractical: boolean;
  practicalFull: number;
  practicalPass: number;
  passRule: PassRuleType;
  totalFull: number;
  totalPass: number;
}

export interface SubjectCombination {
  id: string;
  institutionId: string;
  academicYear: number;
  examId: string;
  classId: string;
  name: string;
  paperSubjectIds: string[];
  mode: CombineMode;
  passRule: CombinePassRule;
  isFourth: boolean;
}

export interface Mark {
  id: string;
  institutionId: string;
  academicYear: number;
  examId: string;
  classId: string;
  sectionId: string;
  subjectId: string;
  studentId: string;
  cq: number | null;
  mcq: number | null;
  practical: number | null;
  status: MarkStatus;
  updatedById: string;
  updatedAt: string;
}

export interface ResultPublication {
  id: string;
  institutionId: string;
  academicYear: number;
  examId: string;
  classId: string;
  sectionId: string;
  published: boolean;
  publishedAt: string | null;
}

export interface Assignment {
  id: string;
  institutionId: string;
  academicYear: number;
  teacherId: string;
  classId: string;
  sectionId: string;
  subjectId: string | null;
  title: string;
  description: string;
  fullMarks: number;
  dueDate: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  institutionId: string;
  assignmentId: string;
  studentId: string;
  answerText: string;
  marks: number | null;
  feedback: string;
  submittedAt: string;
  gradedAt: string | null;
}

export interface Notice {
  id: string;
  institutionId: string | null; // null = platform-wide super_admin notice
  academicYear: number | null;
  authorId: string;
  authorName: string;
  title: string;
  body: string;
  audience: NoticeAudience;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  institutionId: string | null;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'লগইন' | 'প্রতিষ্ঠান ব্যবস্থাপনা' | 'পরীক্ষা তৈরি' | 'নম্বর এন্ট্রি' | 'নম্বর পরিবর্তন' | 'ফলাফল প্রকাশ' | 'ব্যবহারকারী ও কাঠামো' | 'নোটিশ';
  entityType: string;
  entityId: string;
  details: string;
  beforeValue?: Record<string, unknown> | null;
  afterValue?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AcademiaDatabase {
  institutions: Institution[];
  settings: InstitutionSettings[];
  users: User[];
  academicYears: AcademicYear[];
  classes: ClassRoom[];
  sections: Section[];
  subjects: Subject[];
  teacherAssignments: TeacherAssignment[];
  students: Student[];
  parentLinks: ParentStudentLink[];
  exams: Exam[];
  examRules: ExamRule[];
  subjectCombinations: SubjectCombination[];
  marks: Mark[];
  resultPublications: ResultPublication[];
  assignments: Assignment[];
  submissions: Submission[];
  notices: Notice[];
  auditLogs: AuditLog[];
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
}
