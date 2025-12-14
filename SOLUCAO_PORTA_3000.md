# Solução: Erro EADDRINUSE (Porta 3000 em Uso)

## 🐛 Erro

```
Error: listen EADDRINUSE: address already in use :::3000
```

## 📋 Causa

A porta 3000 já estava sendo usada por outro processo Node.js (PID 1780). Isso acontece quando:
- O servidor foi iniciado anteriormente e não foi fechado corretamente
- Outro aplicativo está usando a mesma porta
- O terminal foi fechado sem parar o servidor

## ✅ Solução Aplicada

### 1. Identificar o Processo
```bash
netstat -ano | findstr :3000
```

**Resultado:**
```
TCP    0.0.0.0:3000           0.0.0.0:0              LISTENING       1780
TCP    [::]:3000              [::]:0                 LISTENING       1780
```

### 2. Matar o Processo
```bash
taskkill /PID 1780 /F
```

### 3. Iniciar o Servidor
```bash
node server2.js
```

**Resultado:**
```
✅ SDK do Mercado Pago configurado com sucesso.
=================================================
🚀 SERVER 2 RODANDO NA PORTA 3000
=================================================
🔑 Configuração Mercado Pago: TOKEN CONFIGURADO ✅
🌐 Webhook Base URL: https://seusite.com
=================================================
🏠 SITE PRINCIPAL: http://localhost:3000
=================================================
```

## 🛠️ Script de Gerenciamento

Criei um script `gerenciar-servidor.bat` para facilitar o gerenciamento do servidor:

### Como Usar:

1. **Clique duas vezes em `gerenciar-servidor.bat`**
2. **Escolha uma opção:**
   - `[1]` Iniciar servidor
   - `[2]` Parar servidor
   - `[3]` Reiniciar servidor
   - `[4]` Ver status da porta 3000
   - `[5]` Sair

### Funcionalidades:

#### **Iniciar Servidor**
- Abre uma nova janela do terminal
- Inicia o `server2.js`
- Mantém a janela aberta para ver logs

#### **Parar Servidor**
- Encontra automaticamente o processo na porta 3000
- Mata o processo
- Libera a porta

#### **Reiniciar Servidor**
- Para o servidor atual
- Aguarda 2 segundos
- Inicia novamente

#### **Ver Status**
- Mostra se a porta 3000 está livre ou em uso
- Exibe o PID do processo se estiver em uso

## 🔧 Comandos Manuais

Se preferir usar comandos manuais:

### Windows (PowerShell)

**Encontrar processo:**
```powershell
netstat -ano | findstr :3000
```

**Matar processo:**
```powershell
taskkill /PID <PID> /F
```

**Exemplo:**
```powershell
taskkill /PID 1780 /F
```

### Alternativa: Usar outra porta

Se não quiser matar o processo, pode usar outra porta:

**Editar `.env`:**
```env
PORT=3001
```

**Ou executar diretamente:**
```bash
set PORT=3001 && node server2.js
```

## 🚨 Prevenção

Para evitar este erro no futuro:

### 1. **Sempre feche o servidor corretamente**
- Use `Ctrl + C` no terminal
- Ou feche a janela do terminal

### 2. **Use o script de gerenciamento**
- `gerenciar-servidor.bat` cuida de tudo automaticamente

### 3. **Verifique antes de iniciar**
```bash
netstat -ano | findstr :3000
```

### 4. **Use nodemon para desenvolvimento**
```bash
npm install -g nodemon
nodemon server2.js
```

## 📝 Resumo

| Problema | Solução |
|----------|---------|
| Porta em uso | Matar processo com `taskkill` |
| Não sabe o PID | Usar `netstat -ano \| findstr :3000` |
| Quer automatizar | Usar `gerenciar-servidor.bat` |
| Quer outra porta | Mudar `PORT` no `.env` |

## ✅ Status Atual

- ✅ Processo antigo (PID 1780) foi finalizado
- ✅ Servidor está rodando na porta 3000
- ✅ SDK do Mercado Pago configurado
- ✅ Pronto para receber requisições

## 🎯 Próximos Passos

1. **Acesse o site:** http://localhost:3000
2. **Faça login** no sistema
3. **Teste o depósito PIX**
4. **Verifique os logs** no terminal do servidor

---

**Data:** 13/12/2025  
**Status:** ✅ Resolvido  
**Servidor:** Rodando na porta 3000
