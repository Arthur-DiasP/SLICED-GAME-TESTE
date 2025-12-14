// ============================================
// INSTRUÇÕES PARA CONFIGURAR O FIREBASE
// ============================================

/*
1. Acesse: https://console.firebase.google.com/
2. Crie um novo projeto ou selecione um existente
3. Vá em: Configurações do Projeto (ícone de engrenagem)
4. Role até "Seus aplicativos" e clique em </> (Web)
5. Registre o app e copie as credenciais abaixo
6. Cole as credenciais no arquivo: controle-dados/firebase-config.js
*/

// ============================================
// EXEMPLO DE CREDENCIAIS
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyCTX7MMnhHr_QgDpjPuZGuRyG4Uk9GpQAE",
  authDomain: "sliced-4f1e3.firebaseapp.com",
  projectId: "sliced-4f1e3",
  storageBucket: "sliced-4f1e3.firebasestorage.app",
  messagingSenderId: "800471538497",
  appId: "1:800471538497:web:c7d7b9eb55c72687365fc0",
  measurementId: "G-GDYH409PE2"
};


// ============================================
// SUAS CREDENCIAIS (COLE AQUI)
// ============================================

const minhasCredenciais = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// ============================================
// REGRAS DO FIRESTORE
// ============================================

/*
Cole estas regras no Firestore Database > Regras:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Coleção SLICED - permitir leitura e escrita
    // ATENÇÃO: Para produção, adicione regras mais restritivas
    match /SLICED/{userId} {
      allow read, write: if true;
    }
  }
}
*/

// ============================================
// CHECKLIST DE CONFIGURAÇÃO
// ============================================

/*
[ ] 1. Criar projeto no Firebase Console
[ ] 2. Ativar Firestore Database
[ ] 3. Configurar regras de segurança do Firestore
[ ] 4. Copiar credenciais do Firebase
[ ] 5. Colar credenciais em: controle-dados/firebase-config.js
[ ] 6. Iniciar servidor local (Live Server, Python, etc)
[ ] 7. Abrir index.html no navegador
[ ] 8. Testar cadastro de usuário
[ ] 9. Testar login
[ ] 10. Verificar dados no Firestore Console
*/
