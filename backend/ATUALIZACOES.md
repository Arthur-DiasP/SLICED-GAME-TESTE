# 🔄 API Atualizada - InfinitePay Checkout/Links + Firebase SPFC

## ✅ Mudanças Implementadas

Este projeto foi **atualizado** para usar:
1. **API de Checkout/Links da InfinitePay** (ao invés de API de Pix)
2. **Estrutura Firebase existente**: `SPFC/data/Usuários`
3. **Integração completa** com o sistema de autenticação já implementado

---

## 🆕 O que mudou?

### 1. API InfinitePay

**ANTES (API de Pix com OAuth2):**
```javascript
// Requeria CLIENT_ID e CLIENT_SECRET
POST /v2/oauth/token
POST /v2/pix/charges
```

**AGORA (API de Checkout/Links - Pública):**
```javascript
// Requer apenas INFINITE_TAG (handle)
POST /invoices/public/checkout/links
```

### 2. Estrutura do Firebase

**ANTES:**
```
Firestore
├── users/
├── transactions/
└── withdrawals/
```

**AGORA (Integrado com sistema existente):**
```
Firestore
└── SPFC/
    └── data/
        ├── Usuários/        ← Estrutura existente do auth.js
        ├── Transações/      ← Nova coleção para depósitos
        └── Saques/          ← Nova coleção para saques
```

### 3. Campos do Usuário

**ANTES:**
- `balance` (saldo)
- `name` (nome)
- `document` (CPF)

**AGORA (compatível com auth.js):**
- `saldo` (saldo)
- `nomeCompleto` (nome)
- `cpf` (CPF)
- `email` (e-mail)
- `telefone` (telefone)
- `ativo` (status)

---

## 📋 Configuração Atualizada

### Arquivo `.env`

```env
# Configurações do Servidor
PORT=3000
BASE_URL=http://localhost:3000

# InfinitePay - Infinite Tag (Handle)
INFINITEPAY_HANDLE=sua_infinite_tag_aqui

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

**Onde encontrar sua Infinite Tag:**
1. Acesse: https://dashboard.infinitepay.io/
2. Vá em **Configurações** > **Minha Conta**
3. Copie sua **Infinite Tag** (ex: `@meunegocio`)

---

## 🔄 Fluxo de Pagamento Atualizado

### 1️⃣ Cliente solicita depósito

```javascript
POST /api/deposit/generate
{
  "userId": "user_1732814400000_abc123",
  "amount": 100.00,
  "redirectUrl": "https://meusite.com/sucesso" // Opcional
}
```

### 2️⃣ API cria link de pagamento

```javascript
// Internamente, envia para InfinitePay:
POST https://api.infinitepay.io/invoices/public/checkout/links
{
  "handle": "sua_infinite_tag",
  "redirect_url": "https://meusite.com/sucesso",
  "webhook_url": "https://meusite.com/api/infinitepay/webhook",
  "order_nsu": "TXN1732814400000123",
  "customer": {
    "name": "João da Silva",
    "email": "joao@email.com",
    "phone_number": "11999999999"
  },
  "items": [
    {
      "quantity": 1,
      "price": 10000,  // R$ 100,00 em centavos
      "description": "Depósito - SPFC"
    }
  ]
}
```

### 3️⃣ InfinitePay retorna URL

```javascript
{
  "url": "https://checkout.infinitepay.com.br/sua_tag?lenc=codigo_unico"
}
```

### 4️⃣ Cliente paga

- Cliente acessa a URL
- Escolhe forma de pagamento (Pix ou Cartão)
- Finaliza pagamento

### 5️⃣ Webhook automático

```javascript
POST /api/infinitepay/webhook
{
  "invoice_slug": "abc123",
  "amount": 10000,
  "paid_amount": 10000,
  "installments": 1,
  "capture_method": "pix",  // ou "credit_card"
  "transaction_nsu": "UUID",
  "order_nsu": "TXN1732814400000123",
  "receipt_url": "https://comprovante.com/123",
  "items": [...]
}
```

### 6️⃣ Crédito automático

- API valida transação
- Atualiza saldo em `SPFC/data/Usuários`
- Marca transação como `COMPLETED` em `SPFC/data/Transações`

---

## 📡 Endpoints Atualizados

### 1. Gerar Link de Pagamento

```http
POST /api/deposit/generate
Content-Type: application/json

{
  "userId": "user_1732814400000_abc123",
  "amount": 100.00,
  "redirectUrl": "https://meusite.com/sucesso"  // Opcional
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Link de pagamento gerado com sucesso",
  "data": {
    "orderNSU": "TXN1732814400000123",
    "paymentUrl": "https://checkout.infinitepay.com.br/sua_tag?lenc=abc123",
    "amount": 100.00
  }
}
```

### 2. Webhook (Automático)

```http
POST /api/infinitepay/webhook
Content-Type: application/json

{
  "order_nsu": "TXN1732814400000123",
  "paid_amount": 10000,
  "capture_method": "pix",
  "transaction_nsu": "UUID",
  ...
}
```

**Resposta (conforme documentação InfinitePay):**
```json
{
  "success": true,
  "message": null
}
```

### 3. Consultar Saldo

```http
GET /api/user/{userId}/balance
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "userId": "user_1732814400000_abc123",
    "name": "João da Silva",
    "balance": 100.00
  }
}
```

### 4. Solicitar Saque

```http
POST /api/withdraw/request
Content-Type: application/json

{
  "userId": "user_1732814400000_abc123",
  "amount": 50.00
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Solicitação de saque registrada com sucesso",
  "data": {
    "withdrawId": "WTH1732814400000456",
    "amount": 50.00,
    "status": "PENDING",
    "note": "O saque será processado em até 24 horas úteis"
  }
}
```

---

## 🗄️ Estrutura do Firestore

### Coleção: `SPFC/data/Usuários`

```javascript
{
  "uid": "user_1732814400000_abc123",
  "nomeCompleto": "João da Silva",
  "email": "joao@email.com",
  "cpf": "123.456.789-00",
  "dataNascimento": "1990-01-15",
  "telefone": "(11) 99999-9999",
  "saldo": 100.00,              // ← Atualizado pelo webhook
  "ativo": true,
  "dataCriacao": "2025-11-28T15:00:00.000Z",
  "ultimoAcesso": "2025-11-28T18:00:00.000Z"
}
```

### Coleção: `SPFC/data/Transações`

```javascript
{
  "orderNSU": "TXN1732814400000123",
  "userId": "user_1732814400000_abc123",
  "amount": 100.00,
  "amountInCents": 10000,
  "status": "COMPLETED",        // PENDING → COMPLETED
  "paymentUrl": "https://checkout.infinitepay.com.br/...",
  "customerName": "João da Silva",
  "customerEmail": "joao@email.com",
  "paidAmount": 10000,
  "captureMethod": "pix",
  "transactionNSU": "UUID",
  "invoiceSlug": "abc123",
  "receiptUrl": "https://comprovante.com/123",
  "installments": 1,
  "createdAt": "2025-11-28T18:00:00.000Z",
  "completedAt": "2025-11-28T18:05:00.000Z",
  "webhookPayload": { ... }
}
```

### Coleção: `SPFC/data/Saques`

```javascript
{
  "withdrawId": "WTH1732814400000456",
  "userId": "user_1732814400000_abc123",
  "amount": 50.00,
  "status": "PENDING",
  "userName": "João da Silva",
  "userEmail": "joao@email.com",
  "createdAt": "2025-11-28T19:00:00.000Z",
  "updatedAt": "2025-11-28T19:00:00.000Z"
}
```

---

## 🧪 Testando

### 1. Criar usuário de teste

```bash
node create-test-user.js
```

Isso criará um usuário na estrutura `SPFC/data/Usuários` com saldo inicial de R$ 0,00.

### 2. Gerar link de pagamento

```bash
curl -X POST http://localhost:3000/api/deposit/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_1732814400000_test123",
    "amount": 100.00
  }'
```

### 3. Acessar URL de pagamento

Copie a `paymentUrl` retornada e acesse no navegador.

### 4. Webhook será chamado automaticamente

Após o pagamento, a InfinitePay enviará o webhook automaticamente.

### 5. Verificar saldo

```bash
curl http://localhost:3000/api/user/user_1732814400000_test123/balance
```

---

## 🔐 Segurança

### Webhook sem Assinatura

A API de checkout/links **não envia assinatura** no webhook. A validação é feita através do `order_nsu` que só existe no seu sistema.

### Transações Atômicas

Todas as operações críticas usam `db.runTransaction()` para garantir consistência.

---

## 📊 Comparação: Antes vs Agora

| Aspecto | Antes | Agora |
|---------|-------|-------|
| **API** | Pix (OAuth2) | Checkout/Links (Pública) |
| **Autenticação** | CLIENT_ID + SECRET | Infinite Tag |
| **Estrutura Firebase** | `users/`, `transactions/` | `SPFC/data/Usuários`, `SPFC/data/Transações` |
| **Campo Saldo** | `balance` | `saldo` |
| **Campo Nome** | `name` | `nomeCompleto` |
| **Pagamento** | Apenas Pix | Pix + Cartão |
| **QR Code** | Retornado na API | Disponível na URL de checkout |
| **Webhook** | Com assinatura | Sem assinatura |

---

## ✅ Vantagens da Nova Implementação

1. ✅ **Integração total** com sistema de autenticação existente
2. ✅ **Mais formas de pagamento** (Pix + Cartão)
3. ✅ **Checkout hospedado** pela InfinitePay (mais seguro)
4. ✅ **Sem necessidade de OAuth2** (mais simples)
5. ✅ **Estrutura unificada** no Firebase
6. ✅ **Compatível** com `controle-dados/auth.js`

---

## 🚀 Próximos Passos

1. Configure sua Infinite Tag no `.env`
2. Execute `npm install` (se ainda não fez)
3. Execute `node create-test-user.js` para criar usuário de teste
4. Inicie o servidor: `npm start`
5. Teste a geração de link de pagamento
6. Configure o webhook no painel da InfinitePay

---

**Atualizado em:** 28 de Novembro de 2025  
**Versão:** 2.0.0 (Checkout/Links + Firebase SPFC)
