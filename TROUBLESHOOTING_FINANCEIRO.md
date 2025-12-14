# 🔧 Guia de Resolução de Problemas - Sistema Financeiro SLICED

## ❌ Erro: "fetch is not a function"

### Causa
O Node.js não tem a função `fetch` nativa em versões antigas (anteriores à v18).

### Solução ✅
**JÁ CORRIGIDO!** O sistema agora usa:
- **SDK oficial do Mercado Pago** (`mercadopago` package)
- **Axios** para requisições HTTP ao Firestore

```bash
cd backend
npm install
npm start
```

---

## ❌ Erro ao criar pagamento PIX

### Possíveis Causas:
1. Access Token inválido ou expirado
2. Servidor não está rodando
3. Dados do usuário incompletos

### Soluções:

#### 1. Verificar Access Token
Abra `backend/server.js` e confirme:
```javascript
const MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-8089215665209853-120909-01511fb41a354b6ed768b0ba178a02c0-1981576535';
```

#### 2. Verificar se o servidor está rodando
```bash
cd backend
npm start
```

Deve aparecer:
```
🚀 Servidor SLICED rodando em http://localhost:3000
💳 Mercado Pago integrado com sucesso!
```

#### 3. Verificar dados do usuário
No console do navegador (F12), verifique se `currentUser` tem:
- `uid`
- `email`
- `nomeCompleto`

---

## ❌ QR Code não aparece

### Causa
A API do Mercado Pago pode estar retornando erro.

### Solução:
1. Abra o console do navegador (F12)
2. Vá para a aba "Network"
3. Tente fazer um depósito
4. Procure pela requisição para `/api/deposit/create`
5. Veja a resposta (Response)

Se houver erro, verifique:
- Access Token está correto
- E-mail do usuário é válido
- Valor é maior que 0

---

## ❌ Saldo não atualiza após pagamento

### Causa
O webhook não está sendo recebido ou processado.

### Solução para Desenvolvimento Local:

#### Opção 1: Usar ngrok (Recomendado)
```bash
# Instalar ngrok
npm install -g ngrok

# Expor servidor local
ngrok http 3000
```

Copie a URL gerada (ex: `https://abc123.ngrok.io`) e configure no painel do Mercado Pago:
- Webhook URL: `https://abc123.ngrok.io/api/webhook/mercadopago`

#### Opção 2: Atualizar saldo manualmente (para testes)
No Firestore, adicione o campo `saldo` manualmente:
1. Acesse Firebase Console
2. Vá em Firestore Database
3. Navegue até: `SLICED/data/Usuários/{seu_uid}`
4. Adicione campo: `saldo` (tipo: number, valor: 100)

---

## ❌ Erro de CORS

### Sintomas:
```
Access to fetch at 'http://localhost:3000/api/...' from origin 'http://...' has been blocked by CORS policy
```

### Solução:
O CORS já está habilitado no `server.js`:
```javascript
app.use(cors());
```

Se ainda houver erro, adicione:
```javascript
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## ❌ Saque não funciona

### Verificações:

#### 1. Saldo suficiente?
```javascript
// No console do navegador
console.log(document.getElementById('balanceAmount').textContent);
```

#### 2. Chave PIX válida?
- CPF: 11 dígitos
- E-mail: formato válido
- Telefone: com DDD
- Chave aleatória: formato UUID

#### 3. Verificar no servidor
Olhe os logs do servidor (terminal onde rodou `npm start`):
```
💰 Solicitação de saque: Usuário user_123, Valor R$ 50, Chave: 123.456.789-00
```

---

## ❌ Firestore: Usuário não encontrado

### Causa
O campo `saldo` não existe no documento do usuário.

### Solução:
O campo `saldo` é criado automaticamente no primeiro depósito. Para criar manualmente:

1. Acesse Firebase Console
2. Firestore Database
3. `SLICED/data/Usuários/{uid}`
4. Adicione campo:
   - Nome: `saldo`
   - Tipo: `number`
   - Valor: `0`

---

## ❌ Modal não abre

### Verificações:

#### 1. JavaScript carregou?
No console (F12):
```javascript
console.log(typeof depositModal); // Deve retornar 'object'
```

#### 2. Elementos existem?
```javascript
console.log(document.getElementById('depositModal')); // Não deve ser null
console.log(document.getElementById('btnDeposit')); // Não deve ser null
```

#### 3. Erros no console?
Verifique se há erros em vermelho no console do navegador.

---

## 🔍 Debug Geral

### Habilitar logs detalhados

No `server.js`, adicione antes de cada rota:
```javascript
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, req.body);
    next();
});
```

### Testar API diretamente

Use Postman ou curl:

```bash
# Testar consulta de saldo
curl http://localhost:3000/api/user/user_123456/balance

# Testar criação de pagamento
curl -X POST http://localhost:3000/api/deposit/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123456",
    "amount": 10,
    "email": "teste@email.com",
    "firstName": "João",
    "lastName": "Silva"
  }'
```

---

## 📞 Ainda com problemas?

1. **Verifique os logs do servidor** (terminal onde rodou `npm start`)
2. **Verifique o console do navegador** (F12 > Console)
3. **Verifique a aba Network** (F12 > Network) para ver requisições HTTP
4. **Reinicie o servidor**:
   ```bash
   # Pressione Ctrl+C no terminal
   npm start
   ```

---

## ✅ Checklist de Funcionamento

- [ ] Servidor rodando em `http://localhost:3000`
- [ ] Dependências instaladas (`npm install`)
- [ ] Access Token configurado
- [ ] Usuário logado no sistema
- [ ] Campo `saldo` existe no Firestore (ou será criado no primeiro depósito)
- [ ] Console do navegador sem erros
- [ ] Botões "Fazer Depósito" e "Solicitar Saque" aparecem
- [ ] Modais abrem ao clicar nos botões

---

**Última atualização:** 09/12/2025
