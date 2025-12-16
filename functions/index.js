/**
 * Firebase Cloud Functions para SLICED
 * 
 * Função: deleteOldChatMessages
 * Descrição: Deleta automaticamente mensagens de chat com mais de 24 horas
 * Execução: A cada 1 hora
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Inicializar Firebase Admin
admin.initializeApp();

/**
 * Cloud Function agendada para deletar mensagens antigas do chat
 * Executa a cada 1 hora e deleta mensagens com mais de 24 horas
 */
exports.deleteOldChatMessages = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('America/Sao_Paulo')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    console.log('🔄 Iniciando limpeza de mensagens antigas...');
    
    try {
      // Calcular timestamp de 24 horas atrás
      const now = admin.firestore.Timestamp.now();
      const twentyFourHoursAgo = new Date(now.toMillis() - (24 * 60 * 60 * 1000));
      const cutoffTimestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);
      
      console.log(`⏰ Cutoff time: ${twentyFourHoursAgo.toISOString()}`);
      
      // Buscar todos os documentos na coleção SLICED
      const slicedSnapshot = await db.collection('SLICED').get();
      
      let totalDeleted = 0;
      let totalChatsProcessed = 0;
      
      // Processar cada usuário
      for (const userDoc of slicedSnapshot.docs) {
        const userId = userDoc.id;
        
        // Pular documento 'data' (contém dados do sistema)
        if (userId === 'data') {
          continue;
        }
        
        try {
          // Referência para o chat de suporte do usuário
          const chatRef = db.collection('SLICED')
            .doc(userId)
            .collection('Chat')
            .doc('support');
          
          // Verificar se o chat existe
          const chatDoc = await chatRef.get();
          if (!chatDoc.exists) {
            continue;
          }
          
          // Buscar mensagens antigas
          const messagesRef = chatRef.collection('messages');
          const oldMessagesQuery = messagesRef.where('timestamp', '<', cutoffTimestamp);
          const oldMessagesSnapshot = await oldMessagesQuery.get();
          
          if (oldMessagesSnapshot.empty) {
            continue;
          }
          
          // Deletar mensagens em batch (máximo 500 por batch)
          const batchSize = 500;
          let batch = db.batch();
          let batchCount = 0;
          let deletedInThisChat = 0;
          
          for (const messageDoc of oldMessagesSnapshot.docs) {
            batch.delete(messageDoc.ref);
            batchCount++;
            deletedInThisChat++;
            
            // Commit batch quando atingir o limite
            if (batchCount >= batchSize) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
          
          // Commit batch restante
          if (batchCount > 0) {
            await batch.commit();
          }
          
          totalDeleted += deletedInThisChat;
          totalChatsProcessed++;
          
          console.log(`✅ User ${userId}: Deleted ${deletedInThisChat} messages`);
          
          // Verificar se ainda há mensagens no chat
          const remainingMessages = await messagesRef.limit(1).get();
          
          // Se não há mais mensagens, atualizar o documento do chat
          if (remainingMessages.empty) {
            await chatRef.update({
              lastMessage: 'Chat vazio',
              lastMessageTime: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`📭 User ${userId}: Chat está vazio`);
          } else {
            // Atualizar com a última mensagem restante
            const latestMessageSnapshot = await messagesRef
              .orderBy('timestamp', 'desc')
              .limit(1)
              .get();
            
            if (!latestMessageSnapshot.empty) {
              const latestMessage = latestMessageSnapshot.docs[0].data();
              await chatRef.update({
                lastMessage: latestMessage.text || 'Mensagem',
                lastMessageTime: latestMessage.timestamp
              });
            }
          }
          
        } catch (error) {
          console.error(`❌ Error processing user ${userId}:`, error);
        }
      }
      
      console.log(`✅ Limpeza concluída!`);
      console.log(`📊 Total de chats processados: ${totalChatsProcessed}`);
      console.log(`🗑️ Total de mensagens deletadas: ${totalDeleted}`);
      
      return {
        success: true,
        chatsProcessed: totalChatsProcessed,
        messagesDeleted: totalDeleted,
        cutoffTime: twentyFourHoursAgo.toISOString()
      };
      
    } catch (error) {
      console.error('❌ Erro na limpeza de mensagens:', error);
      throw error;
    }
  });

/**
 * Cloud Function HTTP para deletar mensagens antigas manualmente
 * Útil para testes e execução manual
 * 
 * Uso: POST https://[region]-[project-id].cloudfunctions.net/manualDeleteOldMessages
 */
exports.manualDeleteOldMessages = functions.https.onRequest(async (req, res) => {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  const db = admin.firestore();
  
  try {
    console.log('🔄 Iniciando limpeza manual de mensagens antigas...');
    
    // Calcular timestamp de 24 horas atrás
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = new Date(now.toMillis() - (24 * 60 * 60 * 1000));
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);
    
    const slicedSnapshot = await db.collection('SLICED').get();
    
    let totalDeleted = 0;
    let totalChatsProcessed = 0;
    
    for (const userDoc of slicedSnapshot.docs) {
      const userId = userDoc.id;
      
      if (userId === 'data') {
        continue;
      }
      
      try {
        const chatRef = db.collection('SLICED')
          .doc(userId)
          .collection('Chat')
          .doc('support');
        
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) {
          continue;
        }
        
        const messagesRef = chatRef.collection('messages');
        const oldMessagesQuery = messagesRef.where('timestamp', '<', cutoffTimestamp);
        const oldMessagesSnapshot = await oldMessagesQuery.get();
        
        if (oldMessagesSnapshot.empty) {
          continue;
        }
        
        const batch = db.batch();
        let deletedInThisChat = 0;
        
        for (const messageDoc of oldMessagesSnapshot.docs) {
          batch.delete(messageDoc.ref);
          deletedInThisChat++;
        }
        
        await batch.commit();
        
        totalDeleted += deletedInThisChat;
        totalChatsProcessed++;
        
        // Atualizar última mensagem
        const remainingMessages = await messagesRef.limit(1).get();
        
        if (remainingMessages.empty) {
          await chatRef.update({
            lastMessage: 'Chat vazio',
            lastMessageTime: admin.firestore.FieldValue.serverTimestamp()
          });
        } else {
          const latestMessageSnapshot = await messagesRef
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
          
          if (!latestMessageSnapshot.empty) {
            const latestMessage = latestMessageSnapshot.docs[0].data();
            await chatRef.update({
              lastMessage: latestMessage.text || 'Mensagem',
              lastMessageTime: latestMessage.timestamp
            });
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error);
      }
    }
    
    const result = {
      success: true,
      chatsProcessed: totalChatsProcessed,
      messagesDeleted: totalDeleted,
      cutoffTime: twentyFourHoursAgo.toISOString(),
      executedAt: new Date().toISOString()
    };
    
    console.log('✅ Limpeza manual concluída:', result);
    
    res.status(200).json(result);
    
  } catch (error) {
    console.error('❌ Erro na limpeza manual:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Cloud Function para deletar uma conversa específica completa
 * 
 * Uso: POST https://[region]-[project-id].cloudfunctions.net/deleteUserChat
 * Body: { "userId": "user_id_here" }
 */
exports.deleteUserChat = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }
  
  const { userId } = req.body;
  
  if (!userId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }
  
  const db = admin.firestore();
  
  try {
    const chatRef = db.collection('SLICED')
      .doc(userId)
      .collection('Chat')
      .doc('support');
    
    const messagesRef = chatRef.collection('messages');
    const messagesSnapshot = await messagesRef.get();
    
    const batch = db.batch();
    
    messagesSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    // Deletar o documento do chat
    await chatRef.delete();
    
    res.status(200).json({
      success: true,
      messagesDeleted: messagesSnapshot.size,
      userId: userId
    });
    
  } catch (error) {
    console.error('❌ Erro ao deletar chat:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
