# Notificação de Mensagens Temporárias no Chat

## 📋 Resumo

Foi implementada uma notificação visual no chat da página `perfil.html` informando aos usuários que todas as mensagens têm duração de 24 horas e serão excluídas permanentemente após esse período.

## 🎨 Implementação Visual

### Localização
A notificação aparece logo abaixo do cabeçalho do chat (que contém "Suporte SLICED") e acima da área de mensagens.

### Design
- **Cor**: Gradiente amarelo/laranja (rgba(255, 193, 7, 0.15) → rgba(255, 152, 0, 0.1))
- **Ícone**: Material Icons "schedule" (relógio) em amarelo (#ffc107)
- **Borda**: Borda esquerda de 4px em amarelo para destaque
- **Animação**: Slide-in suave ao abrir o chat
- **Texto**: 
  - Título: "⏰ Mensagens temporárias" (negrito, amarelo)
  - Descrição: "Todas as mensagens duram até 24 horas e depois serão excluídas permanentemente."

### Responsividade
A notificação se adapta automaticamente para diferentes tamanhos de tela:

- **Desktop**: Padding 15px 20px, ícone 24px, texto 0.9rem/0.8rem
- **Tablet (≤768px)**: Padding 12px 15px, ícone 20px, texto 0.85rem/0.75rem
- **Mobile (≤480px)**: Padding 10px 12px, ícone 18px, texto 0.8rem/0.7rem

## 🔧 Arquivos Modificados

### `perfil.html`
1. **HTML** (linhas ~1656-1666):
   - Adicionado elemento `.chat-notification` com ícone e texto informativo

2. **CSS** (linhas ~1804-1851):
   - Estilos principais da notificação
   - Animação de entrada
   - Estilos para ícone e texto

3. **CSS Responsivo** (linhas ~1995-2011, 2044-2060):
   - Media queries para 768px e 480px
   - Ajustes de padding, fontes e ícones

## ⚙️ Funcionalidade Backend (Recomendada)

Para implementar a exclusão automática de mensagens após 24 horas, recomenda-se:

### Opção 1: Cloud Functions (Firebase)
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.deleteOldMessages = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    const cutoff = new Date(now.toMillis() - (24 * 60 * 60 * 1000)); // 24 horas atrás
    
    // Buscar todas as conversas
    const usersSnapshot = await db.collection('SLICED').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const messagesRef = userDoc.ref
        .collection('Chat')
        .doc('support')
        .collection('messages');
      
      const oldMessages = await messagesRef
        .where('timestamp', '<', cutoff)
        .get();
      
      // Deletar mensagens antigas
      const batch = db.batch();
      oldMessages.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`Deleted ${oldMessages.size} old messages for user ${userDoc.id}`);
    }
    
    return null;
  });
```

### Opção 2: Script Node.js (Executar via Cron)
```javascript
// scripts/cleanOldMessages.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteOldMessages() {
  const now = admin.firestore.Timestamp.now();
  const cutoff = new Date(now.toMillis() - (24 * 60 * 60 * 1000));
  
  const usersSnapshot = await db.collection('SLICED').get();
  
  for (const userDoc of usersSnapshot.docs) {
    const messagesRef = userDoc.ref
      .collection('Chat')
      .doc('support')
      .collection('messages');
    
    const oldMessages = await messagesRef
      .where('timestamp', '<', cutoff)
      .get();
    
    const batch = db.batch();
    oldMessages.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`✅ Deleted ${oldMessages.size} messages for ${userDoc.id}`);
  }
}

deleteOldMessages()
  .then(() => {
    console.log('✅ Cleanup completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
```

### Opção 3: Firestore TTL (Time To Live)
```javascript
// Ao criar mensagem, adicionar campo de expiração
await chatRef.collection('messages').add({
  text: message,
  sender: 'user',
  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
  expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 horas
});

// Configurar índice TTL no Firestore Console:
// Collection: messages
// Field: expiresAt
// TTL: enabled
```

## 📝 Notas Importantes

1. **Notificação Visual**: ✅ Implementada e funcionando
2. **Exclusão Automática**: ⚠️ Requer implementação backend
3. **Estrutura de Dados**: As mensagens estão em `SLICED/{userId}/Chat/support/messages`
4. **Compatibilidade**: Funciona em todos os navegadores modernos e dispositivos móveis

## 🚀 Próximos Passos

Para completar a funcionalidade:

1. Escolher uma das opções de backend acima
2. Implementar a lógica de exclusão automática
3. Testar com mensagens de teste
4. Monitorar logs para garantir funcionamento correto
5. (Opcional) Adicionar notificação ao usuário quando mensagens forem excluídas

## 🎯 Benefícios

- **Privacidade**: Mensagens não ficam armazenadas indefinidamente
- **Conformidade**: Alinhado com práticas de proteção de dados
- **Performance**: Reduz o tamanho do banco de dados
- **Transparência**: Usuários são informados claramente sobre a política
