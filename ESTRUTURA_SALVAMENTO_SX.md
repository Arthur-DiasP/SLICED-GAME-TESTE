# Documentação: Estrutura de Salvamento de Dados SX - SLICED

Esta documentação descreve onde e como os dados dos usuários que solicitam cadastro como Sócios Exclusivos (SX) são salvos no banco de dados Firestore da plataforma SLICED.

## 📍 Localização no Firestore

Os dados de cadastro do SX são armazenados **dentro do próprio documento do usuário**, garantindo que as informações do sócio estejam vinculadas diretamente ao seu perfil principal.

**Caminho do Documento:**
```
SLICED (Collection)
 └── data (Document)
      └── Usuário (Collection)
           └── {uid} (Documento do Usuário)
```

> **Nota:** `{uid}` representa o ID único do usuário gerado pelo Firebase Authentication.

---

## 💾 Estrutura de Dados Salva

Dentro do documento do usuário, é criado (ou atualizado) um objeto chamado `sxData`. Este objeto contém todas as informações fornecidas no formulário de cadastro SX, além de metadados de status.

### Objeto `sxData`

| Campo | Tipo | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| `category` | String | Categoria selecionada pelo usuário | `"Influencer"`, `"Time"`, `"Empresa"` |
| `socialNetwork` | String | Rede social principal informada | `"Instagram"`, `"TikTok"`, `"Youtube"` |
| `profileName` | String | Nome do perfil na rede social | `"@jogador123"` |
| `followersCount` | String | Quantidade de seguidores informada | `"10k"`, `"1.5M"` |
| `imageUrl` | String | URL da imagem de perfil escolhida | `"https://.../foto.jpg"` |
| `status` | String | Status atual da solicitação | `"pending"`, `"approved"`, `"rejected"` |
| `requestDate` | String | Data e hora do envio da solicitação (ISO) | `"2025-12-17T19:30:00.000Z"` |
| `userName` | String | Nome completo do usuário (copiado do perfil) | `"João da Silva"` |
| `userEmail` | String | Email do usuário (copiado do perfil) | `"joao@email.com"` |
| **Outros Campos do Usuário** | ... | Os demais dados do perfil (`nomeCompleto`, `email`, `saldo`, etc.) permanecem inalterados no mesmo documento. | |

### Exemplo de Documento JSON no Firestore

```json
{
  "nomeCompleto": "Carlos Eduardo",
  "email": "carlos@exemplo.com",
  "saldo": 50.00,
  "dataCriacao": "...",
  
  // Objeto SX adicionado ou atualizado
  "sxData": {
    "category": "Influencer",
    "socialNetwork": "Instagram",
    "profileName": "@carlosedu_oficial",
    "followersCount": "150k",
    "imageUrl": "https://imgur.com/exemplo_foto.jpg",
    "status": "pending",
    "requestDate": "2025-12-17T16:45:12.123Z",
    "userName": "Carlos Eduardo",
    "userEmail": "carlos@exemplo.com"
  }
}
```

---

## 🔄 Fluxo de Dados

1. **Envio do Formulário (`sx.js`):**
   - O script captura os valores dos inputs: categoria, rede social, perfil, seguidores e imagem.
   - Verifica se o usuário está logado via `localStorage`.
   - Cria o objeto `sxData` com status inicial `pending`.

2. **Salvamento no Firestore:**
   - Utiliza a função `setDoc` com a opção `{ merge: true }`.
   - Isso garante que apenas o campo `sxData` seja adicionado ou atualizado no documento do usuário, sem apagar outros dados como saldo ou histórico.

3. **Verificação de Status:**
   - Ao carregar a página `sx.html`, o sistema consulta `SLICED/data/Usuário/{uid}`.
   - Verifica se o campo `sxData` existe.
   - Se `status === 'pending'`, exibe a tela de solicitação em análise.
   - Se `status === 'approved'`, exibe a tela de sucesso/membro ativo.

## 🛠️ Manutenção e Aprovação

Para aprovar um usuário como Sócio SX, um administrador deve acessar o documento do usuário no Firestore e alterar manualmente (ou via painel administrativo futuro) o campo:

`sxData.status` ➔ De `"pending"` para `"approved"`.

Após essa alteração, o usuário terá acesso aos benefícios SX e aparecerá como membro na plataforma.
