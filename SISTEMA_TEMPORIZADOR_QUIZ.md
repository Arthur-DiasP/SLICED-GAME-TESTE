# Sistema de Temporizador e Redirecionamento Automático - Quiz SPFC

## 🎯 Objetivo
Implementar um sistema completo onde:
1. **Dashboard** cria partidas agendadas com horário específico
2. **Abertura** exibe countdown em tempo real até o horário da partida
3. **Redirecionamento automático** quando o horário chegar
4. **Quiz-Jogo** carrega a pergunta correta da partida

## 📋 Alterações Realizadas

### 1. **quiz-abertura.js** - Sistema de Temporizador

#### Funcionalidades Adicionadas:

**a) Cálculo de Tempo Restante**
```javascript
function getTimeRemaining(horario) {
    // Calcula quanto tempo falta até o horário da partida
    // Retorna: { total, hours, minutes, seconds, isPast, isStarting }
}
```

**b) Formatação do Countdown**
```javascript
function formatTimeRemaining(timeObj) {
    // Formata o tempo para exibição:
    // - "HH:MM:SS" se falta mais de 1 hora
    // - "MM:SS" se falta menos de 1 hora
    // - "COMEÇANDO AGORA! Xs" nos últimos 5 segundos
    // - "Partida encerrada" se já passou
}
```

**c) Atualização em Tempo Real**
- Cada partida tem seu próprio intervalo de atualização (1 segundo)
- O countdown é atualizado dinamicamente
- Quando faltam 0 segundos, redireciona automaticamente

**d) Redirecionamento Automático**
```javascript
if (timeRemaining.isStarting && timeRemaining.seconds <= 0) {
    window.location.href = `quiz-jogo.html?matchId=${matchId}`;
}
```

#### Estrutura do Card de Partida:
```html
<div class="match-card" id="match-{id}">
    <div class="match-time">⏰ 22:15</div>
    <div class="countdown" id="countdown-{id}">
        05:30  <!-- Atualiza a cada segundo -->
    </div>
    <div class="match-prize">🏆 Camisa Autografada</div>
    <div class="match-question">❓ Qual ano o SPFC foi fundado?</div>
</div>
```

### 2. **abertura.html** - Estilos do Countdown

#### CSS Adicionado:

```css
.countdown {
    font-size: 1.8rem;
    font-weight: 700;
    color: #4facfe;
    margin: 10px 0;
    padding: 10px;
    background: rgba(79, 172, 254, 0.1);
    border-radius: 8px;
    text-align: center;
    font-family: 'Courier New', monospace;
}

@keyframes pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.05);
        opacity: 0.8;
    }
}
```

**Efeito Visual:**
- Countdown em fonte monoespaçada (estilo digital)
- Cor azul (#4facfe) para indicar tempo restante
- Cor verde pulsante quando está começando
- Cor vermelha quando já passou

### 3. **quiz-jogo.html** - Carregamento da Pergunta

#### Fluxo de Funcionamento:

1. **Recebe o matchId via URL**
   ```javascript
   const matchId = urlParams.get('matchId');
   // Exemplo: quiz-jogo.html?matchId=abc123
   ```

2. **Busca a partida no Firebase**
   ```javascript
   const docRef = doc(db, "SPFC", "data", "quiz", matchId);
   const docSnap = await getDoc(docRef);
   ```

3. **Extrai os dados da pergunta**
   ```javascript
   const matchData = docSnap.data();
   // matchData.questionData contém a pergunta completa
   // matchData.prize contém o prêmio
   ```

4. **Renderiza a interface do quiz**
   - Exibe o prêmio em destaque
   - Mostra a pergunta
   - Cria botões para as 4 opções (A, B, C, D)
   - Implementa feedback visual (verde/vermelho)

## 🔄 Fluxo Completo do Sistema

```
1. DASHBOARD (dashboard-quiz.html)
   ↓
   Admin cria pergunta e agenda partida para "22:15"
   ↓
   Salva no Firebase: SPFC/data/quiz/{id}
   {
     type: 'match',
     horario: '22:15',
     prize: 'Camisa Autografada',
     questionData: { ... }
   }

2. ABERTURA (abertura.html + quiz-abertura.js)
   ↓
   Carrega partidas em tempo real
   ↓
   Exibe cards com countdown
   ↓
   Atualiza a cada 1 segundo
   ↓
   Quando chega em 00:00 → REDIRECIONA

3. QUIZ-JOGO (quiz-jogo.html)
   ↓
   Recebe matchId via URL
   ↓
   Busca dados no Firebase
   ↓
   Exibe pergunta e opções
   ↓
   Usuário responde
   ↓
   Feedback visual (✅ ou ❌)
```

## ⏱️ Lógica do Temporizador

### Exemplo Prático:

**Horário Atual:** 21:50:00  
**Horário da Partida:** 22:15:00  
**Tempo Restante:** 25:00 (25 minutos)

**Display do Countdown:**
- 21:50:00 → "25:00"
- 21:55:00 → "20:00"
- 22:10:00 → "05:00"
- 22:14:55 → "00:05"
- 22:14:56 → "00:04"
- 22:14:57 → "00:03"
- 22:14:58 → "00:02"
- 22:14:59 → "00:01"
- 22:15:00 → "COMEÇANDO AGORA! 0s" + REDIRECIONA

### Estados do Countdown:

1. **Mais de 1 hora:** `01:30:45`
2. **Menos de 1 hora:** `30:45`
3. **Últimos 5 segundos:** `COMEÇANDO AGORA! 3s` (verde pulsante)
4. **Já passou:** `Partida encerrada` (vermelho)

## 🎨 Experiência do Usuário

### Na Tela de Abertura:
1. Usuário vê todas as partidas agendadas
2. Cada partida mostra:
   - ⏰ Horário fixo (ex: 22:15)
   - ⏳ Countdown dinâmico (ex: 05:30)
   - 🏆 Prêmio
   - ❓ Pergunta (preview)
3. Countdown atualiza a cada segundo
4. Quando falta 5 segundos, fica verde e pulsa
5. Quando chega a hora, redireciona automaticamente

### Na Tela do Quiz:
1. Carregamento rápido da pergunta
2. Exibição clara do prêmio
3. 4 opções de resposta
4. Feedback imediato ao clicar:
   - ✅ Verde se acertou
   - ❌ Vermelho se errou + mostra a correta

## 🐛 Logs de Depuração

### quiz-abertura.js:
```
🔄 Iniciando sincronia com o Quiz...
📡 Recebidos 3 registros do banco.
📋 Partidas processadas: [...]
🔍 Processando partida: { id, horario, prize, questionData }
```

### quiz-jogo.html:
```
🎮 Quiz-Jogo iniciado com matchId: abc123
📡 Buscando partida no Firebase...
✅ Partida encontrada: { ... }
🎯 Renderizando pergunta: { text, options, correct }
✅ Resposta correta! (ou ❌ Resposta errada!)
```

## 📁 Arquivos Modificados

1. ✅ `usuário/inicio/jogos/quiz/quiz-abertura.js` - Sistema de temporizador
2. ✅ `usuário/inicio/jogos/quiz/abertura.html` - Estilos do countdown
3. ✅ `usuário/inicio/jogos/quiz/quiz-jogo.html` - Carregamento da pergunta

## 🧪 Como Testar

### Teste Rápido (Partida em 2 minutos):

1. Abra `dashboard-quiz.html`
2. Crie uma pergunta qualquer
3. Agende uma partida para **DAQUI A 2 MINUTOS**
   - Exemplo: Se agora são 23:10, agende para 23:12
4. Abra `abertura.html`
5. Veja o countdown: "02:00", "01:59", "01:58"...
6. Aguarde chegar em "00:00"
7. Será redirecionado automaticamente para `quiz-jogo.html`
8. A pergunta aparecerá na tela

### Teste de Múltiplas Partidas:

1. Agende 3 partidas:
   - 23:15
   - 23:20
   - 23:25
2. Todas aparecerão na `abertura.html`
3. Cada uma com seu próprio countdown
4. A primeira que chegar em 00:00 redireciona

## ⚠️ Observações Importantes

1. **Horário do Sistema:** O countdown usa o horário do navegador do usuário
2. **Redirecionamento:** Acontece automaticamente, sem confirmação
3. **Limpeza de Intervalos:** Quando redireciona, os intervalos são limpos para evitar vazamento de memória
4. **Partidas Passadas:** Continuam aparecendo com "Partida encerrada" até serem removidas manualmente no dashboard

## 🚀 Próximas Melhorias Sugeridas

1. **Notificação Sonora:** Tocar um som quando faltar 10 segundos
2. **Vibração:** Vibrar o celular nos últimos 5 segundos
3. **Tela Cheia:** Entrar em fullscreen automaticamente ao redirecionar
4. **Ranking em Tempo Real:** Mostrar quem respondeu primeiro
5. **Limite de Participantes:** Fechar a partida quando atingir X jogadores
6. **Replay:** Permitir rever as perguntas após o término

## 📊 Estrutura de Dados no Firebase

```javascript
// Documento da Partida
{
  type: 'match',
  status: 'pending',
  horario: '22:15',  // String HH:mm
  questionId: 'abc123',
  questionData: {
    text: 'Qual ano o SPFC foi fundado?',
    options: {
      A: '1930',
      B: '1935',
      C: '1940',
      D: '1945'
    },
    correct: 'A',
    duration: 15
  },
  prize: 'Camisa Autografada',
  winnersCount: 1,
  createdAt: Timestamp
}
```

## ✨ Conclusão

O sistema está completo e funcional! Agora:
- ✅ Partidas são agendadas com horário
- ✅ Countdown em tempo real na abertura
- ✅ Redirecionamento automático quando chega a hora
- ✅ Quiz carrega a pergunta correta
- ✅ Feedback visual para respostas

**Tudo pronto para uso!** 🎉
