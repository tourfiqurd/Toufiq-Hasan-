import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signOut } from 'firebase/auth';
import { createSeedDatabase, hashPasswordSync } from '../data/seed';
import { ensureEmulatorAuthToken } from '../lib/applicationsApi';
import { firebaseAuth } from '../lib/firebase';
import {
  createInstitutionViaServer,
  deleteStudentViaServer,
  deleteTeacherViaServer,
  deleteUserViaServer,
  resetUserPasswordViaServer,
} from '../lib/principalUsersApi';
import {
  buildPublishedResultsUpdates,
  mapAppRoleToClaimRole,
  pushRtdbUpdates,
  resolveInstitutionCode,
  subscribeDashboardRtdb,
} from '../lib/rtdbSync';
import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE } from '../lib/grading/scale';
import type { FourthSubjectConfig, GradingScaleRule, NumeralLocale } from '../lib/grading/types';
import {
  assignmentSchema,
  classSchema,
  examSchema,
  formatZodError,
  loginSchema,
  noticeSchema,
  registerInstitutionSchema,
  studentSchema,
  subjectSchema,
  teacherSchema,
} from '../lib/validation';
import { TenantRepository } from './TenantRepository';
import type {
  AcademiaDatabase,
  AuditLog,
  ClassRoom,
  Exam,
  ExamRule,
  Institution,
  InstitutionStatus,
  Mark,
  MarkStatus,
  NoticeAudience,
  Section,
  SessionUser,
  Student,
  Subject,
  SubjectCombination,
  User,
  UserRole,
} from '../types/domain';

const DB_STORAGE_KEY = 'academia_lms_db_v1';
const SESSION_STORAGE_KEY = 'academia_lms_session_v1';
const THEME_STORAGE_KEY = 'academia_lms_theme_v1';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: 'default' | 'success' | 'danger' | 'warning';
}

interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface AppContextValue {
  db: AcademiaDatabase;
  user: SessionUser | null;
  actingInstitutionId: string | null;
  activeInstitutionCode: string | null;
  academicYear: number;
  theme: 'light' | 'dark';
  numeralLocale: NumeralLocale;
  toasts: ToastMessage[];
  repo: TenantRepository | null;
  // UI controls
  showToast: (message: string, variant?: ToastMessage['variant']) => void;
  dismissToast: (id: string) => void;
  toggleTheme: () => void;
  setNumeralLocale: (locale: NumeralLocale) => void;
  setAcademicYear: (year: number) => void;
  setActingInstitutionId: (instId: string | null) => void;
  resetDemoData: () => void;
  // Auth
  loginWithCredentials: (email: string, password: string, remember?: boolean) => ActionResult<SessionUser>;
  loginDemoRole: (role: UserRole) => SessionUser;
  logout: () => void;
  // Public registration (no password stored; set-password email sent upon approval)
  registerInstitution: (input: {
    id?: string;
    institutionName: string;
    type: 'school' | 'college' | 'madrasa';
    eiin: string;
    address: string;
    district: string;
    principalName: string;
    phone: string;
    email: string;
    logoDataUrl?: string;
    acceptedTerms: boolean;
  }) => ActionResult<Institution>;
  // Super Admin
  updateInstitutionStatus: (instId: string, status: InstitutionStatus, rejectedReason?: string) => ActionResult;
  addInstitutionByAdmin: (input: {
    name: string;
    type: 'school' | 'college' | 'madrasa';
    eiin: string;
    address: string;
    district: string;
    phone: string;
    email: string;
    principalName: string;
    password: string;
  }) => ActionResult;
  deleteInstitution: (instId: string) => ActionResult;
  resetUserPassword: (userId: string, newPassword: string) => ActionResult;
  deleteUserAccount: (userId: string) => ActionResult;
  // Academic Year
  addAcademicYear: (year: number, copyStructureFromCurrent: boolean) => ActionResult;
  deleteAcademicYear: (year: number) => ActionResult;
  // Classes, Sections, Subjects
  saveClass: (input: { id?: string; name: string; code: string; classTeacherId: string | null }) => ActionResult<ClassRoom>;
  deleteClass: (classId: string) => ActionResult;
  addSection: (classId: string, name: string) => ActionResult<Section>;
  deleteSection: (sectionId: string) => ActionResult;
  saveSubject: (input: Omit<Subject, 'id' | 'institutionId' | 'academicYear'> & { id?: string }) => ActionResult<Subject>;
  deleteSubject: (subjectId: string) => ActionResult;
  // Teachers
  saveTeacherWithAssignments: (input: {
    id?: string;
    forcedUserId?: string;
    skipRtdbUserWrite?: boolean;
    name: string;
    email: string;
    phone: string;
    password?: string;
    assignments: Array<{ classId: string; sectionId: string | null; subjectId: string }>;
  }) => ActionResult<User>;
  removeTeacherAssignment: (assignmentId: string) => ActionResult;
  deleteTeacher: (teacherId: string) => ActionResult;
  // Students
  saveStudent: (input: {
    id?: string;
    forcedUserId?: string;
    forcedStudentId?: string;
    skipRtdbWrite?: boolean;
    name: string;
    roll: number;
    studentCode: string;
    classId: string;
    sectionId: string;
    gender: 'male' | 'female' | 'other';
    dob: string;
    fatherName: string;
    motherName: string;
    guardianPhone: string;
    address: string;
    fourthSubjectId: string | null;
    email: string;
    password?: string;
  }) => ActionResult<Student>;
  bulkImportStudents: (
    rows: Array<{
      forcedUserId?: string;
      forcedStudentId?: string;
      name: string;
      roll: number;
      studentCode: string;
      classId: string;
      sectionId: string;
      gender: 'male' | 'female' | 'other';
      fatherName: string;
      motherName: string;
      guardianPhone: string;
      email: string;
    }>,
    options?: { skipRtdbWrite?: boolean }
  ) => ActionResult<number>;
  deleteStudent: (studentId: string) => ActionResult;
  // Exams & Mark Distribution
  saveExamWithRules: (input: {
    id?: string;
    name: string;
    defaultClassId: string;
    sectionId: string | null;
    startDate: string;
    endDate: string;
    marksDeadline: string;
    rules: Array<Omit<ExamRule, 'id' | 'institutionId' | 'academicYear' | 'examId'>>;
    combinations: Array<Omit<SubjectCombination, 'id' | 'institutionId' | 'academicYear' | 'examId'>>;
  }) => ActionResult<Exam>;
  deleteExam: (examId: string) => ActionResult;
  toggleSectionPublication: (examId: string, classId: string, sectionId: string, published: boolean) => ActionResult;
  // Marks & Approval
  saveMarksBatch: (input: {
    examId: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    status: MarkStatus;
    entries: Array<{ studentId: string; cq: number | null; mcq: number | null; practical: number | null }>;
  }) => ActionResult;
  approveSubjectMarks: (examId: string, subjectId: string, sectionId?: string | null) => ActionResult;
  // Assignments
  createAssignment: (input: {
    title: string;
    description: string;
    fullMarks: number;
    dueDate: string;
    classId: string;
    sectionId: string;
    subjectId: string | null;
  }) => ActionResult;
  submitStudentAssignment: (assignmentId: string, studentId: string, answerText: string) => ActionResult;
  gradeSubmission: (submissionId: string, marks: number, feedback: string) => ActionResult;
  // Notices & Settings
  publishNotice: (input: { title: string; body: string; audience: NoticeAudience }) => ActionResult;
  deleteNotice: (noticeId: string) => ActionResult;
  updateInstitutionSettings: (input: {
    institutionPatch?: Partial<Pick<Institution, 'name' | 'eiin' | 'address' | 'district' | 'phone' | 'email' | 'logoDataUrl'>>;
    numeralLocale: NumeralLocale;
    fourthConfig: FourthSubjectConfig;
    gradingScale: GradingScaleRule[];
  }) => ActionResult;
}

const AppContext = createContext<AppContextValue | null>(null);

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nowStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function loadInitialDb(): AcademiaDatabase {
  try {
    const raw = localStorage.getItem(DB_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as AcademiaDatabase;
    }
  } catch {
    // fallback to seed
  }
  return createSeedDatabase();
}

function loadInitialSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SessionUser;
  } catch {
    // ignore
  }
  return null;
}

function loadInitialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    // ignore
  }
  return 'light';
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<AcademiaDatabase>(loadInitialDb);
  const [user, setUser] = useState<SessionUser | null>(loadInitialSession);
  const [actingInstitutionId, setActingInstitutionId] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<number>(2026);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadInitialTheme);
  const [globalLocale, setGlobalLocale] = useState<NumeralLocale>('bn');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(db));
    } catch {
      // ignore quota error
    }
  }, [db]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const effectiveInstId = user?.role === 'super_admin' ? actingInstitutionId : user?.institutionId ?? null;
  const activeSettings = useMemo(
    () => db.settings.find((s) => s.institutionId === effectiveInstId) ?? null,
    [db.settings, effectiveInstId]
  );
  const numeralLocale = activeSettings?.numeralLocale ?? globalLocale;
  const activeInstitutionCode = useMemo(
    () => resolveInstitutionCode(effectiveInstId, db.institutions),
    [effectiveInstId, db.institutions]
  );

  // Live Firebase Realtime Database hydration scoped by role, institutionCode, and academicYear
  useEffect(() => {
    if (!user) return;
    return subscribeDashboardRtdb(user, activeInstitutionCode, academicYear, {
      getInstitutions: () => db.institutions,
      onInstitutionsPatch: ({ institutions, settings, academicYears }) => {
        setDb((prev) => ({
          ...prev,
          institutions,
          settings: settings.length > 0 ? settings : prev.settings,
          academicYears: academicYears.length > 0 ? academicYears : prev.academicYears,
        }));
      },
      onUsersPatch: (users) => {
        setDb((prev) => ({ ...prev, users }));
      },
      onPlatformNoticesPatch: (platformNotices) => {
        setDb((prev) => ({
          ...prev,
          notices: [
            ...platformNotices,
            ...prev.notices.filter((n) => n.institutionId !== null),
          ],
        }));
      },
      onPlatformAuditLogsPatch: (platformLogs) => {
        setDb((prev) => ({
          ...prev,
          auditLogs: [
            ...platformLogs,
            ...prev.auditLogs.filter((l) => l.institutionId !== null),
          ],
        }));
      },
      onYearScopePatch: (patch) => {
        const matchScope = (item: { institutionId: string; academicYear: number }) =>
          item.institutionId === patch.institutionId && item.academicYear === patch.academicYear;

        setDb((prev) => ({
          ...prev,
          classes: [...prev.classes.filter((x) => !matchScope(x)), ...patch.classes],
          sections: [...prev.sections.filter((x) => !matchScope(x)), ...patch.sections],
          subjects: [...prev.subjects.filter((x) => !matchScope(x)), ...patch.subjects],
          teacherAssignments: [
            ...prev.teacherAssignments.filter((x) => !matchScope(x)),
            ...patch.teacherAssignments,
          ],
          students: [...prev.students.filter((x) => !matchScope(x)), ...patch.students],
          parentLinks: [
            ...prev.parentLinks.filter((x) => x.institutionId !== patch.institutionId),
            ...patch.parentLinks,
          ],
          exams: [...prev.exams.filter((x) => !matchScope(x)), ...patch.exams],
          examRules: [...prev.examRules.filter((x) => !matchScope(x)), ...patch.examRules],
          subjectCombinations: [
            ...prev.subjectCombinations.filter((x) => !matchScope(x)),
            ...patch.subjectCombinations,
          ],
          marks: [...prev.marks.filter((x) => !matchScope(x)), ...patch.marks],
          resultPublications: [
            ...prev.resultPublications.filter((x) => !matchScope(x)),
            ...patch.resultPublications,
          ],
          assignments: [...prev.assignments.filter((x) => !matchScope(x)), ...patch.assignments],
          submissions: [
            ...prev.submissions.filter((x) => x.institutionId !== patch.institutionId),
            ...patch.submissions,
          ],
          notices: [
            ...prev.notices.filter(
              (n) => !(n.institutionId === patch.institutionId && n.academicYear === patch.academicYear)
            ),
            ...patch.notices,
          ],
          auditLogs: [
            ...prev.auditLogs.filter((l) => l.institutionId !== patch.institutionId),
            ...patch.auditLogs,
          ],
        }));
      },
    });
  }, [user, activeInstitutionCode, academicYear]);

  const repo = useMemo(() => {
    if (!user) return null;
    return new TenantRepository(db, {
      user,
      actingInstitutionId,
      academicYear,
    });
  }, [db, user, actingInstitutionId, academicYear]);

  const showToast = useCallback((message: string, variant: ToastMessage['variant'] = 'default') => {
    const id = uid('toast');
    setToasts((prev) => [...prev.filter((t) => t.message !== message).slice(-1), { id, message, variant }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setNumeralLocale = useCallback(
    (locale: NumeralLocale) => {
      setGlobalLocale(locale);
      if (effectiveInstId) {
        setDb((prev) => ({
          ...prev,
          settings: prev.settings.map((s) =>
            s.institutionId === effectiveInstId ? { ...s, numeralLocale: locale } : s
          ),
        }));
        if (activeInstitutionCode) {
          void pushRtdbUpdates({
            [`institutions/${activeInstitutionCode}/settings/numeralLocale`]: locale,
          });
        }
      }
      showToast(locale === 'bn' ? 'বাংলা সংখ্যা (১২৩) সক্রিয় হয়েছে' : 'ইংরেজি সংখ্যা (123) সক্রিয় হয়েছে', 'success');
    },
    [effectiveInstId, activeInstitutionCode, showToast]
  );

  const buildAuditRtdbUpdates = useCallback(
    (
      instCode: string | null,
      year: number,
      entry: { action: string; entityType: string; entityId: string; details: string; beforeValue?: Record<string, unknown> | null; afterValue?: Record<string, unknown> | null }
    ): Record<string, unknown> => {
      if (!user) return {};
      const logId = uid('aud');
      const path = instCode
        ? `data/${instCode}/${year}/auditLogs/${logId}`
        : `platform/auditLogs/${logId}`;
      return {
        [path]: {
          id: logId,
          userUid: user.id,
          userName: user.name,
          userRole: mapAppRoleToClaimRole(user.role),
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          details: entry.details,
          beforeValue: entry.beforeValue ?? null,
          afterValue: entry.afterValue ?? null,
          createdAt: new Date().toISOString(),
        },
      };
    },
    [user]
  );

  const appendAudit = useCallback(
    (
      draftDb: AcademiaDatabase,
      entry: Omit<AuditLog, 'id' | 'createdAt' | 'userId' | 'userName' | 'userRole'> & {
        actor?: SessionUser;
      }
    ): AcademiaDatabase => {
      const actor = entry.actor ?? user;
      if (!actor) return draftDb;
      const log: AuditLog = {
        id: uid('aud'),
        institutionId: entry.institutionId,
        userId: actor.id,
        userName: actor.name,
        userRole: actor.role,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        details: entry.details,
        beforeValue: entry.beforeValue ?? null,
        afterValue: entry.afterValue ?? null,
        createdAt: nowStamp(),
      };
      return {
        ...draftDb,
        auditLogs: [log, ...draftDb.auditLogs],
      };
    },
    [user]
  );

  const persistSession = (sessionUser: SessionUser, remember = true) => {
    setUser(sessionUser);
    setActingInstitutionId(null);
    const targetStorage = remember ? localStorage : sessionStorage;
    targetStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionUser));
    if (sessionUser.institutionId) {
      const years = db.academicYears
        .filter((y) => y.institutionId === sessionUser.institutionId)
        .sort((a, b) => b.year - a.year);
      const current = years.find((y) => y.isCurrent) ?? years[0];
      if (current) setAcademicYear(current.year);
    }
  };

  const loginWithCredentials = useCallback(
    (email: string, password: string, remember = true): ActionResult<SessionUser> => {
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        return { ok: false, error: formatZodError(parsed.error) };
      }
      const found = db.users.find(
        (u) => u.email.toLowerCase() === parsed.data.email.toLowerCase()
      );
      if (!found || found.passwordHash !== hashPasswordSync(parsed.data.password)) {
        return { ok: false, error: 'ইমেইল বা পাসওয়ার্ড মিলছে না। আবার চেষ্টা করুন।' };
      }
      if (!found.isActive) {
        return { ok: false, error: 'আপনার প্রতিষ্ঠান বা অ্যাকাউন্টটি এখনও অনুমোদিত বা সক্রিয় নয়।' };
      }
      if (found.institutionId) {
        const inst = db.institutions.find((i) => i.id === found.institutionId);
        if (inst && inst.status !== 'approved') {
          return { ok: false, error: 'প্রতিষ্ঠানটি অনুমোদিত নয়। অনুমোদনের পর লগইন করুন।' };
        }
      }
      const sessionUser: SessionUser = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        institutionId: found.institutionId,
      };
      persistSession(sessionUser, remember);
      void ensureEmulatorAuthToken(parsed.data.email, parsed.data.password);
      setDb((prev) =>
        appendAudit(prev, {
          actor: sessionUser,
          institutionId: sessionUser.institutionId,
          action: 'লগইন',
          entityType: 'Session',
          entityId: sessionUser.id,
          details: `${sessionUser.name} ড্যাশবোর্ডে লগইন করেছেন।`,
        })
      );
      return { ok: true, data: sessionUser };
    },
    [db.users, db.institutions, appendAudit]
  );

  const loginDemoRole = useCallback(
    (role: UserRole): SessionUser => {
      const found =
        db.users.find((u) => u.role === role && u.isActive) ??
        db.users[0];
      const sessionUser: SessionUser = {
        id: found.id,
        name: found.name,
        email: found.email,
        role: found.role,
        institutionId: found.institutionId,
      };
      persistSession(sessionUser, true);
      const demoPwMap: Record<string, string> = {
        'superadmin@academia.edu.bd': 'admin123',
        'principal@adarsha.edu.bd': 'principal123',
        'teacher1@adarsha.edu.bd': 'teacher123',
        'student1@adarsha.edu.bd': 'student123',
        'parent@adarsha.edu.bd': 'parent123',
      };
      void ensureEmulatorAuthToken(found.email, demoPwMap[found.email] || 'demo1234');
      setDb((prev) =>
        appendAudit(prev, {
          actor: sessionUser,
          institutionId: sessionUser.institutionId,
          action: 'লগইন',
          entityType: 'Session',
          entityId: sessionUser.id,
          details: `${sessionUser.name} ডেমো অ্যাকাউন্টে প্রবেশ করেছেন।`,
        })
      );
      return sessionUser;
    },
    [db.users, appendAudit]
  );

  const logout = useCallback(() => {
    setUser(null);
    setActingInstitutionId(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    void signOut(firebaseAuth).catch(() => {});
  }, []);

  const resetDemoData = useCallback(() => {
    const fresh = createSeedDatabase();
    setDb(fresh);
    localStorage.setItem(DB_STORAGE_KEY, JSON.stringify(fresh));
    showToast('ডেমো তথ্য পুনরায় রিসেট করা হয়েছে', 'success');
  }, [showToast]);

  const registerInstitution: AppContextValue['registerInstitution'] = useCallback((input) => {
    const parsed = registerInstitutionSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: formatZodError(parsed.error) };
    }
    const exists = db.users.some((u) => u.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (exists) {
      return { ok: false, error: 'এই ইমেইল দিয়ে ইতোমধ্যে একটি অ্যাকাউন্ট নিবন্ধিত আছে।' };
    }
    const instId = input.id || uid('inst');
    const newInst: Institution = {
      id: instId,
      name: parsed.data.institutionName,
      type: parsed.data.type,
      eiin: parsed.data.eiin,
      address: parsed.data.address,
      district: parsed.data.district,
      phone: parsed.data.phone,
      email: parsed.data.email,
      logoDataUrl: input.logoDataUrl,
      status: 'pending',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    setDb((prev) => ({
      ...prev,
      institutions: [newInst, ...prev.institutions.filter((i) => i.id !== instId)],
      auditLogs: [
        {
          id: uid('aud'),
          institutionId: instId,
          userId: 'public-applicant',
          userName: parsed.data.principalName,
          userRole: 'institution_admin',
          action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: 'InstitutionApplication',
          entityId: instId,
          details: `নতুন প্রতিষ্ঠান নিবন্ধন আবেদন: ${newInst.name} (EIIN: ${newInst.eiin})`,
          createdAt: nowStamp(),
        },
        ...prev.auditLogs,
      ],
    }));
    return { ok: true, data: newInst };
  }, [db.users]);

  const updateInstitutionStatus: AppContextValue['updateInstitutionStatus'] = useCallback(
    (instId, status, rejectedReason) => {
      if (user?.role !== 'super_admin') return { ok: false, error: 'অনুমতি নেই।' };
      const target = db.institutions.find((i) => i.id === instId);
      if (!target) return { ok: false, error: 'প্রতিষ্ঠান পাওয়া যায়নি।' };
      setDb((prev) => {
        const next: AcademiaDatabase = {
          ...prev,
          institutions: prev.institutions.map((i) =>
            i.id === instId
              ? { ...i, status, ...(rejectedReason ? { rejectedReason } : {}) }
              : i
          ),
          users: prev.users.map((u) =>
            u.institutionId === instId && u.role === 'institution_admin'
              ? { ...u, isActive: status === 'approved' }
              : u
          ),
        };
        const statusLabels: Record<InstitutionStatus, string> = {
          approved: 'অনুমোদিত',
          suspended: 'স্থগিত',
          rejected: 'বাতিল',
          pending: 'অপেক্ষমাণ',
        };
        return appendAudit(next, {
          institutionId: instId,
          action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: 'Institution',
          entityId: instId,
          details: `${target.name} এর স্ট্যাটাস "${statusLabels[status]}" করা হয়েছে${rejectedReason ? ` (কারণ: ${rejectedReason})` : ''}।`,
          beforeValue: { status: target.status },
          afterValue: { status, ...(rejectedReason ? { rejectedReason } : {}) },
        });
      });
      const code = resolveInstitutionCode(instId, db.institutions);
      if (code) {
        void ensureEmulatorAuthToken().then((token) => {
          if (!token) return;
          void fetch(`/api/admin/institutions/${encodeURIComponent(code)}/status`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status, reason: rejectedReason }),
          }).catch(() => {});
        });
      }
      return { ok: true };
    },
    [user, db.institutions, appendAudit]
  );

  const addInstitutionByAdmin: AppContextValue['addInstitutionByAdmin'] = useCallback(
    (input) => {
      if (user?.role !== 'super_admin') return { ok: false, error: 'অনুমতি নেই।' };
      const parsed = registerInstitutionSchema.safeParse({
        institutionName: input.name,
        type: input.type,
        eiin: input.eiin,
        address: input.address,
        district: input.district,
        principalName: input.principalName,
        phone: input.phone,
        email: input.email,
        acceptedTerms: true,
      });
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
      if (!input.password || input.password.length < 6) {
        return { ok: false, error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
      }
      if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        return { ok: false, error: 'এই ইমেইল ইতোমধ্যে ব্যবহৃত হয়েছে।' };
      }
      const instId = uid('inst');
      const newInst: Institution = {
        id: instId,
        name: input.name,
        type: input.type,
        eiin: input.eiin,
        address: input.address,
        district: input.district,
        phone: input.phone,
        email: input.email,
        status: 'approved',
        createdAt: new Date().toISOString().slice(0, 10),
      };
      const newPrincipal: User = {
        id: uid('u-prin'),
        institutionId: instId,
        name: input.principalName,
        email: input.email,
        phone: input.phone,
        passwordHash: hashPasswordSync(input.password),
        role: 'institution_admin',
        isActive: true,
        createdAt: new Date().toISOString().slice(0, 10),
      };
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            institutions: [newInst, ...prev.institutions],
            users: [...prev.users, newPrincipal],
            settings: [
              ...prev.settings,
              {
                institutionId: instId,
                numeralLocale: 'bn',
                fourthConfig: { ...DEFAULT_FOURTH_CONFIG },
                gradingScale: DEFAULT_GRADING_SCALE.map((g) => ({ ...g })),
              },
            ],
            academicYears: [
              ...prev.academicYears,
              { id: uid('ay'), institutionId: instId, year: 2026, isCurrent: true },
            ],
          },
          {
            institutionId: instId,
            action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
            entityType: 'Institution',
            entityId: instId,
            details: `সুপার এডমিন নতুন প্রতিষ্ঠান "${newInst.name}" যুক্ত করেছেন।`,
          }
        )
      );
      void createInstitutionViaServer({
        name: input.name,
        type: input.type,
        eiin: input.eiin,
        address: input.address,
        district: input.district,
        phone: input.phone,
        email: input.email,
        principalName: input.principalName,
        password: input.password,
      });
      return { ok: true };
    },
    [user, db.users, appendAudit]
  );

  const deleteInstitution: AppContextValue['deleteInstitution'] = useCallback(
    (instId) => {
      if (user?.role !== 'super_admin') return { ok: false, error: 'অনুমতি নেই।' };
      const target = db.institutions.find((i) => i.id === instId);
      if (!target) return { ok: false, error: 'প্রতিষ্ঠান পাওয়া যায়নি।' };
      if (actingInstitutionId === instId) setActingInstitutionId(null);
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            institutions: prev.institutions.filter((i) => i.id !== instId),
            users: prev.users.filter((u) => u.institutionId !== instId),
            settings: prev.settings.filter((s) => s.institutionId !== instId),
            academicYears: prev.academicYears.filter((y) => y.institutionId !== instId),
            classes: prev.classes.filter((c) => c.institutionId !== instId),
            sections: prev.sections.filter((s) => s.institutionId !== instId),
            subjects: prev.subjects.filter((s) => s.institutionId !== instId),
            students: prev.students.filter((s) => s.institutionId !== instId),
            exams: prev.exams.filter((e) => e.institutionId !== instId),
          },
          {
            institutionId: null,
            action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
            entityType: 'Institution',
            entityId: instId,
            details: `প্রতিষ্ঠান "${target.name}" স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
          }
        )
      );
      const code = resolveInstitutionCode(instId, db.institutions);
      if (code) {
        void ensureEmulatorAuthToken().then((token) => {
          if (!token) return;
          void fetch(`/api/admin/institutions/${encodeURIComponent(code)}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        });
      }
      return { ok: true };
    },
    [user, db.institutions, actingInstitutionId, appendAudit]
  );

  const resetUserPassword: AppContextValue['resetUserPassword'] = useCallback(
    (userId, newPassword) => {
      if (newPassword.length < 6) return { ok: false, error: 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।' };
      const target = db.users.find((u) => u.id === userId);
      if (!target) return { ok: false, error: 'ব্যবহারকারী পাওয়া যায়নি।' };
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: prev.users.map((u) =>
              u.id === userId ? { ...u, passwordHash: hashPasswordSync(newPassword) } : u
            ),
          },
          {
            institutionId: target.institutionId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'User',
            entityId: userId,
            details: `${target.name} (${target.email}) এর পাসওয়ার্ড রিসেট করা হয়েছে।`,
          }
        )
      );
      void resetUserPasswordViaServer(userId, newPassword);
      return { ok: true };
    },
    [db.users, appendAudit]
  );

  const deleteUserAccount: AppContextValue['deleteUserAccount'] = useCallback(
    (userId) => {
      const target = db.users.find((u) => u.id === userId);
      if (!target) return { ok: false, error: 'ব্যবহারকারী পাওয়া যায়নি।' };
      if (target.role === 'super_admin') return { ok: false, error: 'সুপার এডমিন মুছে ফেলা যাবে না।' };
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: prev.users.filter((u) => u.id !== userId),
            teacherAssignments: prev.teacherAssignments.filter((ta) => ta.teacherId !== userId),
          },
          {
            institutionId: target.institutionId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'User',
            entityId: userId,
            details: `ব্যবহারকারী ${target.name} (${target.email}) মুছে ফেলা হয়েছে।`,
          }
        )
      );
      void deleteUserViaServer(userId);
      return { ok: true };
    },
    [db.users, appendAudit]
  );

  const addAcademicYear: AppContextValue['addAcademicYear'] = useCallback(
    (year, copyStructure) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      if (year < 2020 || year > 2040) return { ok: false, error: 'বৈধ শিক্ষাবর্ষ লিখুন (২০২০–২০৪০)।' };
      if (db.academicYears.some((y) => y.institutionId === effectiveInstId && y.year === year)) {
        return { ok: false, error: `${year} শিক্ষাবর্ষ ইতোমধ্যে বিদ্যমান।` };
      }

      setDb((prev) => {
        let nextClasses = [...prev.classes];
        let nextSections = [...prev.sections];
        let nextSubjects = [...prev.subjects];
        let nextTa = [...prev.teacherAssignments];

        if (copyStructure) {
          const srcClasses = prev.classes.filter(
            (c) => c.institutionId === effectiveInstId && c.academicYear === academicYear
          );
          const classIdMap = new Map<string, string>();
          for (const c of srcClasses) {
            const newCid = uid('cls');
            classIdMap.set(c.id, newCid);
            nextClasses.push({ ...c, id: newCid, academicYear: year });
          }

          const srcSections = prev.sections.filter(
            (s) => s.institutionId === effectiveInstId && s.academicYear === academicYear
          );
          const sectionIdMap = new Map<string, string>();
          for (const s of srcSections) {
            const newCid = classIdMap.get(s.classId);
            if (!newCid) continue;
            const newSid = uid('sec');
            sectionIdMap.set(s.id, newSid);
            nextSections.push({ ...s, id: newSid, classId: newCid, academicYear: year });
          }

          const srcSubjects = prev.subjects.filter(
            (sub) => sub.institutionId === effectiveInstId && sub.academicYear === academicYear
          );
          const subjectIdMap = new Map<string, string>();
          for (const sub of srcSubjects) {
            const newCid = classIdMap.get(sub.classId);
            if (!newCid) continue;
            const newSubId = uid('sub');
            subjectIdMap.set(sub.id, newSubId);
            nextSubjects.push({
              ...sub,
              id: newSubId,
              classId: newCid,
              sectionId: sub.sectionId ? sectionIdMap.get(sub.sectionId) ?? null : null,
              academicYear: year,
            });
          }

          const srcTa = prev.teacherAssignments.filter(
            (ta) => ta.institutionId === effectiveInstId && ta.academicYear === academicYear
          );
          for (const ta of srcTa) {
            const newCid = classIdMap.get(ta.classId);
            const newSubId = subjectIdMap.get(ta.subjectId);
            if (!newCid || !newSubId) continue;
            nextTa.push({
              ...ta,
              id: uid('ta'),
              classId: newCid,
              sectionId: ta.sectionId ? sectionIdMap.get(ta.sectionId) ?? null : null,
              subjectId: newSubId,
              academicYear: year,
            });
          }
        }

        return appendAudit(
          {
            ...prev,
            academicYears: [
              ...prev.academicYears,
              { id: uid('ay'), institutionId: effectiveInstId, year, isCurrent: false },
            ],
            classes: nextClasses,
            sections: nextSections,
            subjects: nextSubjects,
            teacherAssignments: nextTa,
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'AcademicYear',
            entityId: String(year),
            details: `নতুন শিক্ষাবর্ষ ${year} যুক্ত করা হয়েছে${copyStructure ? ' (কাঠামো কপি সহ)' : ''}।`,
          }
        );
      });
      const code = activeInstitutionCode;
      if (code) {
        const yearUpdates: Record<string, unknown> = {
          [`institutions/${code}/academicYears/${year}`]: { year, isCurrent: false },
        };
        if (copyStructure) {
          const srcClasses = db.classes.filter(
            (c) => c.institutionId === effectiveInstId && c.academicYear === academicYear
          );
          const classMap = new Map<string, string>();
          for (const c of srcClasses) {
            const newCid = uid('cls');
            classMap.set(c.id, newCid);
            yearUpdates[`data/${code}/${year}/classes/${newCid}`] = {
              id: newCid,
              name: c.name,
              code: c.code,
              classTeacherUid: c.classTeacherId ?? null,
            };
          }
          const srcSections = db.sections.filter(
            (s) => s.institutionId === effectiveInstId && s.academicYear === academicYear
          );
          const secMap = new Map<string, string>();
          for (const s of srcSections) {
            const newCid = classMap.get(s.classId);
            if (!newCid) continue;
            const newSid = uid('sec');
            secMap.set(s.id, newSid);
            yearUpdates[`data/${code}/${year}/sections/${newSid}`] = {
              id: newSid,
              classId: newCid,
              name: s.name,
            };
          }
          const srcSubjects = db.subjects.filter(
            (sub) => sub.institutionId === effectiveInstId && sub.academicYear === academicYear
          );
          for (const sub of srcSubjects) {
            const newCid = classMap.get(sub.classId);
            if (!newCid) continue;
            const newSubId = uid('sub');
            yearUpdates[`data/${code}/${year}/subjects/${newSubId}`] = {
              id: newSubId,
              classId: newCid,
              sectionId: sub.sectionId ? secMap.get(sub.sectionId) ?? null : null,
              name: sub.name,
              code: sub.code,
              isFourth: sub.isFourth,
              passRule: sub.passRule,
              hasCq: sub.hasCq,
              cqFull: sub.cqFull,
              cqPass: sub.cqPass,
              hasMcq: sub.hasMcq,
              mcqFull: sub.mcqFull,
              mcqPass: sub.mcqPass,
              hasPractical: sub.hasPractical,
              practicalFull: sub.practicalFull,
              practicalPass: sub.practicalPass,
              totalFull: sub.totalFull,
              totalPass: sub.totalPass,
            };
          }
        }
        void pushRtdbUpdates(yearUpdates);
      }
      setAcademicYear(year);
      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.academicYears, db.classes, db.sections, db.subjects, appendAudit]
  );

  const deleteAcademicYear: AppContextValue['deleteAcademicYear'] = useCallback(
    (year) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const hasStudents = db.students.some(
        (s) => s.institutionId === effectiveInstId && s.academicYear === year
      );
      const hasExams = db.exams.some(
        (e) => e.institutionId === effectiveInstId && e.academicYear === year
      );
      if (hasStudents || hasExams) {
        return { ok: false, error: 'যে শিক্ষাবর্ষে শিক্ষার্থী বা পরীক্ষা রয়েছে তা মুছে ফেলা যাবে না।' };
      }
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            academicYears: prev.academicYears.filter(
              (y) => !(y.institutionId === effectiveInstId && y.year === year)
            ),
            classes: prev.classes.filter(
              (c) => !(c.institutionId === effectiveInstId && c.academicYear === year)
            ),
            sections: prev.sections.filter(
              (s) => !(s.institutionId === effectiveInstId && s.academicYear === year)
            ),
            subjects: prev.subjects.filter(
              (s) => !(s.institutionId === effectiveInstId && s.academicYear === year)
            ),
            teacherAssignments: prev.teacherAssignments.filter(
              (t) => !(t.institutionId === effectiveInstId && t.academicYear === year)
            ),
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'AcademicYear',
            entityId: String(year),
            details: `শিক্ষাবর্ষ ${year} মুছে ফেলা হয়েছে।`,
          }
        )
      );
      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`institutions/${activeInstitutionCode}/academicYears/${year}`]: null,
          [`data/${activeInstitutionCode}/${year}`]: null,
        });
      }
      if (academicYear === year) {
        const remaining = db.academicYears.find(
          (y) => y.institutionId === effectiveInstId && y.year !== year
        );
        if (remaining) setAcademicYear(remaining.year);
      }
      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.students, db.exams, db.academicYears, appendAudit]
  );

  const saveClass: AppContextValue['saveClass'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const parsed = classSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const cls: ClassRoom = input.id
        ? {
            id: input.id,
            institutionId: effectiveInstId,
            academicYear,
            name: parsed.data.name,
            code: parsed.data.code,
            classTeacherId: input.classTeacherId,
          }
        : {
            id: uid('cls'),
            institutionId: effectiveInstId,
            academicYear,
            name: parsed.data.name,
            code: parsed.data.code,
            classTeacherId: input.classTeacherId,
          };

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            classes: input.id
              ? prev.classes.map((c) => (c.id === input.id ? cls : c))
              : [...prev.classes, cls],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Class',
            entityId: cls.id,
            details: `${cls.name} (${cls.code}) সংরক্ষণ করা হয়েছে।`,
          }
        )
      );
      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/classes/${cls.id}`]: {
            id: cls.id,
            name: cls.name,
            code: cls.code,
            classTeacherUid: cls.classTeacherId ?? null,
          },
        });
      }
      return { ok: true, data: cls };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, appendAudit]
  );

  const deleteClass: AppContextValue['deleteClass'] = useCallback(
    (classId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const target = db.classes.find((c) => c.id === classId);
      const delSecs = db.sections.filter((s) => s.classId === classId);
      const delSubs = db.subjects.filter((s) => s.classId === classId);
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            classes: prev.classes.filter((c) => c.id !== classId),
            sections: prev.sections.filter((s) => s.classId !== classId),
            subjects: prev.subjects.filter((s) => s.classId !== classId),
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Class',
            entityId: classId,
            details: `শ্রেণি "${target?.name ?? classId}" মুছে ফেলা হয়েছে।`,
          }
        )
      );
      if (activeInstitutionCode) {
        const updates: Record<string, null> = {
          [`data/${activeInstitutionCode}/${academicYear}/classes/${classId}`]: null,
        };
        for (const s of delSecs) updates[`data/${activeInstitutionCode}/${academicYear}/sections/${s.id}`] = null;
        for (const sub of delSubs) updates[`data/${activeInstitutionCode}/${academicYear}/subjects/${sub.id}`] = null;
        void pushRtdbUpdates(updates);
      }
      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.classes, db.sections, db.subjects, appendAudit]
  );

  const addSection: AppContextValue['addSection'] = useCallback(
    (classId, name) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      if (!name.trim()) return { ok: false, error: 'শাখার নাম লিখুন।' };
      const sec: Section = {
        id: uid('sec'),
        institutionId: effectiveInstId,
        academicYear,
        classId,
        name: name.trim(),
      };
      setDb((prev) => ({ ...prev, sections: [...prev.sections, sec] }));
      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/sections/${sec.id}`]: {
            id: sec.id,
            classId: sec.classId,
            name: sec.name,
          },
        });
      }
      return { ok: true, data: sec };
    },
    [effectiveInstId, academicYear, activeInstitutionCode]
  );

  const deleteSection: AppContextValue['deleteSection'] = useCallback(
    (sectionId) => {
      setDb((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId),
      }));
      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/sections/${sectionId}`]: null,
        });
      }
      return { ok: true };
    },
    [activeInstitutionCode, academicYear]
  );

  const saveSubject: AppContextValue['saveSubject'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const parsed = subjectSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const sub: Subject = {
        ...input,
        id: input.id ?? uid('sub'),
        institutionId: effectiveInstId,
        academicYear,
      };
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            subjects: input.id
              ? prev.subjects.map((s) => (s.id === input.id ? sub : s))
              : [...prev.subjects, sub],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Subject',
            entityId: sub.id,
            details: `বিষয় "${sub.name}" (${sub.code}) সংরক্ষণ করা হয়েছে।`,
          }
        )
      );
      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/subjects/${sub.id}`]: {
            id: sub.id,
            classId: sub.classId,
            sectionId: sub.sectionId,
            name: sub.name,
            code: sub.code,
            isFourth: sub.isFourth,
            passRule: sub.passRule,
            hasCq: sub.hasCq,
            cqFull: sub.cqFull,
            cqPass: sub.cqPass,
            hasMcq: sub.hasMcq,
            mcqFull: sub.mcqFull,
            mcqPass: sub.mcqPass,
            hasPractical: sub.hasPractical,
            practicalFull: sub.practicalFull,
            practicalPass: sub.practicalPass,
            totalFull: sub.totalFull,
            totalPass: sub.totalPass,
          },
        });
      }
      return { ok: true, data: sub };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, appendAudit]
  );

  const deleteSubject: AppContextValue['deleteSubject'] = useCallback(
    (subjectId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      setDb((prev) => ({
        ...prev,
        subjects: prev.subjects.filter((s) => s.id !== subjectId),
        teacherAssignments: prev.teacherAssignments.filter((ta) => ta.subjectId !== subjectId),
      }));
      if (activeInstitutionCode) {
        const updates: Record<string, null> = {
          [`data/${activeInstitutionCode}/${academicYear}/subjects/${subjectId}`]: null,
        };
        for (const ta of db.teacherAssignments.filter(
          (x) => x.institutionId === effectiveInstId && x.academicYear === academicYear && x.subjectId === subjectId
        )) {
          updates[`data/${activeInstitutionCode}/${academicYear}/teacherAssignments/${ta.id}`] = null;
          updates[
            `data/${activeInstitutionCode}/${academicYear}/teacherSubjectAccess/${ta.teacherId}/${ta.classId}_${ta.sectionId ?? 'all'}_${ta.subjectId}`
          ] = null;
        }
        void pushRtdbUpdates(updates);
      }
      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.teacherAssignments]
  );

  const saveTeacherWithAssignments: AppContextValue['saveTeacherWithAssignments'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const parsed = teacherSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };
      if (!input.id && !input.forcedUserId && !input.password) {
        return { ok: false, error: 'নতুন শিক্ষকের জন্য পাসওয়ার্ড দিন।' };
      }

      const duplicate = db.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.id !== (input.id ?? input.forcedUserId)
      );
      if (duplicate) return { ok: false, error: 'এই ইমেইল ইতোমধ্যে ব্যবহৃত হয়েছে।' };

      const teacherId = input.id ?? input.forcedUserId ?? uid('u-t');
      const existing = db.users.find((u) => u.id === teacherId);
      const teacherUser: User = {
        id: teacherId,
        institutionId: effectiveInstId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        passwordHash: input.password
          ? hashPasswordSync(input.password)
          : existing?.passwordHash ?? hashPasswordSync('teacher123'),
        role: 'teacher',
        isActive: true,
        createdAt: existing?.createdAt ?? new Date().toISOString().slice(0, 10),
      };

      const newAssignments = input.assignments.map((a) => ({
        id: uid('ta'),
        institutionId: effectiveInstId,
        academicYear,
        teacherId,
        classId: a.classId,
        sectionId: a.sectionId,
        subjectId: a.subjectId,
      }));

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: prev.users.some((u) => u.id === teacherId)
              ? prev.users.map((u) => (u.id === teacherId ? teacherUser : u))
              : [...prev.users, teacherUser],
            teacherAssignments: [
              ...prev.teacherAssignments.filter(
                (ta) => !(ta.teacherId === teacherId && ta.academicYear === academicYear)
              ),
              ...newAssignments,
            ],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Teacher',
            entityId: teacherId,
            details: `শিক্ষক "${teacherUser.name}" ও ${newAssignments.length}টি বিষয় বণ্টন সংরক্ষিত হয়েছে।`,
          }
        )
      );

      if (activeInstitutionCode && !input.skipRtdbUserWrite) {
        const updates: Record<string, unknown> = {
          [`data/${activeInstitutionCode}/${academicYear}/teacherSubjectAccess/${teacherId}`]: null,
        };
        for (const oldTa of db.teacherAssignments.filter(
          (ta) => ta.institutionId === effectiveInstId && ta.teacherId === teacherId && ta.academicYear === academicYear
        )) {
          updates[`data/${activeInstitutionCode}/${academicYear}/teacherAssignments/${oldTa.id}`] = null;
        }
        for (const a of newAssignments) {
          updates[`data/${activeInstitutionCode}/${academicYear}/teacherAssignments/${a.id}`] = {
            id: a.id,
            teacherUid: a.teacherId,
            classId: a.classId,
            sectionId: a.sectionId,
            subjectId: a.subjectId,
          };
          updates[
            `data/${activeInstitutionCode}/${academicYear}/teacherSubjectAccess/${teacherId}/${a.classId}_${a.sectionId ?? 'all'}_${a.subjectId}`
          ] = true;
        }
        void pushRtdbUpdates(updates);
      }

      return { ok: true, data: teacherUser };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.users, db.teacherAssignments, appendAudit]
  );

  const removeTeacherAssignment: AppContextValue['removeTeacherAssignment'] = useCallback(
    (assignmentId) => {
      const target = db.teacherAssignments.find((ta) => ta.id === assignmentId);
      setDb((prev) => ({
        ...prev,
        teacherAssignments: prev.teacherAssignments.filter((ta) => ta.id !== assignmentId),
      }));
      if (activeInstitutionCode && target) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/teacherAssignments/${assignmentId}`]: null,
          [`data/${activeInstitutionCode}/${academicYear}/teacherSubjectAccess/${target.teacherId}/${target.classId}_${target.sectionId ?? 'all'}_${target.subjectId}`]:
            null,
        });
      }
      return { ok: true };
    },
    [activeInstitutionCode, academicYear, db.teacherAssignments]
  );

  const deleteTeacher: AppContextValue['deleteTeacher'] = useCallback(
    (teacherId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const target = db.users.find((u) => u.id === teacherId);
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: prev.users.filter((u) => u.id !== teacherId),
            teacherAssignments: prev.teacherAssignments.filter((ta) => ta.teacherId !== teacherId),
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Teacher',
            entityId: teacherId,
            details: `শিক্ষক "${target?.name ?? teacherId}" অ্যাকাউন্ট মুছে ফেলা হয়েছে।`,
          }
        )
      );
      void deleteTeacherViaServer(teacherId, academicYear);
      return { ok: true };
    },
    [effectiveInstId, academicYear, db.users, appendAudit]
  );

  const saveStudent: AppContextValue['saveStudent'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const parsed = studentSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const existingStudent = input.id ? db.students.find((s) => s.id === input.id) : null;
      const userId = existingStudent?.userId ?? input.forcedUserId ?? uid('u-st');

      const dupEmail = db.users.find(
        (u) => u.email.toLowerCase() === input.email.toLowerCase() && u.id !== userId
      );
      if (dupEmail) return { ok: false, error: 'এই লগইন ইমেইল ইতোমধ্যে ব্যবহৃত হয়েছে।' };

      const studentUser: User = {
        id: userId,
        institutionId: effectiveInstId,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.guardianPhone,
        passwordHash: input.password
          ? hashPasswordSync(input.password)
          : db.users.find((u) => u.id === userId)?.passwordHash ?? hashPasswordSync('student123'),
        role: 'student',
        isActive: true,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      const studentRecord: Student = {
        id: existingStudent?.id ?? input.forcedStudentId ?? uid('st'),
        institutionId: effectiveInstId,
        academicYear,
        userId,
        classId: parsed.data.classId,
        sectionId: parsed.data.sectionId,
        roll: parsed.data.roll,
        studentCode: parsed.data.studentCode,
        name: parsed.data.name,
        gender: input.gender,
        dob: input.dob,
        fatherName: parsed.data.fatherName,
        motherName: parsed.data.motherName,
        guardianPhone: parsed.data.guardianPhone,
        address: input.address,
        fourthSubjectId: input.fourthSubjectId,
      };

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: prev.users.some((u) => u.id === userId)
              ? prev.users.map((u) => (u.id === userId ? studentUser : u))
              : [...prev.users, studentUser],
            students: existingStudent
              ? prev.students.map((s) => (s.id === studentRecord.id ? studentRecord : s))
              : [...prev.students, studentRecord],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Student',
            entityId: studentRecord.id,
            details: `শিক্ষার্থী "${studentRecord.name}" (রোল ${studentRecord.roll}) সংরক্ষণ করা হয়েছে।`,
          }
        )
      );

      if (activeInstitutionCode && !input.skipRtdbWrite) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/students/${studentRecord.id}`]: {
            id: studentRecord.id,
            uid: studentRecord.userId,
            classId: studentRecord.classId,
            sectionId: studentRecord.sectionId,
            roll: studentRecord.roll,
            studentCode: studentRecord.studentCode,
            name: studentRecord.name,
            gender: studentRecord.gender,
            dob: studentRecord.dob,
            fatherName: studentRecord.fatherName,
            motherName: studentRecord.motherName,
            guardianPhone: studentRecord.guardianPhone,
            address: studentRecord.address,
            fourthSubjectId: studentRecord.fourthSubjectId,
          },
        });
      }

      return { ok: true, data: studentRecord };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.students, db.users, appendAudit]
  );

  const bulkImportStudents: AppContextValue['bulkImportStudents'] = useCallback(
    (rows, options) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const newUsers: User[] = [];
      const newStudents: Student[] = [];
      const takenEmails = new Set(db.users.map((u) => u.email.toLowerCase()));

      for (const r of rows) {
        if (takenEmails.has(r.email.toLowerCase())) continue;
        takenEmails.add(r.email.toLowerCase());
        const userId = r.forcedUserId ?? uid('u-st');
        newUsers.push({
          id: userId,
          institutionId: effectiveInstId,
          name: r.name,
          email: r.email,
          phone: r.guardianPhone,
          passwordHash: hashPasswordSync('student123'),
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString().slice(0, 10),
        });
        newStudents.push({
          id: r.forcedStudentId ?? uid('st'),
          institutionId: effectiveInstId,
          academicYear,
          userId,
          classId: r.classId,
          sectionId: r.sectionId,
          roll: r.roll,
          studentCode: r.studentCode,
          name: r.name,
          gender: r.gender,
          dob: '2012-01-01',
          fatherName: r.fatherName,
          motherName: r.motherName,
          guardianPhone: r.guardianPhone,
          address: '',
          fourthSubjectId: null,
        });
      }

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            users: [...prev.users, ...newUsers],
            students: [...prev.students, ...newStudents],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Student',
            entityId: 'bulk',
            details: `CSV/Excel থেকে ${newStudents.length} জন শিক্ষার্থী বাল্ক ইমপোর্ট করা হয়েছে।`,
          }
        )
      );

      if (activeInstitutionCode && !options?.skipRtdbWrite && newStudents.length > 0) {
        const bulkUpdates: Record<string, unknown> = {};
        for (const st of newStudents) {
          bulkUpdates[`data/${activeInstitutionCode}/${academicYear}/students/${st.id}`] = {
            id: st.id,
            uid: st.userId,
            classId: st.classId,
            sectionId: st.sectionId,
            roll: st.roll,
            studentCode: st.studentCode,
            name: st.name,
            gender: st.gender,
            dob: st.dob,
            fatherName: st.fatherName,
            motherName: st.motherName,
            guardianPhone: st.guardianPhone,
            address: st.address,
            fourthSubjectId: st.fourthSubjectId,
          };
        }
        void pushRtdbUpdates(bulkUpdates);
      }

      return { ok: true, data: newStudents.length };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.users, appendAudit]
  );

  const deleteStudent: AppContextValue['deleteStudent'] = useCallback(
    (studentId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const st = db.students.find((s) => s.id === studentId);
      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            students: prev.students.filter((s) => s.id !== studentId),
            users: st ? prev.users.filter((u) => u.id !== st.userId) : prev.users,
            marks: prev.marks.filter((m) => m.studentId !== studentId),
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Student',
            entityId: studentId,
            details: `শিক্ষার্থী "${st?.name ?? studentId}" মুছে ফেলা হয়েছে।`,
          }
        )
      );
      void deleteStudentViaServer(studentId, academicYear, activeInstitutionCode ?? undefined);
      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.students, appendAudit]
  );

  const saveExamWithRules: AppContextValue['saveExamWithRules'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const parsed = examSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const examId = input.id ?? uid('ex');
      const exam: Exam = {
        id: examId,
        institutionId: effectiveInstId,
        academicYear,
        name: parsed.data.name,
        defaultClassId: parsed.data.defaultClassId,
        sectionId: input.sectionId,
        startDate: parsed.data.startDate,
        endDate: parsed.data.endDate,
        marksDeadline: input.marksDeadline || parsed.data.endDate,
      };

      const rules: ExamRule[] = input.rules.map((r) => ({
        ...r,
        id: uid('er'),
        institutionId: effectiveInstId,
        academicYear,
        examId,
      }));

      const combos: SubjectCombination[] = input.combinations.map((c) => ({
        ...c,
        id: uid('cmb'),
        institutionId: effectiveInstId,
        academicYear,
        examId,
      }));

      const auditDetails = `পরীক্ষা "${exam.name}" (${rules.length}টি বিষয় নিয়ম, ${combos.length}টি সমন্বয়) সংরক্ষিত হয়েছে।`;

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            exams: input.id
              ? prev.exams.map((e) => (e.id === examId ? exam : e))
              : [...prev.exams, exam],
            examRules: [...prev.examRules.filter((r) => r.examId !== examId), ...rules],
            subjectCombinations: [
              ...prev.subjectCombinations.filter((c) => c.examId !== examId),
              ...combos,
            ],
          },
          {
            institutionId: effectiveInstId,
            action: 'পরীক্ষা তৈরি',
            entityType: 'Exam',
            entityId: examId,
            details: auditDetails,
          }
        )
      );

      if (activeInstitutionCode) {
        const rulesMap: Record<string, unknown> = {};
        for (const r of rules) {
          rulesMap[r.id] = {
            id: r.id,
            examId: r.examId,
            classId: r.classId,
            sectionId: r.sectionId,
            subjectId: r.subjectId,
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
        }
        const combosMap: Record<string, unknown> = {};
        for (const c of combos) {
          combosMap[c.id] = {
            id: c.id,
            examId: c.examId,
            classId: c.classId,
            name: c.name,
            paperSubjectIds: c.paperSubjectIds,
            mode: c.mode,
            passRule: c.passRule,
            isFourth: c.isFourth,
          };
        }
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/exams/${examId}`]: {
            id: exam.id,
            name: exam.name,
            defaultClassId: exam.defaultClassId,
            sectionId: exam.sectionId,
            startDate: exam.startDate,
            endDate: exam.endDate,
            marksDeadline: exam.marksDeadline,
          },
          [`data/${activeInstitutionCode}/${academicYear}/examRules/${examId}`]:
            Object.keys(rulesMap).length > 0 ? rulesMap : null,
          [`data/${activeInstitutionCode}/${academicYear}/subjectCombinations/${examId}`]:
            Object.keys(combosMap).length > 0 ? combosMap : null,
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'পরীক্ষা তৈরি',
            entityType: 'Exam',
            entityId: examId,
            details: auditDetails,
          }),
        });
      }

      return { ok: true, data: exam };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, appendAudit, buildAuditRtdbUpdates]
  );

  const deleteExam: AppContextValue['deleteExam'] = useCallback(
    (examId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const target = db.exams.find((e) => e.id === examId);
      const auditDetails = `পরীক্ষা "${target?.name ?? examId}" মুছে ফেলা হয়েছে।`;

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            exams: prev.exams.filter((e) => e.id !== examId),
            examRules: prev.examRules.filter((r) => r.examId !== examId),
            subjectCombinations: prev.subjectCombinations.filter((c) => c.examId !== examId),
            marks: prev.marks.filter((m) => m.examId !== examId),
            resultPublications: prev.resultPublications.filter((p) => p.examId !== examId),
          },
          {
            institutionId: effectiveInstId,
            action: 'পরীক্ষা তৈরি',
            entityType: 'Exam',
            entityId: examId,
            details: auditDetails,
          }
        )
      );

      if (activeInstitutionCode) {
        const delUpdates: Record<string, unknown> = {
          [`data/${activeInstitutionCode}/${academicYear}/exams/${examId}`]: null,
          [`data/${activeInstitutionCode}/${academicYear}/examRules/${examId}`]: null,
          [`data/${activeInstitutionCode}/${academicYear}/subjectCombinations/${examId}`]: null,
          [`data/${activeInstitutionCode}/${academicYear}/marks/${examId}`]: null,
          [`data/${activeInstitutionCode}/${academicYear}/resultPublications/${examId}`]: null,
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'পরীক্ষা তৈরি',
            entityType: 'Exam',
            entityId: examId,
            details: auditDetails,
          }),
        };
        for (const st of db.students.filter(
          (s) => s.institutionId === effectiveInstId && s.academicYear === academicYear
        )) {
          delUpdates[`data/${activeInstitutionCode}/${academicYear}/publishedResults/${st.userId}/${examId}`] =
            null;
        }
        void pushRtdbUpdates(delUpdates);
      }

      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.exams, db.students, appendAudit, buildAuditRtdbUpdates]
  );

  const toggleSectionPublication: AppContextValue['toggleSectionPublication'] = useCallback(
    (examId, classId, sectionId, published) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const exam = db.exams.find((e) => e.id === examId);
      const section = db.sections.find((s) => s.id === sectionId);
      const publishedAt = published ? new Date().toISOString().slice(0, 10) : null;
      const auditDetails = `${exam?.name ?? ''} — শাখা "${section?.name ?? ''}" ${published ? 'প্রকাশিত' : 'অপ্রকাশিত'} করা হয়েছে।`;

      setDb((prev) => {
        const existing = prev.resultPublications.find(
          (p) => p.examId === examId && p.sectionId === sectionId
        );
        const updatedList = existing
          ? prev.resultPublications.map((p) =>
              p.examId === examId && p.sectionId === sectionId
                ? { ...p, published, publishedAt }
                : p
            )
          : [
              ...prev.resultPublications,
              {
                id: uid('pub'),
                institutionId: effectiveInstId,
                academicYear,
                examId,
                classId,
                sectionId,
                published,
                publishedAt,
              },
            ];
        return appendAudit(
          { ...prev, resultPublications: updatedList },
          {
            institutionId: effectiveInstId,
            action: 'ফলাফল প্রকাশ',
            entityType: 'ResultPublication',
            entityId: `${examId}:${sectionId}`,
            details: auditDetails,
          }
        );
      });

      if (activeInstitutionCode) {
        const pubUpdates = buildPublishedResultsUpdates({
          institutionCode: activeInstitutionCode,
          institutionId: effectiveInstId,
          academicYear,
          examId,
          classId,
          sectionId,
          published,
          publishedAt,
          db,
        });
        void pushRtdbUpdates({
          ...pubUpdates,
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'ফলাফল প্রকাশ',
            entityType: 'ResultPublication',
            entityId: `${examId}:${sectionId}`,
            details: auditDetails,
          }),
        });
      }

      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db, appendAudit, buildAuditRtdbUpdates]
  );

  const saveMarksBatch: AppContextValue['saveMarksBatch'] = useCallback(
    (input) => {
      if (!effectiveInstId || !user) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      if (repo && !repo.canTeacherAccess(input.classId, input.sectionId, input.subjectId)) {
        return { ok: false, error: 'এই শ্রেণি বা বিষয়ে নম্বর প্রদানের অনুমতি নেই।' };
      }

      const subject = db.subjects.find((s) => s.id === input.subjectId);
      const updatedAt = new Date().toISOString();

      const preDiffs: Array<{ roll: number; before: Record<string, unknown>; after: Record<string, unknown> }> = [];
      for (const entry of input.entries) {
        const old = db.marks.find(
          (m) =>
            m.examId === input.examId &&
            m.subjectId === input.subjectId &&
            m.studentId === entry.studentId
        );
        if (old && (old.cq !== entry.cq || old.mcq !== entry.mcq || old.practical !== entry.practical)) {
          const st = db.students.find((s) => s.id === entry.studentId);
          preDiffs.push({
            roll: st?.roll ?? 0,
            before: { cq: old.cq, mcq: old.mcq, practical: old.practical },
            after: { cq: entry.cq, mcq: entry.mcq, practical: entry.practical },
          });
        }
      }
      const isEdit = preDiffs.length > 0;
      const firstDiff = preDiffs[0];
      const auditDetails = isEdit
        ? `${subject?.name ?? ''} বিষয়ে ${preDiffs.length} জন শিক্ষার্থীর নম্বর পরিবর্তন (যেমন রোল ${firstDiff.roll}) ও "${input.status === 'draft' ? 'খসড়া' : 'জমা'}" সংরক্ষণ।`
        : `${subject?.name ?? ''} বিষয়ে ${input.entries.length} জন শিক্ষার্থীর নম্বর (${input.status === 'draft' ? 'খসড়া' : 'জমা'}) সংরক্ষণ।`;

      setDb((prev) => {
        const nextMarks = [...prev.marks];
        for (const entry of input.entries) {
          const existingIdx = nextMarks.findIndex(
            (m) =>
              m.examId === input.examId &&
              m.subjectId === input.subjectId &&
              m.studentId === entry.studentId
          );
          if (existingIdx >= 0) {
            nextMarks[existingIdx] = {
              ...nextMarks[existingIdx],
              cq: entry.cq,
              mcq: entry.mcq,
              practical: entry.practical,
              status: input.status,
              updatedById: user.id,
              updatedAt,
            };
          } else {
            nextMarks.push({
              id: uid('mk'),
              institutionId: effectiveInstId,
              academicYear,
              examId: input.examId,
              classId: input.classId,
              sectionId: input.sectionId,
              subjectId: input.subjectId,
              studentId: entry.studentId,
              cq: entry.cq,
              mcq: entry.mcq,
              practical: entry.practical,
              status: input.status,
              updatedById: user.id,
              updatedAt,
            });
          }
        }

        return appendAudit(
          { ...prev, marks: nextMarks },
          {
            institutionId: effectiveInstId,
            action: isEdit ? 'নম্বর পরিবর্তন' : 'নম্বর এন্ট্রি',
            entityType: 'Mark',
            entityId: `${input.examId}:${input.subjectId}`,
            details: auditDetails,
            beforeValue: firstDiff?.before ?? null,
            afterValue: firstDiff?.after ?? null,
          }
        );
      });

      if (activeInstitutionCode) {
        const markUpdates: Record<string, unknown> = {
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: isEdit ? 'নম্বর পরিবর্তন' : 'নম্বর এন্ট্রি',
            entityType: 'Mark',
            entityId: `${input.examId}:${input.subjectId}`,
            details: auditDetails,
            beforeValue: firstDiff?.before ?? null,
            afterValue: firstDiff?.after ?? null,
          }),
        };
        for (const entry of input.entries) {
          markUpdates[
            `data/${activeInstitutionCode}/${academicYear}/marks/${input.examId}/${input.classId}/${input.sectionId}/${input.subjectId}/${entry.studentId}`
          ] = {
            cq: entry.cq,
            mcq: entry.mcq,
            practical: entry.practical,
            status: input.status,
            updatedByUid: user.id,
            updatedAt,
          };
        }
        void pushRtdbUpdates(markUpdates);
      }

      return { ok: true };
    },
    [effectiveInstId, user, repo, db.subjects, db.marks, db.students, academicYear, activeInstitutionCode, appendAudit, buildAuditRtdbUpdates]
  );

  const approveSubjectMarks: AppContextValue['approveSubjectMarks'] = useCallback(
    (examId, subjectId, sectionId) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const subject = db.subjects.find((s) => s.id === subjectId);
      const auditDetails = `${subject?.name ?? ''} বিষয়ের নম্বর অনুমোদন করা হয়েছে।`;
      const matchingMarks = db.marks.filter(
        (m) =>
          m.institutionId === effectiveInstId &&
          m.academicYear === academicYear &&
          m.examId === examId &&
          m.subjectId === subjectId &&
          (!sectionId || m.sectionId === sectionId)
      );

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            marks: prev.marks.map((m) =>
              m.examId === examId &&
              m.subjectId === subjectId &&
              (!sectionId || m.sectionId === sectionId)
                ? { ...m, status: 'approved' }
                : m
            ),
          },
          {
            institutionId: effectiveInstId,
            action: 'ফলাফল প্রকাশ',
            entityType: 'MarkApproval',
            entityId: `${examId}:${subjectId}`,
            details: auditDetails,
          }
        )
      );

      if (activeInstitutionCode && matchingMarks.length > 0) {
        const approvalUpdates: Record<string, unknown> = {
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'ফলাফল প্রকাশ',
            entityType: 'MarkApproval',
            entityId: `${examId}:${subjectId}`,
            details: auditDetails,
          }),
        };
        for (const m of matchingMarks) {
          approvalUpdates[
            `data/${activeInstitutionCode}/${academicYear}/marks/${m.examId}/${m.classId}/${m.sectionId}/${m.subjectId}/${m.studentId}/status`
          ] = 'approved';
        }
        void pushRtdbUpdates(approvalUpdates);
      }

      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.subjects, db.marks, appendAudit, buildAuditRtdbUpdates]
  );

  const createAssignment: AppContextValue['createAssignment'] = useCallback(
    (input) => {
      if (!effectiveInstId || !user) return { ok: false, error: 'অনুমতি নেই।' };
      const parsed = assignmentSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const id = uid('asg');
      const createdAt = new Date().toISOString().slice(0, 10);
      const auditDetails = `নতুন অ্যাসাইনমেন্ট "${parsed.data.title}" প্রকাশিত হয়েছে।`;

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            assignments: [
              {
                id,
                institutionId: effectiveInstId,
                academicYear,
                teacherId: user.id,
                classId: parsed.data.classId,
                sectionId: parsed.data.sectionId,
                subjectId: input.subjectId,
                title: parsed.data.title,
                description: parsed.data.description,
                fullMarks: parsed.data.fullMarks,
                dueDate: parsed.data.dueDate,
                createdAt,
              },
              ...prev.assignments,
            ],
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Assignment',
            entityId: id,
            details: auditDetails,
          }
        )
      );

      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/assignments/${id}`]: {
            id,
            teacherUid: user.id,
            classId: parsed.data.classId,
            sectionId: parsed.data.sectionId,
            subjectId: input.subjectId,
            title: parsed.data.title,
            description: parsed.data.description,
            fullMarks: parsed.data.fullMarks,
            dueDate: parsed.data.dueDate,
            createdAt,
          },
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Assignment',
            entityId: id,
            details: auditDetails,
          }),
        });
      }

      return { ok: true };
    },
    [effectiveInstId, user, academicYear, activeInstitutionCode, appendAudit, buildAuditRtdbUpdates]
  );

  const submitStudentAssignment: AppContextValue['submitStudentAssignment'] = useCallback(
    (assignmentId, studentId, answerText) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const trimmed = answerText.trim();
      if (trimmed.length < 5) {
        return { ok: false, error: 'অনুগ্রহ করে কমপক্ষে ৫ অক্ষরের উত্তর লিখুন।' };
      }

      const existing = db.submissions.find(
        (s) => s.assignmentId === assignmentId && s.studentId === studentId
      );
      const submId = existing?.id ?? uid('subm');
      const submittedAt = new Date().toISOString();
      const student = db.students.find((s) => s.id === studentId);
      const studentUid = student?.userId || user?.id || studentId;

      setDb((prev) => {
        const updated = existing
          ? prev.submissions.map((s) =>
              s.id === existing.id ? { ...s, answerText: trimmed, submittedAt } : s
            )
          : [
              ...prev.submissions,
              {
                id: submId,
                institutionId: effectiveInstId,
                assignmentId,
                studentId,
                answerText: trimmed,
                marks: null,
                feedback: '',
                submittedAt,
                gradedAt: null,
              },
            ];
        return { ...prev, submissions: updated };
      });

      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/submissions/${assignmentId}/${studentUid}`]: {
            id: submId,
            assignmentId,
            studentId,
            studentUid,
            answerText: trimmed,
            marks: existing?.marks ?? null,
            feedback: existing?.feedback ?? '',
            submittedAt,
            gradedAt: existing?.gradedAt ?? null,
          },
        });
      }

      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, db.submissions, db.students, user]
  );

  const gradeSubmission: AppContextValue['gradeSubmission'] = useCallback(
    (submissionId, marks, feedback) => {
      const sub = db.submissions.find((s) => s.id === submissionId);
      if (!sub) return { ok: false, error: 'উত্তরপত্র পাওয়া যায়নি।' };
      const asg = db.assignments.find((a) => a.id === sub.assignmentId);
      if (asg && (marks < 0 || marks > asg.fullMarks)) {
        return { ok: false, error: `নম্বর ০ থেকে ${asg.fullMarks} এর মধ্যে হতে হবে।` };
      }
      const gradedAt = new Date().toISOString();
      const student = db.students.find((s) => s.id === sub.studentId);
      const studentUid = student?.userId || sub.studentId;

      setDb((prev) => ({
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId ? { ...s, marks, feedback, gradedAt } : s
        ),
      }));

      if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/submissions/${sub.assignmentId}/${studentUid}/marks`]:
            marks,
          [`data/${activeInstitutionCode}/${academicYear}/submissions/${sub.assignmentId}/${studentUid}/feedback`]:
            feedback,
          [`data/${activeInstitutionCode}/${academicYear}/submissions/${sub.assignmentId}/${studentUid}/gradedAt`]:
            gradedAt,
        });
      }

      return { ok: true };
    },
    [db.submissions, db.assignments, db.students, activeInstitutionCode, academicYear]
  );

  const publishNotice: AppContextValue['publishNotice'] = useCallback(
    (input) => {
      if (!user) return { ok: false, error: 'লগইন প্রয়োজন।' };
      const parsed = noticeSchema.safeParse(input);
      if (!parsed.success) return { ok: false, error: formatZodError(parsed.error) };

      const targetInst = user.role === 'super_admin' && !actingInstitutionId ? null : effectiveInstId;
      const id = uid('not');
      const createdAt = new Date().toISOString().slice(0, 10);
      const auditDetails = `নোটিশ প্রকাশিত হয়েছে: "${parsed.data.title}"`;

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            notices: [
              {
                id,
                institutionId: targetInst,
                academicYear: targetInst ? academicYear : null,
                authorId: user.id,
                authorName: user.name,
                title: parsed.data.title,
                body: parsed.data.body,
                audience: parsed.data.audience,
                createdAt,
              },
              ...prev.notices,
            ],
          },
          {
            institutionId: targetInst,
            action: 'নোটিশ',
            entityType: 'Notice',
            entityId: id,
            details: auditDetails,
          }
        )
      );

      const noticePayload = {
        id,
        authorUid: user.id,
        authorName: user.name,
        title: parsed.data.title,
        body: parsed.data.body,
        audience: parsed.data.audience,
        createdAt,
      };
      if (targetInst === null) {
        void pushRtdbUpdates({
          [`platform/notices/${id}`]: noticePayload,
          ...buildAuditRtdbUpdates(null, academicYear, {
            action: 'নোটিশ',
            entityType: 'Notice',
            entityId: id,
            details: auditDetails,
          }),
        });
      } else if (activeInstitutionCode) {
        void pushRtdbUpdates({
          [`data/${activeInstitutionCode}/${academicYear}/notices/${id}`]: noticePayload,
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'নোটিশ',
            entityType: 'Notice',
            entityId: id,
            details: auditDetails,
          }),
        });
      }

      return { ok: true };
    },
    [user, actingInstitutionId, effectiveInstId, academicYear, activeInstitutionCode, appendAudit, buildAuditRtdbUpdates]
  );

  const deleteNotice: AppContextValue['deleteNotice'] = useCallback(
    (noticeId) => {
      const target = db.notices.find((n) => n.id === noticeId);
      setDb((prev) => ({
        ...prev,
        notices: prev.notices.filter((n) => n.id !== noticeId),
      }));
      if (target) {
        if (target.institutionId === null) {
          void pushRtdbUpdates({ [`platform/notices/${noticeId}`]: null });
        } else {
          const code = resolveInstitutionCode(target.institutionId, db.institutions);
          const yr = target.academicYear ?? academicYear;
          if (code) {
            void pushRtdbUpdates({ [`data/${code}/${yr}/notices/${noticeId}`]: null });
          }
        }
      }
      return { ok: true };
    },
    [db.notices, db.institutions, academicYear]
  );

  const updateInstitutionSettings: AppContextValue['updateInstitutionSettings'] = useCallback(
    (input) => {
      if (!effectiveInstId) return { ok: false, error: 'প্রতিষ্ঠান নির্বাচিত নয়।' };
      const auditDetails = 'প্রতিষ্ঠানের তথ্য, গ্রেডিং স্কেল ও ৪র্থ বিষয়ের নিয়মাবলি হালনাগাদ করা হয়েছে।';

      setDb((prev) =>
        appendAudit(
          {
            ...prev,
            institutions: input.institutionPatch
              ? prev.institutions.map((i) =>
                  i.id === effectiveInstId ? { ...i, ...input.institutionPatch } : i
                )
              : prev.institutions,
            settings: prev.settings.map((s) =>
              s.institutionId === effectiveInstId
                ? {
                    ...s,
                    numeralLocale: input.numeralLocale,
                    fourthConfig: input.fourthConfig,
                    gradingScale: input.gradingScale,
                  }
                : s
            ),
          },
          {
            institutionId: effectiveInstId,
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Settings',
            entityId: effectiveInstId,
            details: auditDetails,
          }
        )
      );

      if (activeInstitutionCode) {
        const settingsUpdates: Record<string, unknown> = {
          [`institutions/${activeInstitutionCode}/settings`]: {
            numeralLocale: input.numeralLocale,
            fourthConfig: input.fourthConfig,
            gradingScale: input.gradingScale,
          },
          ...buildAuditRtdbUpdates(activeInstitutionCode, academicYear, {
            action: 'ব্যবহারকারী ও কাঠামো',
            entityType: 'Settings',
            entityId: effectiveInstId,
            details: auditDetails,
          }),
        };
        if (input.institutionPatch) {
          for (const [k, v] of Object.entries(input.institutionPatch)) {
            if (v !== undefined) {
              settingsUpdates[`institutions/${activeInstitutionCode}/meta/${k}`] = v;
            }
          }
        }
        void pushRtdbUpdates(settingsUpdates);
      }

      return { ok: true };
    },
    [effectiveInstId, academicYear, activeInstitutionCode, appendAudit, buildAuditRtdbUpdates]
  );

  const value: AppContextValue = {
    db,
    user,
    actingInstitutionId,
    activeInstitutionCode,
    academicYear,
    theme,
    numeralLocale,
    toasts,
    repo,
    showToast,
    dismissToast,
    toggleTheme,
    setNumeralLocale,
    setAcademicYear,
    setActingInstitutionId,
    resetDemoData,
    loginWithCredentials,
    loginDemoRole,
    logout,
    registerInstitution,
    updateInstitutionStatus,
    addInstitutionByAdmin,
    deleteInstitution,
    resetUserPassword,
    deleteUserAccount,
    addAcademicYear,
    deleteAcademicYear,
    saveClass,
    deleteClass,
    addSection,
    deleteSection,
    saveSubject,
    deleteSubject,
    saveTeacherWithAssignments,
    removeTeacherAssignment,
    deleteTeacher,
    saveStudent,
    bulkImportStudents,
    deleteStudent,
    saveExamWithRules,
    deleteExam,
    toggleSectionPublication,
    saveMarksBatch,
    approveSubjectMarks,
    createAssignment,
    submitStudentAssignment,
    gradeSubmission,
    publishNotice,
    deleteNotice,
    updateInstitutionSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
