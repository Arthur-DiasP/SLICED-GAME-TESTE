# 📜 Atualização das Regras do Jogo da Velha

## ✅ Mudança Implementada

O modal de **"Regras do Jogo"** no jogo da velha agora inclui informações detalhadas sobre a divisão do prêmio e o sistema de apostas.

## 📋 Novas Regras Adicionadas

### Regra 4: Entrada
> **"Cada jogador paga metade do valor da sala para entrar."**

- Explica que a entrada é dividida igualmente entre os dois jogadores
- Exemplo: Sala de R$ 10,00 = R$ 5,00 por jogador

### Regra 5: Prêmio
> **"O vencedor recebe 80% do valor total da sala. A plataforma fica com 20% como taxa de serviço."**

- **80%** para o vencedor (destacado em verde)
- **20%** para a plataforma (destacado em amarelo)
- Deixa claro que é uma taxa de serviço

### Regra 6: Desconexão (W.O.) ✨ NOVO
> **"Se um jogador sair da partida, o jogador que permaneceu recebe vitória automática por W.O. (Walk Over)."**

- O jogador que **permaneceu** recebe:
  - ✅ Notificação de **VITÓRIA POR W.O.**
  - ✅ **80% do valor total da sala** como prêmio
  - ✅ Crédito automático no saldo

- O jogador que **saiu** da partida:
  - ❌ **Perde o dinheiro de entrada** (não há devolução)
  - ❌ É marcado como perdedor
  - ❌ A partida é encerrada imediatamente

**Detecção de Desconexão:**
- Sistema detecta automaticamente quando um jogador:
  - Fecha o navegador/aba durante a partida
  - Perde conexão com a internet
  - Não atualiza presença por mais de 8 segundos
  - Sai da página do jogo


### 💡 Exemplo Prático (Box Destacado)

Um box visual com fundo verde claro mostra um exemplo concreto:

```
Exemplo: Sala de R$ 10,00
• Entrada: R$ 5,00 por jogador
• Prêmio do vencedor: R$ 8,00 (80%)
• Taxa da plataforma: R$ 2,00 (20%)
```

## 🎨 Estilo Visual

### Cores Utilizadas:
- **Verde (#4ade80)**: Porcentagem do vencedor (80%)
- **Amarelo (#fbbf24)**: Porcentagem da plataforma (20%)
- **Box de exemplo**: Fundo verde translúcido com borda esquerda verde

### Formatação:
- Texto em negrito para destacar informações importantes
- Espaçamento adequado entre as regras
- Box de exemplo com padding e border-radius

## 📊 Estrutura Completa das Regras

1. **Objetivo**: Alinhar 3 símbolos iguais
2. **Partida**: Melhor de 3 rodadas
3. **Morte Súbita**: Em caso de empate total, clique no 'P' na chuva de letras
4. **Entrada**: Cada jogador paga metade do valor da sala para entrar ✨ NOVO
5. **Prêmio**: O vencedor recebe 80% do valor total da sala. A plataforma fica com 20% como taxa de serviço ✨ NOVO
   - **Exemplo visual com cálculos** ✨ NOVO
6. **Desconexão**: Se um jogador sair da partida, o jogador que permaneceu recebe vitória automática (W.O.) e ganha 80% do prêmio. O jogador que saiu perde o dinheiro de entrada. ✨ NOVO

## 🎯 Benefícios da Atualização

1. **Transparência Total**: Jogadores sabem exatamente quanto vão pagar e quanto podem ganhar
2. **Clareza Financeira**: Divisão do prêmio explicada de forma simples
3. **Exemplo Prático**: Box com cálculo real facilita o entendimento
4. **Confiança**: Mostra que a plataforma é transparente sobre suas taxas

## 📱 Como Visualizar

1. Acesse o jogo: `jogo-da-velha.html`
2. Clique no ícone **"Regras"** na barra inferior
3. Veja as regras atualizadas com as novas informações sobre prêmios

## 💰 Tabela de Exemplos por Sala

| Valor da Sala | Entrada (50%) | Prêmio Vencedor (80%) | Taxa Plataforma (20%) |
|---------------|---------------|----------------------|----------------------|
| R$ 1,00       | R$ 0,50       | R$ 0,80              | R$ 0,20              |
| R$ 10,00      | R$ 5,00       | R$ 8,00              | R$ 2,00              |
| R$ 50,00      | R$ 25,00      | R$ 40,00             | R$ 10,00             |
| R$ 100,00     | R$ 50,00      | R$ 80,00             | R$ 20,00             |
| R$ 500,00     | R$ 250,00     | R$ 400,00            | R$ 100,00            |
| R$ 1.000,00   | R$ 500,00     | R$ 800,00            | R$ 200,00            |

## 🔍 Código HTML Adicionado

```html
<p style="margin-top:10px;">
    <strong>4. Entrada:</strong> Cada jogador paga metade do valor da sala para entrar.
</p>

<p style="margin-top:10px;">
    <strong>5. Prêmio:</strong> O vencedor recebe 
    <span style="color: #4ade80; font-weight: 700;">80%</span> 
    do valor total da sala. A plataforma fica com 
    <span style="color: #fbbf24; font-weight: 700;">20%</span> 
    como taxa de serviço.
</p>

<div style="margin-top: 15px; padding: 12px; background: rgba(74, 222, 128, 0.1); 
            border-left: 3px solid #4ade80; border-radius: 6px;">
    <p style="font-size: 0.85rem; margin: 0;">
        <strong>Exemplo:</strong> Sala de R$ 10,00
    </p>
    <p style="font-size: 0.85rem; margin: 5px 0 0 0;">
        • Entrada: R$ 5,00 por jogador
    </p>
    <p style="font-size: 0.85rem; margin: 5px 0 0 0;">
        • Prêmio do vencedor: R$ 8,00 (80%)
    </p>
    <p style="font-size: 0.85rem; margin: 5px 0 0 0;">
        • Taxa da plataforma: R$ 2,00 (20%)
    </p>
</div>
```

## ✨ Resultado Final

Agora os jogadores têm acesso a informações completas e transparentes sobre:
- ✅ Quanto precisam pagar para entrar
- ✅ Quanto podem ganhar se vencerem
- ✅ Quanto a plataforma cobra como taxa
- ✅ Exemplo prático com valores reais

---

**Atualizado em**: 2025-12-16  
**Versão**: 2.0  
**Status**: ✅ Implementado  
**Arquivo**: `jogo-da-velha.html`
