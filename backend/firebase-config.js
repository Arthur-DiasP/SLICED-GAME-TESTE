/**
 * Firebase Admin SDK Configuration
 * Inicializa a conexão com o Firestore
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Caminho para o arquivo de credenciais do Firebase
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH não está definido no arquivo .env');
}

// Importar as credenciais do service account
const serviceAccount = require(serviceAccountPath);

// Inicializar o Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Exportar a instância do Firestore
const db = admin.firestore();

// Configurações opcionais do Firestore
db.settings({
  timestampsInSnapshots: true
});

console.log('✅ Firebase Admin inicializado com sucesso');

module.exports = { db, admin };
