# 🔧 Diagnóstico: Problemas na Geração de QR Code

## 📋 Resumo Executivo

O sistema de geração de QR Code para pagamento PIX não estava funcionando devido a **3 problemas críticos** que foram identificados e corrigidos.

---

## ❌ Problemas Identificados

### **1. Porta Incorreta da API** 
**Arquivo:** `usuário/perfil/perfil.html` (Linha 1298)

**Problema:**
```javascript
const API_BASE = 'http://localhost:3001/api'; // ❌ ERRADO
```

**Causa:**
- O servidor `server2.js` está rodando na porta **3000**
- O frontend estava tentando se conectar na porta **3001**
- Resultado: Erro de conexão (ERR_CONNECTION_REFUSED)

**Solução Aplicada:**
```javascript
const API_BASE = 'http://localhost:3000/api'; // ✅ CORRETO
```

---

### **2. Campo CPF Obrigatório Faltando**
**Arquivo:** `usuário/perfil/perfil.html` (Linhas 1394-1400)

**Problema:**
```javascript
body: JSON.stringify({
    userId: currentUser.uid,
    amount: amount,
    email: currentUser.email,
    firstName: currentUser.nomeCompleto.split(' ')[0],
    lastName: currentUser.nomeCompleto.split(' ').slice(1).join(' ') || 'SLICED'
    // ❌ FALTANDO: payerCpf
})
```

**Causa:**
- A API da Efí Bank **exige** o campo `cpf` no objeto `devedor` (Linha 127 do server2.js)
- O frontend não estava enviando esse campo
- Resultado: API retorna erro 400 (Bad Request)

**Solução Aplicada:**
```javascript
body: JSON.stringify({
    userId: currentUser.uid,
    amount: amount,
    email: currentUser.email,
    firstName: currentUser.nomeCompleto.split(' ')[0],
    lastName: currentUser.nomeCompleto.split(' ').slice(1).join(' ') || 'SLICED',
    payerCpf: currentUser.cpf ? currentUser.cpf.replace(/\D/g, '') : '00000000000' // ✅ ADICIONADO
})
```

**Nota:** O CPF é limpo de caracteres especiais (pontos e traços) antes de ser enviado.

---

### **3. QR Code Base64 Não Gerado**
**Arquivo:** `server2.js` (Linhas 142-160)

**Problema:**
```javascript
res.status(200).json({
    success: true,
    data: {
        paymentId: pixResponse.loc.id,
        txid: pixResponse.txid,
        qrCode: pixData.pixCopiaECola,
        qrCodeBase64: 'Consulte o endpoint pixGenerateQRCode...', // ❌ String fixa
        pixCopiaECola: pixData.pixCopiaECola
    }
});
```

**Causa:**
- O método `pixCreateImmediateCharge` da Efí **não retorna** o QR Code em Base64
- É necessário chamar o método `pixGenerateQRCode` separadamente
- O frontend esperava `qrCodeBase64` para exibir a imagem
- Resultado: QR Code não aparece na tela

**Solução Aplicada:**
```javascript
// Gerar QR Code em Base64
let qrCodeBase64 = null;
try {
    const qrCodeResponse = await efipay.pixGenerateQRCode({ id: pixResponse.loc.id });
    qrCodeBase64 = qrCodeResponse.imagemQrcode; // ✅ Base64 do QR Code
    console.log('✅ QR Code Base64 gerado com sucesso!');
} catch (qrError) {
    console.error('⚠️ Erro ao gerar QR Code Base64:', qrError.message);
}

res.status(200).json({
    success: true,
    data: {
        paymentId: pixResponse.loc.id,
        txid: pixResponse.txid,
        qrCodeBase64: qrCodeBase64, // ✅ Base64 real
        qrCode: pixResponse.pixCopiaECola,
        pixCopiaECola: pixResponse.pixCopiaECola
    }
});
```

---

## ✅ Verificações Necessárias

Antes de testar, certifique-se de que:

### 1. **Variáveis de Ambiente (.env)**
```env
EFI_CLIENT_ID=Client_Id_...
EFI_CLIENT_SECRET=Client_Secret_...
EFI_CERT_PATH=./certificado-producao.p12
EFI_PIX_KEY=e1391fb4-1e5c-4b02-a897-98e716e40e68
```

### 2. **Certificado da Efí**
- O arquivo `certificado-producao.p12` deve estar no diretório raiz do projeto
- O certificado deve ser válido e estar em **modo produção** (sandbox: false)

### 3. **Usuário com CPF Cadastrado**
- O usuário deve ter o campo `cpf` preenchido no Firestore
- Se não tiver, o sistema usa um CPF padrão: `00000000000`

### 4. **Servidor Rodando**
```bash
node server2.js
```
Deve exibir:
```
✅ SDK da Efí configurado com sucesso.
🚀 SERVER 2 RODANDO NA PORTA 3000
🔑 Certificado Efí Carregado: SIM ✅
```

---

## 🧪 Como Testar

1. **Inicie o servidor:**
   ```bash
   node server2.js
   ```

2. **Acesse o perfil:**
   ```
   http://localhost:3000/usuário/perfil/perfil.html
   ```

3. **Faça login** com um usuário que tenha CPF cadastrado

4. **Clique em "Fazer Depósito"**

5. **Selecione um valor** (R$ 10, R$ 50, R$ 100, ou R$ 500)

6. **Aguarde a geração do QR Code**

7. **Verifique:**
   - ✅ QR Code aparece visualmente
   - ✅ Código PIX Copia e Cola está disponível
   - ✅ Botão "Copiar Código PIX" funciona

---

## 🔍 Logs de Depuração

### **Console do Navegador (Frontend):**
```
✅ QR Code gerado com sucesso!
```

### **Console do Servidor (Backend):**
```
🔵 [Server 2] RECEBIDO PEDIDO DE PIX (Efí)
👤 Usuário: João Silva (ID: abc123)
📧 Email: joao@example.com
💰 Valor: R$ 50
✅ PIX Efí Criado com Sucesso! TXID: SLICEDabc1231702345678
✅ QR Code Base64 gerado com sucesso!
```

---

## 🚨 Possíveis Erros Restantes

### **Erro: "CPF inválido"**
- **Causa:** CPF não está no formato correto (11 dígitos numéricos)
- **Solução:** Verifique se o CPF do usuário está cadastrado corretamente no Firestore

### **Erro: "Certificado não encontrado"**
- **Causa:** Arquivo `.p12` não está no caminho especificado
- **Solução:** Verifique o caminho em `EFI_CERT_PATH` no arquivo `.env`

### **Erro: "Chave PIX inválida"**
- **Causa:** A chave PIX configurada não pertence à conta Efí
- **Solução:** Verifique `EFI_PIX_KEY` no arquivo `.env`

### **Erro: "Sandbox mode"**
- **Causa:** SDK está em modo de homologação
- **Solução:** Certifique-se de que `sandbox: false` na linha 31 do `server2.js`

---

## 📝 Notas Importantes

1. **Segurança:** Nunca exponha suas credenciais da Efí em repositórios públicos
2. **HTTPS:** Em produção, o webhook da Efí **exige** HTTPS
3. **Webhook:** Configure o webhook no painel da Efí para receber confirmações de pagamento
4. **Timeout:** A cobrança PIX expira em 3600 segundos (1 hora)

---

## 🎯 Próximos Passos

1. ✅ **Testar a geração de QR Code** com as correções aplicadas
2. ⏳ **Implementar o webhook** para confirmar pagamentos automaticamente
3. ⏳ **Atualizar o saldo do usuário** quando o pagamento for confirmado
4. ⏳ **Adicionar histórico de transações** no perfil do usuário
5. ⏳ **Implementar sistema de saques** (pixSend)

---

**Data da Correção:** 2025-12-11  
**Arquivos Modificados:**
- `usuário/perfil/perfil.html`
- `server2.js`
