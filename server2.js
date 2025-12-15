// --- ARQUIVO: server2.js ---

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { WebSocketServer } = require('ws');

const app = express();
const PORT = process.env.PORT || 3001;

// ==================================================================
// 1. CONFIGURAÇÃO DA URL DE NOTIFICAÇÃO (CRÍTICO)
// ==================================================================
// Essa é a URL que o Mercado Pago vai chamar.
// Tem que ser EXATAMENTE a URL do seu servidor no Render.
const BASE_URL = 'https://sliced-game-teste.onrender.com';

// Chave fornecida anteriormente
const MERCADO_PAGO_ACCESS_TOKEN = 'f3c5276a78082bfdbcb6a09e58ab5d1b3441cb62c6bcda745eebe48e19828911';

// Configuração do SDK
let paymentClient;
try {
    const client = new MercadoPagoConfig({ accessToken: MERCADO_PAGO_ACCESS_TOKEN });
    paymentClient = new Payment(client);
    console.log('✅ SDK Mercado Pago configurado.');
} catch (error) {
    console.error('❌ Erro SDK:', error);
}

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));

// ==================================================================
// 2. SISTEMA DE WEBSOCKET (O "Telefone" com o Frontend)
// ==================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Mapa para guardar quem está esperando qual pagamento
// Exemplo: { "123456789": ConexãoDoUsuario }
const paymentClients = new Map();

// Função que o Webhook vai chamar para avisar o Frontend
function avisarFrontend(paymentId, status) {
    // Verifica se tem alguém online esperando por ESSE paymentId
    if (paymentClients.has(paymentId)) {
        const ws = paymentClients.get(paymentId);
        
        if (ws.readyState === 1) { // 1 = Conectado
            console.log(`📡 [WS] Avisando o frontend sobre o ID ${paymentId}: ${status}`);
            
            ws.send(JSON.stringify({
                type: 'payment_status',
                status: status,
                paymentId: paymentId
            }));

            // Se aprovado, fecha a conexão pois já acabou
            if (status === 'approved') {
                setTimeout(() => {
                    ws.close();
                    paymentClients.delete(paymentId);
                }, 1000);
            }
        }
    } else {
        console.log(`⚠️ [WS] Webhook recebido para ID ${paymentId}, mas o usuário não está conectado.`);
    }
}

wss.on('connection', (ws) => {
    let meuPaymentId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // O Frontend envia: { type: 'register', paymentId: '123...' }
            if (data.type === 'register' && data.paymentId) {
                meuPaymentId = data.paymentId;
                paymentClients.set(meuPaymentId, ws);
                console.log(`🔗 [WS] Cliente conectado aguardando pagamento ID: ${meuPaymentId}`);
            }
        } catch (e) {
            console.error('Erro WS:', e);
        }
    });

    ws.on('close', () => {
        if (meuPaymentId) {
            paymentClients.delete(meuPaymentId);
        }
    });
});

// ==================================================================
// 3. ROTA PARA CRIAR O PIX
// ==================================================================
app.post('/api/deposit/create', async (req, res) => {
    try {
        let { amount, userId, email, payerCpf, firstName } = req.body;

        // Limpeza básica
        if (!payerCpf) payerCpf = '';
        payerCpf = payerCpf.replace(/\D/g, '');
        if (!email || !email.includes('@')) email = 'user@sliced.com';

        // Validação CPF (MP exige 11 dígitos)
        if (payerCpf.length !== 11) {
            return res.status(400).json({ success: false, message: 'CPF deve ter 11 dígitos.' });
        }

        const body = {
            transaction_amount: parseFloat(amount),
            description: `Depósito ${userId}`,
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName || 'User',
                identification: { type: 'CPF', number: payerCpf }
            },
            // 🚨 AQUI ESTÁ O SEGREDO: A URL QUE O MP VAI CHAMAR
            notification_url: `${BASE_URL}/api/webhook/mercadopago`,
            metadata: { user_id: userId }
        };

        const payment = await paymentClient.create({ body });

        if (payment && payment.id) {
            res.json({
                success: true,
                data: {
                    paymentId: payment.id, // O Identificador único
                    qrCodeBase64: `data:image/png;base64,${payment.point_of_interaction.transaction_data.qr_code_base64}`,
                    pixCopiaECola: payment.point_of_interaction.transaction_data.qr_code
                }
            });
        } else {
            res.status(400).json({ success: false, message: 'Falha ao criar PIX' });
        }
    } catch (error) {
        console.error('Erro Criar PIX:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==================================================================
// 4. ROTA DO WEBHOOK (Onde o MP avisa que pagou)
// ==================================================================
app.post('/api/webhook/mercadopago', async (req, res) => {
    // O Mercado Pago envia o ID no corpo ou na query
    const paymentId = req.query.id || (req.body.data && req.body.data.id);

    // Se não tiver ID ou não for aviso de pagamento, ignora
    if (!paymentId || (req.body.type !== 'payment' && req.query.topic !== 'payment')) {
        return res.status(200).send('OK');
    }

    try {
        // Consultamos o status atualizado no Mercado Pago
        const payment = await paymentClient.get({ id: paymentId });
        const status = payment.status;

        console.log(`🔔 NOTIFICAÇÃO RECEBIDA! ID: ${paymentId} | Status: ${status}`);

        if (status === 'approved') {
            console.log('💰 PAGAMENTO APROVADO!');
            // AQUI OCORRE A MÁGICA: O Node avisa o Frontend
            avisarFrontend(String(paymentId), 'approved');
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro Webhook:', error);
        res.status(200).send('OK'); // Responde OK para o MP não ficar tentando de novo
    }
});

// Rotas Mock (Simulações para não travar o front sem DB)
app.get('/api/user/:uid/balance', (req, res) => res.json({ success: true, data: { balance: 0 } }));
app.post('/api/withdraw/request', (req, res) => res.json({ success: true, message: 'Saque simulado.' }));

server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR RODANDO!`);
    console.log(`📡 URL Base Webhook: ${BASE_URL}/api/webhook/mercadopago`);
});