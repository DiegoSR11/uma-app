// src/firebase.js
// 1. Importamos las herramientas principales de Firebase
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // Herramientas para el Login
import { getFirestore } from "firebase/firestore"; // Herramientas para la Base de Datos

// 2. Tu llave de acceso única (la que copiaste de Firebase)
const firebaseConfig = {
  apiKey: "AIzaSyBCrq_9xYQQVQCPhD0yTtO8UJYRVBFTBxA",
  authDomain: "uma-app-dasr.firebaseapp.com",
  projectId: "uma-app-dasr",
  storageBucket: "uma-app-dasr.firebasestorage.app",
  messagingSenderId: "535749800467",
  appId: "1:535749800467:web:6daa667639f74adde605e6",
  measurementId: "G-HY79NSRHJH"
};

// 3. Inicializamos la aplicación conectándola con Google
const app = initializeApp(firebaseConfig);

// 4. Preparamos y exportamos los servicios para usarlos en otras pantallas de UMA
export const auth = getAuth(app); // Controla quién entra y sale
export const db = getFirestore(app); // Controlará las tareas guardadas
export const googleProvider = new GoogleAuthProvider(); // Permite la ventana emergente de Google