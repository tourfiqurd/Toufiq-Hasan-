import { onValue, ref, update } from 'firebase/database';
import { isFirebaseBackendReachable } from './applicationsApi';
import { firebaseAuth, rtdb } from './firebase';
import { evaluateStudentExam, rankExamResults } from './grading/calculator';
import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE } from './grading/scale';
import type {
  AcademiaDatabase,
  AcademicYear,
  Assignment,
  AuditLog,
  ClassRoom,
  Exam,
  ExamRule,
  Institution,
  InstitutionSettings,
  Mark,
  Notice,
  ParentStudentLink,
  ResultPublication,
  Section,
  SessionUser,
  Student,
  Subject,
  SubjectCombination,
  Submission,
  TeacherAssignment,
  User,
  UserRole,
} from '../types/domain';

export function resolveInstitutionCode(
  instId: string | null | undefined,
  institutions: Institution[]
): string | null {
  if (!instId) return null;
  const found = institutions.find((i) => i.id === instId || i.code === instId);
  if (found?.code) return found.code;
  if (instId.startsWith('ACD-')) return instId;
  if (instId === 'inst-1') return 'ACD-00001';
  if (instId === 'inst-2') return 'ACD-00002';
  if (instId === 'inst-3') return 'ACD-00003';
  return instId;
}

export function mapClaimRoleToAppRole(claimRole: string | undefined): UserRole {
  if (claimRole === 'principal' || claimRole === 'institution_admin') return 'institution_admin';
  if (
    claimRole === 'super_admin' ||
    claimRole === 'teacher' ||
    claimRole === 'student' ||
    claimRole === 'parent'
  ) {
    return claimRole;
  }
  return 'student';
}

export function mapAppRoleToClaimRole(role: UserRole): string {
  return role === 'institution_admin' ? 'principal' : role;
}

export interface RtdbInstitutionNode {
  meta?: {
    code?: string;
    name?: string;
    type?: 'school' | 'college' | 'madrasa';
    eiin?: string;
    address?: string;
    district?: string;
    phone?: string;
    email?: string;
    logoDataUrl?: string | null;
    status?: 'pending' | 'approved' | 'suspended' | 'rejected';
    rejectedReason?: string;
    createdAt?: string;
  };
  settings?: {
    numeralLocale?: 'bn' | 'en';
    fourthConfig?: InstitutionSettings['fourthConfig'];
    gradingScale?: InstitutionSettings['gradingScale'];
  };
  academicYears?: Record<string, { year?: number; isCurrent?: boolean }>;
}

export function mapRtdbInstitutionsToState(
  rawInstitutions: Record<string, RtdbInstitutionNode>,
  existingInstitutions: Institution[] = []
): {
  institutions: Institution[];
  settings: InstitutionSettings[];
  academicYears: AcademicYear[];
} {
  const institutions: Institution[] = [];
  const settings: InstitutionSettings[] = [];
  const academicYears: AcademicYear[] = [];

  for (const [code, node] of Object.entries(rawInstitutions || {})) {
    if (!node?.meta) continue;
    const matchedExisting = existingInstitutions.find((i) => i.code === code || i.id === code);
    const id = matchedExisting?.id ?? code;
    institutions.push({
      id,
      code,
      name: node.meta.name || '',
      type: node.meta.type || 'school',
      eiin: node.meta.eiin || '',
      address: node.meta.address || '',
      district: node.meta.district || 'ঢাকা',
      phone: node.meta.phone || '',
      email: node.meta.email || '',
      logoDataUrl: node.meta.logoDataUrl ?? undefined,
      status: node.meta.status || 'approved',
      rejectedReason: node.meta.rejectedReason,
      createdAt: (node.meta.createdAt || '').slice(0, 10),
    });

    settings.push({
      institutionId: id,
      numeralLocale: node.settings?.numeralLocale ?? 'bn',
      fourthConfig: node.settings?.fourthConfig ?? { ...DEFAULT_FOURTH_CONFIG },
      gradingScale: node.settings?.gradingScale ?? DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
    });

    for (const [yrKey, yrVal] of Object.entries(node.academicYears || {})) {
      const yearNum = Number(yrVal?.year ?? yrKey);
      if (!Number.isFinite(yearNum)) continue;
      academicYears.push({
        id: `ay-${code}-${yearNum}`,
        institutionId: id,
        year: yearNum,
        isCurrent: Boolean(yrVal?.isCurrent),
      });
    }
  }

  return { institutions, settings, academicYears };
}

export interface RtdbUserNode {
  uid?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  institutionCode?: string | null;
  isActive?: boolean;
  createdAt?: string;
}

export function mapRtdbUsersToState(
  rawUsers: Record<string, RtdbUserNode>,
  institutions: Institution[]
): User[] {
  const result: User[] = [];
  for (const [uid, u] of Object.entries(rawUsers || {})) {
    if (!u?.email) continue;
    const inst = u.institutionCode
      ? institutions.find((i) => i.code === u.institutionCode || i.id === u.institutionCode)
      : undefined;
    result.push({
      id: u.uid || uid,
      institutionId: inst ? inst.id : u.institutionCode ?? null,
      name: u.name || u.email,
      email: u.email,
      phone: u.phone || '',
      passwordHash: '',
      role: mapClaimRoleToAppRole(u.role),
      isActive: u.isActive !== false,
      createdAt: (u.createdAt || '').slice(0, 10),
    });
  }
  return result;
}

export interface YearScopePatch {
  institutionId: string;
  academicYear: number;
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

export function mapRtdbDataYearToPatch(
  institutionId: string,
  academicYear: number,
  raw: Record<string, any>
): YearScopePatch {
  const classes: ClassRoom[] = Object.entries(raw?.classes || {}).map(([id, c]: [string, any]) => ({
    id: c.id || id,
    institutionId,
    academicYear,
    name: c.name || '',
    code: c.code || '',
    classTeacherId: c.classTeacherUid ?? null,
  }));

  const sections: Section[] = Object.entries(raw?.sections || {}).map(([id, s]: [string, any]) => ({
    id: s.id || id,
    institutionId,
    academicYear,
    classId: s.classId || '',
    name: s.name || '',
  }));

  const subjects: Subject[] = Object.entries(raw?.subjects || {}).map(([id, s]: [string, any]) => ({
    id: s.id || id,
    institutionId,
    academicYear,
    classId: s.classId || '',
    sectionId: s.sectionId ?? null,
    name: s.name || '',
    code: s.code || '',
    isFourth: Boolean(s.isFourth),
    passRule: s.passRule || 'separate',
    hasCq: Boolean(s.hasCq),
    cqFull: Number(s.cqFull || 0),
    cqPass: Number(s.cqPass || 0),
    hasMcq: Boolean(s.hasMcq),
    mcqFull: Number(s.mcqFull || 0),
    mcqPass: Number(s.mcqPass || 0),
    hasPractical: Boolean(s.hasPractical),
    practicalFull: Number(s.practicalFull || 0),
    practicalPass: Number(s.practicalPass || 0),
    totalFull: Number(s.totalFull || 100),
    totalPass: Number(s.totalPass || 33),
  }));

  const teacherAssignments: TeacherAssignment[] = Object.entries(
    raw?.teacherAssignments || {}
  ).map(([id, ta]: [string, any]) => ({
    id: ta.id || id,
    institutionId,
    academicYear,
    teacherId: ta.teacherUid || ta.teacherId || '',
    classId: ta.classId || '',
    sectionId: ta.sectionId ?? null,
    subjectId: ta.subjectId || '',
  }));

  const students: Student[] = Object.entries(raw?.students || {}).map(([id, st]: [string, any]) => ({
    id: st.id || id,
    institutionId,
    academicYear,
    userId: st.uid || st.userId || '',
    classId: st.classId || '',
    sectionId: st.sectionId || '',
    roll: Number(st.roll || 1),
    studentCode: st.studentCode || '',
    name: st.name || '',
    gender: st.gender || 'male',
    dob: st.dob || '2012-01-01',
    fatherName: st.fatherName || '',
    motherName: st.motherName || '',
    guardianPhone: st.guardianPhone || '',
    address: st.address || '',
    fourthSubjectId: st.fourthSubjectId ?? null,
  }));

  const parentLinks: ParentStudentLink[] = [];
  for (const [parentUid, linksObj] of Object.entries<any>(raw?.parentLinks || {})) {
    for (const [studentId, flag] of Object.entries<any>(linksObj || {})) {
      if (flag === true) {
        parentLinks.push({
          id: `pl-${parentUid}-${studentId}`,
          institutionId,
          parentUserId: parentUid,
          studentId,
        });
      }
    }
  }

  const exams: Exam[] = Object.entries(raw?.exams || {}).map(([id, ex]: [string, any]) => ({
    id: ex.id || id,
    institutionId,
    academicYear,
    name: ex.name || '',
    defaultClassId: ex.defaultClassId || '',
    sectionId: ex.sectionId ?? null,
    startDate: ex.startDate || '',
    endDate: ex.endDate || '',
    marksDeadline: ex.marksDeadline || '',
  }));

  const examRules: ExamRule[] = [];
  for (const [examId, ruleMap] of Object.entries<any>(raw?.examRules || {})) {
    for (const [id, r] of Object.entries<any>(ruleMap || {})) {
      examRules.push({
        id: r.id || id,
        institutionId,
        academicYear,
        examId: r.examId || examId,
        classId: r.classId || '',
        sectionId: r.sectionId ?? null,
        subjectId: r.subjectId || '',
        hasCq: Boolean(r.hasCq),
        cqFull: Number(r.cqFull || 0),
        cqPass: Number(r.cqPass || 0),
        hasMcq: Boolean(r.hasMcq),
        mcqFull: Number(r.mcqFull || 0),
        mcqPass: Number(r.mcqPass || 0),
        hasPractical: Boolean(r.hasPractical),
        practicalFull: Number(r.practicalFull || 0),
        practicalPass: Number(r.practicalPass || 0),
        passRule: r.passRule || 'separate',
        totalFull: Number(r.totalFull || 100),
        totalPass: Number(r.totalPass || 33),
      });
    }
  }

  const subjectCombinations: SubjectCombination[] = [];
  for (const [examId, comboMap] of Object.entries<any>(raw?.subjectCombinations || {})) {
    for (const [id, c] of Object.entries<any>(comboMap || {})) {
      subjectCombinations.push({
        id: c.id || id,
        institutionId,
        academicYear,
        examId: c.examId || examId,
        classId: c.classId || '',
        name: c.name || '',
        paperSubjectIds: Array.isArray(c.paperSubjectIds) ? c.paperSubjectIds : [],
        mode: c.mode || 'sum',
        passRule: c.passRule || 'combined_total',
        isFourth: Boolean(c.isFourth),
      });
    }
  }

  const marks: Mark[] = [];
  for (const [examId, clsMap] of Object.entries<any>(raw?.marks || {})) {
    for (const [classId, secMap] of Object.entries<any>(clsMap || {})) {
      for (const [sectionId, subMap] of Object.entries<any>(secMap || {})) {
        for (const [subjectId, stMap] of Object.entries<any>(subMap || {})) {
          for (const [studentId, m] of Object.entries<any>(stMap || {})) {
            marks.push({
              id: `mk-${examId}-${subjectId}-${studentId}`,
              institutionId,
              academicYear,
              examId,
              classId,
              sectionId,
              subjectId,
              studentId,
              cq: m.cq ?? null,
              mcq: m.mcq ?? null,
              practical: m.practical ?? null,
              status: m.status || 'draft',
              updatedById: m.updatedByUid || '',
              updatedAt: m.updatedAt || '',
            });
          }
        }
      }
    }
  }

  const resultPublications: ResultPublication[] = [];
  for (const [examId, secMap] of Object.entries<any>(raw?.resultPublications || {})) {
    for (const [sectionId, pub] of Object.entries<any>(secMap || {})) {
      resultPublications.push({
        id: `pub-${examId}-${sectionId}`,
        institutionId,
        academicYear,
        examId,
        classId: pub.classId || '',
        sectionId,
        published: Boolean(pub.published),
        publishedAt: pub.publishedAt ?? null,
      });
    }
  }

  const assignments: Assignment[] = Object.entries(raw?.assignments || {}).map(
    ([id, a]: [string, any]) => ({
      id: a.id || id,
      institutionId,
      academicYear,
      teacherId: a.teacherUid || a.teacherId || '',
      classId: a.classId || '',
      sectionId: a.sectionId || '',
      subjectId: a.subjectId ?? null,
      title: a.title || '',
      description: a.description || '',
      fullMarks: Number(a.fullMarks || 0),
      dueDate: a.dueDate || '',
      createdAt: a.createdAt || '',
    })
  );

  const submissions: Submission[] = [];
  for (const [assignmentId, stMap] of Object.entries<any>(raw?.submissions || {})) {
    for (const [studentUid, s] of Object.entries<any>(stMap || {})) {
      submissions.push({
        id: s.id || `subm-${assignmentId}-${studentUid}`,
        institutionId,
        assignmentId,
        studentId: s.studentId || '',
        answerText: s.answerText || '',
        marks: s.marks ?? null,
        feedback: s.feedback || '',
        submittedAt: s.submittedAt || '',
        gradedAt: s.gradedAt ?? null,
      });
    }
  }

  const notices: Notice[] = Object.entries(raw?.notices || {}).map(([id, n]: [string, any]) => ({
    id: n.id || id,
    institutionId,
    academicYear,
    authorId: n.authorUid || n.authorId || '',
    authorName: n.authorName || '',
    title: n.title || '',
    body: n.body || '',
    audience: n.audience || 'all',
    createdAt: n.createdAt || '',
  }));

  const auditLogs: AuditLog[] = Object.entries(raw?.auditLogs || {}).map(
    ([id, l]: [string, any]) => ({
      id: l.id || id,
      institutionId,
      userId: l.userUid || l.userId || '',
      userName: l.userName || '',
      userRole: mapClaimRoleToAppRole(l.userRole),
      action: l.action || 'ব্যবহারকারী ও কাঠামো',
      entityType: l.entityType || '',
      entityId: l.entityId || '',
      details: l.details || '',
      beforeValue: l.beforeValue ?? null,
      afterValue: l.afterValue ?? null,
      createdAt: l.createdAt || '',
    })
  );

  return {
    institutionId,
    academicYear,
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

/**
 * Computes /data/{code}/{year}/publishedResults/{studentUid}/{examId} entries when
 * a Principal publishes section results, allowing strict student/parent read-only access
 * under database.rules.json.
 */
export function buildPublishedResultsUpdates(params: {
  institutionCode: string;
  institutionId: string;
  academicYear: number;
  examId: string;
  classId: string;
  sectionId: string;
  published: boolean;
  publishedAt: string | null;
  db: AcademiaDatabase;
}): Record<string, unknown> {
  const {
    institutionCode,
    institutionId,
    academicYear,
    examId,
    classId,
    sectionId,
    published,
    publishedAt,
    db,
  } = params;

  const updates: Record<string, unknown> = {
    [`data/${institutionCode}/${academicYear}/resultPublications/${examId}/${sectionId}`]: {
      examId,
      classId,
      sectionId,
      published,
      publishedAt,
    },
  };

  const sectionStudents = db.students.filter(
    (s) =>
      s.institutionId === institutionId &&
      s.academicYear === academicYear &&
      s.classId === classId &&
      s.sectionId === sectionId
  );

  if (!published) {
    for (const st of sectionStudents) {
      updates[`data/${institutionCode}/${academicYear}/publishedResults/${st.userId}/${examId}`] = null;
    }
    return updates;
  }

  const settings = db.settings.find((s) => s.institutionId === institutionId);
  const scale = settings?.gradingScale ?? DEFAULT_GRADING_SCALE;
  const fourthConfig = settings?.fourthConfig ?? DEFAULT_FOURTH_CONFIG;

  const rules = db.examRules.filter(
    (r) =>
      r.institutionId === institutionId &&
      r.academicYear === academicYear &&
      r.examId === examId &&
      r.classId === classId &&
      (r.sectionId === null || r.sectionId === sectionId)
  );
  const subjects = db.subjects.filter(
    (s) =>
      s.institutionId === institutionId &&
      s.academicYear === academicYear &&
      s.classId === classId
  );
  const combos = db.subjectCombinations.filter(
    (c) =>
      c.institutionId === institutionId &&
      c.academicYear === academicYear &&
      c.examId === examId &&
      c.classId === classId
  );
  const examMarks = db.marks.filter(
    (m) =>
      m.institutionId === institutionId &&
      m.academicYear === academicYear &&
      m.examId === examId &&
      m.sectionId === sectionId
  );

  const subjectConfigs = rules
    .filter((r) => {
      const sub = subjects.find((s) => s.id === r.subjectId);
      return !sub?.sectionId || sub.sectionId === sectionId;
    })
    .map((r) => {
      const sub = subjects.find((s) => s.id === r.subjectId);
      return {
        subjectId: r.subjectId,
        subjectName: sub?.name ?? r.subjectId,
        subjectCode: sub?.code ?? '',
        isFourth: sub?.isFourth ?? false,
        hasCq: r.hasCq,
        cqFull: r.cqFull,
        cqPass: r.cqPass,
        hasMcq: r.hasMcq,
        mcqFull: r.mcqFull,
        mcqPass: r.mcqPass,
        hasPractical: r.hasPractical,
        practicalFull: r.practicalFull,
        practicalPass: r.practicalPass,
        passRule: r.passRule,
        totalFull: r.totalFull,
        totalPass: r.totalPass,
      };
    });

  const evaluations = sectionStudents.map((st) => {
    const stMarks = examMarks
      .filter((m) => m.studentId === st.id)
      .map((m) => ({
        subjectId: m.subjectId,
        cq: m.cq,
        mcq: m.mcq,
        practical: m.practical,
      }));
    return evaluateStudentExam({
      studentId: st.id,
      subjectConfigs,
      combinations: combos,
      marks: stMarks,
      studentFourthSubjectId: st.fourthSubjectId,
      scale,
      fourthConfig,
    });
  });

  const rankMap = rankExamResults(evaluations);
  for (const r of evaluations) {
    const st = sectionStudents.find((s) => s.id === r.studentId);
    if (!st) continue;
    updates[`data/${institutionCode}/${academicYear}/publishedResults/${st.userId}/${examId}`] = {
      examId,
      classId,
      sectionId,
      studentId: st.id,
      studentUid: st.userId,
      roll: st.roll,
      studentName: st.name,
      gpa: r.gpa,
      overallGrade: r.overallGrade,
      passed: r.passed,
      meritRank: rankMap.get(st.id) ?? 0,
      totalObtained: r.totalObtained,
      totalFull: r.totalFull,
      subjects: r.subjects,
      publishedAt,
    };
  }

  return updates;
}

export async function pushRtdbUpdates(
  updates: Record<string, unknown>,
  onError?: (err: Error) => void
): Promise<boolean> {
  if (Object.keys(updates).length === 0) return true;
  if (!firebaseAuth.currentUser) return false;
  const reachable = await isFirebaseBackendReachable();
  if (!reachable) return false;

  try {
    await update(ref(rtdb), updates);
    return true;
  } catch (err) {
    const error = err instanceof Error ? err : new Error('RTDB update failed');
    onError?.(error);
    return false;
  }
}

export interface RtdbSyncCallbacks {
  getInstitutions: () => Institution[];
  onInstitutionsPatch: (patch: {
    institutions: Institution[];
    settings: InstitutionSettings[];
    academicYears: AcademicYear[];
  }) => void;
  onUsersPatch: (users: User[]) => void;
  onPlatformNoticesPatch: (notices: Notice[]) => void;
  onPlatformAuditLogsPatch: (logs: AuditLog[]) => void;
  onYearScopePatch: (patch: YearScopePatch) => void;
}

/**
 * Attaches role-scoped Firebase Realtime Database listeners obeying database.rules.json.
 */
export function subscribeDashboardRtdb(
  user: SessionUser,
  institutionCode: string | null,
  academicYear: number,
  callbacks: RtdbSyncCallbacks
): () => void {
  let disposed = false;
  const unsubs: Array<() => void> = [];
  const registeredPaths = new Set<string>();

  const start = async () => {
    const reachable = await isFirebaseBackendReachable();
    if (disposed || !reachable || !firebaseAuth.currentUser) return;

    const addListener = (path: string, handler: (val: any) => void) => {
      if (registeredPaths.has(path)) return;
      registeredPaths.add(path);
      const unsub = onValue(
        ref(rtdb, path),
        (snap) => {
          if (disposed) return;
          handler(snap.val());
        },
        () => {
          // ignore permission-denied on optional scopes
        }
      );
      unsubs.push(unsub);
    };

    // Platform notices are readable by all authenticated users
    addListener('platform/notices', (val) => {
      const list: Notice[] = Object.entries(val || {}).map(([id, n]: [string, any]) => ({
        id: n.id || id,
        institutionId: null,
        academicYear: null,
        authorId: n.authorUid || '',
        authorName: n.authorName || '',
        title: n.title || '',
        body: n.body || '',
        audience: n.audience || 'all',
        createdAt: n.createdAt || '',
      }));
      callbacks.onPlatformNoticesPatch(list);
    });

    if (user.role === 'super_admin') {
      addListener('institutions', (val) => {
        if (!val) return;
        const mapped = mapRtdbInstitutionsToState(val, callbacks.getInstitutions());
        if (mapped.institutions.length > 0) {
          callbacks.onInstitutionsPatch(mapped);
          addListener('users', (uVal) => {
            if (!uVal) return;
            const users = mapRtdbUsersToState(uVal, mapped.institutions);
            if (users.length > 0) callbacks.onUsersPatch(users);
          });
        }
      });

      addListener('platform/auditLogs', (val) => {
        const list: AuditLog[] = Object.entries(val || {}).map(([id, l]: [string, any]) => ({
          id: l.id || id,
          institutionId: null,
          userId: l.userUid || '',
          userName: l.userName || '',
          userRole: mapClaimRoleToAppRole(l.userRole),
          action: l.action || 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: l.entityType || '',
          entityId: l.entityId || '',
          details: l.details || '',
          beforeValue: l.beforeValue ?? null,
          afterValue: l.afterValue ?? null,
          createdAt: l.createdAt || '',
        }));
        callbacks.onPlatformAuditLogsPatch(list);
      });
    } else if (institutionCode) {
      addListener(`institutions/${institutionCode}`, (val) => {
        if (!val) return;
        const mapped = mapRtdbInstitutionsToState(
          { [institutionCode]: val },
          callbacks.getInstitutions()
        );
        if (mapped.institutions.length > 0) {
          callbacks.onInstitutionsPatch(mapped);
        }
      });
    }

    if (!institutionCode) return;
    const instId =
      callbacks.getInstitutions().find((i) => i.code === institutionCode || i.id === institutionCode)
        ?.id ?? institutionCode;

    if (user.role === 'super_admin' || user.role === 'institution_admin') {
      addListener(`data/${institutionCode}/${academicYear}`, (val) => {
        if (!val) return;
        callbacks.onYearScopePatch(mapRtdbDataYearToPatch(instId, academicYear, val));
      });
      return;
    }

    // Teacher, Student, Parent read only paths permitted by database.rules.json
    const base = `data/${institutionCode}/${academicYear}`;
    const sharedState: Record<string, any> = {
      marks: {},
      submissions: {},
      students: {},
    };
    const emit = () => {
      callbacks.onYearScopePatch(mapRtdbDataYearToPatch(instId, academicYear, sharedState));
    };

    const subNodes = [
      'classes',
      'sections',
      'subjects',
      'exams',
      'examRules',
      'subjectCombinations',
      'resultPublications',
      'assignments',
      'notices',
    ];
    if (user.role === 'teacher') {
      subNodes.push('teacherAssignments');
      addListener(`${base}/students`, (val) => {
        sharedState.students = val || {};
        emit();
      });
    }

    const syncTeacherMarksListeners = () => {
      if (user.role !== 'teacher') return;
      const tas = Object.values<any>(sharedState.teacherAssignments || {}).filter(
        (ta) => ta.teacherUid === user.id || ta.teacherId === user.id
      );
      const exams = Object.keys(sharedState.exams || {});
      const allSections = Object.values<any>(sharedState.sections || {});
      for (const examId of exams) {
        for (const ta of tas) {
          const targetSecs = ta.sectionId
            ? [ta.sectionId]
            : allSections.filter((s) => s.classId === ta.classId).map((s) => s.id);
          for (const secId of targetSecs) {
            const mPath = `${base}/marks/${examId}/${ta.classId}/${secId}/${ta.subjectId}`;
            addListener(mPath, (val) => {
              sharedState.marks[examId] = sharedState.marks[examId] || {};
              sharedState.marks[examId][ta.classId] = sharedState.marks[examId][ta.classId] || {};
              sharedState.marks[examId][ta.classId][secId] =
                sharedState.marks[examId][ta.classId][secId] || {};
              sharedState.marks[examId][ta.classId][secId][ta.subjectId] = val || {};
              emit();
            });
          }
        }
      }
      for (const asg of Object.values<any>(sharedState.assignments || {})) {
        if (asg.teacherUid === user.id || asg.teacherId === user.id) {
          addListener(`${base}/submissions/${asg.id}`, (val) => {
            sharedState.submissions[asg.id] = val || {};
            emit();
          });
        }
      }
    };

    for (const node of subNodes) {
      addListener(`${base}/${node}`, (val) => {
        sharedState[node] = val || {};
        if (user.role === 'teacher') syncTeacherMarksListeners();
        emit();
      });
    }

    if (user.role === 'student' || user.role === 'parent') {
      const attachPublishedForStudent = (studentUid: string) => {
        addListener(`${base}/publishedResults/${studentUid}`, (pubVal) => {
          for (const [examId, res] of Object.entries<any>(pubVal || {})) {
            if (!res?.studentId || !res?.classId || !res?.sectionId || !Array.isArray(res.subjects)) {
              continue;
            }
            for (const line of res.subjects) {
              for (const paper of line.papers || []) {
                sharedState.marks[examId] = sharedState.marks[examId] || {};
                sharedState.marks[examId][res.classId] = sharedState.marks[examId][res.classId] || {};
                sharedState.marks[examId][res.classId][res.sectionId] =
                  sharedState.marks[examId][res.classId][res.sectionId] || {};
                sharedState.marks[examId][res.classId][res.sectionId][paper.subjectId] =
                  sharedState.marks[examId][res.classId][res.sectionId][paper.subjectId] || {};
                sharedState.marks[examId][res.classId][res.sectionId][paper.subjectId][
                  res.studentId
                ] = {
                  cq: paper.cq,
                  mcq: paper.mcq,
                  practical: paper.practical,
                  status: 'approved',
                };
              }
            }
            if (res.studentId) {
              addListener(`${base}/students/${res.studentId}`, (stVal) => {
                if (stVal) {
                  sharedState.students[res.studentId] = stVal;
                  emit();
                }
              });
            }
          }
          emit();
        });
      };

      if (user.role === 'student') {
        addListener(`users/${user.id}`, (uVal) => {
          const stId = uVal?.studentId;
          if (typeof stId === 'string' && stId) {
            addListener(`${base}/students/${stId}`, (stVal) => {
              if (stVal) {
                sharedState.students[stId] = stVal;
                emit();
              }
            });
          }
        });
        attachPublishedForStudent(user.id);
        addListener(`${base}/assignments`, (asgVal) => {
          sharedState.assignments = asgVal || {};
          for (const asgId of Object.keys(asgVal || {})) {
            addListener(`${base}/submissions/${asgId}/${user.id}`, (subVal) => {
              sharedState.submissions[asgId] = sharedState.submissions[asgId] || {};
              if (subVal) sharedState.submissions[asgId][user.id] = subVal;
              emit();
            });
          }
          emit();
        });
      } else {
        addListener(`${base}/parentLinks/${user.id}`, (links) => {
          for (const [studentId, flag] of Object.entries<any>(links || {})) {
            if (flag !== true) continue;
            addListener(`${base}/students/${studentId}`, (stVal) => {
              if (!stVal) return;
              sharedState.students[studentId] = stVal;
              if (stVal.uid) attachPublishedForStudent(stVal.uid);
              emit();
            });
          }
        });
      }
    }
  };

  void start();

  return () => {
    disposed = true;
    for (const unsub of unsubs) {
      unsub();
    }
  };
}
