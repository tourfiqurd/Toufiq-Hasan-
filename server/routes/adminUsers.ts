import { Router } from 'express';
import { z } from 'zod';
import {
  adminAuth,
  adminRtdb,
  requireFirebaseAuth,
  requireRoles,
  type AuthenticatedRequest,
} from '../firebaseAdmin.ts';
import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE } from '../../src/lib/grading/scale.ts';

export const adminUsersRouter = Router();

const addInstitutionSchema = z.object({
  name: z.string().trim().min(3),
  type: z.enum(['school', 'college', 'madrasa']),
  eiin: z.string().trim().min(4),
  address: z.string().trim().min(4),
  district: z.string().trim().min(2),
  phone: z.string().trim().min(10),
  email: z.string().trim().email(),
  principalName: z.string().trim().min(2),
  password: z.string().min(6),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'),
});

const statusUpdateSchema = z.object({
  status: z.enum(['approved', 'suspended', 'rejected', 'pending']),
  reason: z.string().trim().optional(),
});

async function generateNextInstitutionCode(): Promise<string> {
  const tx = await adminRtdb.ref('counters/institutionCode').transaction((current) => {
    const n = typeof current === 'number' && Number.isFinite(current) ? current : 0;
    return n + 1;
  });
  const seq = Number(tx.snapshot.val() || 1);
  return `ACD-${String(seq).padStart(5, '0')}`;
}

/**
 * POST /api/admin/institutions
 * Direct institution + principal creation by Super Admin.
 */
adminUsersRouter.post(
  '/institutions',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const parsed = addInstitutionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'অবৈধ তথ্য।' });
      return;
    }

    let createdUid: string | null = null;
    try {
      const existing = await adminAuth.getUserByEmail(parsed.data.email).catch(() => null);
      if (existing) {
        res.status(409).json({ ok: false, error: 'এই ইমেইল ইতোমধ্যে ব্যবহৃত হয়েছে।' });
        return;
      }

      const code = await generateNextInstitutionCode();
      const authUser = await adminAuth.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        displayName: parsed.data.principalName,
        emailVerified: true,
      });
      createdUid = authUser.uid;

      await adminAuth.setCustomUserClaims(createdUid, {
        role: 'principal',
        institutionCode: code,
      });

      const nowIso = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      await adminRtdb.ref().update({
        [`users/${createdUid}`]: {
          uid: createdUid,
          name: parsed.data.principalName,
          email: parsed.data.email,
          phone: parsed.data.phone,
          role: 'principal',
          institution: parsed.data.name,
          institutionCode: code,
          isActive: true,
          createdAt: nowIso,
        },
        [`institutions/${code}/meta`]: {
          code,
          name: parsed.data.name,
          type: parsed.data.type,
          eiin: parsed.data.eiin,
          address: parsed.data.address,
          district: parsed.data.district,
          phone: parsed.data.phone,
          email: parsed.data.email,
          principalUid: createdUid,
          principalName: parsed.data.principalName,
          status: 'approved',
          createdAt: nowIso,
        },
        [`institutions/${code}/settings`]: {
          numeralLocale: 'bn',
          fourthConfig: DEFAULT_FOURTH_CONFIG,
          gradingScale: DEFAULT_GRADING_SCALE,
        },
        [`institutions/${code}/academicYears/${currentYear}`]: {
          year: currentYear,
          isCurrent: true,
        },
        [`platform/auditLogs/${logId}`]: {
          id: logId,
          userUid: req.authUser?.uid ?? 'super_admin',
          userName: req.authUser?.email ?? 'সুপার এডমিন',
          userRole: 'super_admin',
          action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: 'Institution',
          entityId: code,
          details: `সুপার এডমিন নতুন প্রতিষ্ঠান "${parsed.data.name}" (${code}) যুক্ত করেছেন।`,
          createdAt: nowIso,
        },
      });

      res.json({ ok: true, institutionCode: code, uid: createdUid });
    } catch (err) {
      if (createdUid) {
        await adminAuth.deleteUser(createdUid).catch(() => {});
      }
      const message = err instanceof Error ? err.message : 'প্রতিষ্ঠান যোগ করা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * PATCH /api/admin/institutions/:code/status
 */
adminUsersRouter.patch(
  '/institutions/:code/status',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const code = String(req.params.code || '').trim();
    const parsed = statusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: 'অবৈধ স্ট্যাটাস।' });
      return;
    }

    try {
      const metaSnap = await adminRtdb.ref(`institutions/${code}/meta`).get();
      if (!metaSnap.exists()) {
        res.status(404).json({ ok: false, error: 'প্রতিষ্ঠান পাওয়া যায়নি।' });
        return;
      }
      const meta = metaSnap.val() as { name?: string; principalUid?: string };
      const updates: Record<string, unknown> = {
        [`institutions/${code}/meta/status`]: parsed.data.status,
      };
      if (parsed.data.reason) {
        updates[`institutions/${code}/meta/rejectedReason`] = parsed.data.reason;
      }
      if (meta.principalUid) {
        updates[`users/${meta.principalUid}/isActive`] = parsed.data.status === 'approved';
        await adminAuth
          .updateUser(meta.principalUid, { disabled: parsed.data.status !== 'approved' })
          .catch(() => {});
      }
      await adminRtdb.ref().update(updates);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'স্ট্যাটাস পরিবর্তন করা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * DELETE /api/admin/institutions/:code
 */
adminUsersRouter.delete(
  '/institutions/:code',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const code = String(req.params.code || '').trim();
    try {
      const usersSnap = await adminRtdb
        .ref('users')
        .orderByChild('institutionCode')
        .equalTo(code)
        .get();

      const updates: Record<string, null> = {
        [`institutions/${code}`]: null,
        [`data/${code}`]: null,
      };
      if (usersSnap.exists()) {
        const usersObj = usersSnap.val() as Record<string, unknown>;
        for (const uid of Object.keys(usersObj)) {
          updates[`users/${uid}`] = null;
          await adminAuth.deleteUser(uid).catch(() => {});
        }
      }
      await adminRtdb.ref().update(updates);
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'প্রতিষ্ঠান মুছে ফেলা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * POST /api/admin/users/:uid/reset-password
 */
adminUsersRouter.post(
  '/users/:uid/reset-password',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const uid = String(req.params.uid || '').trim();
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ ok: false, error: parsed.error.issues[0]?.message ?? 'অবৈধ পাসওয়ার্ড।' });
      return;
    }

    try {
      await adminAuth.updateUser(uid, { password: parsed.data.newPassword });
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'পাসওয়ার্ড রিসেট করা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * DELETE /api/admin/users/:uid
 */
adminUsersRouter.delete(
  '/users/:uid',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const uid = String(req.params.uid || '').trim();
    try {
      await adminAuth.deleteUser(uid).catch(() => {});
      await adminRtdb.ref(`users/${uid}`).remove();
      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'ব্যবহারকারী মুছে ফেলা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);
