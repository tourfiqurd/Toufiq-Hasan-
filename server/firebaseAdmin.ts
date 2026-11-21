import { getApp, getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import type { NextFunction, Request, Response } from 'express';

export const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || 'usersapp-2a67f';

export const USE_FIREBASE_EMULATOR =
  process.env.USE_FIREBASE_EMULATOR !== 'false';

export const FIREBASE_DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  'https://usersapp-2a67f-default-rtdb.firebaseio.com';

if (USE_FIREBASE_EMULATOR) {
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
  }
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = '127.0.0.1:9000';
  }
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp(
      USE_FIREBASE_EMULATOR
        ? {
            projectId: FIREBASE_PROJECT_ID,
            databaseURL: FIREBASE_DATABASE_URL,
          }
        : {
            credential: applicationDefault(),
            projectId: FIREBASE_PROJECT_ID,
            databaseURL: FIREBASE_DATABASE_URL,
          }
    );

export const adminAuth = getAuth(adminApp);
export const adminRtdb = getDatabase(adminApp);

export type ClaimRole =
  | 'super_admin'
  | 'principal'
  | 'teacher'
  | 'student'
  | 'parent';

export interface AuthenticatedRequest extends Request {
  authUser?: DecodedIdToken & {
    role?: ClaimRole;
    institutionCode?: string | null;
  };
}

export async function requireFirebaseAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ ok: false, error: 'অনুমোদিত টোকেন পাওয়া যায়নি।' });
    return;
  }

  const idToken = header.slice('Bearer '.length).trim();
  if (!idToken) {
    res.status(401).json({ ok: false, error: 'টোকেন খালি হতে পারে না।' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.authUser = decoded as AuthenticatedRequest['authUser'];
    next();
  } catch {
    res.status(401).json({ ok: false, error: 'অবৈধ বা মেয়াদোত্তীর্ণ সেশন টোকেন।' });
  }
}

export function requireRoles(...allowed: ClaimRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const role = req.authUser?.role;
    if (!role || !allowed.includes(role)) {
      res.status(403).json({ ok: false, error: 'এই কাজের জন্য আপনার অনুমতি নেই।' });
      return;
    }
    next();
  };
}
