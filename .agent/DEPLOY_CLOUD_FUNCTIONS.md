# 🚀 Guia de Deploy - Cloud Functions para Exclusão Automática de Mensagens

## 📋 Visão Geral

Este guia explica como fazer o deploy das Cloud Functions que deletam automaticamente mensagens de chat com mais de 24 horas no Firestore.

## 🔧 Pré-requisitos

1. **Node.js** instalado (versão 18 ou superior)
2. **Firebase CLI** instalado globalmente
3. **Conta Firebase** com projeto configurado
4. **Plano Blaze** do Firebase (necessário para Cloud Functions)

## 📦 Instalação

### 1. Instalar Firebase CLI (se ainda não tiver)

```bash
npm install -g firebase-tools
```

### 2. Fazer login no Firebase

```bash
firebase login
```

### 3. Inicializar o projeto Firebase (se ainda não foi feito)

```bash
# Na raiz do projeto SLICED-GAME
firebase init
```

Selecione:
- ✅ Functions: Configure a Cloud Functions directory and its files
- ✅ Use an existing project
- Selecione seu projeto: `sliced-4f1e3`
- Language: JavaScript
- ESLint: No (ou Yes, se preferir)
- Install dependencies: Yes

### 4. Instalar dependências das Functions

```bash
cd functions
npm install
```

## 🚀 Deploy

### Deploy de todas as functions

```bash
# Na raiz do projeto
firebase deploy --only functions
```

### Deploy de uma function específica

```bash
# Apenas a função agendada
firebase deploy --only functions:deleteOldChatMessages

# Apenas a função manual
firebase deploy --only functions:manualDeleteOldMessages

# Apenas a função de deletar chat
firebase deploy --only functions:deleteUserChat
```

## 📊 Functions Disponíveis

### 1. `deleteOldChatMessages` (Agendada)

**Descrição**: Executa automaticamente a cada 1 hora e deleta mensagens com mais de 24 horas.

**Configuração**:
- Agendamento: A cada 1 hora
- Timezone: America/Sao_Paulo
- Tipo: Scheduled Function (Pub/Sub)

**Logs**:
```bash
firebase functions:log --only deleteOldChatMessages
```

### 2. `manualDeleteOldMessages` (HTTP)

**Descrição**: Permite executar a limpeza manualmente via HTTP request.

**Uso**:
```bash
# Obter URL da function
firebase functions:config:get

# Executar manualmente
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages
```

**Resposta**:
```json
{
  "success": true,
  "chatsProcessed": 15,
  "messagesDeleted": 42,
  "cutoffTime": "2025-12-15T14:38:54.000Z",
  "executedAt": "2025-12-16T14:38:54.000Z"
}
```

### 3. `deleteUserChat` (HTTP)

**Descrição**: Deleta completamente o chat de um usuário específico.

**Uso**:
```bash
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/deleteUserChat \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_AQUI"}'
```

## 🔍 Monitoramento

### Ver logs em tempo real

```bash
firebase functions:log
```

### Ver logs de uma função específica

```bash
firebase functions:log --only deleteOldChatMessages
```

### Ver logs no Console do Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em **Functions** no menu lateral
4. Clique na função desejada
5. Vá na aba **Logs**

## ⚙️ Configurações Avançadas

### Alterar frequência de execução

Edite `functions/index.js`, linha da função `deleteOldChatMessages`:

```javascript
// A cada 30 minutos
.schedule('every 30 minutes')

// A cada 2 horas
.schedule('every 2 hours')

// Diariamente às 2h da manhã
.schedule('0 2 * * *')

// A cada 6 horas
.schedule('0 */6 * * *')
```

### Alterar período de retenção

Edite `functions/index.js`, altere a linha:

```javascript
// Para 48 horas
const cutoff = new Date(now.toMillis() - (48 * 60 * 60 * 1000));

// Para 12 horas
const cutoff = new Date(now.toMillis() - (12 * 60 * 60 * 1000));

// Para 7 dias
const cutoff = new Date(now.toMillis() - (7 * 24 * 60 * 60 * 1000));
```

Após alterar, faça o deploy novamente:

```bash
firebase deploy --only functions:deleteOldChatMessages
```

## 🧪 Testes

### Testar localmente (Emulador)

```bash
# Iniciar emuladores
firebase emulators:start --only functions

# Em outro terminal, chamar a função manual
curl -X POST http://localhost:5001/sliced-4f1e3/us-central1/manualDeleteOldMessages
```

### Testar em produção

```bash
# Executar a função manual
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages
```

## 💰 Custos

### Plano Blaze (Pay as you go)

- **Invocações gratuitas**: 2 milhões/mês
- **Tempo de execução gratuito**: 400.000 GB-segundos/mês
- **Tráfego de rede gratuito**: 5 GB/mês

**Estimativa para este projeto**:
- Execuções: 24 vezes/dia × 30 dias = 720 execuções/mês
- Custo estimado: **GRATUITO** (dentro do free tier)

## 🔒 Segurança

### Proteger funções HTTP (Opcional)

Para proteger as funções HTTP, adicione autenticação:

```javascript
// Em functions/index.js
exports.manualDeleteOldMessages = functions.https.onRequest(async (req, res) => {
  // Verificar token de autenticação
  const authToken = req.headers.authorization;
  
  if (authToken !== 'Bearer SEU_TOKEN_SECRETO') {
    res.status(401).send('Unauthorized');
    return;
  }
  
  // ... resto do código
});
```

## 📝 Checklist de Deploy

- [ ] Firebase CLI instalado
- [ ] Login no Firebase realizado
- [ ] Projeto Firebase selecionado
- [ ] Dependências instaladas (`npm install` em `/functions`)
- [ ] Código revisado e testado
- [ ] Deploy realizado (`firebase deploy --only functions`)
- [ ] Logs verificados (sem erros)
- [ ] Função agendada aparece no Console do Firebase
- [ ] Teste manual executado com sucesso

## 🆘 Troubleshooting

### Erro: "Firebase CLI not found"

```bash
npm install -g firebase-tools
```

### Erro: "Billing account not configured"

Você precisa ativar o plano Blaze no Firebase Console:
1. Acesse https://console.firebase.google.com/
2. Selecione seu projeto
3. Vá em **Configurações** → **Uso e faturamento**
4. Clique em **Modificar plano**
5. Selecione **Blaze (Pay as you go)**

### Erro: "Permission denied"

```bash
firebase login --reauth
```

### Function não está executando

1. Verifique os logs:
```bash
firebase functions:log --only deleteOldChatMessages
```

2. Verifique se a função foi deployada:
```bash
firebase functions:list
```

3. Execute manualmente para testar:
```bash
curl -X POST https://[SUA-REGION]-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages
```

## 📞 Suporte

Para mais informações:
- [Documentação Firebase Functions](https://firebase.google.com/docs/functions)
- [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Firestore com Functions](https://firebase.google.com/docs/functions/firestore-events)

## ✅ Próximos Passos

Após o deploy bem-sucedido:

1. ✅ Monitorar logs nas primeiras 24 horas
2. ✅ Verificar se mensagens antigas estão sendo deletadas
3. ✅ Ajustar frequência se necessário
4. ✅ Configurar alertas no Firebase Console (opcional)
5. ✅ Documentar para a equipe
