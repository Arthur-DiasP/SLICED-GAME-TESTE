# Ajuste de Cores - Cards de Aposta

## ✅ Mudança Implementada

### Objetivo
Tornar a informação de entrada mais neutra, destacando o valor do prêmio (vermelho) como elemento principal.

## 🎨 Comparação Visual

### ANTES (Verde):
```
┌─────────────────┐
│   R$ 10,00      │ ← Vermelho (destaque)
│                 │
│ Entrada:        │
│  R$ 5,00        │ ← Verde (destaque também)
│                 │
│ ● 5 na fila     │
└─────────────────┘
```
**Problema**: Dois destaques competindo (vermelho vs verde)

### DEPOIS (Cinza Neutro):
```
┌─────────────────┐
│   R$ 10,00      │ ← Vermelho (DESTAQUE PRINCIPAL) ⭐
│                 │
│ Entrada:        │
│  R$ 5,00        │ ← Cinza (informação secundária)
│                 │
│ ● 5 na fila     │
└─────────────────┘
```
**Solução**: Destaque único no valor do prêmio!

## 🔧 Mudanças no CSS

### Antes:
```css
.entry-fee {
    font-size: 0.9rem;
    font-weight: 600;
    color: #4ade80;                        /* Verde */
    margin-bottom: 10px;
    padding: 5px 10px;
    background: rgba(74, 222, 128, 0.1);   /* Fundo verde */
    border-radius: 8px;
    border: 1px solid rgba(74, 222, 128, 0.2); /* Borda verde */
}
```

### Depois:
```css
.entry-fee {
    font-size: 0.9rem;
    font-weight: 600;
    color: #888;                           /* Cinza neutro */
    margin-bottom: 10px;
    padding: 5px 10px;
    background: rgba(255, 255, 255, 0.03); /* Fundo neutro */
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.08); /* Borda neutra */
}
```

## 🎯 Hierarquia Visual

### Ordem de Importância (do mais para o menos destacado):

1. **R$ 10,00** (Valor da Sala)
   - Cor: `#e60000` (Vermelho vibrante)
   - Tamanho: `1.8rem`
   - Peso: `800`
   - **DESTAQUE MÁXIMO** ⭐

2. **Entrada: R$ 5,00** (Informação Secundária)
   - Cor: `#888` (Cinza neutro)
   - Tamanho: `0.9rem`
   - Peso: `600`
   - **Informação de suporte**

3. **● 5 na fila** (Status)
   - Cor: `#888` ou `#fff` (se tem jogadores)
   - Tamanho: `0.9rem`
   - **Informação contextual**

## 🎨 Paleta de Cores do Card

| Elemento | Cor | Função |
|----------|-----|--------|
| **Valor da Sala** | `#e60000` (Vermelho) | **Destaque principal** |
| **Entrada** | `#888` (Cinza) | Informação secundária |
| **Fila vazia** | `#888` (Cinza) | Status neutro |
| **Fila ativa** | `#4ade80` (Verde) | Status positivo |
| **Fundo do card** | `rgba(255,255,255,0.03)` | Base neutra |
| **Borda do card** | `rgba(255,255,255,0.1)` | Separação sutil |

## 📊 Impacto Visual

### Antes (2 destaques):
- 🔴 Vermelho: Valor da sala
- 🟢 Verde: Entrada
- ⚪ Branco/Cinza: Fila

**Resultado**: Confusão visual - dois elementos competindo por atenção

### Depois (1 destaque):
- 🔴 **Vermelho: Valor da sala** ← ÚNICO DESTAQUE
- ⚪ Cinza: Entrada
- ⚪ Cinza/Verde: Fila

**Resultado**: Hierarquia clara - foco no que importa

## 💡 Benefícios da Mudança

| Benefício | Descrição |
|-----------|-----------|
| 🎯 **Foco Claro** | Olho vai direto para o valor do prêmio |
| 🎨 **Hierarquia Visual** | Informações organizadas por importância |
| 👁️ **Menos Poluição** | Cores usadas com propósito |
| ⚡ **Decisão Rápida** | Usuário identifica rapidamente os valores |
| 🎭 **Profissional** | Design mais limpo e sofisticado |

## 🧠 Psicologia das Cores

### Vermelho (#e60000):
- ✅ Chama atenção
- ✅ Urgência e ação
- ✅ Destaque principal
- **Uso**: Valor da sala (o que você pode ganhar)

### Cinza (#888):
- ✅ Neutro e discreto
- ✅ Informação de suporte
- ✅ Não compete por atenção
- **Uso**: Entrada (custo para jogar)

### Verde (#4ade80):
- ✅ Positivo e ativo
- ✅ Status favorável
- **Uso**: Apenas quando há jogadores na fila

## 📱 Exemplo Completo

```
┌──────────────────────────┐
│                          │
│      R$ 10,00            │ ← VERMELHO (destaque)
│                          │
│   Entrada: R$ 5,00       │ ← CINZA (neutro)
│                          │
│   ● 5 na fila            │ ← VERDE (ativo)
│                          │
└──────────────────────────┘
      ↓ (hover)
┌──────────────────────────┐
│  [Borda vermelha]        │
│                          │
│      R$ 10,00            │ ← VERMELHO (brilhante)
│                          │
│   Entrada: R$ 5,00       │ ← CINZA (mantém neutro)
│                          │
│   ● 5 na fila            │ ← VERDE (mantém)
│                          │
└──────────────────────────┘
```

## 🎯 Fluxo Visual do Usuário

1. **Primeiro olhar**: R$ 10,00 (vermelho) ← "Quanto posso ganhar?"
2. **Segundo olhar**: Entrada: R$ 5,00 (cinza) ← "Quanto vou pagar?"
3. **Terceiro olhar**: ● 5 na fila (verde/cinza) ← "Tem gente jogando?"

**Ordem perfeita de informação!** ✅

## 🎨 Consistência com o Design

O jogo usa principalmente:
- **Vermelho**: Tema principal, ação, destaque
- **Branco/Cinza**: Informações secundárias
- **Verde**: Status positivo (jogadores online, vitória)

Agora a entrada está alinhada com essa paleta! 🎨

## ✨ Resumo

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Cor da Entrada** | Verde (#4ade80) | Cinza (#888) |
| **Fundo** | Verde transparente | Branco transparente |
| **Borda** | Verde | Branca sutil |
| **Destaque** | Dividido (vermelho + verde) | Único (vermelho) |
| **Hierarquia** | Confusa | Clara |

**Resultado**: Design mais limpo, profissional e focado! 🎯
