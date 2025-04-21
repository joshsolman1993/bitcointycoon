import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';

// Your Firebase configuration object (replace with your own config)
const firebaseConfig = {
  apiKey: "AIzaSyB-oqibCr73Tpi3yePIe7qvAQE5rnz2wEA",
  authDomain: "bitcoin-tycoon-a289a.firebaseapp.com",
  projectId: "bitcoin-tycoon-a289a",
  storageBucket: "bitcoin-tycoon-a289a.firebasestorage.app",
  messagingSenderId: "576904974293",
  appId: "1:576904974293:web:864fed3fb2c851ae18b75c"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Function to initialize user data in Firestore
export const initializeUserData = async (userId: string, email: string) => {
  const userRef = doc(db, 'users', userId);
  const defaultData = {
    email: email,
    btcBalance: 12.45,
    rank: 'Darkweb Overlord',
    miningPower: '1.2 TH/s',
    transactions: 245
  };
  await setDoc(userRef, defaultData);
};

// Function to get user data from Firestore
export const getUserData = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return userSnap.data();
  } else {
    return null;
  }
};