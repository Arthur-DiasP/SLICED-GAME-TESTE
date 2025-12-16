/**
 * Script de teste local para simular a exclusão de mensagens antigas
 * Execute com: node test-delete-messages.js
 * 
 * ATENÇÃO: Este script usa firebase-admin e requer credenciais de serviço
 */

const admin = require('firebase-admin');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCTX7MMnhHr_QgDpjPuZGuRyG4Uk9GpQAE",
  authDomain: "sliced-4f1e3.firebaseapp.com",
  projectId: "sliced-4f1e3",
  storageBucket: "sliced-4f1e3.firebasestorage.app",
  messagingSenderId: "800471538497",
  appId: "1:800471538497:web:c7d7b9eb55c72687365fc0"
};

// Inicializar Firebase Admin
// NOTA: Para produção, use serviceAccountKey.json
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  ...firebaseConfig
});

const db = admin.firestore();

async function testDeleteOldMessages() {
  console.log('🧪 TESTE: Iniciando simulação de limpeza de mensagens antigas...\n');
  
  try {
    // Calcular timestamp de 24 horas atrás
    const now = admin.firestore.Timestamp.now();
    const twentyFourHoursAgo = new Date(now.toMillis() - (24 * 60 * 60 * 1000));
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(twentyFourHoursAgo);
    
    console.log(`⏰ Data/Hora atual: ${new Date(now.toMillis()).toLocaleString('pt-BR')}`);
    console.log(`⏰ Cutoff (24h atrás): ${twentyFourHoursAgo.toLocaleString('pt-BR')}\n`);
    
    // Buscar todos os documentos na coleção SLICED
    const slicedSnapshot = await db.collection('SLICED').get();
    
    console.log(`📊 Total de documentos em SLICED: ${slicedSnapshot.size}\n`);
    
    let totalOldMessages = 0;
    let totalChatsWithOldMessages = 0;
    let totalChatsProcessed = 0;
    
    // Processar cada usuário
    for (const userDoc of slicedSnapshot.docs) {
      const userId = userDoc.id;
      
      // Pular documento 'data'
      if (userId === 'data') {
        console.log(`⏭️  Pulando documento 'data'`);
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
          console.log(`⏭️  User ${userId}: Sem chat de suporte`);
          continue;
        }
        
        totalChatsProcessed++;
        
        // Buscar TODAS as mensagens (para estatísticas)
        const allMessagesRef = chatRef.collection('messages');
        const allMessagesSnapshot = await allMessagesRef.get();
        
        // Buscar mensagens antigas
        const oldMessagesQuery = allMessagesRef.where('timestamp', '<', cutoffTimestamp);
        const oldMessagesSnapshot = await oldMessagesQuery.get();
        
        const chatData = chatDoc.data();
        
        console.log(`\n👤 User: ${chatData.userName || userId}`);
        console.log(`   📧 Email: ${chatData.userEmail || 'N/A'}`);
        console.log(`   💬 Total de mensagens: ${allMessagesSnapshot.size}`);
        console.log(`   🗑️  Mensagens antigas (>24h): ${oldMessagesSnapshot.size}`);
        
        if (!oldMessagesSnapshot.empty) {
          totalOldMessages += oldMessagesSnapshot.size;
          totalChatsWithOldMessages++;
          
          // Mostrar detalhes das mensagens antigas
          console.log(`   📋 Detalhes das mensagens antigas:`);
          oldMessagesSnapshot.docs.forEach((msgDoc, index) => {
            const msg = msgDoc.data();
            const msgDate = msg.timestamp ? msg.timestamp.toDate() : new Date();
            const sender = msg.sender === 'user' ? '👤 Usuário' : '🎧 Suporte';
            console.log(`      ${index + 1}. ${sender} - ${msgDate.toLocaleString('pt-BR')}`);
            console.log(`         "${msg.text.substring(0, 50)}${msg.text.length > 50 ? '...' : ''}"`);
          });
          
          console.log(`   ⚠️  SERIAM DELETADAS: ${oldMessagesSnapshot.size} mensagens`);
        } else {
          console.log(`   ✅ Nenhuma mensagem antiga para deletar`);
        }
        
      } catch (error) {
        console.error(`   ❌ Erro ao processar user ${userId}:`, error.message);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMO DO TESTE');
    console.log('='.repeat(60));
    console.log(`✅ Total de chats processados: ${totalChatsProcessed}`);
    console.log(`📭 Chats com mensagens antigas: ${totalChatsWithOldMessages}`);
    console.log(`🗑️  Total de mensagens que seriam deletadas: ${totalOldMessages}`);
    console.log(`⏰ Cutoff time: ${twentyFourHoursAgo.toLocaleString('pt-BR')}`);
    console.log('='.repeat(60));
    
    console.log('\n✅ Teste concluído com sucesso!');
    console.log('ℹ️  NOTA: Este foi apenas um teste. Nenhuma mensagem foi deletada.');
    console.log('ℹ️  Para deletar de verdade, use a função manualDeleteOldMessages ou aguarde a execução agendada.\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Erro no teste:', error);
    process.exit(1);
  }
}

// Executar teste
console.log('🚀 Iniciando teste de exclusão de mensagens antigas...\n');
testDeleteOldMessages();
