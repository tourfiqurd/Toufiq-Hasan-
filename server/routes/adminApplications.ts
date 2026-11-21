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
import { DEFAULT_FOURTH_CONFIG, DEFAULT_GRADING_SCALE } from '../../src/lib/grading/scale.ts';

export const adminApplicationsRouter = Router();

const rejectSchema = z.object({
  reason: z.string().trim().min(3, 'বাতিলের কারণ কমপক্ষে ৩ অক্ষরের হতে হবে।').max(500),
});

interface StoredApplication {
  id: string;
  institutionName: string;
  type: 'school' | 'college' | 'madrasa';
  eiin: string;
  address: string;
  district: string;
  phone: string;
  email: string;
  principalName: string;
  logoDataUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

/**
 * Generates the next sequential unique institution code (e.g. ACD-00001)
 * via an atomic RTDB transaction on /counters/institutionCode.
 */
async function generateNextInstitutionCode(): Promise<string> {
  const tx = await adminRtdb.ref('counters/institutionCode').transaction((current) => {
    const n = typeof current === 'number' && Number.isFinite(current) ? current : 0;
    return n + 1;
  });
  const seq = Number(tx.snapshot.val() || 1);
  return `ACD-${String(seq).padStart(5, '0')}`;
}

/**
 * GET /api/admin/applications
 * Lists all institution applications for authenticated Super Admins.
 */
adminApplicationsRouter.get(
  '/applications',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (_req, res) => {
    try {
      const snap = await adminRtdb.ref('institutionApplications').get();
      const raw = (snap.val() ?? {}) as Record<string, StoredApplication>;
      const list = Object.values(raw).sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      res.json({ ok: true, data: list });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'আবেদন তালিকা লোড করা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * POST /api/admin/applications/:id/approve
 * Server-side atomic approval:
 * 1. Generates unique institution code (ACD-00001)
 * 2. Creates Firebase Auth user for principal (no client-side auth creation)
 * 3. Sets custom claims { role: "principal", institutionCode }
 * 4. Writes /users/{uid}, /institutions/{code}, marks /institutionApplications/{id} approved
 * 5. Sends password-setup email link
 * Rolls back (deletes Auth user) if ANY step after user creation fails.
 */
adminApplicationsRouter.post(
  '/applications/:id/approve',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const appId = String(req.params.id || '').trim();
    if (!appId || /[.#$[\]/]/.test(appId)) {
      res.status(400).json({ ok: false, error: 'অবৈধ আবেদন আইডি।' });
      return;
    }

    const appRef = adminRtdb.ref(`institutionApplications/${appId}`);
    const snap = await appRef.get();
    if (!snap.exists()) {
      res.status(404).json({ ok: false, error: 'আবেদনটি খুঁজে পাওয়া যায়নি।' });
      return;
    }

    const appData = snap.val() as StoredApplication;
    if (appData.status !== 'pending') {
      res.status(409).json({
        ok: false,
        error: 'এই আবেদনটি ইতিমধ্যেই পর্যালোচিত হয়েছে।',
      });
      return;
    }

    let createdUid: string | null = null;

    try {
      const existingAuthUser = await adminAuth.getUserByEmail(appData.email).catch(() => null);
      if (existingAuthUser) {
        res.status(409).json({
          ok: false,
          error: `এই ইমেইলে (${appData.email}) ইতিমধ্যেই একটি অ্যাকাউন্ট বিদ্যমান।`,
        });
        return;
      }

      const institutionCode = await generateNextInstitutionCode();

      const authUser = await adminAuth.createUser({
        email: appData.email,
        displayName: appData.principalName,
        emailVerified: false,
      });
      createdUid = authUser.uid;

      await adminAuth.setCustomUserClaims(createdUid, {
        role: 'principal',
        institutionCode,
      });

      const nowIso = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      const multiUpdates: Record<string, unknown> = {
        [`users/${createdUid}`]: {
          uid: createdUid,
          name: appData.principalName,
          email: appData.email,
          phone: appData.phone,
          role: 'principal',
          institution: appData.institutionName,
          institutionCode,
          isActive: true,
          createdAt: nowIso,
        },
        [`institutions/${institutionCode}/meta`]: {
          code: institutionCode,
          name: appData.institutionName,
          type: appData.type,
          eiin: appData.eiin,
          address: appData.address,
          district: appData.district,
          phone: appData.phone,
          email: appData.email,
          principalUid: createdUid,
          principalName: appData.principalName,
          logoDataUrl: appData.logoDataUrl ?? null,
          status: 'approved',
          createdAt: nowIso,
        },
        [`institutions/${institutionCode}/settings`]: {
          numeralLocale: 'bn',
          fourthConfig: DEFAULT_FOURTH_CONFIG,
          gradingScale: DEFAULT_GRADING_SCALE,
        },
        [`institutions/${institutionCode}/academicYears/${currentYear}`]: {
          year: currentYear,
          isCurrent: true,
        },
        [`institutionApplications/${appId}/status`]: 'approved',
        [`institutionApplications/${appId}/approvedCode`]: institutionCode,
        [`institutionApplications/${appId}/reviewedByUid`]: req.authUser?.uid ?? null,
        [`institutionApplications/${appId}/reviewedAt`]: nowIso,
        [`platform/auditLogs/${logId}`]: {
          id: logId,
          userUid: req.authUser?.uid ?? 'super_admin',
          userName: req.authUser?.email ?? 'সুপার এডমিন',
          userRole: 'super_admin',
          action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: 'institution',
          entityId: institutionCode,
          details: `"${appData.institutionName}" (${institutionCode}) অনুমোদিত হয়েছে ও অধ্যক্ষ অ্যাকাউন্ট তৈরি হয়েছে`,
          afterValue: { institutionCode, email: appData.email, status: 'approved' },
          createdAt: nowIso,
        },
      };

      await adminRtdb.ref().update(multiUpdates);

      const emailRes = await sendPasswordSetupEmail({
        email: appData.email,
        recipientName: appData.principalName,
        institutionName: appData.institutionName,
        institutionCode,
        roleLabel: 'অধ্যক্ষ',
      });

      res.json({
        ok: true,
        institutionCode,
        uid: createdUid,
        emailSent: emailRes.sent,
      });
    } catch (err) {
      if (createdUid) {
        try {
          await adminAuth.deleteUser(createdUid);
        } catch (rollbackErr) {
          console.error('[Approve Rollback] Failed to delete Auth user:', createdUid, rollbackErr);
        }
      }
      const message =
        err instanceof Error
          ? err.message
          : 'প্রতিষ্ঠান অনুমোদন প্রক্রিয়ায় ত্রুটি হয়েছে; কোনো পরিবর্তন সংরক্ষণ করা হয়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);

/**
 * POST /api/admin/applications/:id/reject
 * Marks a pending institution application as rejected with a required reason.
 */
adminApplicationsRouter.post(
  '/applications/:id/reject',
  requireFirebaseAuth,
  requireRoles('super_admin'),
  async (req: AuthenticatedRequest, res) => {
    const appId = String(req.params.id || '').trim();
    if (!appId || /[.#$[\]/]/.test(appId)) {
      res.status(400).json({ ok: false, error: 'অবৈধ আবেদন আইডি।' });
      return;
    }

    const parsed = rejectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'বাতিলের কারণ লিখুন।',
      });
      return;
    }

    try {
      const appRef = adminRtdb.ref(`institutionApplications/${appId}`);
      const snap = await appRef.get();
      if (!snap.exists()) {
        res.status(404).json({ ok: false, error: 'আবেদনটি খুঁজে পাওয়া যায়নি।' });
        return;
      }

      const appData = snap.val() as StoredApplication;
      if (appData.status !== 'pending') {
        res.status(409).json({
          ok: false,
          error: 'এই আবেদনটি ইতিমধ্যেই পর্যালোচিত হয়েছে।',
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const logId = `log-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

      await adminRtdb.ref().update({
        [`institutionApplications/${appId}/status`]: 'rejected',
        [`institutionApplications/${appId}/rejectedReason`]: parsed.data.reason,
        [`institutionApplications/${appId}/reviewedByUid`]: req.authUser?.uid ?? null,
        [`institutionApplications/${appId}/reviewedAt`]: nowIso,
        [`platform/auditLogs/${logId}`]: {
          id: logId,
          userUid: req.authUser?.uid ?? 'super_admin',
          userName: req.authUser?.email ?? 'সুপার এডমিন',
          userRole: 'super_admin',
          action: 'প্রতিষ্ঠান ব্যবস্থাপনা',
          entityType: 'institutionApplication',
          entityId: appId,
          details: `"${appData.institutionName}"-এর আবেদন বাতিল করা হয়েছে (কারণ: ${parsed.data.reason})`,
          afterValue: { status: 'rejected', reason: parsed.data.reason },
          createdAt: nowIso,
        },
      });

      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'আবেদন বাতিল করা যায়নি।';
      res.status(500).json({ ok: false, error: message });
    }
  }
);
