const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

export const firebaseConfig = {
  apiKey: viteEnv?.VITE_FIREBASE_API_KEY || "AIzaSyCnaCCsVO8vZ3bAAiTX_QOO-cfKGmf9LgU",
  authDomain: viteEnv?.VITE_FIREBASE_AUTH_DOMAIN || "usersapp-2a67f.firebaseapp.com",
  databaseURL: viteEnv?.VITE_FIREBASE_DATABASE_URL || "https://usersapp-2a67f-default-rtdb.firebaseio.com",
  projectId: viteEnv?.VITE_FIREBASE_PROJECT_ID || "usersapp-2a67f",
  storageBucket: viteEnv?.VITE_FIREBASE_STORAGE_BUCKET || "usersapp-2a67f.firebasestorage.app",
  messagingSenderId: viteEnv?.VITE_FIREBASE_MESSAGING_SENDER_ID || "651412439253",
  appId: viteEnv?.VITE_FIREBASE_APP_ID || "1:651412439253:web:aa2e77739555c35851625c",
};

export const USE_FIREBASE_EMULATOR =
  viteEnv?.VITE_USE_FIREBASE_EMULATOR !== 'false';
