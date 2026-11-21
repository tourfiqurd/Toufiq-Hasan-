import { createSeedDatabase } from '../src/data/seed.ts';
import { adminAuth, adminRtdb, USE_FIREBASE_EMULATOR, type ClaimRole } from './firebaseAdmin.ts';

const INSTITUTION_CODE_MAP: Record<string, string> = {
  'inst-1': 'ACD-00001',
  'inst-2': 'ACD-00002',
  'inst-3': 'ACD-00003',
};

const DEMO_PASSWORDS: Record<string, string> = {
  'superadmin@academia.edu.bd': 'admin123',
  'principal@adarsha.edu.bd': 'principal123',
  'teacher1@adarsha.edu.bd': 'teacher123',
  'student1@adarsha.edu.bd': 'student123',
  'parent@adarsha.edu.bd': 'parent123',
};

function mapSeedRoleToClaim(role: string): ClaimRole {
  if (role === 'institution_admin') return 'principal';
  if (
    role === 'super_admin' ||
    role === 'teacher' ||
    role === 'student' ||
    role === 'parent'
  ) {
    return role;
  }
  return 'student';
}

export async function seedDemoIntoEmulator(): Promise<{
  seeded: boolean;
  usersCount: number;
  institutionsCount: number;
}> {
  if (!USE_FIREBASE_EMULATOR) {
    throw new Error('Emulator seeder cannot run when USE_FIREBASE_EMULATOR is false.');
  }

  const existingCounter = await adminRtdb.ref('counters/institutionCode').get();
  if (existingCounter.exists()) {
    return { seeded: false, usersCount: 0, institutionsCount: 0 };
  }

  const db = createSeedDatabase();
  const uidBySeedUserId: Record<string, string> = {};
  let createdUsers = 0;

  for (const u of db.users) {
    const claimRole = mapSeedRoleToClaim(u.role);
    const instCode = u.institutionId ? INSTITUTION_CODE_MAP[u.institutionId] ?? null : null;
    const instName = u.institutionId
      ? db.institutions.find((i) => i.id === u.institutionId)?.name ?? null
      : null;

    let uid = u.id;
    try {
      const existing = await adminAuth.getUserByEmail(u.email);
      uid = existing.uid;
    } catch {
      const created = await adminAuth.createUser({
        uid: u.id,
        email: u.email,
        password: DEMO_PASSWORDS[u.email] || 'demo1234',
        displayName: u.name,
        emailVerified: true,
      });
      uid = created.uid;
      createdUsers += 1;
    }

    await adminAuth.setCustomUserClaims(uid, {
      role: claimRole,
      institutionCode: instCode,
    });

    uidBySeedUserId[u.id] = uid;

    const linkedStudent = u.role === 'student' ? db.students.find((s) => s.userId === u.id) : undefined;

    await adminRtdb.ref(`users/${uid}`).set({
      uid,
      ...(linkedStudent ? { studentId: linkedStudent.id } : {}),
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: claimRole,
      institution: instName,
      institutionCode: instCode,
      isActive: u.isActive,
      createdAt: u.createdAt,
    });
  }

  const updates: Record<string, unknown> = {
    'counters/institutionCode': 3,
  };

  for (const inst of db.institutions) {
    const code = INSTITUTION_CODE_MAP[inst.id] ?? 'ACD-00099';
    if (inst.status === 'pending') {
      const appId = `app-${inst.id}`;
      updates[`institutionApplications/${appId}`] = {
        id: appId,
        institutionName: inst.name,
        type: inst.type,
        eiin: inst.eiin,
        address: inst.address,
        district: inst.district,
        phone: inst.phone,
        email: inst.email,
        principalName: `অধ্যক্ষ (${inst.name})`,
        status: 'pending',
        createdAt: inst.createdAt,
      };
      continue;
    }

    const principalUser = db.users.find(
      (u) => u.institutionId === inst.id && u.role === 'institution_admin'
    );
    const instSettings = db.settings.find((s) => s.institutionId === inst.id);
    const instYears = db.academicYears.filter((y) => y.institutionId === inst.id);

    updates[`institutions/${code}/meta`] = {
      code,
      name: inst.name,
      type: inst.type,
      eiin: inst.eiin,
      address: inst.address,
      district: inst.district,
      phone: inst.phone,
      email: inst.email,
      principalUid: principalUser ? uidBySeedUserId[principalUser.id] : null,
      principalName: principalUser?.name ?? '',
      status: inst.status,
      createdAt: inst.createdAt,
    };

    if (instSettings) {
      updates[`institutions/${code}/settings`] = {
        numeralLocale: instSettings.numeralLocale,
        fourthConfig: instSettings.fourthConfig,
        gradingScale: instSettings.gradingScale,
      };
    }

    for (const yr of instYears) {
      updates[`institutions/${code}/academicYears/${yr.year}`] = {
        year: yr.year,
        isCurrent: yr.isCurrent,
      };
    }

    for (const c of db.classes.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${c.academicYear}/classes/${c.id}`] = {
        id: c.id,
        name: c.name,
        code: c.code,
        classTeacherUid: c.classTeacherId ? uidBySeedUserId[c.classTeacherId] ?? null : null,
      };
    }

    for (const s of db.sections.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${s.academicYear}/sections/${s.id}`] = {
        id: s.id,
        classId: s.classId,
        name: s.name,
      };
    }

    for (const sub of db.subjects.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${sub.academicYear}/subjects/${sub.id}`] = {
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
      };
    }

    for (const ta of db.teacherAssignments.filter((x) => x.institutionId === inst.id)) {
      const teacherUid = uidBySeedUserId[ta.teacherId] ?? ta.teacherId;
      updates[`data/${code}/${ta.academicYear}/teacherAssignments/${ta.id}`] = {
        id: ta.id,
        teacherUid,
        classId: ta.classId,
        sectionId: ta.sectionId,
        subjectId: ta.subjectId,
      };
      const secKey = ta.sectionId ?? 'all';
      updates[
        `data/${code}/${ta.academicYear}/teacherSubjectAccess/${teacherUid}/${ta.classId}_${secKey}_${ta.subjectId}`
      ] = true;
    }

    for (const st of db.students.filter((x) => x.institutionId === inst.id)) {
      const stUid = uidBySeedUserId[st.userId] ?? st.userId;
      updates[`data/${code}/${st.academicYear}/students/${st.id}`] = {
        id: st.id,
        uid: stUid,
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

    for (const pl of db.parentLinks.filter((x) => x.institutionId === inst.id)) {
      const parentUid = uidBySeedUserId[pl.parentUserId] ?? pl.parentUserId;
      for (const yr of instYears) {
        updates[`data/${code}/${yr.year}/parentLinks/${parentUid}/${pl.studentId}`] = true;
      }
    }

    for (const ex of db.exams.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${ex.academicYear}/exams/${ex.id}`] = {
        id: ex.id,
        name: ex.name,
        defaultClassId: ex.defaultClassId,
        sectionId: ex.sectionId,
        startDate: ex.startDate,
        endDate: ex.endDate,
        marksDeadline: ex.marksDeadline,
      };
    }

    for (const r of db.examRules.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${r.academicYear}/examRules/${r.examId}/${r.id}`] = {
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

    for (const comb of db.subjectCombinations.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${comb.academicYear}/subjectCombinations/${comb.examId}/${comb.id}`] = {
        id: comb.id,
        examId: comb.examId,
        classId: comb.classId,
        name: comb.name,
        paperSubjectIds: comb.paperSubjectIds,
        mode: comb.mode,
        passRule: comb.passRule,
        isFourth: comb.isFourth,
      };
    }

    for (const m of db.marks.filter((x) => x.institutionId === inst.id)) {
      updates[
        `data/${code}/${m.academicYear}/marks/${m.examId}/${m.classId}/${m.sectionId}/${m.subjectId}/${m.studentId}`
      ] = {
        cq: m.cq,
        mcq: m.mcq,
        practical: m.practical,
        status: m.status,
        updatedByUid: uidBySeedUserId[m.updatedById] ?? m.updatedById,
        updatedAt: m.updatedAt,
      };
    }

    for (const pub of db.resultPublications.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${pub.academicYear}/resultPublications/${pub.examId}/${pub.sectionId}`] = {
        examId: pub.examId,
        classId: pub.classId,
        sectionId: pub.sectionId,
        published: pub.published,
        publishedAt: pub.publishedAt,
      };
    }

    for (const asg of db.assignments.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/${asg.academicYear}/assignments/${asg.id}`] = {
        id: asg.id,
        teacherUid: uidBySeedUserId[asg.teacherId] ?? asg.teacherId,
        classId: asg.classId,
        sectionId: asg.sectionId,
        subjectId: asg.subjectId,
        title: asg.title,
        description: asg.description,
        fullMarks: asg.fullMarks,
        dueDate: asg.dueDate,
        createdAt: asg.createdAt,
      };
    }

    for (const sub of db.submissions.filter((x) => x.institutionId === inst.id)) {
      const student = db.students.find((st) => st.id === sub.studentId);
      const studentUid = student ? uidBySeedUserId[student.userId] ?? student.userId : sub.studentId;
      const year = student?.academicYear ?? 2026;
      updates[`data/${code}/${year}/submissions/${sub.assignmentId}/${studentUid}`] = {
        id: sub.id,
        assignmentId: sub.assignmentId,
        studentId: sub.studentId,
        studentUid,
        answerText: sub.answerText,
        marks: sub.marks,
        feedback: sub.feedback,
        submittedAt: sub.submittedAt,
        gradedAt: sub.gradedAt,
      };
    }

    for (const n of db.notices.filter((x) => x.institutionId === inst.id)) {
      const yr = n.academicYear ?? 2026;
      updates[`data/${code}/${yr}/notices/${n.id}`] = {
        id: n.id,
        authorUid: uidBySeedUserId[n.authorId] ?? n.authorId,
        authorName: n.authorName,
        title: n.title,
        body: n.body,
        audience: n.audience,
        createdAt: n.createdAt,
      };
    }

    for (const log of db.auditLogs.filter((x) => x.institutionId === inst.id)) {
      updates[`data/${code}/2026/auditLogs/${log.id}`] = {
        id: log.id,
        userUid: uidBySeedUserId[log.userId] ?? log.userId,
        userName: log.userName,
        userRole: mapSeedRoleToClaim(log.userRole),
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        details: log.details,
        beforeValue: log.beforeValue ?? null,
        afterValue: log.afterValue ?? null,
        createdAt: log.createdAt,
      };
    }
  }

  for (const n of db.notices.filter((x) => x.institutionId === null)) {
    updates[`platform/notices/${n.id}`] = {
      id: n.id,
      authorUid: uidBySeedUserId[n.authorId] ?? n.authorId,
      authorName: n.authorName,
      title: n.title,
      body: n.body,
      audience: n.audience,
      createdAt: n.createdAt,
    };
  }

  for (const log of db.auditLogs.filter((x) => x.institutionId === null)) {
    updates[`platform/auditLogs/${log.id}`] = {
      id: log.id,
      userUid: uidBySeedUserId[log.userId] ?? log.userId,
      userName: log.userName,
      userRole: mapSeedRoleToClaim(log.userRole),
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      beforeValue: log.beforeValue ?? null,
      afterValue: log.afterValue ?? null,
      createdAt: log.createdAt,
    };
  }

  await adminRtdb.ref().update(updates);

  return {
    seeded: true,
    usersCount: createdUsers,
    institutionsCount: db.institutions.filter((i) => i.status !== 'pending').length,
  };
}
