import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyAFJKhinY2JrJCK-fMc2xQ9PKdBPKri4DQ",
  authDomain: "studio-5067807929-254e6.firebaseapp.com",
  projectId: "studio-5067807929-254e6",
  storageBucket: "studio-5067807929-254e6.appspot.com",
  messagingSenderId: "745753571996",
  appId: "1:745753571996:web:4b3220fa9705e3b5a33359"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleAuthProvider = new GoogleAuthProvider();

export { app, auth, db, storage, googleAuthProvider };
