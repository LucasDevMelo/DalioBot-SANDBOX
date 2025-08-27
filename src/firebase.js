// Importar as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // Para usar a autenticação
import { getStorage } from "firebase/storage"; // Para usar o Storage
import { getFirestore } from "firebase/firestore"; // Para usar o Firestore
import { getDatabase, ref as dbRef, set } from 'firebase/database'; // Importando do Realtime Database

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBrh-M5zhWsVPcnpRVjMLJnhoqa1NAopZk",
  authDomain: "daliobot.firebaseapp.com",
  projectId: "daliobot",
  storageBucket: "daliobot.firebasestorage.app",
  messagingSenderId: "262123979539",
  appId: "1:262123979539:web:58befa87667422274090e6",
  measurementId: "G-M25W73JBRG"
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);

// Exportar os serviços que você for usar no seu projeto
export const db = getFirestore(app); // Firestore
export const auth = getAuth(app); // Firebase Authentication
export const storage = getStorage(app); // Firebase Storage
export const realtimeDB = getDatabase(app); // Realtime Database
