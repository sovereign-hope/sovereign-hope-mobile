import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyAvvBaPklg1pC7fb1gyo7B9WaU8a4NMh2g",
  authDomain: "sovereign-hope-mobile.firebaseapp.com",
  projectId: "sovereign-hope-mobile",
  storageBucket: "sovereign-hope-mobile.appspot.com",
  messagingSenderId: "816081321481",
  appId: "1:816081321481:web:f44dc2a4f1d29f973f42d8",
  measurementId: "G-WBM7136G5P",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "us-central1");

const googleProvider = new GoogleAuthProvider();

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export const logOut = () => signOut(auth);
