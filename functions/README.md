# 🔥 Firebase Cloud Functions - SLICED

Funções serverless para automação e manutenção do sistema SLICED.

## 📋 Funções Disponíveis

### 1. `deleteOldChatMessages` ⏰ (Agendada)

Deleta automaticamente mensagens de chat com mais de 24 horas.

- **Tipo**: Scheduled Function (Pub/Sub)
- **Frequência**: A cada 1 hora
- **Timezone**: America/Sao_Paulo
- **Ação**: Deleta mensagens com timestamp > 24 horas

### 2. `manualDeleteOldMessages` 🔧 (HTTP)

Permite executar a limpeza de mensagens manualmente.

- **Tipo**: HTTP Function
- **Método**: POST
- **URL**: `https://[region]-[project].cloudfunctions.net/manualDeleteOldMessages`
- **Resposta**: JSON com estatísticas da limpeza

### 3. `deleteUserChat` 🗑️ (HTTP)

Deleta completamente o chat de um usuário específico.

- **Tipo**: HTTP Function
- **Método**: POST
- **Body**: `{ "userId": "user_id" }`
- **Ação**: Remove todas as mensagens e o documento do chat

## 🚀 Quick Start

### Instalação

```bash
# Instalar dependências
npm install

# Fazer login no Firebase
firebase login

# Deploy
npm run deploy
```

### Testes

```bash
# Testar localmente (simulação - não deleta)
node test-delete-messages.js

# Testar com emulador
npm run serve

# Ver logs
npm run logs
```

## 📁 Estrutura de Arquivos

```
functions/
├── index.js                    # Cloud Functions principais
├── test-delete-messages.js     # Script de teste local
├── package.json                # Dependências
├── .gitignore                  # Arquivos ignorados
└── README.md                   # Este arquivo
```

## 🔧 Configuração

### Alterar Frequência de Execução

Edite `index.js`, linha 20:

```javascript
.schedule('every 1 hours')      // A cada 1 hora
.schedule('every 30 minutes')   // A cada 30 minutos
.schedule('0 2 * * *')          // Diariamente às 2h
```

### Alterar Período de Retenção

Edite `index.js`, linha 33:

```javascript
// 24 horas (padrão)
const twentyFourHoursAgo = new Date(now.toMillis() - (24 * 60 * 60 * 1000));

// 48 horas
const fortyEightHoursAgo = new Date(now.toMillis() - (48 * 60 * 60 * 1000));

// 12 horas
const twelveHoursAgo = new Date(now.toMillis() - (12 * 60 * 60 * 1000));
```

## 📊 Monitoramento

### Ver Logs em Tempo Real

```bash
firebase functions:log
```

### Ver Logs de Função Específica

```bash
firebase functions:log --only deleteOldChatMessages
```

### Console do Firebase

1. Acesse: https://console.firebase.google.com/
2. Selecione o projeto `sliced-4f1e3`
3. Vá em **Functions** → Selecione a função → **Logs**

## 🧪 Testes

### Teste Local (Simulação)

```bash
node test-delete-messages.js
```

Este script:
- ✅ Conecta ao Firestore
- ✅ Busca todas as mensagens
- ✅ Identifica mensagens antigas
- ✅ Mostra estatísticas detalhadas
- ❌ **NÃO deleta nada** (apenas simulação)

### Teste Manual (Produção)

```bash
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages
```

Este comando:
- ✅ Executa a função de verdade
- ✅ **DELETA mensagens antigas**
- ✅ Retorna estatísticas

## 💰 Custos Estimados

### Plano Blaze (Pay as you go)

**Free Tier Mensal**:
- 2 milhões de invocações
- 400.000 GB-segundos de tempo de execução
- 5 GB de tráfego de rede

**Uso Estimado**:
- Execuções: 24/dia × 30 = 720/mês
- Tempo médio: ~2 segundos/execução
- **Custo**: R$ 0,00 (dentro do free tier)

## 🔒 Segurança

### Funções HTTP

As funções HTTP estão públicas por padrão. Para adicionar autenticação:

```javascript
exports.manualDeleteOldMessages = functions.https.onRequest(async (req, res) => {
  // Verificar token
  const authToken = req.headers.authorization;
  if (authToken !== 'Bearer SEU_TOKEN_SECRETO') {
    res.status(401).send('Unauthorized');
    return;
  }
  // ... resto do código
});
```

## 📝 Logs Importantes

### Sucesso

```
✅ Limpeza concluída!
📊 Total de chats processados: 15
🗑️ Total de mensagens deletadas: 42
```

### Erro

```
❌ Erro na limpeza de mensagens: [error message]
```

## 🆘 Troubleshooting

### Erro: "Billing account not configured"

Ative o plano Blaze no Firebase Console.

### Erro: "Permission denied"

```bash
firebase login --reauth
```

### Function não executa

1. Verifique os logs: `npm run logs`
2. Liste as functions: `firebase functions:list`
3. Teste manualmente: `curl -X POST [URL_DA_FUNCTION]`

## 📚 Documentação

- [Firebase Functions](https://firebase.google.com/docs/functions)
- [Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Firestore com Functions](https://firebase.google.com/docs/functions/firestore-events)

## 🔄 Workflow de Deploy

1. Fazer alterações em `index.js`
2. Testar localmente: `node test-delete-messages.js`
3. Commit das alterações
4. Deploy: `npm run deploy`
5. Verificar logs: `npm run logs`
6. Testar em produção

## ✅ Checklist

- [ ] Firebase CLI instalado
- [ ] Login realizado (`firebase login`)
- [ ] Dependências instaladas (`npm install`)
- [ ] Código testado localmente
- [ ] Deploy realizado (`npm run deploy`)
- [ ] Logs verificados (sem erros)
- [ ] Teste manual executado
- [ ] Monitoramento configurado

## 📞 Suporte

Para dúvidas ou problemas, consulte:
- Documentação em `.agent/DEPLOY_CLOUD_FUNCTIONS.md`
- Logs do Firebase: `npm run logs`
- Console do Firebase: https://console.firebase.google.com/
