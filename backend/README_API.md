# Backend SLICED - API Mercado Pago

## 🚀 Início Rápido

### Instalação
```bash
npm install
```

### Executar
```bash
npm start
```

O servidor estará disponível em `http://localhost:3000`

## 🔑 Configuração

### Access Token Mercado Pago
Configurado em `server.js`:
```javascript
const MERCADO_PAGO_ACCESS_TOKEN = 'APP_USR-8089215665209853-120909-01511fb41a354b6ed768b0ba178a02c0-1981576535';
```

### Firestore
- **Project ID**: sliced-4f1e3
- **Coleção**: SLICED/data/Usuários
- **Acesso**: Via REST API (sem firebase-admin)

## 📡 Endpoints

### Depósitos
- `POST /api/deposit/create` - Criar pagamento PIX

### Saques
- `POST /api/withdraw/request` - Solicitar saque

### Saldo
- `GET /api/user/:uid/balance` - Consultar saldo

### Webhook
- `POST /api/webhook/mercadopago` - Receber notificações de pagamento

## 🔧 Estrutura

```
backend/
├── server.js           # Servidor principal
├── package.json        # Dependências
└── README.md          # Este arquivo
```

## 📦 Dependências

- **express**: Framework web
- **body-parser**: Parser de requisições
- **cors**: Habilitar CORS
- **node-fetch**: Fazer requisições HTTP
- **qrcode**: Gerar QR Codes (opcional)

## 🌐 Produção

Para deploy em produção:

1. Configure variáveis de ambiente
2. Use HTTPS
3. Configure webhook no painel do Mercado Pago
4. Adicione autenticação JWT
5. Implemente rate limiting

## 📝 Notas

- Usa Firestore REST API (sem firebase-admin)
- Webhook processa pagamentos automaticamente
- Saldo é atualizado em tempo real
