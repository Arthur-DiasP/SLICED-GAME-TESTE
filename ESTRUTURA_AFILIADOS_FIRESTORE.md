# Estrutura do Firestore - Sistema de Afiliados

## Visão Geral
Este documento descreve a estrutura de dados criada no Firestore para o sistema de afiliados da plataforma SLICED.

---

## 📊 Estrutura de Dados

### 1. **Saldo de Afiliado do Usuário**

**Caminho:** `SLICED/data/Usuário/{uid}`

```
SLICED (Collection)
└── data (Document)
    └── Usuário (Collection)
        └── {uid} (Document)
            ├── nomeCompleto: string
            ├── email: string
            ├── cpf: string
            ├── telefone: string
            ├── afiliado-saldo: number  ⭐ NOVO CAMPO
            └── ... (outros campos existentes)
```

**Campo Adicionado:**
- `afiliado-saldo` (number): Saldo acumulado de comissões de afiliado do usuário
  - Valor inicial: `0.00`
  - Incrementado quando há indicações bem-sucedidas
  - Decrementado quando o usuário solicita um saque

---

### 2. **Registro de Saques de Afiliado**

**Caminho:** `SLICED/data/Saques-Afiliado/{documentId}`

```
SLICED (Collection)
└── data (Document)
    └── Saques-Afiliado (Collection)
        └── {auto-generated-id} (Document)
            ├── userId: string           // UID do usuário
            ├── userName: string          // Nome completo do usuário
            ├── userEmail: string         // Email do usuário
            ├── amount: number            // Valor solicitado para saque
            ├── status: string            // Status: "pendente" | "aprovado" | "rejeitado"
            ├── requestDate: string       // Data da solicitação (ISO format)
            └── processedDate: string     // Data do processamento (ISO format ou null)
```

**Detalhes dos Campos:**

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `userId` | string | ID único do usuário no Firebase Auth | "abc123def456..." |
| `userName` | string | Nome completo do usuário | "João Silva" |
| `userEmail` | string | Email do usuário | "joao@example.com" |
| `amount` | number | Valor do saque solicitado (mínimo R$ 20,00) | 25.50 |
| `status` | string | Status atual do saque | "pendente" |
| `requestDate` | string | Data e hora da solicitação | "2025-12-17T14:30:00.000Z" |
| `processedDate` | string/null | Data de processamento (null se pendente) | null ou "2025-12-18T10:00:00.000Z" |

---

## 🎯 Regras de Negócio

### Comissões de Afiliado
- **Taxa:** R$ 0,50 para cada R$ 10,00 de indicação
- **Acúmulo:** O saldo é incrementado automaticamente quando indicações fazem depósitos

### Saque
- **Valor Mínimo:** R$ 20,00
- **Requisito:** O usuário deve ter saldo >= R$ 20,00 no campo `afiliado-saldo`
- **Prazo:** Processamento em até 24 horas úteis
- **Dedução:** Ao solicitar saque, o valor é imediatamente deduzido do `afiliado-saldo`

---

## 🔄 Fluxo de Operação

### 1️⃣ Carregamento do Saldo
```javascript
1. Usuário acessa a página de afiliados
2. Sistema busca documento em: SLICED/data/Usuário/{uid}
3. Lê o campo 'afiliado-saldo'
4. Exibe o saldo formatado na tela
5. Habilita/desabilita botão de saque baseado no saldo >= R$ 20,00
```

### 2️⃣ Solicitação de Saque
```javascript
1. Usuário clica em "Solicitar Saque"
2. Modal é aberto com saldo atual
3. Usuário informa o valor (mín. R$ 20,00)
4. Sistema valida:
   - Valor >= R$ 20,00
   - Valor <= saldo disponível
5. Se válido:
   a. Cria novo documento em SLICED/data/Saques-Afiliado
   b. Deduz valor do campo 'afiliado-saldo' do usuário
   c. Exibe mensagem de sucesso
6. Atualiza UI com novo saldo
```

### 3️⃣ Processamento Administrativo
```javascript
1. Admin acessa dashboard de saques
2. Visualiza todos os documentos em SLICED/data/Saques-Afiliado
3. Filtra por status: "pendente"
4. Processa o pagamento
5. Atualiza documento:
   - status: "aprovado" ou "rejeitado"
   - processedDate: data atual
6. (Se rejeitado) Reembolsa o valor ao 'afiliado-saldo' do usuário
```

---

## 💾 Exemplo de Dados

### Documento do Usuário (após adicionar saldo de afiliado)
```json
{
  "uid": "abc123def456",
  "nomeCompleto": "Maria Santos",
  "email": "maria@example.com",
  "cpf": "123.456.789-00",
  "telefone": "(11) 98765-4321",
  "afiliado-saldo": 45.50,
  "dataCriacao": "2025-01-01T00:00:00.000Z"
}
```

### Documento de Saque
```json
{
  "userId": "abc123def456",
  "userName": "Maria Santos",
  "userEmail": "maria@example.com",
  "amount": 25.50,
  "status": "pendente",
  "requestDate": "2025-12-17T14:30:00.000Z",
  "processedDate": null
}
```

---

## 🔒 Segurança

### Regras do Firestore (Sugeridas)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Leitura do próprio saldo de afiliado
    match /SLICED/data/Usuário/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Criação de solicitações de saque
    match /SLICED/data/Saques-Afiliado/{docId} {
      allow create: if request.auth != null 
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.amount >= 20;
      allow read: if request.auth != null 
        && (resource.data.userId == request.auth.uid || isAdmin());
      allow update, delete: if isAdmin();
    }
    
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

---

## 📝 Notas Importantes

1. **Concorrência:** O sistema usa transações do Firestore para garantir consistência
2. **Auditoria:** Todos os saques são registrados permanentemente
3. **Histórico:** Usuários podem consultar seu histórico de saques futuramente
4. **Incremento Automático:** O campo `afiliado-saldo` é incrementado automaticamente quando indicações são confirmadas
5. **Validação Dupla:** Validação no frontend e backend para segurança

---

**Última Atualização:** 17/12/2025  
**Versão:** 1.0
