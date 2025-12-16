# Widget de Saldo - Implementação

## 📋 Resumo
Foi implementado um widget de saldo atraente e interativo que aparece no lado direito das páginas `inicio.html`, `termos.html`, `anuncie.html` e `afiliados.html`. Ao clicar no widget, o usuário é redirecionado para a página de perfil.

## 🎨 Características do Widget

### Design Premium
- **Gradiente vibrante** com cores da marca (#00ff88)
- **Efeito glassmorphism** com backdrop-filter blur
- **Animações suaves** de entrada e hover
- **Ícone pulsante** com animação contínua
- **Responsivo** para mobile e desktop

### Funcionalidades
- ✅ Busca automática do saldo via API (`/api/user/{uid}/balance`)
- ✅ Mesma fonte de dados que a página de perfil (consistência garantida)
- ✅ Formatação monetária em Real (R$)
- ✅ Redirecionamento para perfil ao clicar
- ✅ Estados de loading e erro
- ✅ Animações de entrada e interação

## 📁 Arquivos Criados

### 1. `controle-dados/balance-widget.js`
Módulo JavaScript reutilizável que contém:
- `fetchUserBalance(userId)` - Busca saldo via API (mesma que perfil.js usa)
- `formatCurrency(value)` - Formata valores monetários
- `initBalanceWidget(userId)` - Inicializa o widget na página
- `refreshBalance(userId)` - Atualiza o saldo em tempo real

### 2. `controle-dados/balance-widget.css`
Estilos CSS modernos incluindo:
- Layout fixo no canto superior direito
- Animações de entrada (slideInRight)
- Efeitos de hover com transform e scale
- Animação de pulso no ícone
- Responsividade mobile completa

## 🔧 Arquivos Modificados

### Páginas HTML Atualizadas
1. **`usuário/inicio/inicio.html`**
2. **`usuário/termos/termos.html`**
3. **`usuário/anuncie/anuncie.html`**
4. **`usuário/afiliados/afiliados.html`**

Cada página recebeu:
- Link para `balance-widget.css` no `<head>`
- Elemento `<div id="balance-widget" class="balance-widget"></div>` após o header
- Import do módulo `balance-widget.js`
- Chamada `await initBalanceWidget(user.uid)` no callback `onUserLoaded`

### 5. `controle-dados/tracker-config.js`
Atualizado para passar o objeto `user` para o callback `onUserLoaded`, permitindo acesso ao `user.uid`.

## 🎯 Como Funciona

1. **Carregamento da Página**
   - O usuário acessa uma das páginas (inicio, termos, anuncie, afiliados)
   - O sistema de autenticação verifica se o usuário está logado

2. **Inicialização do Widget**
   - Após autenticação, `initBalanceWidget(user.uid)` é chamado
   - Widget exibe estado de loading enquanto busca dados

3. **Busca do Saldo**
   - Faz requisição para API: `GET /api/user/{userId}/balance`
   - Mesma API que a página de perfil usa (garantindo consistência)
   - Formata o valor em Real brasileiro

4. **Exibição**
   - Widget aparece com animação suave no canto superior direito
   - Mostra ícone de carteira, label "Saldo" e valor formatado
   - Seta à direita indica que é clicável

5. **Interação**
   - Hover: Widget aumenta levemente e brilha mais
   - Click: Redireciona para `/usuário/perfil/perfil.html`

## 📱 Responsividade

### Desktop (> 768px)
- Posicionado no canto superior direito
- Largura mínima de 280px
- Animação de entrada da direita

### Mobile (≤ 768px)
- Ocupa largura total com margens laterais
- Posicionado abaixo do header (top: 70px)
- Tamanhos de fonte e ícones ajustados
- Padding reduzido para melhor aproveitamento

## 🔄 Atualização em Tempo Real

O widget pode ser atualizado chamando:
```javascript
import { refreshBalance } from '../../controle-dados/balance-widget.js';
await refreshBalance(userId);
```

Isso é útil após:
- Depósitos aprovados
- Saques processados
- Compras realizadas

## 🎨 Personalização

### Cores
As cores podem ser ajustadas em `balance-widget.css`:
- `--primary-color: #00ff88` (verde principal)
- `--primary-color-escuro: #00cc6e` (verde escuro)

### Posição
Altere em `.balance-widget`:
- `top: 100px` - Distância do topo
- `right: 20px` - Distância da direita

### Animações
Velocidades podem ser ajustadas:
- `animation: slideInRight 0.5s` - Entrada
- `transition: all 0.3s` - Hover
- `animation: pulse 2s` - Pulso do ícone

## ✅ Checklist de Implementação

- [x] Criar módulo JavaScript de widget
- [x] Criar estilos CSS premium
- [x] Integrar em inicio.html
- [x] Integrar em termos.html
- [x] Integrar em anuncie.html
- [x] Integrar em afiliados.html
- [x] Atualizar tracker-config.js
- [x] Implementar redirecionamento para perfil
- [x] Adicionar responsividade mobile
- [x] Testar estados de loading e erro

## 🚀 Próximos Passos (Opcional)

1. **Notificações de Saldo**
   - Mostrar badge quando saldo aumentar
   - Animação especial em transações

2. **Histórico Rápido**
   - Tooltip com últimas transações ao passar o mouse

3. **Modo Compacto**
   - Versão minimizada que expande ao hover

4. **Sincronização Real-time**
   - Usar Firestore listeners para atualizar automaticamente
