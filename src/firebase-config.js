import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, onSnapshot, updateDoc, increment, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCCvFYBNK92lbfTjE89FufJP-2xCltfa60",
  authDomain: "tien-ich-nx-csdl-vnedu.firebaseapp.com",
  databaseURL: "https://tien-ich-nx-csdl-vnedu-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tien-ich-nx-csdl-vnedu",
  storageBucket: "tien-ich-nx-csdl-vnedu.firebasestorage.app",
  messagingSenderId: "87222165808",
  appId: "1:87222165808:web:865203c65dd69a8362a8f5",
  measurementId: "G-657J85CYGL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export { app, auth, db, provider, signInWithPopup, onAuthStateChanged, signOut, doc, getDoc, setDoc, onSnapshot, updateDoc, increment, arrayUnion };
