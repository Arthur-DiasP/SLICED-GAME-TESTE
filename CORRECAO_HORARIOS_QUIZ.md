# Correção do Sistema de Exibição de Horários das Partidas

## Problema Identificado
O arquivo `abertura.html` não conseguia mostrar os horários agendados das partidas criadas pelo `dashboard-quiz.html`.

## Alterações Realizadas

### 1. **quiz-abertura.js** - Correção do Caminho do Firebase
**Problema:** O caminho de importação do `firebase-config.js` estava incorreto.

**Antes:**
```javascript
import { db } from './controle-dados/firebase-config.js';
```

**Depois:**
```javascript
import { db } from '../../../../controle-dados/firebase-config.js';
```

**Motivo:** O arquivo `quiz-abertura.js` está localizado em `usuário/inicio/jogos/quiz/`, então precisa subir 4 níveis para acessar a pasta `controle-dados/` na raiz do projeto.

### 2. **abertura.html** - Correção do Caminho do Script
**Problema:** O caminho do script estava usando um caminho absoluto que pode não funcionar em todos os servidores.

**Antes:**
```html
<script type="module" src="/usuário/inicio/jogos/quiz/quiz-abertura.js"></script>
```

**Depois:**
```html
<script type="module" src="./quiz-abertura.js"></script>
```

**Motivo:** Usar caminho relativo garante que o arquivo seja encontrado independentemente da configuração do servidor.

### 3. **quiz-abertura.js** - Adição de Verificações de Segurança
**Adicionado:** Verificações para garantir que os campos existem antes de exibi-los.

```javascript
const horario = match.horario || 'Horário não definido';
const prize = match.prize || 'Prêmio não definido';
const questionText = match.questionData ? match.questionData.text : "Pergunta oculta / Aguardando...";
```

**Motivo:** Evita erros caso algum campo esteja vazio ou indefinido.

### 4. **quiz-abertura.js** - Logs de Depuração
**Adicionado:** Logs detalhados para facilitar a identificação de problemas.

```javascript
console.log("🔍 Processando partida:", {
    id: match.id,
    horario: match.horario,
    prize: match.prize,
    questionData: match.questionData
});
```

**Motivo:** Permite verificar no console do navegador se os dados estão sendo recebidos corretamente do Firebase.

## Como Funciona Agora

1. **Dashboard cria a partida:** O administrador acessa `dashboard-quiz.html` e agenda uma partida com horário (ex: "22:15"), prêmio e pergunta.

2. **Dados salvos no Firebase:** A partida é salva no Firestore em `SPFC/data/quiz` com:
   - `type: 'match'`
   - `horario: "HH:mm"` (string)
   - `prize: "Nome do prêmio"`
   - `questionData: { ... }` (dados da pergunta)

3. **Abertura sincroniza em tempo real:** O arquivo `abertura.html` carrega `quiz-abertura.js` que:
   - Conecta ao Firebase
   - Busca todas as partidas com `type === 'match'`
   - Ordena por horário
   - Exibe os cards com horário, prêmio e pergunta

4. **Usuários veem as partidas:** Os cards são exibidos na tela mostrando:
   - ⏰ Horário da partida
   - 🏆 Prêmio
   - ❓ Pergunta do quiz

## Como Testar

1. Abra o `dashboard-quiz.html` e crie uma nova pergunta
2. Agende uma partida com horário, prêmio e a pergunta criada
3. Abra o `abertura.html` em outra aba
4. Verifique se a partida aparece com o horário correto
5. Abra o Console do navegador (F12) para ver os logs de depuração

## Verificação de Problemas

Se os horários ainda não aparecerem, verifique no Console do navegador:

1. **Erro de importação do Firebase:** Verifique se aparece erro relacionado ao `firebase-config.js`
2. **Dados recebidos:** Procure por `"📡 Recebidos X registros do banco"`
3. **Dados processados:** Procure por `"📋 Partidas processadas:"` e verifique se o campo `horario` está presente
4. **Erro de conexão:** Procure por `"❌ Erro na sincronia:"`

## Estrutura de Dados no Firebase

```javascript
{
  type: 'match',
  status: 'pending',
  horario: '22:15',  // String no formato HH:mm
  questionId: 'abc123',
  questionData: {
    text: 'Qual ano o SPFC foi fundado?',
    options: { A: '1930', B: '1935', C: '1940', D: '1945' },
    correct: 'A',
    duration: 15
  },
  prize: 'Camisa Autografada',
  winnersCount: 1,
  createdAt: Timestamp
}
```

## Arquivos Modificados

1. `usuário/inicio/jogos/quiz/quiz-abertura.js` - Corrigido caminho do Firebase e adicionadas verificações
2. `usuário/inicio/jogos/quiz/abertura.html` - Corrigido caminho do script

## Arquivos Não Modificados (Já Estavam Corretos)

1. `dashboard/dashboard-quiz.html` - Já estava salvando o horário corretamente
2. `controle-dados/firebase-config.js` - Configuração do Firebase
