# Estrutura do Chat - SLICED

## Nova Estrutura Implementada

A estrutura do chat foi refatorada para ser uma **subcoleção** dentro da coleção principal `SLICED`, ao invés de uma coleção raiz separada.

### Estrutura Anterior (Depreciada)
```
chats/
  └── {userId}/
      ├── userId
      ├── userName
      ├── userEmail
      ├── lastMessage
      ├── lastMessageTime
      ├── unreadSupport
      └── messages/ (subcoleção)
          └── {messageId}/
              ├── text
              ├── sender
              └── timestamp
```

### Nova Estrutura (Atual)
```
SLICED/
  └── {userId}/
      ├── (dados do usuário)
      └── Chat/ (subcoleção)
          └── support/
              ├── userId
              ├── userName
              ├── userEmail
              ├── lastMessage
              ├── lastMessageTime
              ├── unreadSupport
              └── messages/ (subcoleção)
                  └── {messageId}/
                      ├── text
                      ├── sender (user | support)
                      └── timestamp
```

## Benefícios da Nova Estrutura

1. **Organização**: Todos os dados relacionados a um usuário ficam agrupados sob o documento do usuário
2. **Escalabilidade**: Permite adicionar outros tipos de chat no futuro (ex: chat em grupo, notificações)
3. **Segurança**: Facilita a implementação de regras de segurança do Firestore
4. **Consistência**: Mantém a hierarquia lógica dos dados

## Arquivos Modificados

### 1. `usuário/perfil/perfil.html`
- **Função `loadChatMessages()`**: Atualizada para buscar mensagens em `SLICED/{userId}/Chat/support/messages`
- **Event Listener de envio**: Atualizado para salvar mensagens na nova estrutura

### 2. `dashboard/dashboard-suporte.html`
- **Função `loadChatList()`**: Agora usa `collectionGroup('Chat')` para buscar todos os chats de todos os usuários
- **Função `openChat()`**: Atualizada para usar `userId` ao invés de `chatId`
- **Função `loadMessages()`**: Busca mensagens em `SLICED/{userId}/Chat/support/messages`
- **Função `sendMessage()`**: Salva mensagens na nova estrutura

## Exemplo de Uso

### Usuário enviando mensagem
```javascript
const chatRef = db.collection('SLICED').doc(currentUser.uid)
    .collection('Chat').doc('support');

await chatRef.set({
    userId: currentUser.uid,
    userName: 'João Silva',
    userEmail: 'joao@example.com',
    lastMessage: 'Olá, preciso de ajuda',
    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
    unreadSupport: firebase.firestore.FieldValue.increment(1)
}, { merge: true });

await chatRef.collection('messages').add({
    text: 'Olá, preciso de ajuda',
    sender: 'user',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Suporte respondendo
```javascript
const chatRef = db.collection('SLICED').doc(userId)
    .collection('Chat').doc('support');

await chatRef.update({
    lastMessage: 'Olá! Como posso ajudar?',
    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
    unreadUser: firebase.firestore.FieldValue.increment(1)
});

await chatRef.collection('messages').add({
    text: 'Olá! Como posso ajudar?',
    sender: 'support',
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
});
```

### Dashboard buscando todos os chats
```javascript
db.collectionGroup('Chat')
    .where('userId', '!=', null)
    .orderBy('userId')
    .orderBy('lastMessageTime', 'desc')
    .onSnapshot((snapshot) => {
        snapshot.forEach((doc) => {
            const chat = doc.data();
            console.log(chat.userName, chat.lastMessage);
        });
    });
```

## Migração de Dados

Se você tiver dados na estrutura antiga (`chats/`), será necessário migrar para a nova estrutura. Aqui está um exemplo de script de migração:

```javascript
async function migrarChats() {
    const chatsAntigos = await db.collection('chats').get();
    
    for (const doc of chatsAntigos.docs) {
        const chatData = doc.data();
        const userId = doc.id;
        
        // Criar chat na nova estrutura
        await db.collection('SLICED').doc(userId)
            .collection('Chat').doc('support')
            .set(chatData);
        
        // Migrar mensagens
        const mensagens = await db.collection('chats').doc(userId)
            .collection('messages').get();
        
        for (const msgDoc of mensagens.docs) {
            await db.collection('SLICED').doc(userId)
                .collection('Chat').doc('support')
                .collection('messages').doc(msgDoc.id)
                .set(msgDoc.data());
        }
    }
    
    console.log('Migração concluída!');
}
```

## Regras de Segurança Firestore (Sugeridas)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para a coleção SLICED
    match /SLICED/{userId} {
      // Usuário pode ler e escrever seus próprios dados
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Subcoleção Chat
      match /Chat/{chatType} {
        // Usuário pode ler e escrever em seu próprio chat
        allow read, write: if request.auth != null && request.auth.uid == userId;
        
        // Suporte pode ler todos os chats (adicione verificação de role admin)
        allow read: if request.auth != null; // Adicione verificação de admin aqui
        
        // Mensagens
        match /messages/{messageId} {
          allow read, write: if request.auth != null && 
            (request.auth.uid == userId); // Adicione verificação de admin para suporte
        }
      }
    }
  }
}
```

## Notas Importantes

1. **CollectionGroup**: O dashboard usa `collectionGroup('Chat')` para buscar todos os chats. Certifique-se de criar um índice composto no Firestore para `userId` e `lastMessageTime`.

2. **Índice Necessário**: 
   - Coleção: `Chat` (Collection Group)
   - Campos: `userId` (Ascending), `lastMessageTime` (Descending)

3. **Compatibilidade**: A nova estrutura não é compatível com a antiga. Se você tiver dados existentes, execute a migração antes de usar o novo código.

4. **Performance**: O uso de `collectionGroup` é eficiente, mas certifique-se de ter os índices corretos configurados.

## Data de Implementação
**02 de Dezembro de 2025**

## Estrutura Final
**SLICED → Chat → support → messages**
