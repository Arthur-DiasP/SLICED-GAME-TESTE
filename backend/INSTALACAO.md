# 🚀 Guia de Instalação - Node.js e Dependências

## ⚠️ Pré-requisitos

Para executar este projeto, você precisa ter o **Node.js** instalado no seu sistema.

## 📥 Instalando o Node.js no Windows

### Opção 1: Download Direto (Recomendado)

1. Acesse o site oficial: [https://nodejs.org/](https://nodejs.org/)
2. Baixe a versão **LTS (Long Term Support)** - recomendada para a maioria dos usuários
3. Execute o instalador `.msi` baixado
4. Siga o assistente de instalação:
   - ✅ Aceite os termos de licença
   - ✅ Mantenha o caminho de instalação padrão
   - ✅ **IMPORTANTE:** Marque a opção "Automatically install the necessary tools"
5. Clique em "Install" e aguarde a conclusão
6. Reinicie o terminal/PowerShell

### Opção 2: Usando Winget (Windows Package Manager)

Se você tem o Windows 10/11 atualizado:

```powershell
winget install OpenJS.NodeJS.LTS
```

### Opção 3: Usando Chocolatey

Se você usa o Chocolatey:

```powershell
choco install nodejs-lts
```

## ✅ Verificando a Instalação

Após instalar, abra um **novo terminal** e execute:

```powershell
node --version
npm --version
```

Você deve ver algo como:
```
v20.10.0
10.2.3
```

## 📦 Instalando as Dependências do Projeto

Após instalar o Node.js, navegue até a pasta do backend e instale as dependências:

```powershell
cd c:\Users\grupo\OneDrive\Documentos\SPFC\backend
npm install
```

Isso instalará todos os pacotes necessários:
- ✅ express
- ✅ body-parser
- ✅ axios
- ✅ dotenv
- ✅ firebase-admin
- ✅ nodemon (dev)

## 🔧 Configuração Inicial

### 1. Criar arquivo .env

Copie o arquivo de exemplo:

```powershell
cp .env.example .env
```

Ou crie manualmente um arquivo `.env` na pasta `backend/` com o seguinte conteúdo:

```env
PORT=3000

# Credenciais InfinitePay
INFINITEPAY_CLIENT_ID=seu_client_id_aqui
INFINITEPAY_CLIENT_SECRET=seu_client_secret_aqui
INFINITEPAY_WEBHOOK_SECRET=sua_chave_secreta_webhook_aqui

# Firebase
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

### 2. Obter Credenciais Firebase

1. Acesse: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Selecione seu projeto (ou crie um novo)
3. Vá em **⚙️ Configurações do Projeto** > **Contas de Serviço**
4. Clique em **"Gerar nova chave privada"**
5. Salve o arquivo JSON como `serviceAccountKey.json` na pasta `backend/`

### 3. Obter Credenciais InfinitePay

1. Acesse o painel da InfinitePay: [https://dashboard.infinitepay.io/](https://dashboard.infinitepay.io/)
2. Vá em **Configurações** > **API**
3. Copie:
   - `CLIENT_ID`
   - `CLIENT_SECRET`
   - `WEBHOOK_SECRET`
4. Cole no arquivo `.env`

### 4. Configurar Webhook na InfinitePay

1. No painel da InfinitePay, vá em **Webhooks**
2. Adicione uma nova URL de webhook:
   ```
   https://seu-dominio.com/api/infinitepay/webhook
   ```
3. Selecione os eventos:
   - ✅ `payment.paid` (Pagamento confirmado)
4. Salve a configuração

**Para testes locais**, use [ngrok](https://ngrok.com/):

```powershell
# Instalar ngrok
winget install ngrok

# Expor porta 3000
ngrok http 3000
```

Use a URL gerada pelo ngrok (ex: `https://abc123.ngrok.io/api/infinitepay/webhook`)

## 🎯 Executar o Servidor

### Modo de Produção
```powershell
npm start
```

### Modo de Desenvolvimento (com auto-reload)
```powershell
npm run dev
```

O servidor estará disponível em: **http://localhost:3000**

## 🧪 Testar a API

### Health Check
```powershell
curl http://localhost:3000/health
```

Ou abra no navegador: [http://localhost:3000/health](http://localhost:3000/health)

## 🐛 Problemas Comuns

### "npm não é reconhecido como comando"
- ✅ Certifique-se de que o Node.js foi instalado corretamente
- ✅ Reinicie o terminal/PowerShell
- ✅ Verifique se o Node.js está no PATH do sistema

### "Cannot find module 'express'"
- ✅ Execute `npm install` na pasta `backend/`

### "FIREBASE_SERVICE_ACCOUNT_PATH não está definido"
- ✅ Verifique se o arquivo `.env` existe
- ✅ Confirme se a variável está configurada corretamente

### "Falha na autenticação com InfinitePay"
- ✅ Verifique se as credenciais no `.env` estão corretas
- ✅ Confirme se o CLIENT_ID e CLIENT_SECRET são válidos

## 📚 Próximos Passos

1. ✅ Instalar Node.js
2. ✅ Instalar dependências (`npm install`)
3. ✅ Configurar arquivo `.env`
4. ✅ Baixar credenciais Firebase
5. ✅ Configurar webhook InfinitePay
6. ✅ Executar servidor (`npm start` ou `npm run dev`)
7. ✅ Testar endpoints

## 🆘 Suporte

Se encontrar problemas, verifique:
- [Documentação Node.js](https://nodejs.org/docs/)
- [Documentação InfinitePay](https://developers.infinitepay.io/)
- [Documentação Firebase](https://firebase.google.com/docs)

---

**Boa sorte! 🚀**
