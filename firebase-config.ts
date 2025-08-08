import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Feature flag to allow disabling Firestore usage in dev until rules are set
export const isFirestoreEnabled: boolean = (import.meta as any).env?.VITE_ENABLE_FIRESTORE !== 'false';

// Avoid logging full config or secrets in production

// Optional: log if Firestore is disabled to clarify console
if (!isFirestoreEnabled) {
  console.warn('Firestore disabled via VITE_ENABLE_FIRESTORE=false');
}

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.warn('Popup sign-in failed, trying redirect...', error);
    await signInWithRedirect(auth, googleProvider);
    return null as any;
  }
};

export const signOutUser = async () => {
  try {
    console.log('Firebase signOut called');
    await signOut(auth);
    console.log('Firebase signOut successful');
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Firestore functions for user data
export const saveUserData = async (userId: string, data: any) => {
  try {
    if (!isFirestoreEnabled) {
      console.warn('saveUserData skipped: Firestore disabled');
      return;
    }
    console.log('Attempting to save user data for:', userId);
    console.log('Data to save:', data);
    await setDoc(doc(db, 'users', userId), data, { merge: true });
    console.log('User data saved successfully');
  } catch (error) {
    console.error('Error saving user data:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

export const getUserData = async (userId: string) => {
  try {
    if (!isFirestoreEnabled) {
      console.warn('getUserData skipped: Firestore disabled');
      return null;
    }
    const docRef = doc(db, 'users', userId);
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
  return onAuthStateChanged(auth, callback);
};

export { auth, db };
