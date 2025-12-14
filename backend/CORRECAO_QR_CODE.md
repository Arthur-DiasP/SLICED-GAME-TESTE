# 🔧 Correção do Problema de QR Code PIX

## 📋 Problemas Identificados

### 1. ❌ Autenticação Firestore Ausente
**Problema:** O código usava a REST API do Firestore sem autenticação, causando erros 401/403.

**Solução:** Implementado Firebase Admin SDK com autenticação adequada.

### 2. ❌ Caminho Firestore Incorreto
**Problema:** O código usava `/SLICED/data/Usuários/${uid}` que não existe.

**Solução:** Corrigido para `/SLICED/${uid}` conforme a estrutura real do banco.

### 3. ❌ Token Mercado Pago Exposto
**Problema:** Token hardcoded no código-fonte (vulnerabilidade de segurança).

**Solução:** Migrado para variáveis de ambiente usando `dotenv`.

### 4. ❌ Falta de Logs Detalhados
**Problema:** Difícil identificar onde o processo estava falando.

**Solução:** Adicionados logs detalhados em cada etapa do processo.

### 5. ❌ Validação Fraca da Resposta do Mercado Pago
**Problema:** Código não verificava se `qr_code` e `qr_code_base64` existiam.

**Solução:** Validação robusta com mensagens de erro específicas.

---

## 🚀 Como Configurar

### Passo 1: Instalar Dependências

```bash
cd backend
npm install dotenv firebase-admin
```

### Passo 2: Criar Arquivo `.env`

Copie o arquivo `.env.example` para `.env`:

```bash
copy .env.example .env
```

### Passo 3: Configurar Firebase Admin

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Configurações do Projeto** > **Contas de Serviço**
3. Clique em **Gerar nova chave privada**
4. Baixe o arquivo JSON
5. Copie as informações para o arquivo `.env`:
   - `projectId` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

**Exemplo:**
```env
FIREBASE_PROJECT_ID=sliced-4f1e3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@sliced-4f1e3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEF...\n-----END PRIVATE KEY-----\n"
```

### Passo 4: Configurar Mercado Pago

1. Acesse o [Mercado Pago Developers](https://www.mercadopago.com.br/developers)
2. Vá em **Suas integrações** > **Credenciais**
3. Copie o **Access Token de Produção**
4. Cole no arquivo `.env`:

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-token-aqui
```

### Passo 5: Iniciar o Servidor

```bash
node server.js
```

---

## 🧪 Testando a Geração de QR Code

### Requisição de Teste (usando cURL ou Postman):

```bash
curl -X POST http://localhost:3000/api/deposit/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "ID_DO_USUARIO",
    "amount": 10.00,
    "email": "usuario@exemplo.com",
    "firstName": "João",
    "lastName": "Silva"
  }'
```

### Resposta Esperada (Sucesso):

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

### Logs no Console (Sucesso):

```
📥 Requisição de depósito recebida: { userId: 'abc123', amount: 10, email: 'usuario@exemplo.com', ... }
📤 Enviando requisição para Mercado Pago...
📨 Resposta do Mercado Pago:
Status: 201
✅ Pagamento PIX criado com sucesso!
   ID: 123456789
   Usuário: abc123
   Valor: R$ 10
   QR Code (primeiros 50 chars): 00020126580014br.gov.bcb.pix...
   QR Code Base64 (primeiros 50 chars): iVBORw0KGgoAAAANSUhEUgAA...
```

---

## 🐛 Troubleshooting

### Erro: "Firebase Admin não inicializado"

**Causa:** Variáveis de ambiente do Firebase não configuradas.

**Solução:** Verifique se o arquivo `.env` existe e contém as credenciais corretas.

### Erro: "Erro ao criar pagamento no Mercado Pago"

**Causa:** Token do Mercado Pago inválido ou expirado.

**Solução:** 
1. Verifique se está usando o token de **Produção** (não o de teste)
2. Gere um novo token no painel do Mercado Pago

### Erro: "Dados do PIX não encontrados na resposta"

**Causa:** O Mercado Pago não retornou os dados do QR Code.

**Solução:**
1. Verifique os logs detalhados no console
2. Confirme que o `payment_method_id` está como `'pix'`
3. Verifique se sua conta do Mercado Pago está habilitada para PIX

### Erro: "Usuário não encontrado"

**Causa:** O `userId` não existe no Firestore ou o caminho está incorreto.

**Solução:**
1. Verifique se o usuário existe em `/SLICED/{userId}`
2. Confirme que o `userId` está sendo enviado corretamente

---

## 📊 Estrutura de Dados Firestore

```
SLICED (collection)
  └── {userId} (document)
      ├── email: string
      ├── firstName: string
      ├── lastName: string
      ├── saldo: number
      └── ... outros campos
```

---

## 🔐 Segurança

### ⚠️ IMPORTANTE:

1. **NUNCA** commite o arquivo `.env` no Git
2. Adicione `.env` ao `.gitignore`
3. Use tokens de **Produção** apenas em ambiente de produção
4. Mantenha as credenciais do Firebase Admin em segurança
5. Rotacione os tokens periodicamente

### Arquivo `.gitignore` recomendado:

```gitignore
# Variáveis de ambiente
.env
.env.local

# Credenciais Firebase
*-firebase-adminsdk-*.json

# Node modules
node_modules/
```

---

## 📝 Checklist de Implementação

- [x] Instalar `dotenv` e `firebase-admin`
- [ ] Criar arquivo `.env` com credenciais
- [ ] Configurar Firebase Admin SDK
- [ ] Configurar token do Mercado Pago
- [ ] Testar criação de pagamento PIX
- [ ] Verificar logs detalhados
- [ ] Confirmar geração de QR Code
- [ ] Testar webhook de confirmação
- [ ] Adicionar `.env` ao `.gitignore`

---

## 🆘 Suporte

Se o problema persistir após seguir este guia:

1. Verifique os logs detalhados no console
2. Confirme que todas as dependências estão instaladas
3. Teste com valores pequenos (R$ 1,00)
4. Verifique se o servidor está rodando na porta correta
5. Confirme que não há firewall bloqueando as requisições

---

**Última atualização:** 09/12/2025
