import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection } from 'firebase/firestore';

// Firebase configuration
// TODO: החלף את הפרטים הבאים עם הפרטים האמיתיים שלך מ-Firebase Console
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Feature flag to allow disabling Firestore usage in dev until rules are set
export const isFirestoreEnabled: boolean = (import.meta as any).env?.VITE_ENABLE_FIRESTORE !== 'false';

// Debug: Check if Firebase is initialized correctly
console.log('Firebase initialized successfully');
console.log('Auth domain:', firebaseConfig.authDomain);
console.log('Project ID:', firebaseConfig.projectId);
console.log('API Key loaded:', !!firebaseConfig.apiKey);
console.log('Storage Bucket:', firebaseConfig.storageBucket);
console.log('Full config:', firebaseConfig);

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
    console.error('Error signing in with Google:', error);
    throw error;
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
