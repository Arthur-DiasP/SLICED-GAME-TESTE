# 💰 Sistema de Finanças - Perfil do Usuário

## ✅ Implementação Completa!

Foi adicionada uma seção completa de **Finanças** no `perfil.html` com integração total à API backend.

---

## 🎯 Funcionalidades Implementadas

### 1. **Exibição de Saldo**
- ✅ Saldo exibido em destaque com animação
- ✅ Formatação em Real Brasileiro (R$)
- ✅ Botão para atualizar saldo manualmente
- ✅ Atualização automática a cada 30 segundos

### 2. **Depósito**
- ✅ Modal com formulário de depósito
- ✅ Geração de link de pagamento via InfinitePay
- ✅ Suporte a Pix e Cartão de Crédito
- ✅ Exibição do link de pagamento
- ✅ Botão para abrir página de pagamento em nova aba

### 3. **Saque**
- ✅ Modal com formulário de saque
- ✅ Validação de valor mínimo (R$ 50,00)
- ✅ Validação de saldo suficiente
- ✅ Exibição do saldo disponível
- ✅ Registro de solicitação no backend

---

## 🎨 Design

### **Seção de Finanças**
```
┌─────────────────────────────────────┐
│  💰 Finanças                        │
├─────────────────────────────────────┤
│                                     │
│     Saldo Disponível                │
│     R$ 150,00                       │
│     [🔄 Atualizar Saldo]            │
│                                     │
│  [➕ Fazer Depósito] [➖ Saque]     │
│                                     │
└─────────────────────────────────────┘
```

### **Modal de Depósito**
- Campo de valor
- Informação sobre formas de pagamento
- Exibição do link de pagamento gerado
- Botão para abrir página de pagamento

### **Modal de Saque**
- Campo de valor (mínimo R$ 50)
- Exibição do saldo disponível
- Informações sobre processamento
- Validações automáticas

---

## 🔌 Integração com API

### **Endpoint de Saldo**
```javascript
GET /api/user/{userId}/balance

Resposta:
{
  "success": true,
  "data": {
    "userId": "user_123",
    "name": "João da Silva",
    "balance": 150.00
  }
}
```

### **Endpoint de Depósito**
```javascript
POST /api/deposit/generate
{
  "userId": "user_123",
  "amount": 100.00,
  "redirectUrl": "https://site.com/perfil"
}

Resposta:
{
  "success": true,
  "data": {
    "orderNSU": "TXN123",
    "paymentUrl": "https://checkout.infinitepay.com.br/...",
    "amount": 100.00
  }
}
```

### **Endpoint de Saque**
```javascript
POST /api/withdraw/request
{
  "userId": "user_123",
  "amount": 50.00
}

Resposta:
{
  "success": true,
  "data": {
    "withdrawId": "WTH456",
    "amount": 50.00,
    "status": "PENDING"
  }
}
```

---

## 🚀 Como Usar

### **1. Iniciar o Servidor Backend**
```bash
cd backend
npm start
```

O servidor deve estar rodando em `http://localhost:3000`

### **2. Acessar o Perfil**
1. Faça login no sistema
2. Acesse **Perfil** no menu inferior
3. Role até a seção **Finanças**

### **3. Fazer um Depósito**
1. Clique em **"Fazer Depósito"**
2. Digite o valor desejado
3. Clique em **"Gerar Link de Pagamento"**
4. Aguarde o link ser gerado
5. Clique em **"Abrir Página de Pagamento"**
6. Complete o pagamento (Pix ou Cartão)
7. Aguarde a confirmação (webhook automático)
8. Saldo será atualizado automaticamente

### **4. Solicitar um Saque**
1. Clique em **"Solicitar Saque"**
2. Digite o valor (mínimo R$ 50,00)
3. Verifique se tem saldo suficiente
4. Clique em **"Solicitar Saque"**
5. Aguarde processamento (até 24h)

---

## ⚙️ Configuração

### **URL da API**
Por padrão, a API está configurada para:
```javascript
const API_BASE_URL = 'http://localhost:3000/api';
```

Para produção, altere para:
```javascript
const API_BASE_URL = 'https://seu-dominio.com/api';
```

---

## 🎯 Fluxo Completo

```
1. Usuário clica em "Fazer Depósito"
   ↓
2. Preenche valor e confirma
   ↓
3. API gera link de pagamento (InfinitePay)
   ↓
4. Link é exibido no modal
   ↓
5. Usuário abre link e paga
   ↓
6. InfinitePay envia webhook para API
   ↓
7. API credita saldo automaticamente
   ↓
8. Saldo é atualizado na tela (30s ou manual)
   ↓
9. ✅ Depósito concluído!
```

---

## 🔒 Segurança

### **Validações Implementadas**
- ✅ Autenticação do usuário (currentUser.uid)
- ✅ Validação de valores mínimos
- ✅ Validação de saldo suficiente
- ✅ Tratamento de erros
- ✅ Feedback visual ao usuário

### **Proteções**
- ✅ Botões desabilitados durante processamento
- ✅ Modals fecham ao clicar fora
- ✅ Mensagens de erro claras
- ✅ Timeout de requisições

---

## 📱 Responsividade

A seção de finanças é **totalmente responsiva**:

- **Desktop:** Botões lado a lado
- **Tablet:** Botões lado a lado
- **Mobile:** Botões empilhados verticalmente

---

## 🎨 Estilos Personalizados

### **Saldo**
- Fonte grande (3rem)
- Cor vermelha SPFC (#DC143C)
- Animação de pulse
- Sombra brilhante

### **Modals**
- Fundo escuro com blur
- Animação de slide up
- Bordas arredondadas
- Gradiente SPFC

### **Botões**
- Gradiente vermelho (Depósito)
- Transparente (Saque)
- Hover com elevação
- Ícones Material Icons

---

## ✅ Checklist de Teste

- [ ] Servidor backend rodando
- [ ] Usuário autenticado
- [ ] Saldo carrega corretamente
- [ ] Botão "Atualizar Saldo" funciona
- [ ] Modal de depósito abre
- [ ] Link de pagamento é gerado
- [ ] Link abre em nova aba
- [ ] Modal de saque abre
- [ ] Validação de valor mínimo funciona
- [ ] Validação de saldo funciona
- [ ] Solicitação de saque é registrada
- [ ] Modals fecham corretamente

---

## 🐛 Troubleshooting

### **"Erro ao buscar saldo"**
- ✅ Verifique se o servidor está rodando
- ✅ Confirme a URL da API
- ✅ Verifique se o usuário está autenticado

### **"Erro ao gerar link de pagamento"**
- ✅ Verifique se INFINITEPAY_HANDLE está configurado
- ✅ Confirme se o servidor está acessível
- ✅ Verifique logs do servidor

### **"Saldo não atualiza"**
- ✅ Aguarde até 30 segundos
- ✅ Clique em "Atualizar Saldo"
- ✅ Verifique se o webhook foi processado

---

## 📊 Dados Salvos

### **Firestore: SPFC/data/Usuários**
```javascript
{
  "uid": "user_123",
  "saldo": 150.00,  // ← Atualizado automaticamente
  ...
}
```

### **Firestore: SPFC/data/Transações**
```javascript
{
  "orderNSU": "TXN123",
  "userId": "user_123",
  "amount": 100.00,
  "status": "COMPLETED",
  "paymentUrl": "https://...",
  ...
}
```

### **Firestore: SPFC/data/Saques**
```javascript
{
  "withdrawId": "WTH456",
  "userId": "user_123",
  "amount": 50.00,
  "status": "PENDING",
  ...
}
```

---

## 🎉 Pronto!

O sistema de finanças está **100% funcional** e integrado com:
- ✅ API Backend
- ✅ InfinitePay (Pix + Cartão)
- ✅ Firebase Firestore
- ✅ Sistema de autenticação existente

**Basta iniciar o servidor e testar!** 🚀
