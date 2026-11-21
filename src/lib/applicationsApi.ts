import { onValue, push, ref, set } from 'firebase/database';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth, rtdb } from './firebase';
import { USE_FIREBASE_EMULATOR } from './firebaseConfig';
import { formatZodError, registerInstitutionSchema } from './validation';
import type { InstitutionApplication, InstitutionType } from '../types/domain';

export interface SubmitApplicationInput {
  institutionName: string;
  type: InstitutionType;
  eiin: string;
  address: string;
  district: string;
  principalName: string;
  phone: string;
  email: string;
  logoDataUrl?: string;
  acceptedTerms: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, ms);
    promise
      .then((val) => {
        window.clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        window.clearTimeout(timer);
        reject(err);
      });
  });
}

let cachedHealth: { checkedAt: number; available: boolean } | null = null;

export async function isFirebaseBackendReachable(): Promise<boolean> {
  if (!USE_FIREBASE_EMULATOR) return true;
  if (cachedHealth && Date.now() - cachedHealth.checkedAt < 15000) {
    return cachedHealth.available;
  }
  try {
    const resp = await fetch('/api/health');
    if (!resp.ok) {
      cachedHealth = { checkedAt: Date.now(), available: false };
      return false;
    }
    const json = (await resp.json()) as { usingEmulator?: boolean; emulatorReachable?: boolean };
    const available = !json.usingEmulator || Boolean(json.emulatorReachable);
    cachedHealth = { checkedAt: Date.now(), available };
    return available;
  } catch {
    cachedHealth = { checkedAt: Date.now(), available: false };
    return false;
  }
}

/**
 * Ensures the current demo browser session also holds a valid Firebase Auth token
 * against the Auth Emulator during the demo phase (without altering LoginPage).
 */
export async function ensureEmulatorAuthToken(
  email?: string,
  password?: string
): Promise<string | null> {
  if (firebaseAuth.currentUser) {
    return firebaseAuth.currentUser.getIdToken();
  }
  if (!USE_FIREBASE_EMULATOR || !email || !password) {
    return null;
  }
  const reachable = await isFirebaseBackendReachable();
  if (!reachable) {
    return null;
  }
  try {
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return cred.user.getIdToken();
    } catch {
      // Seed emulator on first attempt if needed, then sign in
      await fetch('/api/emulator/seed', { method: 'POST' });
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return cred.user.getIdToken();
    }
  } catch {
    return null;
  }
}

/**
 * Saves a new institution registration request at /institutionApplications/{id}
 * with status "pending" and NO password field.
 */
export async function submitInstitutionApplication(
  input: SubmitApplicationInput
): Promise<{ ok: boolean; data?: InstitutionApplication; savedToRtdb?: boolean; error?: string }> {
  const parsed = registerInstitutionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: formatZodError(parsed.error) };
  }

  const listRef = ref(rtdb, 'institutionApplications');
  const newRef = push(listRef);
  const id = newRef.key || `app-${Date.now().toString(36)}`;

  const application: InstitutionApplication = {
    id,
    institutionName: parsed.data.institutionName,
    type: parsed.data.type,
    eiin: parsed.data.eiin,
    address: parsed.data.address,
    district: parsed.data.district,
    principalName: parsed.data.principalName,
    phone: parsed.data.phone,
    email: parsed.data.email,
    ...(input.logoDataUrl ? { logoDataUrl: input.logoDataUrl } : {}),
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  const reachable = await isFirebaseBackendReachable();
  if (!reachable) {
    return { ok: true, data: application, savedToRtdb: false };
  }

  try {
    await withTimeout(
      set(ref(rtdb, `institutionApplications/${id}`), application),
      3500,
      'RTDB_OFFLINE_TIMEOUT'
    );
    return { ok: true, data: application, savedToRtdb: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    if (msg === 'RTDB_OFFLINE_TIMEOUT' || msg.includes('offline') || msg.includes('network')) {
      return { ok: true, data: application, savedToRtdb: false };
    }
    return {
      ok: false,
      error: msg || 'আবেদন সংরক্ষণ করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।',
    };
  }
}

/**
 * Subscribes live to /institutionApplications in Firebase Realtime Database.
 */
export function subscribeToApplications(
  onData: (apps: InstitutionApplication[]) => void,
  onError?: (error: Error) => void
): () => void {
  let active = true;
  let unsubscribeRtdb: (() => void) | null = null;

  void isFirebaseBackendReachable().then((reachable) => {
    if (!active || !reachable) return;
    const appsRef = ref(rtdb, 'institutionApplications');
    unsubscribeRtdb = onValue(
      appsRef,
      (snapshot) => {
        const val = (snapshot.val() ?? {}) as Record<string, InstitutionApplication>;
        const list = Object.values(val).sort((a, b) =>
          (b.createdAt || '').localeCompare(a.createdAt || '')
        );
        onData(list);
      },
      (err) => {
        onError?.(err);
      }
    );
  });

  return () => {
    active = false;
    unsubscribeRtdb?.();
  };
}

export async function fetchApplicationsViaServer(
  idToken: string
): Promise<{ ok: boolean; data?: InstitutionApplication[]; error?: string }> {
  const resp = await fetch('/api/admin/applications', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return resp.json();
}

export async function approveApplicationViaServer(
  idToken: string,
  applicationId: string
): Promise<{ ok: boolean; institutionCode?: string; uid?: string; emailSent?: boolean; error?: string }> {
  const resp = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/approve`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
  });
  return resp.json();
}

export async function rejectApplicationViaServer(
  idToken: string,
  applicationId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const resp = await fetch(`/api/admin/applications/${encodeURIComponent(applicationId)}/reject`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });
  return resp.json();
}
