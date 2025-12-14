# 🧪 Guia de Testes - Sistema Financeiro SLICED

## 📋 Pré-requisitos

Antes de testar, certifique-se de que:

- [ ] Servidor backend está rodando (`npm start` na pasta `backend`)
- [ ] Você está logado no sistema com um usuário válido
- [ ] O console do navegador está aberto (F12)
- [ ] Você tem acesso ao Firebase Console

## 🚀 Teste 1: Iniciar Servidor

### Passos:
```bash
cd backend
npm start
```

### Resultado Esperado:
```
🚀 Servidor SLICED rodando em http://localhost:3000
💳 Mercado Pago integrado com sucesso!
📡 Access Token: APP_USR-8089215665...
```

### ✅ Sucesso se:
- Servidor iniciou sem erros
- Porta 3000 está disponível
- Access Token é exibido

---

## 🧪 Teste 2: Visualizar Card de Saldo

### Passos:
1. Abra `perfil.html` no navegador
2. Faça login com um usuário
3. Role até o card "Saldo"

### Resultado Esperado:
- Card de saldo aparece
- Exibe "R$ 0,00" (ou saldo atual)
- Botão de atualizar (↻) está visível
- Botões "Fazer Depósito" e "Solicitar Saque" aparecem

### ✅ Sucesso se:
- Todos os elementos estão visíveis
- Não há erros no console
- Layout está correto

---

## 🧪 Teste 3: Consultar Saldo via API

### Passos:
1. Abra o console do navegador (F12)
2. Execute:
```javascript
// Obter UID do usuário atual
const user = JSON.parse(localStorage.getItem('spfc_user_session'));
console.log('UID:', user.uid);

// Testar API
fetch(`http://localhost:3000/api/user/${user.uid}/balance`)
    .then(r => r.json())
    .then(data => console.log('Saldo:', data));
```

### Resultado Esperado:
```json
{
  "success": true,
  "data": {
    "balance": "0.00"
  }
}
```

### ✅ Sucesso se:
- Resposta tem `success: true`
- Campo `balance` existe
- Não há erro de CORS

---

## 🧪 Teste 4: Abrir Modal de Depósito

### Passos:
1. Clique no botão "Fazer Depósito"

### Resultado Esperado:
- Modal abre com animação suave
- Título "Fazer Depósito via PIX" aparece
- 4 botões de valores aparecem (10, 20, 50, 100)
- Botão de fechar (✕) está visível

### ✅ Sucesso se:
- Modal abre sem erros
- Todos os elementos estão visíveis
- Pode fechar clicando no ✕ ou fora do modal

---

## 🧪 Teste 5: Gerar QR Code PIX

### Passos:
1. Abra o modal de depósito
2. Clique em "R$ 10,00"
3. Aguarde o loading

### Resultado Esperado:
- Loading aparece ("Gerando QR Code PIX...")
- Após 2-5 segundos:
  - QR Code aparece
  - Código PIX aparece no campo de texto
  - Botão "Copiar" está disponível

### Console do Servidor:
```
✅ Pagamento PIX criado para user_123456: R$ 10
```

### ✅ Sucesso se:
- QR Code é exibido
- Código PIX está preenchido
- Não há erros no console

### ❌ Se der erro:
Verifique no console do navegador:
```javascript
// Deve aparecer algo como:
// POST http://localhost:3000/api/deposit/create 200 OK
```

Se aparecer erro 500, verifique:
- Access Token está correto
- Servidor está rodando
- Dados do usuário estão completos

---

## 🧪 Teste 6: Copiar Código PIX

### Passos:
1. Gere um QR Code (Teste 5)
2. Clique no botão "Copiar"

### Resultado Esperado:
- Botão muda para "✓ Copiado!"
- Após 2 segundos, volta ao normal
- Código está na área de transferência

### Verificar:
```javascript
// Cole em um editor de texto (Ctrl+V)
// Deve ser algo como:
// 00020126580014br.gov.bcb.pix...
```

### ✅ Sucesso se:
- Código é copiado
- Feedback visual funciona
- Código é válido (começa com "00020126")

---

## 🧪 Teste 7: Abrir Modal de Saque

### Passos:
1. Clique no botão "Solicitar Saque"

### Resultado Esperado:
- Modal abre com animação
- Título "Solicitar Saque" aparece
- Formulário com 3 campos:
  - Valor do Saque
  - Tipo de Chave PIX
  - Chave PIX
- Aviso "processado em até 24 horas" aparece
- Botão "Confirmar Saque" está visível

### ✅ Sucesso se:
- Modal abre sem erros
- Todos os campos estão visíveis
- Pode fechar clicando no ✕

---

## 🧪 Teste 8: Solicitar Saque (com saldo insuficiente)

### Passos:
1. Abra o modal de saque
2. Preencha:
   - Valor: `100`
   - Tipo: `CPF`
   - Chave: `123.456.789-00`
3. Clique em "Confirmar Saque"

### Resultado Esperado (se saldo = 0):
```
Erro: Saldo insuficiente.
```

### ✅ Sucesso se:
- Validação funciona
- Mensagem de erro aparece
- Saldo não é alterado

---

## 🧪 Teste 9: Adicionar Saldo Manualmente (para testes)

### Passos:
1. Abra Firebase Console
2. Vá em Firestore Database
3. Navegue até: `SLICED/data/Usuários/{seu_uid}`
4. Adicione/edite campo:
   - Nome: `saldo`
   - Tipo: `number`
   - Valor: `100`
5. Salve

### Verificar no Sistema:
1. Volte ao `perfil.html`
2. Clique no botão de atualizar (↻)
3. Saldo deve mostrar "R$ 100,00"

### ✅ Sucesso se:
- Saldo é atualizado
- Valor aparece formatado corretamente

---

## 🧪 Teste 10: Solicitar Saque (com saldo suficiente)

### Passos:
1. Certifique-se de ter saldo (Teste 9)
2. Abra o modal de saque
3. Preencha:
   - Valor: `50`
   - Tipo: `CPF`
   - Chave: `123.456.789-00`
4. Clique em "Confirmar Saque"

### Resultado Esperado:
- Loading aparece
- Mensagem de sucesso:
  ```
  Saque solicitado com sucesso! Será processado em até 24 horas.
  ```
- Modal fecha
- Saldo é atualizado para R$ 50,00

### Console do Servidor:
```
💰 Solicitação de saque: Usuário user_123456, Valor R$ 50, Chave: 123.456.789-00
```

### ✅ Sucesso se:
- Saque é processado
- Saldo é descontado
- Mensagem de sucesso aparece

---

## 🧪 Teste 11: Atualizar Saldo

### Passos:
1. Clique no botão de atualizar (↻)

### Resultado Esperado:
- Ícone gira 360°
- Requisição é feita à API
- Saldo é atualizado

### Console do Navegador:
```javascript
// Deve aparecer:
// GET http://localhost:3000/api/user/{uid}/balance 200 OK
```

### ✅ Sucesso se:
- Animação funciona
- Saldo é recarregado
- Sem erros no console

---

## 🧪 Teste 12: Responsividade Mobile

### Passos:
1. Abra DevTools (F12)
2. Clique no ícone de dispositivo móvel
3. Selecione "iPhone 12 Pro" ou similar
4. Teste todos os elementos

### Verificar:
- [ ] Card de saldo está legível
- [ ] Botões são clicáveis
- [ ] Modais ocupam tela inteira
- [ ] QR Code tem tamanho adequado
- [ ] Formulários são utilizáveis

### ✅ Sucesso se:
- Interface é usável em mobile
- Não há elementos cortados
- Texto é legível

---

## 🧪 Teste 13: Webhook (Avançado)

### Pré-requisitos:
- Servidor exposto publicamente (ngrok)
- Webhook configurado no Mercado Pago

### Passos:
1. Gere um QR Code
2. Pague via PIX (ambiente de teste do Mercado Pago)
3. Aguarde notificação

### Resultado Esperado:
Console do servidor:
```
📨 Webhook recebido: { type: 'payment', data: { id: '123456' } }
💳 Status do pagamento: approved
✅ Saldo creditado: Usuário user_123, +R$ 10, Novo saldo: R$ 110
```

### ✅ Sucesso se:
- Webhook é recebido
- Pagamento é processado
- Saldo é creditado automaticamente

---

## 📊 Checklist Completo de Testes

### Backend
- [ ] Servidor inicia sem erros
- [ ] Endpoint `/api/deposit/create` funciona
- [ ] Endpoint `/api/user/:uid/balance` funciona
- [ ] Endpoint `/api/withdraw/request` funciona
- [ ] Webhook `/api/webhook/mercadopago` funciona

### Frontend
- [ ] Card de saldo aparece
- [ ] Botão de atualizar funciona
- [ ] Modal de depósito abre
- [ ] Seleção de valores funciona
- [ ] QR Code é gerado
- [ ] Código PIX é copiado
- [ ] Modal de saque abre
- [ ] Formulário de saque funciona
- [ ] Validações funcionam
- [ ] Saldo é atualizado

### Integração
- [ ] API do Mercado Pago responde
- [ ] Firestore é consultado
- [ ] Firestore é atualizado
- [ ] Webhook processa pagamentos

### UX/UI
- [ ] Animações funcionam
- [ ] Loading aparece
- [ ] Mensagens de erro são claras
- [ ] Design é responsivo
- [ ] Cores e estilos estão corretos

---

## 🐛 Reportar Problemas

Se encontrar algum erro:

1. **Anote o erro exato** (copie do console)
2. **Passos para reproduzir**
3. **Navegador e versão**
4. **Logs do servidor**

Consulte: `TROUBLESHOOTING_FINANCEIRO.md`

---

## ✅ Testes Aprovados?

Se todos os testes passaram:
- ✅ Sistema está funcionando corretamente
- ✅ Pronto para uso
- ✅ Pode fazer deploy em produção (com ajustes de segurança)

---

**Boa sorte com os testes! 🚀**
