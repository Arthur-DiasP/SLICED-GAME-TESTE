# 🔔 Instruções para Webhook de Pagamento - SLICED

## 📋 Estrutura do Firebase Corrigida

### ✅ Estrutura CORRETA (Implementada agora)
```
SLICED (collection)
  └── {userId} (document)
      ├── uid: string
      ├── email: string
      ├── nome: string
      ├── balance: number
      ├── createdAt: timestamp
      └── lastUpdated: timestamp
```

### ❌ Estrutura ANTIGA (Removida)
```
SLICED (collection)
  └── data (document)
      └── Usuários (subcollection)
          └── {userId} (document)
```

## 🔧 O que foi Corrigido

### 1. **server2.js**
- ✅ Caminho do Firestore atualizado de `SLICED/data/Usuários/{userId}` para `SLICED/{userId}`
- ✅ Logs detalhados adicionados para debug
- ✅ Função `atualizarSaldoUsuario()` agora cria o documento se não existir
- ✅ Webhook com logs completos para rastreamento

### 2. **Rotas Atualizadas**
- `/api/user/:uid/balance` - Consulta saldo
- `/api/deposit/create` - Cria pagamento PIX
- `/api/webhook/mercadopago` - Recebe notificações do Mercado Pago
- `/api/withdraw/request` - Processa saques

## 🚀 Como Testar

### Passo 1: Verificar Firebase
1. Acesse o Firebase Console
2. Vá em Firestore Database
3. Verifique se a estrutura está como mostrado acima
4. Se houver dados na estrutura antiga, você pode:
   - Migrar manualmente os dados
   - Ou criar novos usuários com a estrutura correta

### Passo 2: Iniciar o Servidor
```bash
node server2.js
```

Você deve ver:
```
✅ Firebase Admin SDK configurado com sucesso.
✅ SDK do Mercado Pago configurado com sucesso.
🚀 SERVER 2 RODANDO NA PORTA 3001
```

### Passo 3: Fazer um Depósito de Teste
1. Acesse `perfil.html`
2. Clique em "Fazer Depósito"
3. Escolha um valor (ex: R$ 0,50 para teste)
4. Você será redirecionado para `saldo.html`
5. O QR Code PIX será gerado

### Passo 4: Monitorar os Logs

#### Quando o PIX é gerado:
```
✅ PIX gerado com sucesso! Iniciando WebSocket.
🔗 [WS] Cliente registrado para o paymentId: 123456789
```

#### Quando o Webhook é recebido:
```
🔔 ========== WEBHOOK RECEBIDO ==========
   📅 Timestamp: 2025-12-14T21:41:02.000Z
   📦 Body: {
     "type": "payment",
     "data": {
       "id": "123456789"
     }
   }
   🆔 Payment ID extraído: 123456789
   📋 Topic: payment
   🔍 Consultando pagamento no Mercado Pago...
   
   ✅ Pagamento consultado com sucesso!
   💳 Payment ID: 123456789
   📊 Status: approved
   👤 User ID: abc123xyz
   💰 Valor: R$ 0.50
   
   🎉 PAGAMENTO APROVADO! Atualizando saldo...
   
💰 [DB] Iniciando atualização de saldo...
   👤 User ID: abc123xyz
   💵 Valor: R$ 0.50
   
✅ [DB] Saldo atualizado com sucesso!
   📊 Saldo Anterior: R$ 0.00
   📊 Saldo Novo: R$ 0.50
   
   ✅ Saldo atualizado com sucesso no Firebase!
   📡 Notificando cliente via WebSocket...
   ✅ Webhook processado com sucesso!
========================================
```

## 🔍 Troubleshooting

### Problema: "Usuário não encontrado no Firestore"
**Solução:** O documento do usuário será criado automaticamente no primeiro depósito.

### Problema: "Firestore não inicializado"
**Solução:** Verifique se o arquivo `sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json` existe no diretório raiz.

### Problema: Webhook não está sendo chamado
**Solução:** 
1. Verifique se a URL do webhook está configurada no Mercado Pago
2. URL deve ser: `https://sliced-game-teste.onrender.com/api/webhook/mercadopago`
3. Em ambiente local, use ngrok ou similar para expor o localhost

### Problema: Saldo não atualiza no frontend
**Solução:**
1. O WebSocket notifica em tempo real
2. Se falhar, o usuário pode clicar no botão de atualizar saldo (ícone de refresh)
3. Ou recarregar a página

## 📱 Fluxo Completo (Como no Uber Cash)

1. **Usuário solicita depósito** → `perfil.html`
2. **Sistema gera PIX** → `saldo.html` (QR Code + Copia e Cola)
3. **Usuário paga** → App do banco
4. **Mercado Pago notifica** → Webhook `/api/webhook/mercadopago`
5. **Sistema atualiza saldo** → Firebase `SLICED/{userId}.balance`
6. **WebSocket notifica** → Frontend mostra "Pagamento Aprovado!"
7. **Usuário retorna** → `perfil.html` com saldo atualizado

## 🎯 Campos Importantes

### No Firebase (SLICED/{userId})
- `balance` (number) - Saldo do usuário em reais
- `uid` (string) - ID único do usuário
- `email` (string) - Email do usuário
- `nome` (string) - Nome completo
- `cpf` (string) - CPF (usado no PIX)

### No Mercado Pago (metadata)
- `user_id` - UID do Firebase (CRÍTICO para identificar quem paga)

## ✨ Melhorias Implementadas

1. **Logs Detalhados**: Cada etapa do processo é registrada
2. **Criação Automática**: Documento do usuário é criado se não existir
3. **Validação Robusta**: Verifica se o documento existe antes de atualizar
4. **Timestamps**: Registra quando o saldo foi criado/atualizado
5. **Tratamento de Erros**: Logs específicos para cada tipo de erro

## 🔐 Segurança

- ✅ Webhook valida o topic (apenas 'payment')
- ✅ Consulta o status real no Mercado Pago (não confia apenas no webhook)
- ✅ Transações atômicas para saques (evita saldo negativo)
- ✅ Validação de valores mínimos (R$ 0,50 para depósito, R$ 20,00 para saque)

---

**Última atualização:** 2025-12-14
**Versão:** 2.0
