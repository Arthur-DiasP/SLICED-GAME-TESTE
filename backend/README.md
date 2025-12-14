# 🚀 Guia Rápido - SLICED PRIVADO Backend

## ⚡ Instalação Rápida

### Windows:
```bash
# Execute o script de instalação
instalar.bat
```

### Manual:
```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
copy .env.example .env
# Edite o arquivo .env com suas credenciais

# 3. Iniciar servidor
npm start
```

---

## 🔑 Configuração Mínima Necessária

Edite o arquivo `.env` com:

```env
# Firebase Admin
FIREBASE_PROJECT_ID=sliced-4f1e3
FIREBASE_CLIENT_EMAIL=seu-email@sliced-4f1e3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui
```

---

## 📡 Endpoints Disponíveis

### 1. Criar Pagamento PIX
```http
POST /api/deposit/create
Content-Type: application/json

{
  "userId": "ID_DO_USUARIO",
  "amount": 10.00,
  "email": "usuario@exemplo.com",
  "firstName": "João",
  "lastName": "Silva"
}
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "paymentId": "123456789",
    "qrCode": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "iVBORw0KGgoAAAANSUhEUgAA...",
    "amount": "10.00",
    "expirationDate": "2025-12-10T12:00:00.000Z"
  }
}
```

### 2. Consultar Saldo
```http
GET /api/user/{userId}/balance
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "balance": "100.00"
  }
}
```

### 3. Solicitar Saque
```http
POST /api/withdraw/request
Content-Type: application/json

{
  "userId": "ID_DO_USUARIO",
  "amount": 50.00,
  "pixKey": "11999999999",
  "pixKeyType": "phone"
}
```

**Resposta:**
```json
{
  "success": true,
  "message": "Saque solicitado com sucesso! Será processado em até 24 horas.",
  "newBalance": "50.00"
}
```

---

## 🐛 Problemas Comuns

### Erro: "Cannot find module 'firebase-admin'"
**Solução:** Execute `npm install`

### Erro: "Firebase Admin não inicializado"
**Solução:** Configure o arquivo `.env` com as credenciais do Firebase

### Erro: "Erro ao criar pagamento no Mercado Pago"
**Solução:** Verifique se o token do Mercado Pago está correto no `.env`

---

## 📚 Documentação Completa

Para mais detalhes, consulte: **[CORRECAO_QR_CODE.md](./CORRECAO_QR_CODE.md)**

---

## 🆘 Suporte

- Verifique os logs detalhados no console
- Leia a documentação completa em `CORRECAO_QR_CODE.md`
- Confirme que todas as dependências estão instaladas
