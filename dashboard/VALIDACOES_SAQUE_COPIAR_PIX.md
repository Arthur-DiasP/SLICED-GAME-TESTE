# Validações de Saque e Funcionalidade de Copiar PIX

## 🔐 Validações Implementadas no Sistema de Saque

### 1. Validação de Valor Mínimo
**Localização**: `usuário/perfil/perfil.js` (linha ~219)

```javascript
if (amount < 20) {
    alert('O valor mínimo para saque é R$ 20,00');
    return;
}
```

**Descrição**: Garante que o usuário só possa solicitar saques acima de R$ 20,00.

---

### 2. Validação de Saldo Suficiente
**Localização**: `usuário/perfil/perfil.js` (linha ~225)

```javascript
if (amount > saldoAtual) {
    alert(`Saldo insuficiente! Você tem R$ ${saldoAtual.toFixed(2)} disponível.`);
    return;
}
```

**Descrição**: Verifica se o usuário possui saldo suficiente antes de permitir a solicitação.

---

### 3. Validação de Chave PIX Cadastrada
**Localização**: `usuário/perfil/perfil.js` (linha ~237)

```javascript
if (!userDoc.exists || !userDoc.data().pixKey) {
    alert('Você precisa cadastrar uma chave PIX antes de solicitar um saque.');
    modalSaque.classList.remove('show');
    return;
}
```

**Descrição**: Impede solicitações de saque se o usuário não tiver uma chave PIX cadastrada.

---

## 📋 Estrutura da Chave PIX

### Formato de Armazenamento no Firebase
```javascript
{
    pixKey: {
        type: String,    // 'cpf', 'email', 'telefone', 'aleatoria'
        value: String    // Valor da chave PIX
    }
}
```

### Tipos de Chave Suportados

| Tipo | Formato | Exemplo |
|------|---------|---------|
| CPF | 000.000.000-00 | 123.456.789-00 |
| E-mail | usuario@dominio.com | joao@email.com |
| Telefone | (00) 00000-0000 | (11) 98765-4321 |
| Aleatória | UUID/Chave Bancária | a2e2049a-811a-4948-ba69-6e661432f029 |

---

## 🎯 Funcionalidade de Copiar Chave PIX

### 1. No Perfil do Usuário (Histórico de Saques)

**Localização**: `usuário/perfil/perfil.js` (linhas ~607-668)

#### Estrutura HTML
```html
<div class="withdraw-detail">
    <span class="withdraw-detail-label">Chave PIX</span>
    <div style="display: flex; align-items: center; gap: 8px;">
        <span class="withdraw-detail-value" id="pixKey_[ID]">chave@pix.com</span>
        <button 
            class="btn-copy-pix-key" 
            onclick="copyPixKey('pixKey_[ID]')"
            title="Copiar chave PIX"
        >
            <i class="material-icons">content_copy</i>
            <span>Copiar</span>
        </button>
    </div>
</div>
```

#### Função JavaScript
```javascript
window.copyPixKey = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent;
    
    // Copia para clipboard
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual
        const button = element.parentElement.querySelector('.btn-copy-pix-key');
        if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="material-icons">check</i><span>Copiado!</span>';
            button.style.background = 'rgba(74, 222, 128, 0.2)';
            button.style.borderColor = 'rgba(74, 222, 128, 0.3)';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.background = 'rgba(0, 255, 136, 0.2)';
                button.style.borderColor = 'rgba(0, 255, 136, 0.3)';
            }, 2000);
        }
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar chave PIX');
    });
};
```

---

### 2. No Dashboard Administrativo

**Localização**: `dashboard/dashboard-admin.js` (linhas ~427-452)

#### Estrutura na Tabela
```html
<td>
    <div style="display: flex; align-items: center; gap: 8px;">
        <span id="pixKey_[DOC_ID]" style="font-size: 0.85rem; font-family: monospace;">
            chave@pix.com
        </span>
        <button 
            class="btn-copy-pix" 
            onclick="copyPixKey('pixKey_[DOC_ID]')"
            title="Copiar chave PIX"
            style="padding: 6px 10px; background: rgba(0, 255, 136, 0.2); ..."
        >
            <i class="material-icons" style="font-size: 16px; color: #00ff88;">content_copy</i>
            <span style="font-size: 0.75rem; color: #00ff88; font-weight: 600;">Copiar</span>
        </button>
    </div>
</td>
```

#### Diferenças de Implementação

| Aspecto | Perfil do Usuário | Dashboard Admin |
|---------|-------------------|-----------------|
| ID do elemento | `pixKey_[RANDOM_ID]` | `pixKey_[DOC_ID]` |
| Classe do botão | `btn-copy-pix-key` | `btn-copy-pix` |
| Estilo da chave | Padrão | `font-family: monospace` |
| Localização | Histórico de Saques | Tabela de Solicitações |

---

## 🎨 Estados Visuais do Botão de Copiar

### Estado Normal
```css
background: rgba(0, 255, 136, 0.2);
border: 1px solid rgba(0, 255, 136, 0.3);
color: #00ff88;
```

### Estado Hover
```css
/* Transição suave de 0.3s */
transform: scale(1.05);
```

### Estado Copiado (2 segundos)
```css
background: rgba(74, 222, 128, 0.2);
border: 1px solid rgba(74, 222, 128, 0.3);
color: #4ade80;
```

---

## 🔄 Fluxo Completo de Solicitação de Saque

```
1. Usuário clica em "Solicitar Saque"
   ↓
2. Sistema verifica se há chave PIX cadastrada
   ↓
3. Se SIM: Mostra formulário com informações da chave
   Se NÃO: Mostra aviso para cadastrar chave PIX
   ↓
4. Usuário insere valor do saque
   ↓
5. Sistema valida:
   - Valor mínimo (R$ 20,00)
   - Saldo suficiente
   - Chave PIX existe
   ↓
6. Cria documento em Firebase:
   SLICED/{userId}/withdrawals/{withdrawalId}
   ↓
7. Exibe mensagem de sucesso
   ↓
8. Atualiza histórico de saques
   ↓
9. Admin visualiza no dashboard com chave PIX
   ↓
10. Admin copia chave PIX e processa pagamento
```

---

## 📱 Compatibilidade da Clipboard API

### Navegadores Suportados
- ✅ Chrome 63+
- ✅ Firefox 53+
- ✅ Safari 13.1+
- ✅ Edge 79+
- ✅ Opera 50+

### Requisitos
- **HTTPS**: A Clipboard API requer conexão segura (exceto localhost)
- **Permissões**: Usuário deve interagir com a página (clique)

### Fallback para Navegadores Antigos
```javascript
// Método alternativo (não implementado, mas recomendado)
function copyToClipboardFallback(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        return true;
    } catch (err) {
        console.error('Fallback: Erro ao copiar', err);
        return false;
    } finally {
        document.body.removeChild(textArea);
    }
}
```

---

## 🐛 Tratamento de Erros

### Erro ao Copiar
```javascript
.catch(err => {
    console.error('Erro ao copiar:', err);
    alert('Erro ao copiar chave PIX');
});
```

**Possíveis Causas**:
- Navegador não suporta Clipboard API
- Conexão não é HTTPS
- Permissões negadas pelo navegador

### Elemento Não Encontrado
```javascript
const element = document.getElementById(elementId);
if (!element) return;
```

**Prevenção**: Sempre verifica se o elemento existe antes de tentar copiar.

---

## 📊 Dados Salvos na Solicitação de Saque

### Estrutura Completa
```javascript
{
    amount: Number,              // Valor solicitado
    pixKey: String,              // Valor da chave PIX
    pixKeyType: String,          // Tipo da chave (cpf, email, etc)
    status: 'pending',           // Status inicial
    createdAt: Timestamp,        // Data/hora da solicitação
    userId: String,              // ID do usuário
    userName: String             // Nome do usuário
}
```

### Status Possíveis
- `pending`: Aguardando aprovação
- `processing`: Em processamento
- `approved`: Aprovado e pago
- `rejected`: Rejeitado

---

## ✅ Checklist de Validação

### Antes de Solicitar Saque
- [ ] Usuário possui chave PIX cadastrada
- [ ] Valor é maior ou igual a R$ 20,00
- [ ] Saldo é suficiente para o valor solicitado

### Ao Processar no Dashboard
- [ ] Chave PIX está visível e correta
- [ ] Botão de copiar funciona
- [ ] Feedback visual é exibido
- [ ] Valor e data estão corretos

### Após Aprovação
- [ ] Status atualizado no Firebase
- [ ] Histórico do usuário reflete mudança
- [ ] Dashboard mostra status atualizado

---

## 🔧 Manutenção e Debug

### Logs Importantes
```javascript
console.log('✅ Saque solicitado:', withdrawalRef.id);
console.log('📥 PIX Gerado! ID:', paymentId);
console.error('Erro ao solicitar saque:', error);
```

### Verificação no Firebase Console
1. Acesse: `SLICED/{userId}/withdrawals`
2. Verifique campos: `pixKey`, `pixKeyType`, `amount`, `status`
3. Confirme timestamp em `createdAt`

### Teste da Funcionalidade de Copiar
1. Abra DevTools (F12)
2. Vá para Console
3. Execute: `copyPixKey('pixKey_teste')`
4. Verifique se há erros

---

**Última atualização**: 16/12/2025
**Versão**: 1.0
**Autor**: Antigravity AI
