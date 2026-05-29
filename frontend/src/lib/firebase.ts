import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC88DAAo4PFfhkxsEhZObKzoJJsk4Zhs5E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "vi-sakha.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "vi-sakha",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "vi-sakha.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "265146091276",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:265146091276:web:755136f129df4bb323ab29"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  updateProfile,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider
};

export default app;

