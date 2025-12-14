# Sistema Financeiro SLICED - Mercado Pago

## 📋 Visão Geral

Sistema completo de depósitos e saques integrado com a API do Mercado Pago, permitindo que usuários depositem via PIX e solicitem saques diretamente pelo perfil.

## 🔧 Configuração

### Access Token do Mercado Pago
O Access Token está configurado no arquivo `backend/server.js`:
```javascript
const MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-8089215665209853-120909-01511fb41a354b6ed768b0ba178a02c0-1981576535';
```

### Estrutura de Dados no Firestore

Os dados do usuário são armazenados em:
```
SLICED/data/Usuários/{uid}
```

Campos importantes:
- `saldo` (number): Saldo disponível do usuário
- `email` (string): E-mail do usuário
- `nomeCompleto` (string): Nome completo do usuário
- `cpf` (string): CPF do usuário

## 🚀 Como Usar

### 1. Iniciar o Servidor Backend

```bash
cd backend
npm start
```

O servidor rodará em `http://localhost:3000`

### 2. Funcionalidades Disponíveis

#### **Depósito via PIX**
1. Acesse a página de perfil (`perfil.html`)
2. Clique em "Fazer Depósito"
3. Selecione um dos valores disponíveis: R$ 10, R$ 20, R$ 50 ou R$ 100
4. Um QR Code PIX será gerado automaticamente
5. Escaneie o QR Code ou copie o código PIX
6. Após o pagamento, o saldo será creditado automaticamente

#### **Solicitar Saque**
1. Acesse a página de perfil (`perfil.html`)
2. Clique em "Solicitar Saque"
3. Informe:
   - Valor do saque
   - Tipo de chave PIX (CPF, E-mail, Telefone ou Chave Aleatória)
   - Chave PIX
4. O saque será processado em até 24 horas
5. O valor será descontado do saldo imediatamente

#### **Consultar Saldo**
- O saldo é exibido automaticamente no card de Saldo
- Clique no ícone de atualizar (↻) para recarregar o saldo

## 🔌 Endpoints da API

### 1. Criar Pagamento PIX
```
POST /api/deposit/create
```

**Body:**
```json
{
  "userId": "user_123456",
  "amount": 50,
  "email": "usuario@email.com",
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
    "amount": 50,
    "expirationDate": "2025-12-09T15:30:00.000Z"
  }
}
```

### 2. Consultar Saldo
```
GET /api/user/:uid/balance
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "balance": "150.00"
  }
}
```

### 3. Solicitar Saque
```
POST /api/withdraw/request
```

**Body:**
```json
{
  "userId": "user_123456",
  "amount": 100,
  "pixKey": "123.456.789-00",
  "pixKeyType": "cpf"
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

### 4. Webhook do Mercado Pago
```
POST /api/webhook/mercadopago
```

Este endpoint recebe notificações automáticas do Mercado Pago quando um pagamento é aprovado e credita o saldo automaticamente.

## 📦 Dependências Instaladas

```json
{
  "express": "^4.18.2",
  "body-parser": "^1.20.2",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "ws": "^8.14.2",
  "qrcode": "^1.5.3",
  "mercadopago": "^2.0.9",
  "axios": "^1.6.2"
}
```

### Principais Bibliotecas:
- **mercadopago**: SDK oficial do Mercado Pago para Node.js
- **axios**: Cliente HTTP para requisições ao Firestore REST API
- **express**: Framework web para criar a API
- **qrcode**: Geração de QR Codes (opcional, o Mercado Pago já retorna o QR Code)

## 🎨 Interface do Usuário

### Card de Saldo
- **Saldo Disponível**: Exibido em destaque com gradiente verde
- **Botão de Atualizar**: Ícone de refresh que gira ao clicar
- **Botões de Ação**: 
  - "Fazer Depósito" (verde)
  - "Solicitar Saque" (laranja)

### Modal de Depósito
- Seleção de valores pré-definidos (10, 20, 50, 100)
- Exibição do QR Code PIX
- Campo para copiar código PIX
- Instruções claras para o usuário

### Modal de Saque
- Campo para valor do saque
- Seleção do tipo de chave PIX
- Campo para chave PIX
- Aviso sobre prazo de processamento

## 🔒 Segurança

- ✅ Validação de valores mínimos
- ✅ Verificação de saldo antes do saque
- ✅ Dados do usuário obtidos do Firestore
- ✅ Webhook seguro para confirmação de pagamentos
- ⚠️ **IMPORTANTE**: Em produção, adicione autenticação JWT e validação de webhook signature

## 📝 Observações Importantes

1. **Firestore REST API**: O sistema usa a REST API do Firestore para evitar o uso do `firebase-admin`, conforme solicitado.

2. **Webhook em Produção**: Para receber notificações do Mercado Pago em produção, você precisa:
   - Hospedar o servidor em um domínio público (ex: Heroku, Railway, Vercel)
   - Configurar o webhook no painel do Mercado Pago

3. **Saldo Inicial**: Novos usuários começam com saldo R$ 0,00. O campo `saldo` será criado automaticamente no primeiro depósito.

4. **Processamento de Saques**: Atualmente, os saques apenas descontam o saldo. Você deve implementar a lógica de transferência PIX real usando a API do Mercado Pago ou outro provedor.

## 🐛 Troubleshooting

### Erro ao gerar QR Code
- Verifique se o Access Token do Mercado Pago está correto
- Confirme que o servidor backend está rodando
- Verifique o console do navegador para erros de CORS

### Saldo não atualiza
- Clique no botão de atualizar (↻)
- Verifique se o usuário existe no Firestore
- Confirme que o campo `saldo` existe no documento do usuário

### Webhook não funciona
- Em desenvolvimento local, use ferramentas como ngrok para expor o servidor
- Verifique os logs do servidor para ver se o webhook está sendo recebido
- Confirme que a URL do webhook está configurada corretamente no Mercado Pago

## 📞 Suporte

Para dúvidas ou problemas, entre em contato através do chat de suporte na plataforma SLICED.

---

**Desenvolvido para SLICED** 🎯
Data: 09/12/2025
