import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const STORAGE_KEY = 'smart_call_firebase_config';

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBXgNdcMEhCCkRGdXIgJyykvjyh3xdaxGs",
  authDomain: "smart-call-reminder.firebaseapp.com",
  projectId: "smart-call-reminder",
  storageBucket: "smart-call-reminder.firebasestorage.app",
  messagingSenderId: "1007504571178",
  appId: "1:1007504571178:web:42fc4f54b8264728087c53",
};

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading firebase config from localStorage', err);
  }

  // Fallback to import.meta.env
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  if (apiKey && projectId) {
    return {
      apiKey,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  // Clear any existing app to force re-init
  _app = null;
  _db = null;
}

export function clearStoredFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  _app = null;
  _db = null;
}

let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (_app) return _app;

  const config = getStoredFirebaseConfig();
  if (!config || !config.apiKey || !config.projectId) {
    return null;
  }

  try {
    if (getApps().length === 0) {
      _app = initializeApp(config);
    } else {
      _app = getApp();
    }
    return _app;
  } catch (err) {
    console.error('Failed to initialize Firebase', err);
    return null;
  }
}

export function getFirebaseDb(): Firestore | null {
  if (_db) return _db;
  const app = getFirebaseApp();
  if (!app) return null;

  try {
    _db = getFirestore(app);
    return _db;
  } catch (err) {
    console.error('Failed to get Firestore', err);
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  const config = getStoredFirebaseConfig();
  return Boolean(config && config.apiKey && config.projectId);
}

export function parseFirebaseConfigInput(input: string): FirebaseConfig | null {
  const trimmed = input.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.apiKey && parsed.projectId) {
      return parsed;
    }
  } catch {}

  const apiKeyMatch = trimmed.match(/apiKey\s*:\s*["']([^"']+)["']/);
  const projectIdMatch = trimmed.match(/projectId\s*:\s*["']([^"']+)["']/);
  const authDomainMatch = trimmed.match(/authDomain\s*:\s*["']([^"']+)["']/);
  const storageBucketMatch = trimmed.match(/storageBucket\s*:\s*["']([^"']+)["']/);
  const messagingSenderIdMatch = trimmed.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
  const appIdMatch = trimmed.match(/appId\s*:\s*["']([^"']+)["']/);

  if (apiKeyMatch && projectIdMatch) {
    return {
      apiKey: apiKeyMatch[1],
      projectId: projectIdMatch[1],
      authDomain: authDomainMatch ? authDomainMatch[1] : undefined,
      storageBucket: storageBucketMatch ? storageBucketMatch[1] : undefined,
      messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : undefined,
      appId: appIdMatch ? appIdMatch[1] : '',
    };
  }

  return null;
}
