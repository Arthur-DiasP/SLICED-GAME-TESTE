# 🛒 Sistema de Checkout - SLICED

## 📋 Visão Geral

O sistema de checkout foi modelado a partir dos exemplos do Mercado Pago (pastas `server` e `client`) e adaptado para o projeto SLICED-GAME. O fluxo agora inclui uma página intermediária de checkout antes do pagamento PIX.

## 🔄 Fluxo Completo

### 1. **Perfil (perfil.html)**
- Usuário clica em um dos botões de depósito (R$ 10, R$ 25, R$ 50, R$ 100 ou valor personalizado)
- Sistema valida:
  - Valor mínimo (R$ 100 para depósito personalizado)
  - Dados obrigatórios: Nome Completo, E-mail, CPF, Telefone, CEP
- Dados são salvos no `sessionStorage`:
  - `depositAmount`: Valor do depósito
  - `loggedInUser`: Dados completos do usuário
- **Redireciona para:** `checkout.html`

### 2. **Checkout (checkout.html)**
- Página de revisão do depósito
- Exibe:
  - Resumo do depósito
  - Informações do usuário (nome e e-mail)
  - Valor formatado em destaque
- Botões:
  - **"Prosseguir para Pagamento"**: Cria o PIX e redireciona para saldo.html
  - **"Cancelar"**: Retorna para perfil.html

### 3. **Geração do PIX**
- Ao clicar em "Prosseguir para Pagamento":
  - Envia requisição POST para `/api/deposit/create`
  - Backend gera PIX via Mercado Pago
  - Retorna: `paymentId`, `pixCopiaECola`, `qrCodeBase64`
  - Dados são salvos no `sessionStorage` como `pixPaymentData`
- **Redireciona para:** `saldo.html`

### 4. **Pagamento (saldo.html)**
- Exibe QR Code e código PIX Copia e Cola
- Conecta via Socket.IO para monitorar pagamento em tempo real
- Quando pagamento é aprovado:
  - Mostra notificação de sucesso
  - Atualiza saldo no Firebase
  - Permite retornar ao perfil

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

#### `checkout.html`
Página de checkout com design moderno e responsivo.

**Características:**
- Header com botão de voltar
- Card de resumo do depósito
- Exibição de informações do usuário
- Valor em destaque
- Botões de ação (Prosseguir/Cancelar)

#### `checkout.css`
Estilos completos para a página de checkout.

**Características:**
- Design consistente com SLICED (verde neon #00ff88)
- Animações suaves
- Layout responsivo (mobile-first)
- Cards com efeitos hover
- Gradientes e glassmorphism

#### `checkout.js`
Lógica do checkout.

**Funções principais:**
- `initializeCheckout()`: Carrega dados do sessionStorage
- `updateUI()`: Atualiza interface com dados do usuário
- `handleCheckout()`: Processa o checkout e cria PIX
- `createPreference()`: Chama API para gerar PIX
- `formatCurrency()`: Formata valores em Real

### Arquivos Modificados

#### `perfil.js`
**Mudança:** Linha 157
```javascript
// ANTES
window.location.href = 'saldo.html';

// DEPOIS
window.location.href = 'checkout.html';
```

## 🔌 Integração com Backend

### Endpoint Utilizado
```
POST https://sliced-game-teste.onrender.com/api/deposit/create
```

### Request Body
```json
{
  "amount": 50.00,
  "userId": "abc123xyz",
  "email": "usuario@exemplo.com",
  "nomeCompleto": "João da Silva",
  "cpf": "12345678900",
  "telefone": "11999999999",
  "cep": "01234567",
  "rua": "Rua Exemplo",
  "numero": "123"
}
```

### Response
```json
{
  "success": true,
  "data": {
    "paymentId": "123456789",
    "pixCopiaECola": "00020126580014br.gov.bcb.pix...",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo..."
  }
}
```

## 💾 SessionStorage

### Dados Armazenados

1. **`depositAmount`** (string)
   - Valor do depósito selecionado
   - Exemplo: `"50.00"`

2. **`loggedInUser`** (JSON string)
   ```json
   {
     "uid": "abc123xyz",
     "email": "usuario@exemplo.com",
     "nome": "João da Silva",
     "nomeCompleto": "João da Silva",
     "cpf": "123.456.789-00",
     "telefone": "(11) 99999-9999",
     "cep": "01234-567",
     "rua": "Rua Exemplo",
     "numero": "123"
   }
   ```

3. **`pixPaymentData`** (JSON string) - Criado no checkout
   ```json
   {
     "paymentId": "123456789",
     "pixCopiaECola": "00020126580014br.gov.bcb.pix...",
     "qrCodeBase64": "data:image/png;base64,iVBORw0KGgo..."
   }
   ```

## 🎨 Design

### Paleta de Cores
```css
--primary-color: #00ff88      /* Verde neon principal */
--secondary-color: #00cc6a    /* Verde secundário */
--bg-dark: #0a0e1a           /* Fundo escuro */
--bg-card: #151b2e           /* Fundo dos cards */
--text-primary: #ffffff       /* Texto principal */
--text-secondary: #a0aec0     /* Texto secundário */
```

### Componentes Principais

1. **Summary Card**
   - Ícone de carteira
   - Informações do usuário
   - Efeito hover com elevação

2. **Amount Card**
   - Valor em destaque (3rem, bold)
   - Borda verde neon
   - Gradiente de fundo

3. **Botões**
   - Primário: Gradiente verde
   - Secundário: Transparente com borda
   - Efeitos hover e disabled

## 📱 Responsividade

### Breakpoints

- **Desktop**: > 768px
  - Layout padrão
  - Cards lado a lado

- **Tablet**: 481px - 768px
  - Cards empilhados
  - Fonte reduzida

- **Mobile**: ≤ 480px
  - Padding reduzido
  - Fonte ainda menor
  - Botões full-width

## 🔒 Validações

### No perfil.js (antes do checkout)
- ✅ Valor mínimo de depósito
- ✅ Dados obrigatórios preenchidos
- ✅ CPF com 14 caracteres (formatado)

### No checkout.js
- ✅ Presença de `depositAmount` no sessionStorage
- ✅ Presença de `loggedInUser` no sessionStorage
- ✅ Limpeza de CPF (remove formatação)

## 🚀 Como Testar

1. **Acesse** `perfil.html`
2. **Preencha** todos os dados obrigatórios
3. **Clique** em um botão de depósito
4. **Revise** as informações no checkout
5. **Clique** em "Prosseguir para Pagamento"
6. **Aguarde** a geração do QR Code em `saldo.html`
7. **Pague** via PIX (em ambiente de teste)
8. **Observe** a notificação de sucesso em tempo real

## 🔧 Troubleshooting

### Erro: "Dados do depósito ou usuário ausentes"
**Causa:** SessionStorage vazio
**Solução:** Volte ao perfil e preencha todos os dados

### Erro: "Erro ao processar checkout"
**Causa:** Falha na comunicação com API
**Solução:** 
- Verifique se o backend está rodando
- Verifique a URL da API no `checkout.js`
- Confira os logs do console

### Checkout não redireciona
**Causa:** Erro no JavaScript
**Solução:** Abra o console (F12) e verifique erros

## 📊 Comparação com Fluxo Anterior

### Antes
```
perfil.html → saldo.html (PIX)
```

### Agora
```
perfil.html → checkout.html → saldo.html (PIX)
```

### Vantagens
- ✅ Melhor UX com página de revisão
- ✅ Usuário pode revisar dados antes de pagar
- ✅ Opção de cancelar antes de gerar PIX
- ✅ Design mais profissional
- ✅ Separação de responsabilidades

## 🎯 Próximos Passos (Opcional)

1. **Adicionar histórico de transações** no checkout
2. **Implementar cupons de desconto**
3. **Adicionar métodos de pagamento alternativos**
4. **Criar página de confirmação pós-pagamento**
5. **Implementar analytics** para rastrear conversão

---

**Última atualização:** 2025-12-15  
**Versão:** 1.0  
**Autor:** Sistema de Checkout SLICED
