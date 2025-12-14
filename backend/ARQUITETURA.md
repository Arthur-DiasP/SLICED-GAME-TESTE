# 🏗️ Arquitetura do Sistema - InfinitePay & Firestore

## 📊 Visão Geral

```
┌─────────────────┐
│   Cliente Web   │
│   ou Mobile     │
└────────┬────────┘
         │
         │ HTTP/HTTPS
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    API Backend                          │
│                  (Node.js/Express)                      │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   server.js  │  │   auth.js    │  │firebase-     │ │
│  │              │  │              │  │config.js     │ │
│  │  - Endpoints │  │ - OAuth2     │  │              │ │
│  │  - Rotas     │  │ - Tokens     │  │ - Firestore  │ │
│  │  - Validação │  │ - Headers    │  │   Connection │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────┬───────────────────┬───────────────────┬──────┘
          │                   │                   │
          │                   │                   │
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  InfinitePay    │  │  InfinitePay    │  │    Firebase     │
│      API        │  │    Webhook      │  │   Firestore     │
│                 │  │                 │  │                 │
│  - Criar Pix    │  │  - Notificação  │  │  - users        │
│  - QR Code      │  │    de Pagamento │  │  - transactions │
│  - Cobrança     │  │  - Status PAID  │  │  - withdrawals  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 🔄 Fluxo de Dados

### 1️⃣ Fluxo de Depósito (Pix)

```
Cliente                API Backend           InfinitePay         Firestore
   │                        │                      │                 │
   │  POST /deposit/generate│                      │                 │
   ├───────────────────────>│                      │                 │
   │                        │                      │                 │
   │                        │  Obter Token OAuth2  │                 │
   │                        ├─────────────────────>│                 │
   │                        │<─────────────────────┤                 │
   │                        │   Access Token       │                 │
   │                        │                      │                 │
   │                        │  Criar Cobrança Pix  │                 │
   │                        ├─────────────────────>│                 │
   │                        │<─────────────────────┤                 │
   │                        │  QR Code + Pix Data  │                 │
   │                        │                      │                 │
   │                        │         Salvar Transação (PENDING)     │
   │                        ├────────────────────────────────────────>│
   │                        │<────────────────────────────────────────┤
   │                        │                      │                 │
   │  Retorna QR Code       │                      │                 │
   │<───────────────────────┤                      │                 │
   │                        │                      │                 │
```

### 2️⃣ Fluxo de Webhook (Crédito Automático)

```
InfinitePay           API Backend                    Firestore
     │                     │                              │
     │  POST /webhook      │                              │
     │  (Pagamento PAID)   │                              │
     ├────────────────────>│                              │
     │                     │                              │
     │                     │  Validar Assinatura          │
     │                     │  (HMAC SHA-256)              │
     │                     │                              │
     │                     │  Iniciar Transação Atômica   │
     │                     ├─────────────────────────────>│
     │                     │                              │
     │                     │  1. Buscar Transação         │
     │                     │  2. Buscar Usuário           │
     │                     │  3. Atualizar Saldo          │
     │                     │  4. Marcar COMPLETED         │
     │                     │                              │
     │                     │<─────────────────────────────┤
     │                     │  Commit Transação            │
     │                     │                              │
     │  200 OK             │                              │
     │<────────────────────┤                              │
     │                     │                              │
```

### 3️⃣ Fluxo de Saque

```
Cliente              API Backend                  Firestore
   │                      │                           │
   │  POST /withdraw      │                           │
   ├─────────────────────>│                           │
   │                      │                           │
   │                      │  Validar Valor Mínimo     │
   │                      │  (>= R$ 50,00)            │
   │                      │                           │
   │                      │  Buscar Saldo do Usuário  │
   │                      ├──────────────────────────>│
   │                      │<──────────────────────────┤
   │                      │                           │
   │                      │  Validar Saldo            │
   │                      │  Suficiente               │
   │                      │                           │
   │                      │  Criar Solicitação        │
   │                      │  (status: PENDING)        │
   │                      ├──────────────────────────>│
   │                      │<──────────────────────────┤
   │                      │                           │
   │  Confirmação         │                           │
   │<─────────────────────┤                           │
   │                      │                           │
```

## 🗄️ Estrutura do Banco de Dados (Firestore)

### Coleção: `users`

```javascript
users/
  └── {userId}/
      ├── userId: string          // ID único do usuário
      ├── name: string            // Nome completo
      ├── document: string        // CPF/CNPJ
      ├── email: string           // E-mail
      ├── phone: string           // Telefone
      ├── balance: number         // Saldo atual (R$)
      ├── createdAt: timestamp    // Data de criação
      └── updatedAt: timestamp    // Última atualização
```

**Exemplo:**
```json
{
  "userId": "user123",
  "name": "João da Silva",
  "document": "12345678900",
  "email": "joao@example.com",
  "phone": "11999999999",
  "balance": 150.00,
  "createdAt": "2025-11-28T15:00:00.000Z",
  "updatedAt": "2025-11-28T18:30:00.000Z"
}
```

---

### Coleção: `transactions`

```javascript
transactions/
  └── {orderNSU}/                 // ID = order_nsu
      ├── orderNSU: string        // ID único da transação
      ├── userId: string          // Referência ao usuário
      ├── amount: number          // Valor em reais
      ├── amountInCents: number   // Valor em centavos
      ├── infiniteTag: string     // Tag de identificação
      ├── status: string          // PENDING | COMPLETED
      ├── pixId: string           // ID do Pix na InfinitePay
      ├── qrCode: string          // QR Code (base64)
      ├── qrCodeText: string      // Pix Copia e Cola
      ├── createdAt: timestamp    // Data de criação
      ├── updatedAt: timestamp    // Última atualização
      ├── completedAt: timestamp  // Data de conclusão (opcional)
      └── webhookPayload: object  // Dados do webhook (opcional)
```

**Exemplo:**
```json
{
  "orderNSU": "TXN1732814400000123",
  "userId": "user123",
  "amount": 100.00,
  "amountInCents": 10000,
  "infiniteTag": "deposito-001",
  "status": "COMPLETED",
  "pixId": "pix_abc123xyz",
  "qrCode": "data:image/png;base64,...",
  "qrCodeText": "00020126580014br.gov.bcb.pix...",
  "createdAt": "2025-11-28T18:00:00.000Z",
  "updatedAt": "2025-11-28T18:30:00.000Z",
  "completedAt": "2025-11-28T18:30:00.000Z",
  "webhookPayload": { ... }
}
```

---

### Coleção: `withdrawals`

```javascript
withdrawals/
  └── {withdrawId}/
      ├── withdrawId: string      // ID único do saque
      ├── userId: string          // Referência ao usuário
      ├── amount: number          // Valor solicitado (R$)
      ├── status: string          // PENDING | APPROVED | REJECTED | COMPLETED
      ├── createdAt: timestamp    // Data da solicitação
      ├── updatedAt: timestamp    // Última atualização
      ├── approvedAt: timestamp   // Data de aprovação (opcional)
      ├── completedAt: timestamp  // Data de conclusão (opcional)
      └── notes: string           // Observações (opcional)
```

**Exemplo:**
```json
{
  "withdrawId": "WTH1732814400000456",
  "userId": "user123",
  "amount": 50.00,
  "status": "PENDING",
  "createdAt": "2025-11-28T19:00:00.000Z",
  "updatedAt": "2025-11-28T19:00:00.000Z"
}
```

## 🔐 Segurança

### 1. Autenticação InfinitePay (OAuth2)

```javascript
// auth.js
POST https://api.infinitepay.io/v2/oauth/token
{
  "grant_type": "client_credentials",
  "client_id": "CLIENT_ID",
  "client_secret": "CLIENT_SECRET"
}

// Resposta
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

### 2. Validação de Webhook (HMAC SHA-256)

```javascript
// server.js
const crypto = require('crypto');

function validateWebhookSignature(payload, signature) {
  const hash = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return hash === signature;
}
```

### 3. Transações Atômicas (Firestore)

```javascript
// server.js
await db.runTransaction(async (transaction) => {
  // 1. Ler dados
  const userDoc = await transaction.get(userRef);
  const txnDoc = await transaction.get(txnRef);
  
  // 2. Validar
  if (txnDoc.data().status === 'COMPLETED') return;
  
  // 3. Atualizar (tudo ou nada)
  transaction.update(userRef, { balance: newBalance });
  transaction.update(txnRef, { status: 'COMPLETED' });
});
```

## 📡 Endpoints da API

| Método | Endpoint                        | Descrição                    |
|--------|---------------------------------|------------------------------|
| GET    | `/health`                       | Health check                 |
| GET    | `/api/user/:userId/balance`     | Consultar saldo              |
| POST   | `/api/deposit/generate`         | Gerar Pix (depósito)         |
| POST   | `/api/infinitepay/webhook`      | Webhook de pagamento         |
| POST   | `/api/withdraw/request`         | Solicitar saque              |

## 🔄 Estados da Transação

```
┌─────────────┐
│   PENDING   │  ← Pix criado, aguardando pagamento
└──────┬──────┘
       │
       │ Webhook recebido (status: PAID)
       │
       ▼
┌─────────────┐
│  COMPLETED  │  ← Pagamento confirmado, saldo creditado
└─────────────┘
```

## 🔄 Estados do Saque

```
┌─────────────┐
│   PENDING   │  ← Solicitação criada
└──────┬──────┘
       │
       │ Análise manual/automática
       │
       ├──────────┬──────────┐
       ▼          ▼          ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│ APPROVED │ │ REJECTED │ │COMPLETED │
└──────────┘ └──────────┘ └──────────┘
```

## 🚀 Tecnologias Utilizadas

| Tecnologia       | Versão  | Uso                              |
|------------------|---------|----------------------------------|
| Node.js          | 20.x    | Runtime JavaScript               |
| Express          | 4.18.x  | Framework web                    |
| Firebase Admin   | 12.0.x  | SDK do Firebase/Firestore        |
| Axios            | 1.6.x   | Cliente HTTP                     |
| dotenv           | 16.3.x  | Variáveis de ambiente            |
| body-parser      | 1.20.x  | Parser de requisições            |

## 📈 Escalabilidade

### Considerações:

1. **Firestore**: Suporta até 1 milhão de operações/dia no plano gratuito
2. **InfinitePay**: Verificar limites de API no contrato
3. **Express**: Pode ser escalado horizontalmente com load balancer
4. **Transações Atômicas**: Garantem consistência mesmo em alta concorrência

### Melhorias Futuras:

- [ ] Cache de tokens InfinitePay (Redis)
- [ ] Fila de processamento de webhooks (Bull/RabbitMQ)
- [ ] Rate limiting por usuário
- [ ] Logs estruturados (Winston/Pino)
- [ ] Monitoramento (Prometheus/Grafana)
- [ ] Testes automatizados (Jest/Mocha)

---

**Arquitetura criada para ser robusta, escalável e segura! 🚀**
