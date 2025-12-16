# Sistema de Apostas - Jogo da Velha

## Visão Geral
O Jogo da Velha implementa um sistema de apostas onde os jogadores pagam uma taxa de entrada e competem por um prêmio, com a plataforma retendo uma taxa de 20%.

## Estrutura de Valores

### Exemplo: Sala de R$ 10,00

| Etapa | Valor | Descrição |
|-------|-------|-----------|
| **Entrada** | R$ 5,00 | Cada jogador paga metade do valor da sala ao entrar na partida |
| **Total Arrecadado** | R$ 10,00 | Soma das entradas dos 2 jogadores (R$ 5,00 × 2) |
| **Prêmio do Vencedor** | R$ 8,00 | 80% do total arrecadado |
| **Taxa da Plataforma** | R$ 2,00 | 20% do total arrecadado |

## Fluxo de Pagamento

### 1. Seleção da Sala
- Usuário escolhe uma sala (ex: R$ 10,00)
- Sistema verifica se o usuário tem saldo suficiente para a entrada (R$ 5,00)
- Se não tiver saldo, exibe mensagem de erro e impede a entrada

### 2. Entrada na Partida
**Quando acontece:** Assim que um oponente é encontrado e a partida é criada

**Modo Público:**
- O jogador com menor ID cria a partida
- Antes de criar, cobra R$ 5,00 de entrada dele mesmo
- O segundo jogador é cobrado automaticamente ao receber o convite

**Modo Privado:**
- O criador da sala é cobrado quando o amigo entra
- O jogador que entra é cobrado imediatamente ao aceitar

**Endpoint usado:** `POST /api/game/charge`
```json
{
  "userId": "user_id",
  "amount": 5.00,
  "gameType": "jogo-da-velha",
  "betValue": 10.00,
  "description": "Entrada no Jogo da Velha - Sala R$ 10.00"
}
```

### 3. Fim da Partida
**Quando acontece:** Quando há um vencedor (melhor de 3 rodadas ou morte súbita)

**Se o jogador vencer:**
- Sistema credita R$ 8,00 automaticamente
- Modal mostra: "Você dominou e ganhou R$ 8,00!"

**Se o jogador perder:**
- Nenhum crédito é feito
- Modal mostra: "Você perdeu tudo."

**Endpoint usado:** `POST /api/game/credit`
```json
{
  "userId": "winner_id",
  "amount": 8.00,
  "gameType": "jogo-da-velha",
  "betValue": 10.00,
  "description": "Vitória no Jogo da Velha - Sala R$ 10.00"
}
```

## Salas Disponíveis

| Sala | Entrada | Prêmio | Taxa Plataforma |
|------|---------|--------|-----------------|
| R$ 0,50 | R$ 0,25 | R$ 0,40 | R$ 0,10 |
| R$ 10,00 | R$ 5,00 | R$ 8,00 | R$ 2,00 |
| R$ 30,00 | R$ 15,00 | R$ 24,00 | R$ 6,00 |
| R$ 50,00 | R$ 25,00 | R$ 40,00 | R$ 10,00 |
| R$ 100,00 | R$ 50,00 | R$ 80,00 | R$ 20,00 |
| R$ 200,00 | R$ 100,00 | R$ 160,00 | R$ 40,00 |
| R$ 350,00 | R$ 175,00 | R$ 280,00 | R$ 70,00 |
| R$ 500,00 | R$ 250,00 | R$ 400,00 | R$ 100,00 |
| R$ 1.000,00 | R$ 500,00 | R$ 800,00 | R$ 200,00 |
| R$ 2.000,00 | R$ 1.000,00 | R$ 1.600,00 | R$ 400,00 |
| R$ 3.000,00 | R$ 1.500,00 | R$ 2.400,00 | R$ 600,00 |
| R$ 5.000,00 | R$ 2.500,00 | R$ 4.000,00 | R$ 1.000,00 |

## Fórmulas

```javascript
const PLATFORM_FEE = 0.20; // 20%

// Entrada por jogador
const entryFee = betValue / 2;

// Total arrecadado
const totalPool = betValue; // (entryFee × 2)

// Prêmio do vencedor
const winnerPrize = totalPool * (1 - PLATFORM_FEE); // 80% do total

// Taxa da plataforma
const platformFee = totalPool * PLATFORM_FEE; // 20% do total
```

## Segurança e Validações

### Verificações Implementadas
1. ✅ Verifica saldo antes de permitir entrada na sala
2. ✅ Cobra entrada ANTES de criar/entrar na partida
3. ✅ Se falhar ao cobrar, cancela a entrada e volta ao lobby
4. ✅ Credita prêmio automaticamente ao vencedor
5. ✅ Exibe mensagem de erro se falhar ao creditar

### Casos de Erro
- **Saldo insuficiente:** Usuário não pode entrar na sala
- **Falha ao cobrar entrada:** Partida é cancelada, usuário volta ao lobby
- **Falha ao creditar prêmio:** Vencedor é notificado para contatar suporte

## Integração com API

O sistema usa a mesma API de saldo implementada em `balance-widget.js`:

- **Verificar saldo:** `GET /api/user/{userId}/balance`
- **Cobrar entrada:** `POST /api/game/charge`
- **Creditar prêmio:** `POST /api/game/credit`

## Código Relevante

### Funções Principais
- `checkBalance(amount)` - Verifica se usuário tem saldo suficiente
- `chargeEntryFee(betValue)` - Cobra a entrada (metade do valor da sala)
- `creditWinnerPrize(betValue)` - Credita o prêmio ao vencedor (80% do total)
- `handleGameOver(winnerId)` - Processa fim de jogo e credita prêmio

### Constantes
```javascript
const BET_VALUES = [10, 30, 50, 100, 200, 350, 500, 1000, 2000, 3000, 5000];
const PLATFORM_FEE = 0.20; // Taxa da plataforma (20%)
```

## Exemplo Completo de Fluxo

### Cenário: Dois jogadores na sala de R$ 10,00

1. **João** escolhe sala de R$ 10,00
   - Sistema verifica: João tem R$ 20,00 de saldo ✅
   - João entra na fila de espera

2. **Maria** escolhe sala de R$ 10,00
   - Sistema verifica: Maria tem R$ 15,00 de saldo ✅
   - Sistema encontra João na fila

3. **Partida Criada**
   - João (menor ID) cria a partida
   - Sistema cobra R$ 5,00 de João → Saldo: R$ 15,00
   - Sistema cobra R$ 5,00 de Maria → Saldo: R$ 10,00
   - **Total arrecadado:** R$ 10,00

4. **Partida Acontece**
   - Melhor de 3 rodadas
   - João vence 2-1

5. **Fim da Partida**
   - Sistema credita R$ 8,00 para João → Saldo: R$ 23,00
   - Maria não recebe nada → Saldo: R$ 10,00
   - **Plataforma retém:** R$ 2,00

### Resultado Final
- **João:** Investiu R$ 5,00, ganhou R$ 8,00 → Lucro de R$ 3,00
- **Maria:** Investiu R$ 5,00, ganhou R$ 0,00 → Perda de R$ 5,00
- **Plataforma:** Arrecadou R$ 2,00 (20% de taxa)
