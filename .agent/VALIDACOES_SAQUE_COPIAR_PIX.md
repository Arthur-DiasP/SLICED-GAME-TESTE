# 🔒 Validações de Saque e Botão de Copiar Chave PIX - SLICED

## 📋 Resumo das Atualizações

Implementadas validações obrigatórias para solicitação de saque e funcionalidade de copiar chave PIX no histórico.

---

## ✅ Novas Funcionalidades

### 1. **Validações Obrigatórias para Saque**

#### **Requisitos para Solicitar Saque:**

1. ✅ **Chave PIX Cadastrada** (Obrigatório)
   - Sistema verifica se usuário tem chave PIX cadastrada
   - Se não tiver, mostra aviso e bloqueia formulário
   - Usuário precisa cadastrar chave PIX antes de sacar

2. ✅ **Valor Mínimo: R$ 20,00** (Obrigatório)
   - Campo de valor tem `min="20"`
   - Validação no JavaScript antes de enviar
   - Mensagem de erro se valor for menor que R$ 20,00

3. ✅ **Saldo Suficiente** (Obrigatório)
   - Sistema verifica saldo disponível
   - Compara com valor solicitado
   - Bloqueia se saldo for insuficiente

---

### 2. **Modal de Saque Inteligente**

#### **Cenário 1: Usuário SEM Chave PIX**

```
┌─────────────────────────────────────┐
│  🚫 Solicitar Saque                 │
├─────────────────────────────────────┤
│                                     │
│  ⚠️ Chave PIX não cadastrada        │
│  Você precisa cadastrar uma chave   │
│  PIX antes de solicitar um saque.   │
│                                     │
│  [Formulário Oculto]                │
└─────────────────────────────────────┘
```

**Comportamento:**
- ⚠️ Mostra alerta amarelo
- 🚫 Oculta formulário de saque
- 🔒 Botão "Confirmar Saque" desabilitado

#### **Cenário 2: Usuário COM Chave PIX**

```
┌─────────────────────────────────────┐
│  💰 Solicitar Saque                 │
├─────────────────────────────────────┤
│                                     │
│  ✅ Chave PIX Cadastrada:           │
│  Tipo: CPF                          │
│  Chave: 123.456.789-00       ✓      │
│                                     │
│  Valor do Saque (R$)                │
│  [_____________________]            │
│  Valor mínimo: R$ 20,00             │
│                                     │
│  ⏰ Processado em até 24h           │
│                                     │
│  [✓ Confirmar Saque]                │
└─────────────────────────────────────┘
```

**Comportamento:**
- ✅ Mostra chave PIX cadastrada (verde)
- 📝 Exibe formulário de saque
- ✓ Botão "Confirmar Saque" habilitado
- 💰 Mostra saldo disponível no placeholder

---

### 3. **Botão de Copiar Chave PIX no Histórico**

#### **Visualização no Histórico:**

```
┌─────────────────────────────────────┐
│  📜 Histórico de Saques             │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐ │
│  │ R$ 50,00      [PENDENTE]      │ │
│  │                               │ │
│  │ Data: 16/12/2025 17:30        │ │
│  │ Chave PIX: 123.456.789-00     │ │
│  │            [📋 Copiar]        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

#### **Funcionalidade do Botão:**

1. **Estado Normal:**
   - 📋 Ícone de copiar
   - Texto: "Copiar"
   - Cor: Verde (#00ff88)

2. **Ao Clicar:**
   - ✅ Copia chave PIX para clipboard
   - ✓ Muda ícone para check
   - Texto: "Copiado!"
   - Cor: Verde claro (#4ade80)

3. **Após 2 Segundos:**
   - 🔄 Volta ao estado normal
   - Pronto para copiar novamente

---

## 🔧 Validações Implementadas

### **Validação 1: Chave PIX Cadastrada**

```javascript
// Ao abrir modal de saque
const userDoc = await firebase.firestore()
    .collection('SLICED')
    .doc(usuarioAtual.uid)
    .get();

if (userDoc.exists && userDoc.data().pixKey) {
    // Tem chave PIX - habilita saque
    hasPixKey = true;
    pixKeyData = userDoc.data().pixKey;
} else {
    // Não tem chave PIX - bloqueia saque
    hasPixKey = false;
}
```

**Resultado:**
- ✅ **COM chave**: Mostra formulário e chave cadastrada
- ❌ **SEM chave**: Mostra aviso e oculta formulário

---

### **Validação 2: Valor Mínimo R$ 20,00**

```javascript
const amount = parseFloat(document.getElementById('withdrawAmount').value);

if (amount < 20) {
    alert('O valor mínimo para saque é R$ 20,00');
    return;
}
```

**Resultado:**
- ✅ **≥ R$ 20,00**: Prossegue com saque
- ❌ **< R$ 20,00**: Mostra alerta e bloqueia

---

### **Validação 3: Saldo Suficiente**

```javascript
const saldoAtual = parseFloat(sessionStorage.getItem('userBalance') || 0);

if (amount > saldoAtual) {
    alert(`Saldo insuficiente! Você tem R$ ${saldoAtual.toFixed(2)} disponível.`);
    return;
}
```

**Resultado:**
- ✅ **Saldo suficiente**: Prossegue com saque
- ❌ **Saldo insuficiente**: Mostra alerta com saldo disponível

---

## 💻 Código Implementado

### **Arquivos Modificados**

1. **perfil.html** (Linhas 1456-1507)
   - Modal de saque atualizado
   - Alerta de chave PIX não cadastrada
   - Informação de chave PIX cadastrada
   - Valor mínimo alterado para R$ 20,00

2. **perfil.js** (Linhas 137-232)
   - Validação de chave PIX ao abrir modal
   - Validação de valor mínimo
   - Validação de saldo suficiente
   - Criação de solicitação de saque no Firebase

3. **perfil.js** (Linhas 503-656)
   - Botão de copiar chave PIX no histórico
   - Função `copyPixKey()` global
   - Feedback visual ao copiar

---

## 🎯 Fluxo de Solicitação de Saque

### **Passo a Passo:**

1. **Usuário clica em "Solicitar Saque"**
   - Sistema abre modal
   - Verifica se tem chave PIX cadastrada

2. **Cenário A: SEM Chave PIX**
   - ⚠️ Mostra aviso amarelo
   - 🚫 Oculta formulário
   - 🔒 Bloqueia botão de confirmar
   - Usuário precisa cadastrar chave PIX primeiro

3. **Cenário B: COM Chave PIX**
   - ✅ Mostra chave cadastrada (verde)
   - 📝 Exibe formulário
   - ✓ Habilita botão de confirmar
   - Usuário digita valor do saque

4. **Validações ao Confirmar:**
   - ✓ Valor ≥ R$ 20,00?
   - ✓ Saldo suficiente?
   - ✓ Chave PIX existe?

5. **Se Tudo OK:**
   - 💾 Cria solicitação no Firebase
   - ✅ Mostra mensagem de sucesso
   - 🔄 Fecha modal
   - 📜 Recarrega histórico

6. **Visualizar no Histórico:**
   - 📋 Vê saque com status "Pendente"
   - 📋 Pode copiar chave PIX usada
   - ⏰ Aguarda processamento (24h)

---

## 🎨 Interface Visual

### **Alerta de Chave PIX Não Cadastrada:**

```html
<div style="background: rgba(255, 193, 7, 0.2); border: 1px solid rgba(255, 193, 7, 0.5);">
    <i class="material-icons">warning</i>
    <p>Chave PIX não cadastrada</p>
    <p>Você precisa cadastrar uma chave PIX antes de solicitar um saque.</p>
</div>
```

**Cores:**
- Fundo: Amarelo translúcido
- Borda: Amarelo
- Ícone: ⚠️ Amarelo
- Texto: Amarelo/Branco

---

### **Informação de Chave PIX Cadastrada:**

```html
<div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3);">
    <span>Chave PIX Cadastrada: CPF</span>
    <span>123.456.789-00</span>
    <i class="material-icons">check_circle</i>
</div>
```

**Cores:**
- Fundo: Verde translúcido
- Borda: Verde
- Ícone: ✓ Verde
- Texto: Verde/Branco

---

### **Botão de Copiar Chave PIX:**

```html
<button onclick="copyPixKey('pixKey_123')">
    <i class="material-icons">content_copy</i>
    <span>Copiar</span>
</button>
```

**Estados:**

1. **Normal:**
   - Fundo: `rgba(0, 255, 136, 0.2)`
   - Borda: `rgba(0, 255, 136, 0.3)`
   - Cor: `#00ff88`

2. **Copiado:**
   - Fundo: `rgba(74, 222, 128, 0.2)`
   - Borda: `rgba(74, 222, 128, 0.3)`
   - Cor: `#4ade80`
   - Ícone: ✓ check

---

## 📊 Estrutura de Dados

### **Solicitação de Saque no Firebase:**

```
SLICED/{userId}/withdrawals/{withdrawalId}
  └─ {
       amount: 50.00,
       pixKey: '123.456.789-00',
       pixKeyType: 'cpf',
       status: 'pending',
       createdAt: Timestamp,
       userId: 'user_123',
       userName: 'João Silva'
     }
```

**Campos:**
- `amount`: Valor do saque
- `pixKey`: Chave PIX cadastrada (auto-preenchida)
- `pixKeyType`: Tipo da chave (cpf/email/telefone/aleatoria)
- `status`: Status do saque (pending/processing/approved/rejected)
- `createdAt`: Data/hora da solicitação
- `userId`: ID do usuário
- `userName`: Nome do usuário

---

## ✨ Benefícios

1. **Segurança**: Garante que usuário tem chave PIX válida
2. **Clareza**: Valor mínimo claro (R$ 20,00)
3. **Praticidade**: Botão de copiar chave PIX
4. **Feedback**: Mensagens claras de erro/sucesso
5. **Experiência**: Interface intuitiva e responsiva

---

## 🔍 Exemplos de Uso

### **Exemplo 1: Usuário Sem Chave PIX**

1. Clica em "Solicitar Saque"
2. Vê aviso: "Chave PIX não cadastrada"
3. Fecha modal
4. Vai para card "Chave PIX"
5. Cadastra chave PIX
6. Volta e solicita saque com sucesso

### **Exemplo 2: Usuário Com Chave PIX**

1. Clica em "Solicitar Saque"
2. Vê chave cadastrada: "CPF: 123.456.789-00"
3. Digita valor: R$ 50,00
4. Clica em "Confirmar Saque"
5. Recebe confirmação de sucesso
6. Vê saque no histórico com status "Pendente"

### **Exemplo 3: Copiar Chave PIX do Histórico**

1. Acessa histórico de saques
2. Vê saque com chave: "123.456.789-00"
3. Clica em botão "Copiar"
4. Botão muda para "Copiado!" (verde)
5. Chave copiada para clipboard
6. Pode colar em outro lugar

---

## 🚀 Próximos Passos (Sugestões)

1. **Notificações**: Notificar quando saque for aprovado/rejeitado
2. **Comprovante**: Gerar comprovante de saque em PDF
3. **Histórico Completo**: Filtros por status e período
4. **Cancelamento**: Permitir cancelar saque pendente
5. **Múltiplas Chaves**: Permitir escolher entre várias chaves PIX

---

**Data de Implementação**: 2025-12-16  
**Versão**: 2.0  
**Desenvolvedor**: Antigravity AI  
**Status**: ✅ Pronto para Produção
