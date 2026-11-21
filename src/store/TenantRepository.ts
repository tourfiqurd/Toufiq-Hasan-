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
  ResultPublication,
  Section,
  SessionUser,
  Student,
  Subject,
  SubjectCombination,
  Submission,
  TeacherAssignment,
  User,
} from '../types/domain';

export interface TenantContext {
  user: SessionUser;
  actingInstitutionId: string | null;
  academicYear: number;
}

/**
 * Single multi-tenant and academic-year data access layer.
 * Every dashboard query routes through this repository to guarantee tenant isolation.
 */
export class TenantRepository {
  private db: AcademiaDatabase;
  private ctx: TenantContext;

  constructor(db: AcademiaDatabase, ctx: TenantContext) {
    this.db = db;
    this.ctx = ctx;
  }

  getEffectiveInstitutionId(): string | null {
    if (this.ctx.user.role === 'super_admin') {
      return this.ctx.actingInstitutionId;
    }
    return this.ctx.user.institutionId;
  }

  private requireInstitutionId(): string {
    const id = this.getEffectiveInstitutionId();
    if (!id) {
      throw new Error('অনুগ্রহ করে প্রথমে একটি প্রতিষ্ঠান নির্বাচন করুন।');
    }
    return id;
  }

  getInstitution(): Institution | null {
    const instId = this.getEffectiveInstitutionId();
    if (!instId) return null;
    return this.db.institutions.find((i) => i.id === instId) ?? null;
  }

  getSettings(): InstitutionSettings | null {
    const instId = this.getEffectiveInstitutionId();
    if (!instId) return null;
    return this.db.settings.find((s) => s.institutionId === instId) ?? null;
  }

  getAcademicYears(): AcademicYear[] {
    const instId = this.getEffectiveInstitutionId();
    if (!instId) return [];
    return this.db.academicYears
      .filter((y) => y.institutionId === instId)
      .sort((a, b) => b.year - a.year);
  }

  getClasses(): ClassRoom[] {
    const instId = this.requireInstitutionId();
    return this.db.classes.filter(
      (c) => c.institutionId === instId && c.academicYear === this.ctx.academicYear
    );
  }

  getSections(classId?: string): Section[] {
    const instId = this.requireInstitutionId();
    return this.db.sections.filter(
      (s) =>
        s.institutionId === instId &&
        s.academicYear === this.ctx.academicYear &&
        (!classId || s.classId === classId)
    );
  }

  getSubjects(classId?: string, sectionId?: string | null): Subject[] {
    const instId = this.requireInstitutionId();
    return this.db.subjects.filter(
      (s) =>
        s.institutionId === instId &&
        s.academicYear === this.ctx.academicYear &&
        (!classId || s.classId === classId) &&
        (!sectionId || s.sectionId === null || s.sectionId === sectionId)
    );
  }

  getTeachers(): User[] {
    const instId = this.requireInstitutionId();
    return this.db.users.filter((u) => u.institutionId === instId && u.role === 'teacher');
  }

  getTeacherAssignments(teacherId?: string): TeacherAssignment[] {
    const instId = this.requireInstitutionId();
    const targetTeacher =
      this.ctx.user.role === 'teacher' ? this.ctx.user.id : teacherId;
    return this.db.teacherAssignments.filter(
      (ta) =>
        ta.institutionId === instId &&
        ta.academicYear === this.ctx.academicYear &&
        (!targetTeacher || ta.teacherId === targetTeacher)
    );
  }

  /**
   * Teacher scoping helper: ensures teachers only read/write assigned class+section+subject.
   */
  canTeacherAccess(classId: string, sectionId: string, subjectId?: string): boolean {
    if (this.ctx.user.role === 'super_admin' || this.ctx.user.role === 'institution_admin') {
      return true;
    }
    if (this.ctx.user.role !== 'teacher') return false;
    const assignments = this.getTeacherAssignments(this.ctx.user.id);
    return assignments.some(
      (a) =>
        a.classId === classId &&
        (a.sectionId === null || a.sectionId === sectionId) &&
        (!subjectId || a.subjectId === subjectId)
    );
  }

  getStudents(classId?: string, sectionId?: string): Student[] {
    const instId = this.requireInstitutionId();
    let list = this.db.students.filter(
      (s) => s.institutionId === instId && s.academicYear === this.ctx.academicYear
    );
    if (this.ctx.user.role === 'student') {
      list = list.filter((s) => s.userId === this.ctx.user.id);
    } else if (this.ctx.user.role === 'parent') {
      const childIds = new Set(
        this.db.parentLinks
          .filter((pl) => pl.institutionId === instId && pl.parentUserId === this.ctx.user.id)
          .map((pl) => pl.studentId)
      );
      list = list.filter((s) => childIds.has(s.id));
    }
    if (classId) list = list.filter((s) => s.classId === classId);
    if (sectionId) list = list.filter((s) => s.sectionId === sectionId);
    return list.sort((a, b) => a.roll - b.roll);
  }

  getExams(): Exam[] {
    const instId = this.requireInstitutionId();
    return this.db.exams.filter(
      (e) => e.institutionId === instId && e.academicYear === this.ctx.academicYear
    );
  }

  getExamRules(examId: string): ExamRule[] {
    const instId = this.requireInstitutionId();
    return this.db.examRules.filter(
      (r) =>
        r.institutionId === instId &&
        r.academicYear === this.ctx.academicYear &&
        r.examId === examId
    );
  }

  getSubjectCombinations(examId: string): SubjectCombination[] {
    const instId = this.requireInstitutionId();
    return this.db.subjectCombinations.filter(
      (c) =>
        c.institutionId === instId &&
        c.academicYear === this.ctx.academicYear &&
        c.examId === examId
    );
  }

  getMarks(examId: string, subjectId?: string, sectionId?: string): Mark[] {
    const instId = this.requireInstitutionId();
    return this.db.marks.filter(
      (m) =>
        m.institutionId === instId &&
        m.academicYear === this.ctx.academicYear &&
        m.examId === examId &&
        (!subjectId || m.subjectId === subjectId) &&
        (!sectionId || m.sectionId === sectionId)
    );
  }

  getPublications(examId?: string): ResultPublication[] {
    const instId = this.requireInstitutionId();
    return this.db.resultPublications.filter(
      (p) =>
        p.institutionId === instId &&
        p.academicYear === this.ctx.academicYear &&
        (!examId || p.examId === examId)
    );
  }

  isSectionPublished(examId: string, sectionId: string): boolean {
    const instId = this.requireInstitutionId();
    return this.db.resultPublications.some(
      (p) =>
        p.institutionId === instId &&
        p.academicYear === this.ctx.academicYear &&
        p.examId === examId &&
        p.sectionId === sectionId &&
        p.published
    );
  }

  getAssignments(): Assignment[] {
    const instId = this.requireInstitutionId();
    let list = this.db.assignments.filter(
      (a) => a.institutionId === instId && a.academicYear === this.ctx.academicYear
    );
    if (this.ctx.user.role === 'teacher') {
      list = list.filter((a) => a.teacherId === this.ctx.user.id);
    } else if (this.ctx.user.role === 'student' || this.ctx.user.role === 'parent') {
      const students = this.getStudents();
      const pairSet = new Set(students.map((s) => `${s.classId}:${s.sectionId}`));
      list = list.filter((a) => pairSet.has(`${a.classId}:${a.sectionId}`));
    }
    return list;
  }

  getSubmissions(assignmentId?: string): Submission[] {
    const instId = this.requireInstitutionId();
    return this.db.submissions.filter(
      (s) => s.institutionId === instId && (!assignmentId || s.assignmentId === assignmentId)
    );
  }

  getNotices(): Notice[] {
    if (this.ctx.user.role === 'super_admin' && !this.ctx.actingInstitutionId) {
      return [...this.db.notices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const instId = this.getEffectiveInstitutionId();
    return this.db.notices
      .filter((n) => {
        const matchesTenant = n.institutionId === null || n.institutionId === instId;
        if (!matchesTenant) return false;
        if (this.ctx.user.role === 'teacher') {
          return n.audience === 'all' || n.audience === 'teachers';
        }
        if (this.ctx.user.role === 'student') {
          return n.audience === 'all' || n.audience === 'students';
        }
        if (this.ctx.user.role === 'parent') {
          return n.audience === 'all' || n.audience === 'parents';
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getAuditLogs(): AuditLog[] {
    if (this.ctx.user.role === 'super_admin' && !this.ctx.actingInstitutionId) {
      return this.db.auditLogs;
    }
    const instId = this.getEffectiveInstitutionId();
    return this.db.auditLogs.filter((l) => l.institutionId === instId);
  }
}
