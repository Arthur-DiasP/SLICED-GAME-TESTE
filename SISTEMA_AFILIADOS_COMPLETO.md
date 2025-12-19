# Sistema de Afiliados SLICED

## 📋 Visão Geral

Sistema completo de rastreamento de indicações e comissionamento automático para a plataforma SLICED.

---

## 🔗 Como Funciona

### 1. **Geração do Link de Afiliado**

Cada usuário tem um link exclusivo de afiliado no formato:
```
https://sliced.online/login/login.html?ref={ID_USUARIO}
```

O ID do usuário são os primeiros 8 caracteres do UID único gerado no cadastro.

**Onde encontrar:** Na página `/usuário/afiliados/afiliados.html`, o link é gerado automaticamente e pode ser copiado.

---

### 2. **Cadastro via Link de Afiliado**

Quando alguém acessa o link de afiliado:

1. A página de login detecta automaticamente o parâmetro `ref` na URL
2. Exibe uma mensagem de boas-vindas: "✨ Você foi indicado! Complete o cadastro para ganhar bônus."
3. Muda automaticamente para a aba de cadastro
4. Ao completar o cadastro, o sistema salva no documento do novo usuário:
   - `indicadoPor`: ID do usuário que indicou
   - `indicadoEm`: Data/hora da indicação

---

### 3. **Sistema de Comissão**

#### Regras de Comissionamento

- **Valor Mínimo de Depósito:** R$ 10,00
- **Comissão:** R$ 0,50 por cada depósito qualificado
- **Processamento:** Automático e em tempo real

#### Fluxo de Pagamento

```
1. Usuário indicado faz um depósito via PIX
2. Mercado Pago confirma o pagamento (webhook)
3. Sistema verifica se:
   - O usuário tem campo 'indicadoPor'
   - O valor depositado >= R$ 10,00
4. Se sim:
   - Credita R$ 0,50 no campo 'afiliado-saldo' do indicador
   - Registra a transação na subcoleção 'Comissoes-Afiliado'
```

---

## 💾 Estrutura de Dados no Firestore

### Documento do Usuário Indicado
```
SLICED/data/Usuários/{uid}
├── uid: string
├── nomeCompleto: string
├── email: string
├── cpf: string
├── indicadoPor: string (UID de quem indicou) ⭐
├── indicadoEm: timestamp ⭐
└── ... (outros campos)
```

### Documento do Indicador
```
SLICED/data/Usuários/{uid_indicador}
├── uid: string
├── nomeCompleto: string
├── afiliado-saldo: number ⭐
└── Comissoes-Afiliado/ (subcoleção) ⭐
    └── {auto-id}
        ├── usuarioIndicado: string
        ├── nomeIndicado: string
        ├── valorDeposito: number
        ├── comissao: number (0.50)
        ├── data: timestamp
        └── paymentId: string
```

---

## 📊 Página de Afiliados

**Localização:** `/usuário/afiliados/afiliados.html`

### Funcionalidades

1. **Link de Referência**
   - Gerado automaticamente
   - Botão de copiar

2. **Estatísticas** (em desenvolvimento)
   - Total de indicações
   - Ganhos totais
   - Pontos acumulados

3. **Saldo de Afiliado**
   - Exibe saldo acumulado
   - Botão de saque (mínimo R$ 20,00)

4. **Solicitação de Saque**
   - Modal com formulário
   - Validação de valor mínimo
   - Processamento em até 24h úteis

---

## 🔒 Segurança e Validações

### Prevenção de Fraudes

1. **Transação Atômica:** Todo o processo acontece dentro de uma transação Firestore
2. **Verificação de Duplicidade:** Cada pagamento é processado apenas uma vez
3. **Validação de Valor Mínimo:** Apenas depósitos >= R$ 10,00 geram comissão
4. **Rastreamento Completo:** Todas as comissões ficam registradas com timestamps e IDs

### Validações no Cadastro

- O sistema não permite que o usuário indique a si mesmo
- O código de referência é validado antes de salvar
- Timestamps garantem rastreamento de quando a indicação foi feita

---

## 🛠️ Arquitetura Técnica

### Frontend

**Arquivos Modificados:**
1. `/login/login.html` - Captura parâmetro ref e exibe mensagem
2. `/controle-dados/auth.js` - Salva indicador no cadastro
3. `/usuário/afiliados/afiliados.html` - Interface do programa de afiliados

### Backend

**Arquivo:** `/server2.js`

**Função Principal:** `processarPagamento(uid, valor, paymentId)`

Esta função:
- Atualiza o saldo do usuário que fez o depósito
- Verifica se há indicador
- Credita comissão automaticamente
- Registra todas as transações

---

## 📈 Exemplos de Uso

### Exemplo 1: Usuário Completo

```javascript
// 1. Maria se cadastra normalmente
// Seu UID: user_1234567890_abc

// 2. Maria acessa a página de afiliados
// Link gerado: https://sliced.online/login/login.html?ref=user_123

// 3. João acessa o link de Maria
// Sistema detecta: ref=user_123

// 4. João completa o cadastro
// Documento do João salvo com:
{
  uid: "user_0987654321_xyz",
  indicadoPor: "user_1234567890_abc",
  indicadoEm: Timestamp(2025-12-19 10:00:00)
}

// 5. João faz um depósito de R$ 15,00
// Sistema automaticamente:
// - Adiciona R$ 15,00 ao saldo do João
// - Adiciona R$ 0,50 ao afiliado-saldo da Maria
// - Registra na subcoleção Comissoes-Afiliado da Maria
```

### Exemplo 2: Múltiplas Indicações

```javascript
// Maria indica 10 pessoas
// Cada uma deposita R$ 10,00
// Maria ganha: 10 x R$ 0,50 = R$ 5,00
// Pode sacar quando atingir R$ 20,00
```

---

## 🎯 Regras de Saque

1. **Valor Mínimo:** R$ 20,00
2. **Processamento:** Até 24 horas úteis
3. **Método:** PIX (mesma chave cadastrada no perfil)
4. **Dedução Imediata:** Ao solicitar, o valor é deduzido do saldo

---

## 🔄 Fluxo Completo do Sistema

```
┌─────────────────────────────────────────────┐
│ 1. Usuário A acessa página de afiliados    │
│    Copia link: sliced.online?ref=ABC123    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 2. Usuário B clica no link                 │
│    Sistema detecta parâmetro ?ref=ABC123   │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 3. Usuário B completa cadastro             │
│    Salvo: indicadoPor = ABC123             │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 4. Usuário B faz depósito de R$ 10,00+    │
│    Webhook Mercado Pago notifica servidor  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 5. Servidor processa pagamento             │
│    - Credita R$ 10,00 para Usuário B       │
│    - Verifica: indicadoPor existe?         │
│    - Valor >= R$ 10,00? Sim!               │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│ 6. Sistema credita afiliado                │
│    - Usuário A ganha R$ 0,50               │
│    - Atualiza afiliado-saldo               │
│    - Registra em Comissoes-Afiliado        │
└─────────────────────────────────────────────┘
```

---

## 📝 Logs e Monitoramento

O sistema registra logs para facilitar debug:

```javascript
// Pagamento normal
✅ [DB] Saldo Atualizado: 0 + 10 = 10

// Comissão creditada
💰 [AFILIADO] R$ 0.50 creditado para user_123 (indicou user_456)

// Pagamento duplicado (prevenção de fraude)
🛑 [DB] Pagamento 123456 DUPLICADO - Ignorando.
```

---

## 🚀 Próximas Funcionalidades (Sugestões)

1. **Dashboard de Afiliados**
   - Gráfico de indicações por período
   - Histórico detalhado de comissões
   - Top indicadores

2. **Campanhas Especiais**
   - Comissão dobrada em eventos
   - Bônus por meta de indicações

3. **Níveis de Afiliados**
   - Bronze: R$ 0,50 por indicação
   - Prata: R$ 0,75 por indicação
   - Ouro: R$ 1,00 por indicação

4. **Notificações**
   - Push notification quando ganhar comissão
   - Email semanal com resumo

---

## ❓ FAQ

**P: Posso indicar a mim mesmo?**
R: Não. O sistema valida o código de referência.

**P: Quantas vezes ganho comissão por usuário?**
R: Apenas uma vez, no primeiro depósito de R$ 10,00 ou mais.

**P: Como vejo minhas comissões?**
R: Na página de afiliados, no card "Saldo Disponível".

**P: Quando posso sacar?**
R: Quando atingir o mínimo de R$ 20,00.

**P: Quanto tempo demora o saque?**
R: Até 24 horas úteis após a solicitação.

---

**Última Atualização:** 19/12/2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Funcional
