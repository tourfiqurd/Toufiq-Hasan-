import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { firebaseConfig, USE_FIREBASE_EMULATOR } from './firebaseConfig';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(app);
export const rtdb = getDatabase(app);

let emulatorsConnected = false;

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

if (USE_FIREBASE_EMULATOR && typeof window !== 'undefined' && !emulatorsConnected) {
  emulatorsConnected = true;
  const authHost = viteEnv?.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
  const dbHost = viteEnv?.VITE_FIREBASE_DB_EMULATOR_HOST || '127.0.0.1';
  const dbPort = Number(viteEnv?.VITE_FIREBASE_DB_EMULATOR_PORT || 9000);

  connectAuthEmulator(firebaseAuth, authHost, { disableWarnings: true });
  connectDatabaseEmulator(rtdb, dbHost, dbPort);
}

export { app as firebaseApp };
