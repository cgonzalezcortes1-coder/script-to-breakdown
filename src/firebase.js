import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCcqZi7bcthzRnIi-Ahlqr8lGkXXA5i38c",
  authDomain: "script-to-breakdown.firebaseapp.com",
  projectId: "script-to-breakdown",
  storageBucket: "script-to-breakdown.firebasestorage.app",
  messagingSenderId: "978322980478",
  appId: "1:978322980478:web:f0b94f4c4e272d9b77622f",
  measurementId: "G-Y8WKLQJJR9"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
