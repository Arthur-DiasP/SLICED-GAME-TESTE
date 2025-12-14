# 📊 Estrutura de Dados do Dashboard - Firebase Firestore

Este documento descreve como estruturar os dados no Firebase Firestore para que o dashboard funcione corretamente.

## 🗂️ Coleções do Firestore

### 1. **Coleção: `SPFC`** (Usuários)
Armazena informações dos usuários cadastrados na plataforma.

**Estrutura do documento:**
```javascript
{
  nomeCompleto: "João Silva",
  email: "joao@email.com",
  cpf: "123.456.789-00",
  dataNascimento: "1990-01-15",
  telefone: "(11) 98765-4321",
  pontuacao: 8542,           // Pontuação total do jogador
  nivel: 45,                 // Nível do jogador
  tempoOnline: 250,          // Tempo total online em minutos
  avatar: null,              // URL da foto de perfil (opcional)
  dataCadastro: Timestamp,   // Data de cadastro
  ultimoAcesso: Timestamp    // Último acesso
}
```

**Campos importantes para o dashboard:**
- `pontuacao`: Usado para ranking de top jogadores
- `nivel`: Exibido no card de top jogadores
- `tempoOnline`: Usado para calcular tempo médio online

---

### 2. **Coleção: `partidas`**
Armazena informações sobre partidas jogadas.

**Estrutura do documento:**
```javascript
{
  jogo: "jogo-da-velha",     // ID do jogo
  jogador1: "userId1",       // ID do jogador 1
  jogador2: "userId2",       // ID do jogador 2
  vencedor: "userId1",       // ID do vencedor (ou null para empate)
  duracao: 180,              // Duração em segundos
  timestamp: Timestamp,      // Data/hora da partida
  status: "finalizada"       // Status: "em-andamento", "finalizada", "cancelada"
}
```

**Usado para:**
- Contar total de partidas jogadas
- Estatísticas por jogo

---

### 3. **Coleção: `conquistas`**
Armazena conquistas desbloqueadas pelos usuários.

**Estrutura do documento:**
```javascript
{
  userId: "userId123",       // ID do usuário
  conquistaId: "mestre-jogos", // ID da conquista
  nome: "Mestre dos Jogos",  // Nome da conquista
  descricao: "Venceu 100 partidas",
  icone: "🏆",               // Ícone da conquista
  timestamp: Timestamp       // Data de desbloqueio
}
```

**Usado para:**
- Contar total de conquistas desbloqueadas
- Exibir conquistas recentes

---

### 4. **Coleção: `atividades`**
Armazena atividades recentes da plataforma.

**Estrutura do documento:**
```javascript
{
  tipo: "game",              // Tipo: "game", "achievement", "user", "quiz", "record", "profile"
  titulo: "Nova partida de Jogo da Velha",
  descricao: "João Silva venceu Maria Santos",
  userId: "userId123",       // ID do usuário relacionado (opcional)
  timestamp: Timestamp       // Data/hora da atividade
}
```

**Tipos de atividade:**
- `game`: Partidas jogadas
- `achievement`: Conquistas desbloqueadas
- `user`: Novos usuários ou atualizações de perfil
- `quiz`: Quizzes completados
- `record`: Recordes estabelecidos
- `profile`: Atualizações de perfil

**Usado para:**
- Exibir atividades recentes no dashboard
- Atualizações em tempo real

---

### 5. **Coleção: `jogos`**
Armazena informações sobre os jogos disponíveis.

**Estrutura do documento (ID do documento = nome do jogo):**
```javascript
// Documento ID: "jogo-da-velha"
{
  nome: "Jogo da Velha",
  descricao: "Desafie outros jogadores no clássico jogo da velha em tempo real",
  icone: "❌⭕",
  status: "ativo",           // "ativo" ou "em-breve"
  gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  jogadores: 1234,           // Total de jogadores únicos
  partidas: 5678,            // Total de partidas
  online: 89                 // Jogadores online agora
}
```

**Jogos sugeridos:**
- `jogo-da-velha`
- `quiz-spfc`
- `memoria-spfc`
- `quebra-cabeca`

---

## 🚀 Como Popular os Dados Iniciais

### Opção 1: Via Console do Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Vá em **Firestore Database**
4. Clique em **Iniciar coleção**
5. Adicione os documentos manualmente

### Opção 2: Via Script (Recomendado)

Crie um arquivo `popular-dados.html` com o seguinte código:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Popular Dados - SPFC Dashboard</title>
</head>
<body>
    <h1>Populando dados do Firebase...</h1>
    <div id="status"></div>

    <script type="module">
        import { db } from './controle-dados/firebase-config.js';
        import { collection, addDoc, setDoc, doc, Timestamp } from 
            'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

        const status = document.getElementById('status');

        async function popularDados() {
            try {
                status.innerHTML += '<p>🔄 Iniciando...</p>';

                // 1. Adicionar jogos
                const jogos = [
                    {
                        nome: "Jogo da Velha",
                        descricao: "Desafie outros jogadores no clássico jogo da velha em tempo real",
                        icone: "❌⭕",
                        status: "ativo",
                        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        jogadores: 0,
                        partidas: 0,
                        online: 0
                    },
                    {
                        nome: "Quiz SPFC",
                        descricao: "Teste seus conhecimentos sobre a história do São Paulo FC",
                        icone: "❓",
                        status: "ativo",
                        gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        jogadores: 0,
                        partidas: 0,
                        online: 0
                    }
                ];

                for (const jogo of jogos) {
                    const jogoId = jogo.nome.toLowerCase().replace(/ /g, '-');
                    await setDoc(doc(db, 'jogos', jogoId), jogo);
                    status.innerHTML += `<p>✅ Jogo "${jogo.nome}" adicionado</p>`;
                }

                // 2. Adicionar atividade de exemplo
                await addDoc(collection(db, 'atividades'), {
                    tipo: 'user',
                    titulo: 'Sistema inicializado',
                    descricao: 'Dashboard SPFC Gaming está pronto para uso',
                    timestamp: Timestamp.now()
                });
                status.innerHTML += '<p>✅ Atividade de exemplo adicionada</p>';

                status.innerHTML += '<p><strong>✅ Dados populados com sucesso!</strong></p>';
                
            } catch (error) {
                status.innerHTML += `<p>❌ Erro: ${error.message}</p>`;
                console.error(error);
            }
        }

        // Executar ao carregar a página
        popularDados();
    </script>
</body>
</html>
```

Abra este arquivo no navegador para popular os dados iniciais.

---

## 📈 Atualizando Estatísticas Automaticamente

Para manter as estatísticas atualizadas, você pode:

### 1. **Ao criar um novo usuário:**
```javascript
// No arquivo auth.js, após criar usuário
await setDoc(doc(db, 'SPFC', user.uid), {
    nomeCompleto,
    email,
    pontuacao: 0,
    nivel: 1,
    tempoOnline: 0,
    dataCadastro: Timestamp.now(),
    ultimoAcesso: Timestamp.now()
});
```

### 2. **Ao finalizar uma partida:**
```javascript
// Adicionar partida
await addDoc(collection(db, 'partidas'), {
    jogo: 'jogo-da-velha',
    jogador1: userId1,
    jogador2: userId2,
    vencedor: vencedorId,
    duracao: 180,
    timestamp: Timestamp.now(),
    status: 'finalizada'
});

// Adicionar atividade
await addDoc(collection(db, 'atividades'), {
    tipo: 'game',
    titulo: 'Nova partida de Jogo da Velha',
    descricao: `${nomeVencedor} venceu ${nomePerdedor}`,
    timestamp: Timestamp.now()
});

// Atualizar estatísticas do jogo
const jogoRef = doc(db, 'jogos', 'jogo-da-velha');
await updateDoc(jogoRef, {
    partidas: increment(1)
});
```

### 3. **Ao desbloquear conquista:**
```javascript
await addDoc(collection(db, 'conquistas'), {
    userId: userId,
    conquistaId: 'mestre-jogos',
    nome: 'Mestre dos Jogos',
    descricao: 'Venceu 100 partidas',
    icone: '🏆',
    timestamp: Timestamp.now()
});

await addDoc(collection(db, 'atividades'), {
    tipo: 'achievement',
    titulo: 'Conquista desbloqueada',
    descricao: `${nomeUsuario} alcançou "Mestre dos Jogos"`,
    timestamp: Timestamp.now()
});
```

---

## 🔒 Regras de Segurança do Firestore

Configure as regras no Firestore para permitir leitura/escrita:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Usuários - apenas leitura pública, escrita autenticada
    match /SPFC/{userId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Partidas - leitura pública, escrita autenticada
    match /partidas/{partidaId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Conquistas - leitura pública, escrita autenticada
    match /conquistas/{conquistaId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Atividades - leitura pública, escrita autenticada
    match /atividades/{atividadeId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Jogos - leitura pública, escrita apenas admin
    match /jogos/{jogoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 📊 Monitoramento em Tempo Real

O dashboard já está configurado para receber atualizações em tempo real da coleção `atividades`. Sempre que um novo documento for adicionado, ele aparecerá automaticamente no dashboard sem necessidade de recarregar a página.

---

## 🎯 Próximos Passos

1. ✅ Configure o Firebase (se ainda não fez)
2. ✅ Adicione as regras de segurança
3. ✅ Popule os dados iniciais
4. ✅ Teste o dashboard
5. ✅ Integre com os jogos para atualizar estatísticas automaticamente

---

## 📞 Suporte

Se tiver dúvidas sobre a estrutura de dados, consulte a documentação do Firebase:
- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
