import { initializeApp } from "firebase/app";
import { getAuth, sendPasswordResetEmail,createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword } from "firebase/auth"; // Include createUserWithEmailAndPassword
import { getFirestore, collection, query, where, getDocs,getDoc, addDoc, doc, setDoc, updateDoc,limit,orderBy} from "firebase/firestore"; // Include all Firestore functions
import { getAnalytics } from "firebase/analytics";  // Optional, if you're using Analytics
import { updateUserData } from "./firebase"

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAmea_mR7DaYDQMpvoKJTVhX4Eou0Qe624",
    authDomain: "beforebroke-3ae0e.firebaseapp.com",
    databaseURL: "https://beforebroke-3ae0e-default-rtdb.firebaseio.com",
    projectId: "beforebroke-3ae0e",
    storageBucket: "beforebroke-3ae0e.firebasestorage.app",
    messagingSenderId: "1067539656204",
    appId: "1:1067539656204:web:3ef88f8cb4c4b16a6ec829",
    measurementId: "G-2V2WS90YJN"
  };
  

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);  // Optional

// Export Firebase services and functions
export { auth, db, analytics,sendPasswordResetEmail, createUserWithEmailAndPassword, getDoc,collection, query, updateUserData, updatePassword, where, getDocs, addDoc, doc, setDoc,updateDoc,limit,orderBy, signOut, signInWithEmailAndPassword};