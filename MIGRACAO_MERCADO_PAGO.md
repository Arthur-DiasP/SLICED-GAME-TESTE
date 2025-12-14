# Migração de EFI Bank para Mercado Pago

## 📋 Resumo das Mudanças

Este documento descreve as alterações realizadas para substituir a integração com a API do EFI Bank pela API do Mercado Pago no projeto SLICED.

## 🔄 Arquivos Modificados

### 1. **server2.js**
- ✅ Removida completamente a integração com EFI Bank (SDK `sdk-node-apis-efi`)
- ✅ Implementada integração com Mercado Pago (SDK `mercadopago`)
- ✅ Atualizado endpoint `/api/deposit/create` para criar pagamentos PIX via Mercado Pago
- ✅ Atualizado webhook de `/api/webhook/efi` para `/api/webhook/mercadopago`

### 2. **package.json**
- ❌ Removida dependência: `sdk-node-apis-efi`
- ❌ Removida dependência: `node-fetch`
- ✅ Adicionada dependência: `mercadopago@^2.0.15`

### 3. **.env** (Arquivo de Variáveis de Ambiente)
- ❌ Removidas variáveis do EFI Bank:
  - `EFI_CLIENT_ID`
  - `EFI_CLIENT_SECRET`
  - `EFI_CERT_PATH`
  - `EFI_CERT_PASSWORD`
  - `EFI_PIX_KEY`
  
- ✅ Adicionada variável do Mercado Pago:
  - `MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8089215665209853-120909-01511fb41a354b6ed768b0ba178a02c0-1981576535`

## 🔑 Configuração do Arquivo .env

**IMPORTANTE:** Você precisa adicionar manualmente o token do Mercado Pago ao seu arquivo `.env`:

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-8089215665209853-120909-01511fb41a354b6ed768b0ba178a02c0-1981576535

# Configurações do Servidor
PORT=3000
USER_BASE_URL=https://seusite.com
```

> **Nota:** O arquivo `.env` está no `.gitignore` por segurança. Um arquivo `.env.example` foi criado como referência.

## 🚀 Como Usar

### 1. Instalar Dependências
```bash
npm install
```

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e adicione suas credenciais:
```bash
copy .env.example .env
```

### 3. Iniciar o Servidor
```bash
npm start
```

Ou para desenvolvimento com auto-reload:
```bash
npm run dev
```

## 📡 Endpoints da API

### **POST** `/api/deposit/create`
Cria um pagamento PIX via Mercado Pago.

**Body:**
```json
{
  "amount": 100.00,
  "userId": "user123",
  "email": "usuario@email.com",
  "firstName": "João",
  "lastName": "Silva",
  "payerCpf": "12345678900"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "data": {
    "paymentId": "123456789",
    "status": "pending",
    "qrCodeBase64": "data:image/png;base64,iVBORw0KG...",
    "pixCopiaECola": "00020126580014br.gov.bcb.pix..."
  }
}
```

### **POST** `/api/webhook/mercadopago`
Recebe notificações de pagamento do Mercado Pago.

### **POST** `/api/withdraw/request`
Solicita um saque (funcionalidade mantida, mas requer implementação adicional).

### **GET** `/api/user/:uid/balance`
Retorna o saldo do usuário (mockado, requer integração com banco de dados).

## 🔔 Configuração de Webhooks

Para receber notificações de pagamento em tempo real, configure o webhook no painel do Mercado Pago:

1. Acesse: https://www.mercadopago.com.br/developers/panel/app
2. Vá em "Webhooks"
3. Adicione a URL: `https://seudominio.com/api/webhook/mercadopago`
4. Selecione o evento: "Payments"

## ⚠️ Diferenças Importantes

### EFI Bank vs Mercado Pago

| Recurso | EFI Bank | Mercado Pago |
|---------|----------|--------------|
| **Autenticação** | Client ID + Secret + Certificado .p12 | Access Token |
| **QR Code** | Geração separada via `pixGenerateQRCode()` | Incluído na resposta do pagamento |
| **Webhook** | Token de notificação | ID do pagamento direto |
| **Transferências PIX** | API `pixSend` | Limitado (requer Money Out API) |

## 📝 Próximos Passos

1. ✅ Testar criação de pagamentos PIX
2. ⏳ Implementar lógica de webhook para atualizar saldo do usuário
3. ⏳ Integrar com banco de dados para persistir transações
4. ⏳ Implementar funcionalidade de saque (Money Out API ou manual)
5. ⏳ Adicionar logs e monitoramento de transações

## 🐛 Troubleshooting

### Erro: "Token de acesso do Mercado Pago não encontrado"
- Verifique se o arquivo `.env` existe na raiz do projeto
- Confirme que a variável `MERCADO_PAGO_ACCESS_TOKEN` está definida corretamente

### Erro: "QR Code ou Copia e Cola não disponíveis"
- Verifique se o token de acesso está correto
- Confirme que a conta do Mercado Pago tem PIX habilitado
- Verifique se todos os dados do pagador estão corretos

## 📚 Documentação Oficial

- [Mercado Pago - Node.js SDK](https://github.com/mercadopago/sdk-nodejs)
- [Mercado Pago - API Reference](https://www.mercadopago.com.br/developers/pt/reference)
- [Mercado Pago - PIX Integration](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix)

---

**Data da Migração:** 13/12/2025  
**Versão:** 1.0.0
