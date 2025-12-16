# Ocultação do Widget de Saldo Durante a Partida

## ✅ Funcionalidade Implementada

### Objetivo
Ocultar o widget de saldo quando a partida do jogo da velha começar, para dar mais foco ao jogo e melhorar a experiência visual.

## 🎯 Comportamento

### **Antes da Partida** (Lobby):
```
┌──────────────────────────────────────────────────┐
│  ⚔️ Jogo da Velha ULTIMATE  │  💰 SALDO          │
│  Aposte valores, vença...   │  R$ 20,00    →     │
└──────────────────────────────────────────────────┘
                ↓ Visível
┌──────────┐ ┌──────────┐ ┌──────────┐
│ R$ 1,00  │ │ R$ 10,00 │ │ R$ 30,00 │
└──────────┘ └──────────┘ └──────────┘
```

### **Durante a Partida**:
```
┌──────────────────────────────────────────────────┐
│  ⚔️ Jogo da Velha ULTIMATE  │                    │
│  Aposte valores, vença...   │  (Widget oculto)   │
└──────────────────────────────────────────────────┘
                ↓ Oculto
┌─────────────────────────────┐
│  Placar: X: 1  |  O: 0      │
│                             │
│  ┌───┬───┬───┐              │
│  │ X │   │   │              │
│  ├───┼───┼───┤              │
│  │   │ O │   │              │
│  ├───┼───┼───┤              │
│  │   │   │   │              │
│  └───┴───┴───┘              │
└─────────────────────────────┘
```

### **Após a Partida** (Volta ao Menu):
```
┌──────────────────────────────────────────────────┐
│  ⚔️ Jogo da Velha ULTIMATE  │  💰 SALDO          │
│  Aposte valores, vença...   │  R$ 23,00    →     │
└──────────────────────────────────────────────────┘
                ↓ Visível novamente (saldo atualizado!)
┌──────────┐ ┌──────────┐ ┌──────────┐
│ R$ 1,00  │ │ R$ 10,00 │ │ R$ 30,00 │
└──────────┘ └──────────┘ └──────────┘
```

## 🔧 Implementação

### Código JavaScript

```javascript
function setupGame(matchId, symbol) {
    gameState.playerSymbol = symbol;
    gameState.gameActive = true;

    // Oculta o widget de saldo durante a partida
    const balanceWidget = document.getElementById('balance-widget');
    if (balanceWidget) {
        balanceWidget.style.display = 'none';
    }

    // Muda para tela do Jogo
    switchView('gameView');
    createBoardUI();

    // ... resto do código
}
```

### Restauração Automática

```javascript
async function backToMenu() {
    location.reload();  // Recarrega a página, widget volta a aparecer
}
```

## 📊 Fluxo Completo

### 1. **Lobby** → Widget Visível
- Usuário vê o saldo
- Escolhe uma sala
- Entra na fila

### 2. **Oponente Encontrado** → Widget Ainda Visível
- Tela de "Procurando Oponente..."
- Widget ainda aparece

### 3. **Partida Inicia** → Widget Oculto
- Função `setupGame()` é chamada
- Widget é ocultado (`display: none`)
- Tela muda para `gameView`

### 4. **Durante o Jogo** → Widget Oculto
- Jogador foca no tabuleiro
- Sem distrações
- Mais espaço visual

### 5. **Fim da Partida** → Modal de Resultado
- Widget ainda oculto
- Modal mostra resultado
- Botão "Voltar ao Menu"

### 6. **Volta ao Menu** → Widget Visível
- Página recarrega
- Widget aparece novamente
- Saldo atualizado (se ganhou)

## 💡 Benefícios

| Benefício | Descrição |
|-----------|-----------|
| 🎯 **Foco no Jogo** | Sem distrações durante a partida |
| 👁️ **Mais Espaço** | Header mais limpo durante o jogo |
| 🎮 **Melhor UX** | Jogador concentra no que importa |
| 💰 **Saldo Atualizado** | Ao voltar, vê o saldo atualizado |
| 🧹 **Interface Limpa** | Menos elementos na tela |

## 🎨 Comparação Visual

### Header Durante o Lobby:
```
┌────────────────────────────────────────────────┐
│  [Título + Descrição]    │    [Widget Saldo]  │
│  70% da largura          │    30% da largura  │
└────────────────────────────────────────────────┘
```

### Header Durante a Partida:
```
┌────────────────────────────────────────────────┐
│  [Título + Descrição]    │    [Espaço Vazio]  │
│  70% da largura          │    (widget oculto) │
└────────────────────────────────────────────────┘
```

## 🔄 Estados do Widget

| Estado | Tela | Display | Motivo |
|--------|------|---------|--------|
| **Visível** | Lobby | `block` | Usuário precisa ver saldo |
| **Visível** | Esperando | `block` | Ainda não começou |
| **Oculto** | Jogo | `none` | Foco no tabuleiro |
| **Oculto** | Morte Súbita | `none` | Foco na matrix |
| **Oculto** | Modal Resultado | `none` | Foco no resultado |
| **Visível** | Volta ao Menu | `block` | Mostra saldo atualizado |

## 📱 Responsividade

### Desktop:
- **Lobby**: Widget ao lado do título
- **Jogo**: Widget oculto, header mais limpo

### Mobile:
- **Lobby**: Widget abaixo do título
- **Jogo**: Widget oculto, mais espaço para tabuleiro

## ✨ Detalhes Técnicos

### Quando o Widget é Ocultado:
- ✅ Função `setupGame()` é chamada
- ✅ Partida está prestes a começar
- ✅ Tela muda para `gameView`

### Quando o Widget é Mostrado:
- ✅ Página é recarregada (`location.reload()`)
- ✅ Função `init()` é chamada novamente
- ✅ Widget é inicializado com saldo atualizado

### Verificação de Segurança:
```javascript
const balanceWidget = document.getElementById('balance-widget');
if (balanceWidget) {
    balanceWidget.style.display = 'none';
}
```
- Verifica se o elemento existe antes de ocultar
- Evita erros caso o widget não esteja carregado

## 🎯 Exemplo Prático

### Cenário: João joga uma partida

1. **Lobby** (10:00)
   - Widget mostra: R$ 20,00
   - João escolhe sala R$ 10,00

2. **Esperando** (10:01)
   - Widget ainda mostra: R$ 20,00
   - "Procurando Oponente..."

3. **Partida Inicia** (10:02)
   - Widget é **OCULTADO**
   - Entrada cobrada: -R$ 5,00
   - Tabuleiro aparece

4. **Durante o Jogo** (10:02 - 10:05)
   - Widget **OCULTO**
   - João foca no jogo
   - Sem distrações

5. **João Vence!** (10:05)
   - Widget ainda **OCULTO**
   - Modal: "Você ganhou R$ 8,00!"
   - Prêmio creditado: +R$ 8,00

6. **Volta ao Menu** (10:06)
   - Página recarrega
   - Widget **VISÍVEL** novamente
   - Mostra: R$ 23,00 (20 - 5 + 8)

## 🎉 Resumo

| Aspecto | Implementação |
|---------|---------------|
| **Quando Oculta** | Ao iniciar partida (`setupGame()`) |
| **Como Oculta** | `display: none` |
| **Quando Mostra** | Ao voltar ao menu (`location.reload()`) |
| **Como Mostra** | Inicialização normal do widget |
| **Benefício** | Mais foco no jogo |

**Resultado**: Interface mais limpa durante a partida, com foco total no jogo! 🎯🎮
