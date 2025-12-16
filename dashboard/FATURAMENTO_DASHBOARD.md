# Gerenciamento de Taxa da Plataforma e Chave PIX - Dashboard

## 📋 Resumo das Implementações

Este documento descreve as novas funcionalidades adicionadas ao dashboard administrativo da plataforma SLICED para gerenciar a taxa de 20% e visualizar chaves PIX nas solicitações de saque.

## ✨ Funcionalidades Implementadas

### 1. **Coluna de Chave PIX nas Solicitações de Saque**

#### Descrição
A tabela de solicitações de saque agora exibe a chave PIX cadastrada pelo usuário, permitindo que o administrador copie facilmente a chave para realizar o pagamento.

#### Recursos
- **Visualização da Chave PIX**: Cada solicitação de saque mostra a chave PIX do usuário em formato monospace para melhor legibilidade
- **Botão de Copiar**: Botão com ícone que permite copiar a chave PIX com um clique
- **Feedback Visual**: Ao copiar, o botão muda de cor e exibe "Copiado!" por 2 segundos

#### Localização
- **Arquivo HTML**: `dashboard/dashboard-inicio.html` (linha ~495)
- **Arquivo JS**: `dashboard/dashboard-admin.js` (função `loadWithdrawals` e `copyPixKey`)

#### Como Funciona
```javascript
// Cada linha da tabela inclui:
<td>
    <div style="display: flex; align-items: center; gap: 8px;">
        <span id="pixKey_[ID]">chave@pix.com</span>
        <button onclick="copyPixKey('pixKey_[ID]')">
            Copiar
        </button>
    </div>
</td>
```

---

### 2. **Gerenciamento da Taxa da Plataforma (20%)**

#### Descrição
Nova seção dedicada ao gerenciamento da taxa de 20% da plataforma, permitindo registrar retiradas e acompanhar o saldo disponível.

#### Recursos Principais

##### 2.1 Card de Taxa da Plataforma (Atualizado)
- **Valor Atual**: Mostra a taxa de 20% calculada sobre o faturamento total
- **Indicador de Retirada**: Badge vermelho pequeno que aparece quando há valores retirados
  - Cor: Vermelho (`#ef4444`)
  - Exibe: "↓ Retirado: R$ X,XX"
  - Visível apenas quando há retiradas registradas

##### 2.2 Seção de Gerenciamento
Localizada entre a tabela de usuários e a tabela de saques, contém:

**Três Indicadores:**
1. **Taxa Atual (20%)**: Valor total da taxa calculada (verde)
2. **Total Retirado**: Soma de todas as retiradas registradas (vermelho)
3. **Saldo Disponível**: Taxa atual - Total retirado (amarelo)

**Formulário de Retirada:**
- Campo numérico para inserir o valor a retirar
- Botão "Registrar Retirada"
- Validações automáticas:
  - Valor deve ser maior que zero
  - Não pode exceder o saldo disponível
  - Confirmação antes de registrar

#### Estrutura de Dados

##### Coleção Firebase: `SLICED/data/PlatformFeeWithdrawals`
```javascript
{
    amount: Number,        // Valor retirado
    createdAt: Date,       // Data da retirada
    createdBy: String      // Usuário que registrou (sempre 'admin')
}
```

#### Fluxo de Funcionamento

1. **Cálculo Automático**:
   - Sistema calcula 20% do faturamento total (soma dos saldos dos usuários)
   - Atualiza automaticamente ao carregar o dashboard

2. **Registro de Retirada**:
   ```
   Usuário insere valor → Validação → Confirmação → Salva no Firebase → Atualiza interface
   ```

3. **Atualização do Card**:
   - Se `totalRetirado > 0`: Mostra badge vermelho
   - Se `totalRetirado = 0`: Esconde badge vermelho

#### Localização dos Arquivos

**HTML** (`dashboard/dashboard-inicio.html`):
- Card atualizado: linhas ~433-440
- Seção de gerenciamento: linhas ~485-528

**JavaScript** (`dashboard/dashboard-admin.js`):
- `loadPlatformFeeWithdrawals()`: Carrega total retirado
- `updatePlatformFeeWithdrawals()`: Atualiza interface
- Event listener do formulário: linhas ~378-410

---

## 🎨 Design e UX

### Cores Utilizadas

| Elemento | Cor | Código |
|----------|-----|--------|
| Taxa Atual | Verde Neon | `#00ff88` |
| Total Retirado | Vermelho | `#ef4444` |
| Saldo Disponível | Amarelo | `#fbbf24` |
| Badge de Retirada | Vermelho (fundo) | `rgba(239, 68, 68, 0.1)` |
| Botão Copiar PIX | Verde (fundo) | `rgba(0, 255, 136, 0.2)` |
| Botão Copiado | Verde Claro | `#4ade80` |

### Animações e Feedback

1. **Copiar Chave PIX**:
   - Transição suave de 0.3s
   - Mudança de cor e texto por 2 segundos
   - Ícone muda de "content_copy" para "check"

2. **Badge de Retirada**:
   - Aparece/desaparece com `display: block/none`
   - Sem animação para manter performance

---

## 🔧 Manutenção e Extensões Futuras

### Possíveis Melhorias

1. **Histórico de Retiradas**:
   - Adicionar tabela mostrando todas as retiradas com data e valor
   - Permitir edição/remoção de retiradas

2. **Relatórios**:
   - Gráfico de evolução da taxa ao longo do tempo
   - Exportação de dados em CSV/PDF

3. **Notificações**:
   - Alerta quando saldo disponível estiver baixo
   - Notificação por email ao registrar retirada

4. **Permissões**:
   - Controle de acesso para diferentes níveis de admin
   - Log de quem registrou cada retirada

### Dependências

- Firebase Firestore 10.7.1
- Material Icons (Google Fonts)
- Navegador com suporte a Clipboard API

---

## 📝 Notas Técnicas

### Validações Implementadas

1. **Chave PIX**:
   - Verifica se existe antes de exibir
   - Mostra "N/A" se não houver chave cadastrada

2. **Retirada da Taxa**:
   - Valor deve ser numérico e positivo
   - Não pode exceder saldo disponível
   - Confirmação obrigatória antes de salvar

### Tratamento de Erros

- Try/catch em todas as operações assíncronas
- Mensagens de erro amigáveis para o usuário
- Logs detalhados no console para debug

### Performance

- Carregamento assíncrono de dados
- Atualização seletiva da interface
- Uso de IDs únicos para evitar conflitos

---

## 🚀 Como Usar

### Para Copiar Chave PIX:
1. Acesse a seção "Solicitações de Saque"
2. Localize a solicitação desejada
3. Clique no botão "Copiar" ao lado da chave PIX
4. A chave será copiada para a área de transferência

### Para Registrar Retirada da Taxa:
1. Acesse a seção "Gerenciar Taxa da Plataforma"
2. Verifique o saldo disponível
3. Digite o valor a retirar no campo
4. Clique em "Registrar Retirada"
5. Confirme a operação
6. O sistema atualizará automaticamente todos os valores

---

## 📊 Estrutura de Dados Completa

### Solicitações de Saque
```
SLICED/{userId}/withdrawals/{withdrawalId}
├── amount: Number
├── pixKey: String
├── pixKeyType: String
├── status: String
├── createdAt: Timestamp
├── userId: String
└── userName: String
```

### Retiradas da Taxa
```
SLICED/data/PlatformFeeWithdrawals/{withdrawalId}
├── amount: Number
├── createdAt: Date
└── createdBy: String
```

---

## ✅ Checklist de Implementação

- [x] Adicionar coluna de Chave PIX na tabela de saques
- [x] Implementar botão de copiar com feedback visual
- [x] Criar seção de gerenciamento da taxa
- [x] Adicionar indicador vermelho no card de taxa
- [x] Implementar validações de saldo
- [x] Criar estrutura no Firebase
- [x] Atualização automática dos valores
- [x] Documentação completa

---

**Última atualização**: 16/12/2025
**Versão**: 1.0
**Autor**: Antigravity AI
