# Sistema de Chat com Suporte - SPFC

## 📋 Visão Geral

Sistema completo de chat em tempo real entre usuários e equipe de suporte, utilizando Firebase Firestore para armazenamento e sincronização de mensagens.

## ✨ Funcionalidades Implementadas

### Para Usuários (perfil.html)

1. **Ícone Flutuante de Chat**
   - Botão flutuante no canto inferior direito
   - Animação de pulso para chamar atenção
   - Design premium com gradiente vermelho SPFC

2. **Popup de Chat**
   - Interface moderna e responsiva
   - Exibição de horário em cada mensagem (HH:MM)
   - Mensagens do usuário alinhadas à direita (vermelho)
   - Mensagens do suporte alinhadas à esquerda (cinza)
   - Scroll automático para última mensagem
   - Campo de input com botão de envio

3. **Funcionalidades em Tempo Real**
   - Sincronização instantânea de mensagens
   - Atualização automática quando suporte responde
   - Contador de mensagens não lidas para suporte

### Para Suporte (dashboard-suporte.html)

1. **Lista de Conversas**
   - Sidebar com todas as conversas ativas
   - Ordenação por última mensagem (mais recente primeiro)
   - Badge de mensagens não lidas
   - Informações do usuário (nome e email)
   - Tempo relativo da última mensagem (agora, 5m, 2h, 3d)

2. **Área de Chat**
   - Cabeçalho com informações do usuário
   - Histórico completo de mensagens
   - Horário exibido em cada mensagem
   - Campo para enviar respostas
   - Interface intuitiva e profissional

3. **Recursos Avançados**
   - Atualização em tempo real de todas as conversas
   - Marcação automática de lidas ao abrir chat
   - Contador de conversas ativas
   - Estado vazio quando não há conversas

## 🗄️ Estrutura do Firestore

### Coleção: `chats`

Documento por usuário (ID = userId):
```javascript
{
  userId: "string",
  userName: "string",
  userEmail: "string",
  lastMessage: "string",
  lastMessageTime: timestamp,
  unreadSupport: number,  // Mensagens não lidas pelo suporte
  unreadUser: number      // Mensagens não lidas pelo usuário
}
```

### Subcoleção: `chats/{userId}/messages`

```javascript
{
  text: "string",
  sender: "user" | "support",
  timestamp: timestamp
}
```

## 🎨 Design e UX

### Características Visuais

- **Gradiente Animado**: Fundo com gradiente preto/vermelho em movimento
- **Glassmorphism**: Efeitos de vidro fosco com backdrop-filter
- **Animações Suaves**: Transições em hover, entrada e saída
- **Responsivo**: Adaptável para desktop, tablet e mobile
- **Cores SPFC**: Vermelho (#DC143C) e preto como cores principais

### Micro-interações

- Pulso no botão de chat
- Rotação no botão de fechar
- Escala no hover dos botões
- Slide-in ao abrir popup
- Highlight na conversa ativa

## 📱 Responsividade

### Mobile (< 768px)
- Chat popup ocupa quase toda a tela
- Botão flutuante menor
- Mensagens com largura máxima de 80%

### Tablet (< 968px)
- Sidebar e chat em coluna
- Sidebar com altura limitada
- Scroll independente

### Desktop
- Layout lado a lado
- Sidebar fixa de 350px
- Chat área flexível

## 🔧 Configuração Necessária

### Regras do Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /chats/{chatId} {
      allow read, write: if true;
      
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
  }
}
```

**⚠️ IMPORTANTE**: Para produção, implemente regras de segurança adequadas!

### Índices Necessários

O Firestore pode solicitar a criação de índices compostos:
- `chats`: `lastMessageTime` (desc)
- `messages`: `timestamp` (asc)

## 🚀 Como Usar

### Para Usuários

1. Acesse a página de perfil
2. Clique no ícone de chat flutuante (canto inferior direito)
3. Digite sua mensagem
4. Clique em enviar ou pressione Enter
5. Aguarde resposta do suporte

### Para Equipe de Suporte

1. Acesse `dashboard-suporte.html`
2. Visualize todas as conversas na sidebar
3. Conversas com badge vermelho têm mensagens não lidas
4. Clique em uma conversa para abrir
5. Digite a resposta e envie
6. A conversa é marcada como lida automaticamente

## 📊 Funcionalidades de Tempo

### Formato de Horário nas Mensagens
- Exibido como: `14:35`
- Formato 24 horas
- Sempre com 2 dígitos (padding com zero)

### Tempo Relativo na Lista
- "Agora" - menos de 1 minuto
- "5m" - 5 minutos atrás
- "2h" - 2 horas atrás
- "3d" - 3 dias atrás

## 🎯 Próximas Melhorias Sugeridas

1. **Notificações**
   - Som ao receber mensagem
   - Notificação desktop
   - Badge no ícone flutuante

2. **Status**
   - Indicador online/offline
   - "Digitando..." em tempo real
   - Última visualização

3. **Anexos**
   - Upload de imagens
   - Envio de arquivos
   - Preview de links

4. **Histórico**
   - Busca em mensagens
   - Exportar conversa
   - Arquivar chats antigos

5. **Automação**
   - Respostas automáticas
   - Bot para perguntas frequentes
   - Horário de atendimento

## 🔒 Segurança

### Recomendações para Produção

1. **Autenticação**
   - Validar usuário logado
   - Verificar permissões de acesso
   - Implementar rate limiting

2. **Validação de Dados**
   - Sanitizar mensagens
   - Limitar tamanho de texto
   - Filtrar conteúdo impróprio

3. **Regras do Firestore**
   - Restringir acesso por usuário
   - Validar estrutura de dados
   - Implementar quotas

## 📝 Notas Técnicas

- Firebase SDK versão: 9.22.0 (compat)
- Fonte: Outfit (Google Fonts)
- Ícones: Material Icons
- Compatibilidade: Navegadores modernos (Chrome, Firefox, Safari, Edge)

## 🐛 Troubleshooting

### Chat não carrega
- Verifique configuração do Firebase
- Confirme que Firestore está ativado
- Verifique regras de segurança

### Mensagens não aparecem
- Verifique console do navegador
- Confirme índices do Firestore
- Teste conexão com internet

### Horário incorreto
- Verifique timezone do navegador
- Confirme serverTimestamp do Firebase
- Valide função formatTime()

---

**Desenvolvido para São Paulo Futebol Clube**
*Sistema de Suporte Premium v1.0*
