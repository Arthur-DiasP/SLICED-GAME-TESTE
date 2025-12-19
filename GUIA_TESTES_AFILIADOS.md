# 🧪 Guia de Testes - Sistema de Afiliados SLICED

## ✅ Checklist de Testes

### Fase 1: Preparação
- [ ] Servidor está rodando (`node server2.js`)
- [ ] Mercado Pago Access Token configurado
- [ ] Firebase conectado corretamente

---

## 📋 Cenário de Teste Completo

### 1️⃣ Criar Usuário Indicador (Maria)

**Passos:**
1. Acessar: `http://localhost:3001/login/login.html`
2. Clicar em "Cadastro"
3. Preencher:
   - Nome: Maria Silva
   - Email: maria@teste.com
   - CPF: 123.456.789-00 (válido)
   - Data Nascimento: 01/01/1990
   - Telefone: (11) 98765-4321
   - Senha: 123456
4. Clicar em "Criar Conta"
5. Aguardar redirecionamento para início

**Resultado Esperado:**
✅ Cadastro realizado com sucesso
✅ Redirecionado para página inicial

---

### 2️⃣ Acessar Página de Afiliados (Maria)

**Passos:**
1. Navegar para: `/usuário/afiliados/afiliados.html`
2. Verificar que o link foi gerado

**Resultado Esperado:**
✅ Link no formato: `https://sliced.online/login/login.html?ref=user_123`
✅ Estatísticas zeradas:
   - Indicações: 0
   - Ganhos Totais: R$ 0,00
   - Pontos: 0
✅ Saldo: R$ 0,00
✅ Botão de saque desabilitado

**Ação:**
- Copiar o link de afiliado

---

### 3️⃣ Criar Usuário Indicado (João)

**Passos:**
1. Abrir nova aba anônima/privada
2. Colar o link copiado no passo anterior
3. Verificar mensagem: "✨ Você foi indicado! Complete o cadastro para ganhar bônus."
4. Verificar que está na aba "Cadastro"
5. Preencher:
   - Nome: João Santos
   - Email: joao@teste.com
   - CPF: 987.654.321-00 (válido)
   - Data: 15/05/1995
   - Telefone: (21) 98888-7777
   - Senha: 123456
6. Clicar em "Criar Conta"

**Resultado Esperado:**
✅ Cadastro realizado
✅ Redirecionado para início

**Verificação no Firebase (Console):**
```
SLICED/data/Usuários/[uid_do_joao]/
├── indicadoPor: "user_123..." ✅
├── indicadoEm: Timestamp ✅
```

---

### 4️⃣ Fazer Depósito - Teste com R$ 5,00 (Não deve gerar comissão)

**Ambiente:** Como João

**Passos:**
1. Acessar: `/usuário/perfil/perfil.html`
2. Clicar em "Depositar"
3. Selecionar R$ 5,00
4. Gerar PIX
5. **NÃO PAGAR AINDA**

**Resultado Esperado:**
✅ QR Code gerado
✅ Código Copia e Cola disponível

**Verificação:**
- Voltar para conta da Maria
- Acessar página de afiliados
- **Estatísticas devem continuar zeradas** (valor < R$ 10,00)

---

### 5️⃣ Fazer Depósito - Teste com R$ 10,00 (Deve gerar comissão)

**Ambiente:** Como João

**Passos:**
1. Acessar perfil
2. Clicar em "Depositar"
3. Selecionar R$ 10,00
4. Gerar PIX
5. **Pagar o PIX** (usar sandbox do Mercado Pago se estiver testando)

**Resultado Esperado:**
✅ Pagamento aprovado
✅ Saldo do João aumentou R$ 10,00

---

### 6️⃣ Verificar Comissão Creditada (Maria)

**Ambiente:** Como Maria

**Passos:**
1. Acessar página de afiliados
2. Aguardar 5-10 segundos (processamento do webhook)
3. Atualizar página (F5)

**Resultado Esperado:**
✅ **Indicações:** 1
✅ **Ganhos Totais:** R$ 0,50
✅ **Pontos:** 10
✅ **Saldo Afiliado:** R$ 0,50
✅ Botão de saque continua **desabilitado** (mínimo R$ 20,00)

**Verificação no Firebase (Console):**
```
SLICED/data/Usuários/[uid_maria]/
├── afiliado-saldo: 0.50 ✅
└── Comissoes-Afiliado/
    └── [auto-id]/
        ├── usuarioIndicado: "[uid_joao]" ✅
        ├── nomeIndicado: "João Santos" ✅
        ├── valorDeposito: 10 ✅
        ├── comissao: 0.50 ✅
        ├── data: Timestamp ✅
        └── paymentId: "123456" ✅
```

**Logs do Servidor:**
```
✅ [DB] Saldo Atualizado: 0 + 10 = 10
💰 [AFILIADO] R$ 0.50 creditado para user_123... (indicou user_456...)
```

---

### 7️⃣ Fazer Múltiplos Depósitos

**Ambiente:** Como João

**Objetivo:** Testar se CADA depósito >= R$ 10,00 gera comissão

**Passos:**
1. Fazer mais um depósito de R$ 10,00
2. Verificar página de afiliados da Maria

**Resultado Esperado:**
✅ **Indicações:** 2
✅ **Ganhos Totais:** R$ 1,00
✅ **Saldo Afiliado:** R$ 1,00

---

### 8️⃣ Atingir Mínimo para Saque

**Ambiente:** Criar mais usuários indicados

**Passos:**
1. Repetir processo 3-5 com mais 39 usuários
2. Cada um deposita R$ 10,00
3. Verificar saldo Maria

**Resultado Esperado (após 40 indicações):**
✅ **Saldo Afiliado:** R$ 20,00
✅ **Botão de saque ATIVADO**

---

### 9️⃣ Solicitar Saque

**Ambiente:** Como Maria

**Passos:**
1. Clicar em "SOLICITAR SAQUE"
2. Informar valor: R$ 20,00
3. Clicar em "CONFIRMAR SAQUE"

**Resultado Esperado:**
✅ Loading exibido
✅ Mensagem de sucesso
✅ Saldo atualizado para R$ 0,00
✅ Modal fecha automaticamente

**Verificação no Firebase:**
```
SLICED/data/Saques-Afiliado/[auto-id]/
├── userId: "[uid_maria]"
├── userName: "Maria Silva"
├── userEmail: "maria@teste.com"
├── amount: 20
├── status: "pendente"
├── requestDate: "2025-12-19T..."
└── processedDate: null
```

---

## 🔍 Testes de Segurança

### Teste 1: Pagamento Duplicado

**Objetivo:** Verificar que o mesmo pagamento não credita duas vezes

**Passos:**
1. Capturar paymentId de um pagamento
2. Enviar webhook manualmente com mesmo ID
3. Verificar logs

**Resultado Esperado:**
```
🛑 [DB] Pagamento 123456 DUPLICADO - Ignorando.
```
✅ Saldo não aumentou

---

### Teste 2: Valor Abaixo do Mínimo

**Passos:**
1. Usuário indicado deposita R$ 5,00

**Resultado Esperado:**
✅ Depósito processado normalmente
✅ **Comissão NÃO creditada**
✅ Estatísticas do afiliado **não mudam**

---

### Teste 3: Usuário Sem Indicador

**Passos:**
1. Criar usuário novo SEM usar link de afiliado
2. Fazer depósito de R$ 10,00

**Resultado Esperado:**
✅ Depósito processado
✅ Nenhuma comissão gerada (campo `indicadoPor` vazio)

---

## 📊 Dashboard Admin - Verificação de Saques

**Passos:**
1. Acessar: `/dashboard/dashboard-inicio.html`
2. Login: sliced@gmail.com / 185520
3. Navegar até área de saques de afiliados

**O que deve estar visível:**
- Lista de solicitações pendentes
- Dados do solicitante
- Valor solicitado
- Data da solicitação
- Botões: Aprovar / Rejeitar

---

## 🎨 Testes de UI/UX

### Visual do Link de Afiliado
- [ ] Link formatado corretamente
- [ ] Botão "COPIAR" funciona
- [ ] Feedback visual ao copiar (OK! verde)

### Visual das Estatísticas
- [ ] Cards alinhados
- [ ] Valores formatados em Real (R$)
- [ ] Números atualizados em tempo real

### Modal de Saque
- [ ] Abre suavemente
- [ ] Validação de valor mínimo funciona
- [ ] Loading exibido durante processamento
- [ ] Mensagem de sucesso clara
- [ ] Modal fecha automaticamente

---

## 🐛 Troubleshooting

### Problema: Link não copia
**Solução:** Verificar permissões do navegador para clipboard

### Problema: Comissão não creditada
**Verificar:**
1. Usuário tem campo `indicadoPor`?
2. Valor >= R$ 10,00?
3. Logs do servidor mostram processamento?
4. Firebase Rules permitem escrita?

### Problema: Estatísticas zeradas
**Verificar:**
1. Subcoleção `Comissoes-Afiliado` existe?
2. Console do navegador mostra erros?
3. UID do usuário está correto?

---

## ✅ Checklist Final

- [ ] Link de afiliado gerado corretamente
- [ ] Parâmetro ref capturado na URL
- [ ] Campo indicadoPor salvo no cadastro
- [ ] Depósito < R$ 10 não gera comissão
- [ ] Depósito >= R$ 10 gera comissão
- [ ] Comissão de R$ 0,50 creditada
- [ ] Estatísticas atualizadas
- [ ] Saldo de afiliado atualizado
- [ ] Botão de saque desabilitado < R$ 20
- [ ] Botão de saque habilitado >= R$ 20
- [ ] Modal de saque funcional
- [ ] Solicitação salva no Firestore
- [ ] Logs do servidor corretos
- [ ] Sem pagamentos duplicados

---

**Última Atualização:** 19/12/2025  
**Status:** Pronto para Testes
