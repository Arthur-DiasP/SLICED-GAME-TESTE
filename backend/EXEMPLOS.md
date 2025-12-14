# Exemplos de Requisições - API InfinitePay

Este arquivo contém exemplos práticos de como usar a API.

## 📋 Pré-requisitos para Testes

1. Servidor rodando: `npm start` ou `npm run dev`
2. Ter um usuário criado no Firestore (coleção `users`)
3. Credenciais InfinitePay configuradas no `.env`

## 🧪 Exemplos de Requisições

### 1. Health Check

**cURL:**
```bash
curl http://localhost:3000/health
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/health" -Method GET
```

**Resposta Esperada:**
```json
{
  "success": true,
  "message": "API está funcionando",
  "timestamp": "2025-11-28T18:00:00.000Z"
}
```

---

### 2. Consultar Saldo do Usuário

**cURL:**
```bash
curl http://localhost:3000/api/user/user123/balance
```

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/user/user123/balance" -Method GET
```

**Resposta Esperada:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "balance": 0
  }
}
```

---

### 3. Gerar Pix (Depósito)

**cURL:**
```bash
curl -X POST http://localhost:3000/api/deposit/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "amount": 100.00,
    "infiniteTag": "deposito-teste"
  }'
```

**PowerShell:**
```powershell
$body = @{
    userId = "user123"
    amount = 100.00
    infiniteTag = "deposito-teste"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/deposit/generate" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**JavaScript (Fetch API):**
```javascript
fetch('http://localhost:3000/api/deposit/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user123',
    amount: 100.00,
    infiniteTag: 'deposito-teste'
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));
```

**Resposta Esperada:**
```json
{
  "success": true,
  "message": "Pix gerado com sucesso",
  "data": {
    "orderNSU": "TXN1732814400000123",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "qrCodeText": "00020126580014br.gov.bcb.pix...",
    "amount": 100.00,
    "expiresAt": "2025-11-28T19:00:00.000Z"
  }
}
```

---

### 4. Solicitar Saque

**cURL:**
```bash
curl -X POST http://localhost:3000/api/withdraw/request \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "amount": 50.00
  }'
```

**PowerShell:**
```powershell
$body = @{
    userId = "user123"
    amount = 50.00
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/withdraw/request" `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

**JavaScript (Fetch API):**
```javascript
fetch('http://localhost:3000/api/withdraw/request', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'user123',
    amount: 50.00
  })
})
.then(response => response.json())
.then(data => console.log(data))
.catch(error => console.error('Erro:', error));
```

**Resposta Esperada (Sucesso):**
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

**Resposta Esperada (Erro - Valor Mínimo):**
```json
{
  "success": false,
  "message": "O valor mínimo para saque é R$ 50,00"
}
```

**Resposta Esperada (Erro - Saldo Insuficiente):**
```json
{
  "success": false,
  "message": "Saldo insuficiente",
  "currentBalance": 30.00,
  "requestedAmount": 50.00
}
```

---

### 5. Webhook InfinitePay (Simulação)

**⚠️ IMPORTANTE:** Este endpoint é chamado automaticamente pela InfinitePay quando um pagamento é confirmado. Não deve ser chamado manualmente em produção.

**Para testes locais, você pode simular:**

**cURL:**
```bash
curl -X POST http://localhost:3000/api/infinitepay/webhook \
  -H "Content-Type: application/json" \
  -H "X-InfinitePay-Signature: sua_assinatura_aqui" \
  -d '{
    "status": "PAID",
    "external_id": "TXN1732814400000123",
    "amount": 10000,
    "paid_at": "2025-11-28T18:30:00.000Z"
  }'
```

**PowerShell:**
```powershell
$headers = @{
    "Content-Type" = "application/json"
    "X-InfinitePay-Signature" = "sua_assinatura_aqui"
}

$body = @{
    status = "PAID"
    external_id = "TXN1732814400000123"
    amount = 10000
    paid_at = "2025-11-28T18:30:00.000Z"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/infinitepay/webhook" `
  -Method POST `
  -Headers $headers `
  -Body $body
```

**Resposta Esperada:**
```json
{
  "success": true,
  "message": "Pagamento processado com sucesso"
}
```

---

## 🔄 Fluxo Completo de Teste

### Passo 1: Criar Usuário no Firestore

Acesse o Firebase Console e crie um documento na coleção `users`:

```javascript
// Documento ID: user123
{
  userId: "user123",
  name: "João da Silva",
  document: "12345678900",
  balance: 0,
  createdAt: "2025-11-28T15:00:00.000Z",
  updatedAt: "2025-11-28T15:00:00.000Z"
}
```

### Passo 2: Gerar Pix

```bash
curl -X POST http://localhost:3000/api/deposit/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "amount": 100.00,
    "infiniteTag": "teste-001"
  }'
```

Guarde o `orderNSU` retornado (ex: `TXN1732814400000123`)

### Passo 3: Verificar Transação no Firestore

Acesse o Firestore e verifique a coleção `transactions`:
- Deve existir um documento com ID = `orderNSU`
- Status deve ser `PENDING`

### Passo 4: Pagar o Pix

Use o `qrCodeText` ou `qrCode` para fazer o pagamento via app bancário.

### Passo 5: Aguardar Webhook

A InfinitePay enviará automaticamente um webhook para:
```
https://seu-dominio.com/api/infinitepay/webhook
```

### Passo 6: Verificar Crédito

Consulte o saldo novamente:

```bash
curl http://localhost:3000/api/user/user123/balance
```

O saldo deve ter aumentado em R$ 100,00.

### Passo 7: Solicitar Saque

```bash
curl -X POST http://localhost:3000/api/withdraw/request \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "amount": 50.00
  }'
```

### Passo 8: Verificar Solicitação no Firestore

Acesse a coleção `withdrawals` e verifique se a solicitação foi criada com status `PENDING`.

---

## 🧰 Ferramentas Úteis para Testes

### 1. Postman
- Download: [https://www.postman.com/downloads/](https://www.postman.com/downloads/)
- Importe os exemplos acima como uma coleção

### 2. Insomnia
- Download: [https://insomnia.rest/download](https://insomnia.rest/download)
- Interface mais simples que o Postman

### 3. Thunder Client (VS Code Extension)
- Extensão do VS Code para testar APIs
- Instale via VS Code Marketplace

### 4. ngrok (Para testes de webhook localmente)
```bash
# Instalar
winget install ngrok

# Expor porta 3000
ngrok http 3000

# Use a URL gerada (ex: https://abc123.ngrok.io)
```

---

## 📊 Monitoramento de Logs

Para ver os logs do servidor em tempo real:

```bash
npm run dev
```

Você verá mensagens como:
```
✅ Firebase Admin inicializado com sucesso
✅ Token de acesso InfinitePay obtido com sucesso
🚀 Servidor rodando na porta 3000
📍 Health check: http://localhost:3000/health
✅ Pix criado com sucesso - Order NSU: TXN1732814400000123
✅ Crédito processado - User: user123, Valor: R$ 100, Novo Saldo: R$ 100
```

---

## ❌ Tratamento de Erros

### Erro 400 - Bad Request
```json
{
  "success": false,
  "message": "userId, amount e infiniteTag são obrigatórios"
}
```

### Erro 404 - Not Found
```json
{
  "success": false,
  "message": "Usuário não encontrado"
}
```

### Erro 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Erro ao gerar Pix",
  "error": "Detalhes do erro..."
}
```

---

## 🎯 Checklist de Testes

- [ ] Health check retorna sucesso
- [ ] Consulta de saldo funciona
- [ ] Geração de Pix cria transação no Firestore
- [ ] Webhook processa pagamento corretamente
- [ ] Saldo é creditado após webhook
- [ ] Validação de valor mínimo de saque (R$ 50)
- [ ] Validação de saldo insuficiente
- [ ] Solicitação de saque é registrada no Firestore
- [ ] Logs estão sendo exibidos corretamente

---

**Bons testes! 🚀**
