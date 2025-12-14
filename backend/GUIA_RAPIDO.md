# 🚀 Guia Rápido - API InfinitePay Atualizada

## ✅ Sistema Atualizado e Pronto!

A API foi **completamente atualizada** para usar:
- ✅ **API de Checkout/Links** da InfinitePay (mais simples e completa)
- ✅ **Estrutura Firebase existente**: `SPFC/data/Usuários`
- ✅ **Integração total** com o sistema de autenticação

---

## 🎯 Como Usar (3 Passos)

### 1️⃣ Configurar `.env`

Crie um arquivo `.env` na pasta `backend/`:

```env
PORT=3000
BASE_URL=http://localhost:3000
INFINITEPAY_HANDLE=sua_infinite_tag_aqui
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

**Onde encontrar sua Infinite Tag:**
- Acesse: https://dashboard.infinitepay.io/
- Vá em **Configurações** > **Minha Conta**
- Copie sua **Infinite Tag** (ex: `@meunegocio`)

### 2️⃣ Instalar e Executar

```bash
# Instalar dependências
npm install

# Criar usuário de teste
node create-test-user.js

# Iniciar servidor
npm start
```

### 3️⃣ Testar

```bash
# Gerar link de pagamento
curl -X POST http://localhost:3000/api/deposit/generate \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "SEU_USER_ID_AQUI",
    "amount": 10.00
  }'
```

---

## 📡 Endpoints Disponíveis

### 1. Gerar Link de Pagamento

```http
POST /api/deposit/generate
```

**Body:**
```json
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
    "paymentUrl": "https://checkout.infinitepay.com.br/...",
    "amount": 100.00
  }
}
```

### 2. Consultar Saldo

```http
GET /api/user/:userId/balance
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

### 3. Solicitar Saque

```http
POST /api/withdraw/request
```

**Body:**
```json
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
    "status": "PENDING"
  }
}
```

### 4. Webhook (Automático)

```http
POST /api/infinitepay/webhook
```

Este endpoint é chamado **automaticamente** pela InfinitePay quando um pagamento é confirmado.

---

## 🗄️ Estrutura do Firebase

```
Firestore
└── SPFC/
    └── data/
        ├── Usuários/
        │   └── {userId}
        │       ├── uid
        │       ├── nomeCompleto
        │       ├── email
        │       ├── cpf
        │       ├── telefone
        │       ├── saldo ← Atualizado automaticamente
        │       └── ...
        │
        ├── Transações/
        │   └── {orderNSU}
        │       ├── userId
        │       ├── amount
        │       ├── status (PENDING → COMPLETED)
        │       ├── paymentUrl
        │       └── ...
        │
        └── Saques/
            └── {withdrawId}
                ├── userId
                ├── amount
                ├── status (PENDING)
                └── ...
```

---

## 🔄 Fluxo de Pagamento

```
1. Cliente → POST /api/deposit/generate
           ↓
2. API → Cria link na InfinitePay
           ↓
3. API → Retorna paymentUrl
           ↓
4. Cliente → Acessa paymentUrl
           ↓
5. Cliente → Paga (Pix ou Cartão)
           ↓
6. InfinitePay → POST /api/infinitepay/webhook
           ↓
7. API → Credita saldo automaticamente
           ↓
8. Cliente → Saldo atualizado! ✅
```

---

## 🆕 Principais Mudanças

| Item | Antes | Agora |
|------|-------|-------|
| **API** | Pix (OAuth2) | Checkout/Links |
| **Autenticação** | CLIENT_ID + SECRET | Infinite Tag |
| **Estrutura** | `users/` | `SPFC/data/Usuários` |
| **Saldo** | `balance` | `saldo` |
| **Pagamento** | Apenas Pix | Pix + Cartão |

---

## 📚 Documentação Completa

- **ATUALIZACOES.md** - Detalhes de todas as mudanças
- **README.md** - Documentação principal
- **INSTALACAO.md** - Guia de instalação do Node.js
- **EXEMPLOS.md** - Exemplos de requisições
- **ARQUITETURA.md** - Arquitetura do sistema

---

## ✅ Checklist

- [ ] Node.js instalado
- [ ] Dependências instaladas (`npm install`)
- [ ] Arquivo `.env` configurado
- [ ] Credenciais Firebase baixadas (`serviceAccountKey.json`)
- [ ] Infinite Tag configurada
- [ ] Usuário de teste criado (`node create-test-user.js`)
- [ ] Servidor rodando (`npm start`)
- [ ] Webhook configurado no painel InfinitePay

---

## 🆘 Precisa de Ajuda?

1. **Erro ao instalar dependências?**
   - Verifique se o Node.js está instalado: `node --version`
   - Leia: `INSTALACAO.md`

2. **Erro ao conectar Firebase?**
   - Verifique se `serviceAccountKey.json` existe
   - Confirme o caminho no `.env`

3. **Erro ao gerar link?**
   - Verifique se `INFINITEPAY_HANDLE` está correto
   - Confirme se o usuário existe no Firebase

4. **Webhook não funciona?**
   - Configure a URL no painel InfinitePay
   - Use ngrok para testes locais: `ngrok http 3000`

---

**Versão:** 2.0.0  
**Data:** 28/11/2025  
**Status:** ✅ Pronto para uso!
