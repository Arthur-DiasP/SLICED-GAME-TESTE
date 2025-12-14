# Estilos CSS - Sistema de Depósito PIX

## 📋 Resumo

Foram criados estilos modernos e premium para o sistema de depósito PIX, seguindo as melhores práticas de design moderno com **glassmorphism**, **gradientes vibrantes** e **animações suaves**.

## 🎨 Arquivos Modificados/Criados

### 1. `perfil.html` - Estilos Inline
Adicionados **238 linhas** de CSS para a seção de depósito.

### 2. `saldo.css` - Arquivo CSS Dedicado
Criado arquivo CSS completo para a página `saldo.html`.

## ✨ Características do Design

### 🎯 Seção de Depósito (perfil.html)

#### **Container Principal (.deposit-block)**
- ✅ Background com gradiente verde translúcido
- ✅ Efeito glassmorphism (backdrop-filter: blur)
- ✅ Borda com glow verde
- ✅ Sombra suave com cor primária
- ✅ Animação de hover (elevação + intensificação do glow)
- ✅ Animação de entrada (slideInFromBottom)

#### **Título (h4)**
- ✅ Cor verde primária (#00ff88)
- ✅ Ícone de cartão de crédito (💳) antes do texto
- ✅ Fonte Outfit, peso 700

#### **Botões de Valor (.deposit-option-btn)**
- ✅ Grid de 3 colunas
- ✅ Background gradiente translúcido
- ✅ Borda verde com glow
- ✅ Efeito de onda ao hover (::before pseudo-elemento)
- ✅ Transformação em gradiente sólido ao hover
- ✅ Elevação e sombra ao hover
- ✅ Feedback visual ao clicar (active state)

#### **Input Personalizado (.custom-deposit-input)**
- ✅ Container com background translúcido
- ✅ Label com ícone de lápis (✏️)
- ✅ Input com foco destacado (glow verde)
- ✅ Placeholder com opacidade reduzida
- ✅ Fonte grande e legível (1.1rem)

#### **Botão Depositar (#deposit-custom-btn)**
- ✅ Gradiente verde vibrante
- ✅ Ícone de dinheiro (💰) antes do texto
- ✅ Estado desabilitado com opacidade reduzida
- ✅ Cursor not-allowed quando desabilitado
- ✅ Animação de elevação ao hover
- ✅ Largura 100%

### 💳 Página de Pagamento PIX (saldo.html)

#### **Header (.app-header-simple)**
- ✅ Background escuro com blur
- ✅ Botão de voltar com hover animado
- ✅ Sticky no topo da página
- ✅ Sombra sutil

#### **Caixa de Valor (.pix-info-box)**
- ✅ Gradiente verde translúcido
- ✅ Borda verde com glow
- ✅ Valor em destaque (2.5rem, peso 900)
- ✅ Text-shadow com glow verde

#### **Container do QR Code (.qr-code-container)**
- ✅ Background branco
- ✅ Padding generoso
- ✅ Border-radius arredondado
- ✅ Sombra profunda
- ✅ Centralizado

#### **Área de Copia e Cola (.copy-paste-container)**
- ✅ Textarea com fonte monospace
- ✅ Background translúcido
- ✅ Foco com glow verde
- ✅ Botão de copiar com gradiente
- ✅ Mensagem de "Copiado!" animada

#### **Loading Spinner**
- ✅ Animação de rotação suave
- ✅ Borda verde no topo
- ✅ Centralizado

#### **Informação de Vencimento (.pix-expiration)**
- ✅ Background laranja translúcido
- ✅ Borda laranja
- ✅ Texto destacado em laranja

## 📱 Responsividade

### Breakpoints Implementados

#### **768px (Tablets)**
```css
- Grid de depósito: 3 colunas → 1 coluna
- Padding reduzido
- Botões menores
```

#### **480px (Smartphones)**
```css
- Títulos menores
- QR Code reduzido (250px → 200px)
- Padding ainda mais compacto
- Fonte reduzida
```

## 🎭 Animações

### **slideInFromBottom**
```css
Entrada suave da seção de depósito
Duração: 0.6s
Easing: ease-out
```

### **fadeInUp**
```css
Entrada dos detalhes do PIX
Duração: 0.6s
Easing: ease-out
```

### **fadeIn**
```css
Mensagem de "Copiado!"
Duração: 0.3s
```

### **spin**
```css
Loading spinner
Duração: 0.8s
Loop: infinito
```

### **Efeito de Onda (Botões)**
```css
Expansão circular ao hover
Duração: 0.6s
Tamanho: 0 → 300px
```

## 🎨 Paleta de Cores

```css
--primary-color: #00ff88       /* Verde vibrante */
--primary-color-dark: #00cc6e  /* Verde escuro */
--dark-bg: #000000             /* Preto puro */
--text-primary: #ffffff        /* Branco */
```

### Variações de Opacidade
- Background translúcido: `rgba(0, 255, 136, 0.1)`
- Borda com glow: `rgba(0, 255, 136, 0.3)`
- Sombra suave: `rgba(0, 255, 136, 0.2)`
- Sombra intensa: `rgba(0, 255, 136, 0.5)`

## 🚀 Efeitos Premium

1. **Glassmorphism**
   - `backdrop-filter: blur(10px)`
   - Backgrounds translúcidos
   - Bordas sutis

2. **Gradientes Dinâmicos**
   - Transição de translúcido para sólido
   - Múltiplas camadas de gradiente

3. **Micro-animações**
   - Hover states suaves
   - Feedback visual imediato
   - Transições de 0.3s

4. **Glow Effects**
   - Text-shadow nos títulos
   - Box-shadow nos botões
   - Border com cores vibrantes

## 📝 Boas Práticas Implementadas

✅ **Acessibilidade**
- Contraste adequado
- Tamanhos de fonte legíveis
- Estados de foco visíveis

✅ **Performance**
- Animações com GPU (transform, opacity)
- Transições suaves (ease, ease-out)
- CSS otimizado

✅ **UX**
- Feedback visual imediato
- Estados claros (hover, active, disabled)
- Responsividade completa

✅ **Manutenibilidade**
- Variáveis CSS
- Comentários descritivos
- Organização por seções

## 🎯 Resultado Final

O design criado proporciona:
- ✨ **Visual Premium**: Aparência moderna e profissional
- 🎨 **Identidade Visual**: Consistente com a marca SLICED
- 📱 **Responsivo**: Funciona em todos os dispositivos
- ⚡ **Performático**: Animações suaves e otimizadas
- 🎭 **Interativo**: Feedback visual rico

---

**Criado em:** 13/12/2025  
**Tecnologias:** CSS3, Flexbox, Grid, Animations, Glassmorphism
