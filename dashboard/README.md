# 🎮 Dashboard SPFC Gaming - Guia de Uso

## 📋 Visão Geral

O Dashboard SPFC Gaming é uma interface administrativa moderna e responsiva conectada ao Firebase Firestore para gerenciar a plataforma de jogos do São Paulo FC.

## ✨ Funcionalidades

### 📊 Cards de Estatísticas
- **Usuários Ativos**: Total de usuários cadastrados
- **Partidas Jogadas**: Total de partidas em todos os jogos
- **Tempo Médio Online**: Média de tempo que os usuários passam na plataforma
- **Conquistas Desbloqueadas**: Total de conquistas alcançadas

### 📋 Atividades Recentes
- Exibe as últimas 6 atividades da plataforma
- Atualização em tempo real via Firestore listeners
- Tipos: partidas, conquistas, novos usuários, quizzes, recordes

### 🏆 Top Jogadores
- Ranking dos 5 melhores jogadores por pontuação
- Exibe nível e pontuação total
- Medalhas especiais para top 3

### 🎮 Jogos Disponíveis
- Lista todos os jogos da plataforma
- Estatísticas por jogo (jogadores, partidas, online)
- Status: Ativo ou Em Breve

### ⚡ Ações Rápidas
- Adicionar Jogo
- Gerenciar Usuários
- Relatórios
- Conquistas
- Configurações

## 🚀 Como Usar

### 1️⃣ Primeira Vez - Popular Dados

Se esta é a primeira vez que você está usando o dashboard:

1. Abra o arquivo `popular-dados.html` no navegador
2. Clique em "➕ Popular Dados Iniciais"
3. Aguarde a confirmação de sucesso
4. Feche a página

Isso irá criar:
- ✅ 4 jogos (Jogo da Velha, Quiz SPFC, Memória SPFC, Quebra-Cabeça)
- ✅ 6 atividades de exemplo
- ✅ 5 usuários de exemplo (top jogadores)
- ✅ 10 partidas de exemplo
- ✅ 5 conquistas de exemplo

### 2️⃣ Acessar o Dashboard

#### Via Login Normal:
1. Abra `../login/login.html`
2. Faça login com qualquer conta cadastrada

#### Via Acesso Administrativo:
1. Abra `../login/login.html`
2. Use as credenciais:
   - **Email**: `spfc@gmail.com`
   - **Senha**: `185520`
3. Você será redirecionado automaticamente para o dashboard

#### Acesso Direto:
1. Abra `dashboard-inicio.html` diretamente no navegador

### 3️⃣ Navegação

**Sidebar:**
- 📊 Dashboard - Página principal
- 🎮 Jogos - Gerenciar jogos
- 👥 Usuários - Gerenciar usuários
- 📈 Estatísticas - Ver estatísticas detalhadas
- 🏆 Conquistas - Gerenciar conquistas
- 💬 Mensagens - Sistema de mensagens
- ⚙️ Configurações - Configurações do sistema
- 🚪 Sair - Voltar para login

## 📁 Arquivos do Dashboard

```
dashboard/
├── dashboard-inicio.html      # Página principal do dashboard
├── dashboard-inicio.css       # Estilos do dashboard
├── dashboard-data.js          # Módulo de dados (Firebase)
├── popular-dados.html         # Utilitário para popular dados
├── ESTRUTURA_DADOS.md         # Documentação da estrutura de dados
└── README.md                  # Este arquivo
```

## 🔧 Configuração do Firebase

### Verificar Conexão

Abra o console do navegador (F12) e verifique:
- ✅ "Firebase inicializado com sucesso!"
- ✅ "🔄 Carregando dados do Firebase..."
- ✅ "✅ Dashboard carregado com sucesso!"

### Problemas Comuns

**Erro: "Firebase not initialized"**
- Verifique se `../controle-dados/firebase-config.js` existe
- Confirme que as credenciais do Firebase estão corretas

**Erro: "Permission denied"**
- Verifique as regras de segurança do Firestore
- Consulte `ESTRUTURA_DADOS.md` para regras corretas

**Dados não aparecem:**
- Execute `popular-dados.html` primeiro
- Verifique se as coleções foram criadas no Firestore Console

## 📊 Estrutura de Dados

O dashboard busca dados das seguintes coleções do Firestore:

### Coleções Principais:
- **SPFC** - Usuários cadastrados
- **partidas** - Partidas jogadas
- **conquistas** - Conquistas desbloqueadas
- **atividades** - Atividades recentes
- **jogos** - Jogos disponíveis

Para detalhes completos, consulte: `ESTRUTURA_DADOS.md`

## 🎨 Personalização

### Cores
As cores podem ser alteradas em `dashboard-inicio.css`:
```css
:root {
    --spfc-red: #E30613;
    --bg-primary: #0a0e27;
    --bg-secondary: #151b3d;
    /* ... */
}
```

### Estatísticas
Para adicionar novas estatísticas, edite:
1. `dashboard-data.js` - Adicione função de busca
2. `dashboard-inicio.html` - Adicione card HTML
3. Script - Conecte a função ao card

## 🔄 Atualizações em Tempo Real

O dashboard está configurado para receber atualizações em tempo real da coleção `atividades`. Quando um novo documento for adicionado ao Firestore, ele aparecerá automaticamente no dashboard.

### Como Funciona:
```javascript
escutarAtividades((atividades) => {
    // Atualiza a interface automaticamente
    renderizarAtividades(atividades);
}, 6);
```

## 📱 Responsividade

O dashboard é totalmente responsivo:

- **Desktop (>1024px)**: Sidebar fixa, layout completo
- **Tablet (768px-1024px)**: Sidebar colapsável, grid adaptativo
- **Mobile (<768px)**: Sidebar em menu, cards em coluna única

## 🛠️ Desenvolvimento

### Adicionar Nova Estatística:

1. **Criar função em `dashboard-data.js`:**
```javascript
export async function getNovaEstatistica() {
    const ref = collection(db, 'minhaColecao');
    const snapshot = await getDocs(ref);
    return snapshot.size;
}
```

2. **Atualizar `inicializarDashboard()`:**
```javascript
const novaEstat = await getNovaEstatistica();
return { stats: { ..., novaEstat } };
```

3. **Adicionar card no HTML e conectar no script**

### Adicionar Novo Tipo de Atividade:

1. **Atualizar `obterIconeAtividade()` em `dashboard-data.js`:**
```javascript
const icones = {
    // ...
    'meuTipo': '🎯'
};
```

2. **Adicionar documento no Firestore:**
```javascript
await addDoc(collection(db, 'atividades'), {
    tipo: 'meuTipo',
    titulo: 'Título',
    descricao: 'Descrição',
    timestamp: Timestamp.now()
});
```

## 🐛 Debug

### Console Logs:
O dashboard exibe logs coloridos no console:
- 🔄 Azul - Carregando
- ✅ Verde - Sucesso
- ❌ Vermelho - Erro
- 🔔 Amarelo - Notificação

### Verificar Dados:
```javascript
// No console do navegador
import { inicializarDashboard } from './dashboard-data.js';
const dados = await inicializarDashboard();
console.log(dados);
```

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique o console do navegador (F12)
2. Consulte `ESTRUTURA_DADOS.md`
3. Verifique o Firebase Console
4. Revise as regras de segurança do Firestore

## 🎯 Próximos Passos

- [ ] Implementar páginas de Jogos, Usuários, etc.
- [ ] Adicionar gráficos com Chart.js
- [ ] Implementar sistema de notificações
- [ ] Adicionar exportação de relatórios
- [ ] Criar sistema de permissões de admin

## 📄 Licença

Este projeto faz parte da plataforma SPFC Gaming.

---

**Desenvolvido com ❤️ para o São Paulo FC**
