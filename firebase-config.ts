import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Firebase configuration (read ONLY from env; no hardcoded fallbacks)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Basic validation to avoid empty config in production builds
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Missing Firebase env configuration. Ensure VITE_* vars are set at build time.');
}

// Detect configuration presence
const isFirebaseConfigured: boolean = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

// Initialize Firebase only when configured
const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : undefined as unknown as ReturnType<typeof initializeApp>;
const auth = isFirebaseConfigured ? getAuth(app) : undefined as unknown as ReturnType<typeof getAuth>;
const db = isFirebaseConfigured
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    })
  : undefined as unknown as ReturnType<typeof initializeFirestore>;

// Feature flag to enable cloud quote fetching (defaults to disabled)
const enableCloudQuotes: boolean = Boolean((import.meta as any).env?.VITE_ENABLE_CLOUD_QUOTES === 'true');

// Cloud Functions (us-central1 by default) - only when enabled
const functions = (isFirebaseConfigured && enableCloudQuotes) ? getFunctions(app, 'us-central1') : undefined as unknown as ReturnType<typeof getFunctions>;

// Feature flag (defaults to enabled when Firebase is configured). Set VITE_ENABLE_FIRESTORE='false' to disable.
export const isFirestoreEnabled: boolean = isFirebaseConfigured && ((import.meta as any).env?.VITE_ENABLE_FIRESTORE !== 'false');

// Avoid logging full config or secrets in production

// Optional: log if Firestore is disabled to clarify console
if (!isFirestoreEnabled) {
  console.warn('Firestore disabled (set VITE_ENABLE_FIRESTORE!="false" to enable)');
}

// Google Auth Provider
const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : undefined;

// App Check (optional, enabled when site key is provided)
try {
  const siteKey = (import.meta as any).env?.VITE_APPCHECK_SITE_KEY;
  if (isFirebaseConfigured && siteKey && typeof window !== 'undefined') {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch (err) {
  // silent in production
}

// Auth functions
export const signInWithGoogle = async () => {
  try {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase is not configured in this build.');
    }
    const result = await signInWithPopup(auth, googleProvider!);
    return result.user;
  } catch (error) {
    console.warn('Popup sign-in failed, trying redirect...', error);
    if (!isFirebaseConfigured) throw error;
    await signInWithRedirect(auth, googleProvider!);
    return null as any;
  }
};

export const signOutUser = async () => {
  try {
    if (!isFirebaseConfigured) return;
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return isFirebaseConfigured ? auth.currentUser : null;
};

// Firestore functions for user data
export const saveUserData = async (userId: string, data: any) => {
  try {
    if (!isFirestoreEnabled) return;
    await setDoc(doc(db!, 'users', userId), data, { merge: true });
  } catch (error) {
    console.error('Error saving user data:', error);
    throw error;
  }
};

export const getUserData = async (userId: string) => {
  try {
    if (!isFirestoreEnabled) {
      console.warn('getUserData skipped: Firestore disabled');
      return null;
    }
    const docRef = doc(db!, 'users', userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user data:', error);
    throw error;
  }
};

// Auth state listener
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

export { auth, db };

// Quote fetcher via callable Cloud Function (with App Check)
export const fetchQuotesViaFunction = async (symbols: string[]): Promise<Record<string, number>> => {
  if (!isFirebaseConfigured || !enableCloudQuotes || !functions) return {};
  try {
    const getQuote = httpsCallable(functions as any, 'getQuote');
    const resp = await getQuote({ symbols });
    return (resp.data as any) || {};
  } catch {
    return {};
  }
};
