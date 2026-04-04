import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAbEFZD3kjDWzTBuJUzzLrGcY8XBmyZ9vs",
  authDomain: "med-manager-3ddd6.firebaseapp.com",
  projectId: "med-manager-3ddd6",
  storageBucket: "med-manager-3ddd6.firebasestorage.app",
  messagingSenderId: "75662515852",
  appId: "1:75662515852:web:3617933cb4b2e12cbca5a9",
  measurementId: "G-3KJS1N62E3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
