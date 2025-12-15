// ==================================================================
// ARQUIVO: server2.js (Versão Final: WebSocket + Webhook + .env)
// ==================================================================

// 1. Carrega variáveis de ambiente
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// 2. Configurações via .env
// Se não houver URL definida, usa a do Render como padrão
const BASE_URL = process.env.USER_BASE_URL || 'https://sliced-game-teste.onrender.com';
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// 3. Configuração do SDK Mercado Pago
let paymentClient;

if (!ACCESS_TOKEN) {
    console.error('❌ ERRO CRÍTICO: Token do Mercado Pago não encontrado no .env!');
} else {
    try {
        const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
        paymentClient = new Payment(client);
        console.log('✅ SDK Mercado Pago configurado com sucesso.');
    } catch (error) {
        console.error('❌ Erro ao configurar SDK:', error.message);
    }
}

// 4. Middlewares
app.use(cors());
app.use(bodyParser.json());
// Serve os arquivos do frontend (HTML/CSS/JS)
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));

// ==================================================================
// 5. CONFIGURAÇÃO WEB SOCKET (Notificação em Tempo Real)
// ==================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const paymentClients = new Map();

// Função para enviar mensagem ao Frontend
function avisarFrontend(paymentId, status) {
    if (paymentClients.has(paymentId)) {
        const ws = paymentClients.get(paymentId);
        if (ws.readyState === 1) { // 1 = Conectado
            console.log(`📡 [WS] Avisando frontend: Pagamento ${paymentId} -> ${status}`);
            
            ws.send(JSON.stringify({
                type: 'payment_status',
                status: status,
                paymentId: paymentId
            }));

            // Fecha a conexão após aprovação para economizar recursos
            if (status === 'approved') {
                setTimeout(() => {
                    ws.close();
                    paymentClients.delete(paymentId);
                }, 2000);
            }
        }
    }
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // O frontend envia { type: 'register', paymentId: '...' }
            if (data.type === 'register' && data.paymentId) {
                paymentClients.set(data.paymentId, ws);
                console.log(`🔗 [WS] Cliente aguardando ID: ${data.paymentId}`);
            }
        } catch (e) {
            console.error('Erro WS:', e);
        }
    });

    ws.on('close', () => {
        // Limpeza automática (opcional, mas boa prática)
        paymentClients.forEach((clientWs, key) => {
            if (clientWs === ws) paymentClients.delete(key);
        });
    });
});

// ==================================================================
// 6. ROTA: CRIAR PIX
// ==================================================================
app.post('/api/deposit/create', async (req, res) => {
    if (!paymentClient) {
        return res.status(500).json({ success: false, message: 'Servidor sem Token configurado.' });
    }

    try {
        let { amount, userId, payerCpf, firstName } = req.body;

        // Limpeza e Validação de CPF
        if (!payerCpf) payerCpf = '';
        payerCpf = payerCpf.replace(/\D/g, ''); // Remove pontos e traços

        if (payerCpf.length !== 11) {
            return res.status(400).json({ 
                success: false, 
                message: 'CPF inválido. Necessário 11 dígitos numéricos.' 
            });
        }

        // Gera email único para evitar erro "PA_UNAUTHORIZED" (pagar para si mesmo)
        const emailSeguro = `cliente_${Date.now()}@emailtemp.com`;

        console.log(`💳 Criando PIX: R$ ${amount} para CPF ${payerCpf}`);

        const paymentBody = {
            transaction_amount: parseFloat(amount),
            description: `Recarga SLICED - User: ${userId}`,
            payment_method_id: 'pix',
            payer: {
                email: emailSeguro,
                first_name: firstName || 'Cliente',
                identification: {
                    type: 'CPF',
                    number: payerCpf
                }
            },
            // O Mercado Pago chamará esta URL quando o pagamento mudar de status
            notification_url: `${BASE_URL}/api/webhook/mercadopago`,
            metadata: {
                user_id: userId
            }
        };

        const payment = await paymentClient.create({ body: paymentBody });

        if (payment && payment.id) {
            res.json({
                success: true,
                data: {
                    paymentId: payment.id,
                    qrCodeBase64: `data:image/png;base64,${payment.point_of_interaction.transaction_data.qr_code_base64}`,
                    pixCopiaECola: payment.point_of_interaction.transaction_data.qr_code
                }
            });
        } else {
            throw new Error('Mercado Pago não retornou ID de pagamento.');
        }

    } catch (error) {
        console.error('❌ ERRO MP API:', JSON.stringify(error, null, 2));
        
        // Pega a mensagem detalhada do erro se existir
        const detalhe = error.cause?.description || error.message;
        
        res.status(500).json({ 
            success: false, 
            message: `Erro ao gerar PIX: ${detalhe}` 
        });
    }
});

// ==================================================================
// 7. ROTA: WEBHOOK (Recebe aviso do Mercado Pago)
// ==================================================================
app.post('/api/webhook/mercadopago', async (req, res) => {
    // Tenta pegar o ID da query (?id=...) ou do corpo (req.body.data.id)
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    
    // Se não tiver ID, apenas responde OK
    if (!paymentId) return res.status(200).send('OK');

    try {
        // Consulta o status real na API do Mercado Pago
        const payment = await paymentClient.get({ id: String(paymentId) });
        const status = payment.status;

        console.log(`🔔 Webhook Recebido | ID: ${paymentId} | Status: ${status}`);

        if (status === 'approved') {
            console.log('💰 Pagamento APROVADO! Notificando usuário...');
            // Avisa o Frontend via WebSocket
            avisarFrontend(String(paymentId), 'approved');
        }

    } catch (error) {
        console.error('Erro ao processar webhook:', error.message);
    }

    // Sempre responde 200 OK para o Mercado Pago não reenviar a notificação
    res.status(200).send('OK');
});

// ==================================================================
// 8. ROTAS MOCK (Simulação de Banco de Dados)
// ==================================================================
// Essas rotas existem para que o frontend não dê erro 404 enquanto o Firebase está desligado.

// Mock Saldo
app.get('/api/user/:uid/balance', (req, res) => {
    // Retorna saldo zero por enquanto (já que não temos DB)
    res.json({ success: true, data: { balance: 0.00 } });
});

// Mock Saque
app.post('/api/withdraw/request', (req, res) => {
    // Simula sucesso no saque
    console.log('💸 Saque simulado solicitado:', req.body);
    res.json({ success: true, message: 'Solicitação de saque simulada com sucesso.' });
});


// ==================================================================
// 9. INICIALIZAÇÃO
// ==================================================================
server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 SERVIDOR RODANDO NA PORTA ${PORT}`);
    console.log(`📡 URL Webhook: ${BASE_URL}/api/webhook/mercadopago`);
    console.log(`🔑 Token Carregado: ${ACCESS_TOKEN ? 'Sim (Do .env)' : 'NÃO ❌'}`);
    console.log(`=============================================`);
});