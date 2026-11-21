import { Router } from 'express';
import { z } from 'zod';
import {
  adminAuth,
  adminRtdb,
  requireFirebaseAuth,
  requireRoles,
  type AuthenticatedRequest,
} from '../firebaseAdmin.ts';
import { sendPasswordSetupEmail } from '../emailService.ts';

export const principalUsersRouter = Router();

const assignmentInputSchema = z.object({
  classId: z.string().trim().min(1),
  sectionId: z.string().trim().nullable().optional(),
  subjectId: z.string().trim().min(1),
});

const createTeacherSchema = z.object({
  name: z.string().trim().min(2, 'শিক্ষকের নাম কমপক্ষে ২ অক্ষরের হতে হবে।'),
  email: z.string().trim().email('বৈধ ইমেইল ঠিকানা দিন।'),
  phone: z.string().trim().min(10, 'সঠিক মোবাইল নম্বর দিন।'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।').optional(),
  academicYear: z.number().int().min(2020).max(2040),
  institutionCode: z.string().trim().optional(),
  institutionName: z.string().trim().optional(),
  assignments: z.array(assignmentInputSchema).default([]),
});

const createStudentSchema = z.object({
  name: z.string().trim().min(2, 'শিক্ষার্থীর নাম কমপক্ষে ২ অক্ষরের হতে হবে।'),
  roll: z.number().int().min(1, 'রোল নম্বর ১ বা তার বেশি হতে হবে।'),
  studentCode: z.string().trim().min(2, 'শিক্ষার্থী আইডি লিখুন।'),
  classId: z.string().trim().min(1, 'শ্রেণি নির্বাচন করুন।'),
  sectionId: z.string().trim().min(1, 'শাখা নির্বাচন করুন।'),
  gender: z.enum(['male', 'female', 'other']).default('male'),
  dob: z.string().trim().default('2012-01-01'),
  fatherName: z.string().trim().min(2, 'পিতার নাম লিখুন।'),
  motherName: z.string().trim().min(2, 'মাতার নাম লিখুন।'),
  guardianPhone: z.string().trim().min(10, 'অভিভাবকের মোবাইল নম্বর দিন।'),
  address: z.string().trim().default(''),
  fourthSubjectId: z.string().trim().nullable().optional(),
  email: z.string().trim().email('বৈধ ইমেইল ঠিকানা দিন।'),
  password: z.string().min(6, 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।').optional(),
  academicYear: z.number().int().min(2020).max(2040),
  institutionCode: z.string().trim().optional(),
  institutionName: z.string().trim().optional(),
});

const bulkStudentsSchema = z.object({
  academicYear: z.number().int().min(2020).max(2040),
  institutionCode: z.string().trim().optional(),
  institutionName: z.string().trim().optional(),
  rows: z.array(createStudentSchema.omit({ academicYear: true, institutionCode: true, institutionName: true })).min(1).max(200),
});

function resolveInstitutionScope(
  req: AuthenticatedRequest,
  bodyCode?: string
): { ok: true; code: string } | { ok: false; status: number; error: string } {
  const role = req.authUser?.role;
  const claimCode = req.authUser?.institutionCode || '';
  if (role === 'super_admin') {
    const code = (bodyCode || claimCode).trim();
    if (!code) return { ok: false, status: 400, error: 'প্রতিষ্ঠান কোড নির্ধারিত নয়।' };
    return { ok: true, code };
  }
  if (!claimCode) {
    return { ok: false, status: 403, error: 'আপনার অ্যাকাউন্টে প্রতিষ্ঠান কোড নির্ধারিত নেই।' };
  }
  if (bodyCode && bodyCode.trim() !== claimCode) {
    return { ok: false, status: 403, error: 'অন্য প্রতিষ্ঠানের তথ্য পরিবর্তন করার অনুমতি নেই।' };
  }
  return { ok: true, code: claimCode };
}

async function resolveInstitutionName(code: string, fallback?: string): Promise<string> {
  try {
    const snap = await adminRtdb.ref(`institutions/${code}/meta/name`).get();
    if (snap.exists() && typeof snap.val() === 'string') {
      return snap.val();
    }
  } catch {
    // ignore
  }
  return fallback || code;
}

/**
 * POST /api/principal/teachers
 * Creates Firebase Auth user, sets custom claims { role: "teacher", institutionCode },
 * writes /users/{uid} and /data/{institutionCode}/{year}/teacherAssignments + teacherSubjectAccess.
 * Rolls back Auth user on any failure.
 */
principalUsersRouter.post(
  '/teachers',
  requireFirebaseAuth,
  requireRoles('principal', 'super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const parsed = createTeacherSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'অবৈধ তথ্য।' });
      return;
    }

    const scope = resolveInstitutionScope(req, parsed.data.institutionCode);
    if (!scope.ok) {
      res.status(scope.status).json({ ok: false, error: scope.error });
      return;
    }

    const institutionCode = scope.code;
    let createdUid: string | null = null;

    try {
      const existing = await adminAuth.getUserByEmail(parsed.data.email).catch(() => null);
      if (existing) {
        res.status(409).json({
          ok: false,
          error: `এই ইমেইলে (${parsed.data.email}) ইতিমধ্যেই একটি অ্যাকাউন্ট বিদ্যমান।`,
        });
        return;
      }

      const institutionName = await resolveInstitutionName(institutionCode, parsed.data.institutionName);

      const authUser = await adminAuth.createUser({
        email: parsed.data.email,
        displayName: parsed.data.name,
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
        emailVerified: Boolean(parsed.data.password),
      });
      createdUid = authUser.uid;

      await adminAuth.setCustomUserClaims(createdUid, {
        role: 'teacher',
        institutionCode,
      });

      const nowIso = new Date().toISOString();
      const year = parsed.data.academicYear;
      const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const updates: Record<string, unknown> = {
        [`users/${createdUid}`]: {
          uid: createdUid,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone,
          role: 'teacher',
          institution: institutionName,
          institutionCode,
          isActive: true,
          createdAt: nowIso,
        },
        [`data/${institutionCode}/${year}/auditLogs/${logId}`]: {
          id: logId,
          userUid: req.authUser?.uid ?? 'principal',
          userName: req.authUser?.email ?? 'অধ্যক্ষ',
          userRole: req.authUser?.role ?? 'principal',
          action: 'ব্যবহারকারী ও কাঠামো',
          entityType: 'Teacher',
          entityId: createdUid,
          details: `শিক্ষক "${parsed.data.name}" (${parsed.data.email}) ও ${parsed.data.assignments.length}টি বিষয় বণ্টন তৈরি করা হয়েছে।`,
          createdAt: nowIso,
        },
      };

      const createdAssignments: Array<{
        id: string;
        teacherUid: string;
        classId: string;
        sectionId: string | null;
        subjectId: string;
      }> = [];

      for (let i = 0; i < parsed.data.assignments.length; i += 1) {
        const a = parsed.data.assignments[i];
        const taId = `ta-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 5)}`;
        const secId = a.sectionId || null;
        const secKey = secId ?? 'all';
        const record = {
          id: taId,
          teacherUid: createdUid,
          classId: a.classId,
          sectionId: secId,
          subjectId: a.subjectId,
        };
        createdAssignments.push(record);
        updates[`data/${institutionCode}/${year}/teacherAssignments/${taId}`] = record;
        updates[
          `data/${institutionCode}/${year}/teacherSubjectAccess/${createdUid}/${a.classId}_${secKey}_${a.subjectId}`
        ] = true;
      }

      await adminRtdb.ref().update(updates);

      if (!parsed.data.password) {
        await sendPasswordSetupEmail({
          email: parsed.data.email,
          recipientName: parsed.data.name,
          institutionName,
          institutionCode,
          roleLabel: 'শিক্ষক',
        });
      }

      res.json({
        ok: true,
        uid: createdUid,
        institutionCode,
        assignments: createdAssignments,
      });
    } catch (err) {
      if (createdUid) {
        try {
          await adminAuth.deleteUser(createdUid);
        } catch (rollbackErr) {
          console.error('[Teacher Rollback] Failed to delete Auth user:', createdUid, rollbackErr);
        }
      }
      const message =
        err instanceof Error ? err.message : 'শিক্ষক অ্যাকাউন্ট তৈরি করা যায়নি; পরিবর্তন বাতিল করা হয়েছে।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * DELETE /api/principal/teachers/:uid
 */
principalUsersRouter.delete(
  '/teachers/:uid',
  requireFirebaseAuth,
  requireRoles('principal', 'super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const uid = String(req.params.uid || '').trim();
    if (!uid || /[.#$[\]/]/.test(uid)) {
      res.status(400).json({ ok: false, error: 'অবৈধ ব্যবহারকারী আইডি।' });
      return;
    }

    const year = Number(req.query.academicYear || new Date().getFullYear());
    const userSnap = await adminRtdb.ref(`users/${uid}`).get();
    if (!userSnap.exists()) {
      res.status(404).json({ ok: false, error: 'শিক্ষক খুঁজে পাওয়া যায়নি।' });
      return;
    }
    const userData = userSnap.val() as { institutionCode?: string; role?: string; name?: string };
    const scope = resolveInstitutionScope(req, userData.institutionCode);
    if (!scope.ok) {
      res.status(scope.status).json({ ok: false, error: scope.error });
      return;
    }

    try {
      await adminAuth.deleteUser(uid).catch(() => {});

      const taSnap = await adminRtdb
        .ref(`data/${scope.code}/${year}/teacherAssignments`)
        .orderByChild('teacherUid')
        .equalTo(uid)
        .get();

      const updates: Record<string, null | unknown> = {
        [`users/${uid}`]: null,
        [`data/${scope.code}/${year}/teacherSubjectAccess/${uid}`]: null,
      };
      if (taSnap.exists()) {
        const val = taSnap.val() as Record<string, unknown>;
        for (const taId of Object.keys(val)) {
          updates[`data/${scope.code}/${year}/teacherAssignments/${taId}`] = null;
        }
      }

      await adminRtdb.ref().update(updates);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'শিক্ষক মুছে ফেলা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * POST /api/principal/students
 * Creates Firebase Auth user, sets custom claims { role: "student", institutionCode },
 * writes /users/{uid} and /data/{institutionCode}/{year}/students/{studentId}.
 * Rolls back Auth user on any failure.
 */
principalUsersRouter.post(
  '/students',
  requireFirebaseAuth,
  requireRoles('principal', 'super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const parsed = createStudentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'অবৈধ তথ্য।' });
      return;
    }

    const scope = resolveInstitutionScope(req, parsed.data.institutionCode);
    if (!scope.ok) {
      res.status(scope.status).json({ ok: false, error: scope.error });
      return;
    }

    const institutionCode = scope.code;
    let createdUid: string | null = null;

    try {
      const existing = await adminAuth.getUserByEmail(parsed.data.email).catch(() => null);
      if (existing) {
        res.status(409).json({
          ok: false,
          error: `এই ইমেইলে (${parsed.data.email}) ইতিমধ্যেই একটি অ্যাকাউন্ট বিদ্যমান।`,
        });
        return;
      }

      const institutionName = await resolveInstitutionName(institutionCode, parsed.data.institutionName);

      const authUser = await adminAuth.createUser({
        email: parsed.data.email,
        displayName: parsed.data.name,
        ...(parsed.data.password ? { password: parsed.data.password } : {}),
        emailVerified: Boolean(parsed.data.password),
      });
      createdUid = authUser.uid;

      await adminAuth.setCustomUserClaims(createdUid, {
        role: 'student',
        institutionCode,
      });

      const nowIso = new Date().toISOString();
      const year = parsed.data.academicYear;
      const studentId = `st-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const studentRecord = {
        id: studentId,
        uid: createdUid,
        classId: parsed.data.classId,
        sectionId: parsed.data.sectionId,
        roll: parsed.data.roll,
        studentCode: parsed.data.studentCode,
        name: parsed.data.name,
        gender: parsed.data.gender,
        dob: parsed.data.dob,
        fatherName: parsed.data.fatherName,
        motherName: parsed.data.motherName,
        guardianPhone: parsed.data.guardianPhone,
        address: parsed.data.address,
        fourthSubjectId: parsed.data.fourthSubjectId ?? null,
      };

      await adminRtdb.ref().update({
        [`users/${createdUid}`]: {
          uid: createdUid,
          studentId,
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.guardianPhone,
          role: 'student',
          institution: institutionName,
          institutionCode,
          isActive: true,
          createdAt: nowIso,
        },
        [`data/${institutionCode}/${year}/students/${studentId}`]: studentRecord,
        [`data/${institutionCode}/${year}/auditLogs/${logId}`]: {
          id: logId,
          userUid: req.authUser?.uid ?? 'principal',
          userName: req.authUser?.email ?? 'অধ্যক্ষ',
          userRole: req.authUser?.role ?? 'principal',
          action: 'ব্যবহারকারী ও কাঠামো',
          entityType: 'Student',
          entityId: studentId,
          details: `শিক্ষার্থী "${parsed.data.name}" (রোল ${parsed.data.roll}) ও Auth অ্যাকাউন্ট তৈরি হয়েছে।`,
          createdAt: nowIso,
        },
      });

      if (!parsed.data.password) {
        await sendPasswordSetupEmail({
          email: parsed.data.email,
          recipientName: parsed.data.name,
          institutionName,
          institutionCode,
          roleLabel: 'শিক্ষার্থী',
        });
      }

      res.json({
        ok: true,
        uid: createdUid,
        studentId,
        institutionCode,
      });
    } catch (err) {
      if (createdUid) {
        try {
          await adminAuth.deleteUser(createdUid);
        } catch (rollbackErr) {
          console.error('[Student Rollback] Failed to delete Auth user:', createdUid, rollbackErr);
        }
      }
      const message =
        err instanceof Error ? err.message : 'শিক্ষার্থী অ্যাকাউন্ট তৈরি করা যায়নি; পরিবর্তন বাতিল করা হয়েছে।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * POST /api/principal/students/bulk
 * Bulk creates Auth users + /users/{uid} + /data/{institutionCode}/{year}/students/{studentId}
 * with full Auth rollback if the RTDB commit fails.
 */
principalUsersRouter.post(
  '/students/bulk',
  requireFirebaseAuth,
  requireRoles('principal', 'super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const parsed = bulkStudentsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'অবৈধ বাল্ক ডেটা।' });
      return;
    }

    const scope = resolveInstitutionScope(req, parsed.data.institutionCode);
    if (!scope.ok) {
      res.status(scope.status).json({ ok: false, error: scope.error });
      return;
    }

    const institutionCode = scope.code;
    const year = parsed.data.academicYear;
    const institutionName = await resolveInstitutionName(institutionCode, parsed.data.institutionName);

    const createdUids: string[] = [];
    const createdStudents: Array<{ id: string; uid: string; email: string }> = [];
    const skipped: Array<{ email: string; reason: string }> = [];
    const seenEmails = new Set<string>();
    const updates: Record<string, unknown> = {};
    const nowIso = new Date().toISOString();

    try {
      for (let i = 0; i < parsed.data.rows.length; i += 1) {
        const row = parsed.data.rows[i];
        const normEmail = row.email.toLowerCase();
        if (seenEmails.has(normEmail)) {
          skipped.push({ email: row.email, reason: 'ফাইলে ডুপ্লিকেট ইমেইল' });
          continue;
        }
        seenEmails.add(normEmail);

        const existing = await adminAuth.getUserByEmail(row.email).catch(() => null);
        if (existing) {
          skipped.push({ email: row.email, reason: 'ইমেইল ইতোমধ্যে নিবন্ধিত' });
          continue;
        }

        const authUser = await adminAuth.createUser({
          email: row.email,
          displayName: row.name,
          password: row.password || 'student123',
          emailVerified: true,
        });
        createdUids.push(authUser.uid);

        await adminAuth.setCustomUserClaims(authUser.uid, {
          role: 'student',
          institutionCode,
        });

        const studentId = `st-${Date.now().toString(36)}-${i}-${Math.random().toString(36).slice(2, 5)}`;

        updates[`users/${authUser.uid}`] = {
          uid: authUser.uid,
          studentId,
          name: row.name,
          email: row.email,
          phone: row.guardianPhone,
          role: 'student',
          institution: institutionName,
          institutionCode,
          isActive: true,
          createdAt: nowIso,
        };

        updates[`data/${institutionCode}/${year}/students/${studentId}`] = {
          id: studentId,
          uid: authUser.uid,
          classId: row.classId,
          sectionId: row.sectionId,
          roll: row.roll,
          studentCode: row.studentCode,
          name: row.name,
          gender: row.gender,
          dob: row.dob || '2012-01-01',
          fatherName: row.fatherName,
          motherName: row.motherName,
          guardianPhone: row.guardianPhone,
          address: row.address || '',
          fourthSubjectId: row.fourthSubjectId ?? null,
        };

        createdStudents.push({ id: studentId, uid: authUser.uid, email: row.email });
      }

      if (createdStudents.length > 0) {
        const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
        updates[`data/${institutionCode}/${year}/auditLogs/${logId}`] = {
          id: logId,
          userUid: req.authUser?.uid ?? 'principal',
          userName: req.authUser?.email ?? 'অধ্যক্ষ',
          userRole: req.authUser?.role ?? 'principal',
          action: 'ব্যবহারকারী ও কাঠামো',
          entityType: 'Student',
          entityId: 'bulk',
          details: `বাল্ক ইমপোর্টের মাধ্যমে ${createdStudents.length} জন শিক্ষার্থী ও Auth অ্যাকাউন্ট তৈরি হয়েছে।`,
          createdAt: nowIso,
        };
        await adminRtdb.ref().update(updates);
      }

      res.json({
        ok: true,
        importedCount: createdStudents.length,
        created: createdStudents,
        skipped,
      });
    } catch (err) {
      if (createdUids.length > 0) {
        await Promise.allSettled(createdUids.map((u) => adminAuth.deleteUser(u)));
      }
      const message =
        err instanceof Error ? err.message : 'বাল্ক ইমপোর্টে ত্রুটি হয়েছে; তৈরি হওয়া অ্যাকাউন্টগুলো রোলব্যাক করা হয়েছে।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * DELETE /api/principal/students/:studentId
 */
principalUsersRouter.delete(
  '/students/:studentId',
  requireFirebaseAuth,
  requireRoles('principal', 'super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const studentId = String(req.params.studentId || '').trim();
    const year = Number(req.query.academicYear || new Date().getFullYear());
    const scope = resolveInstitutionScope(
      req,
      typeof req.query.institutionCode === 'string' ? req.query.institutionCode : undefined
    );
    if (!scope.ok) {
      res.status(scope.status).json({ ok: false, error: scope.error });
      return;
    }

    try {
      const stSnap = await adminRtdb.ref(`data/${scope.code}/${year}/students/${studentId}`).get();
      if (!stSnap.exists()) {
        res.status(404).json({ ok: false, error: 'শিক্ষার্থী পাওয়া যায়নি।' });
        return;
      }
      const stData = stSnap.val() as { uid?: string };
      const updates: Record<string, null> = {
        [`data/${scope.code}/${year}/students/${studentId}`]: null,
      };
      if (stData.uid) {
        await adminAuth.deleteUser(stData.uid).catch(() => {});
        updates[`users/${stData.uid}`] = null;
      }
      await adminRtdb.ref().update(updates);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'শিক্ষার্থী মুছে ফেলা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);
