// src/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuración de Firebase (esto te lo da Firebase Console)
const firebaseConfig = {
  apiKey: "AIzaSyCNzPkWnlxTFCkC6a4_DYI2w1-UilvZKSA",
  authDomain: "regalosboda-56e1a.firebaseapp.com",
  projectId: "regalosboda-56e1a",
  storageBucket: "regalosboda-56e1a.firebasestorage.app",
  messagingSenderId: "220602184323",
  appId: "1:220602184323:web:253e0c814983601ede21b6"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar Firestore (la base de datos)
const db = getFirestore(app);

export { db };
