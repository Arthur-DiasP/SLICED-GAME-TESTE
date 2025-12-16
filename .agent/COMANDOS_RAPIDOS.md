# ⚡ Comandos Rápidos - Cloud Functions

## 🚀 Deploy

```bash
# Deploy completo
firebase deploy --only functions

# Deploy função específica
firebase deploy --only functions:deleteOldChatMessages
firebase deploy --only functions:manualDeleteOldMessages
firebase deploy --only functions:deleteUserChat
```

## 🧪 Testes

```bash
# Teste local (simulação - não deleta)
cd functions
node test-delete-messages.js

# Teste manual (produção - DELETA DE VERDADE)
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages

# Deletar chat de usuário específico
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/deleteUserChat \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID_AQUI"}'
```

## 📊 Monitoramento

```bash
# Ver todos os logs
firebase functions:log

# Ver logs de função específica
firebase functions:log --only deleteOldChatMessages

# Ver logs em tempo real
firebase functions:log --follow
```

## 🔧 Gerenciamento

```bash
# Listar todas as functions
firebase functions:list

# Ver configurações
firebase functions:config:get

# Deletar uma function
firebase functions:delete deleteOldChatMessages
```

## 📦 Instalação Inicial

```bash
# 1. Instalar Firebase CLI
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Instalar dependências
cd functions
npm install

# 4. Deploy
cd ..
firebase deploy --only functions
```

## 🔄 Atualizar Function

```bash
# 1. Editar código em functions/index.js
# 2. Testar localmente
cd functions
node test-delete-messages.js

# 3. Deploy
cd ..
firebase deploy --only functions:deleteOldChatMessages
```

## 🆘 Troubleshooting

```bash
# Reautenticar
firebase login --reauth

# Verificar projeto atual
firebase projects:list

# Selecionar projeto
firebase use sliced-4f1e3

# Limpar cache
firebase functions:delete --force deleteOldChatMessages
firebase deploy --only functions:deleteOldChatMessages
```

## 📱 URLs das Functions

### Produção
```
manualDeleteOldMessages:
https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages

deleteUserChat:
https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/deleteUserChat
```

### Console Firebase
```
https://console.firebase.google.com/project/sliced-4f1e3/functions
```

## 💡 Dicas

```bash
# Ver tamanho do bundle
firebase functions:log --only deleteOldChatMessages | grep "Function execution"

# Monitorar custos
# Acesse: https://console.firebase.google.com/project/sliced-4f1e3/usage

# Exportar logs
firebase functions:log --only deleteOldChatMessages > logs.txt
```

## 🎯 Comandos Mais Usados

```bash
# Deploy rápido
firebase deploy --only functions

# Ver logs
firebase functions:log

# Teste local
node functions/test-delete-messages.js

# Teste produção
curl -X POST https://southamerica-east1-sliced-4f1e3.cloudfunctions.net/manualDeleteOldMessages
```
