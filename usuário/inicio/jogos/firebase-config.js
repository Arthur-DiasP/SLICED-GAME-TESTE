// Configuração do Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCTX7MMnhHr_QgDpjPuZGuRyG4Uk9GpQAE",
    authDomain: "sliced-4f1e3.firebaseapp.com",
    projectId: "sliced-4f1e3",
    storageBucket: "sliced-4f1e3.firebasestorage.app",
    messagingSenderId: "800471538497",
    appId: "1:800471538497:web:c7d7b9eb55c72687365fc0",
    measurementId: "G-GDYH409PE2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { app, db };
