// ==================================================================
// ARQUIVO: server2.js (Versão Final: WebSocket + Webhook + Firestore)
// ==================================================================

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { WebSocketServer } = require('ws');

// 1. CONFIGURAÇÃO FIREBASE ADMIN (NOVO)
const admin = require('firebase-admin');

// Tenta carregar as credenciais. 
// Opção A: Arquivo local (para testes)
// Opção B: Variável de ambiente (para o Render/Produção)
try {
    let serviceAccount;
    
    if (process.env.FIREBASE_CREDENTIALS) {
        // Se estiver no Render, use a variável de ambiente contendo o JSON
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } else {
        // Se estiver local, use o arquivo baixado
        serviceAccount = require('./serviceAccountKey.json');
    }

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    console.log('🔥 Firebase Admin conectado com sucesso!');
} catch (error) {
    console.error('❌ Erro ao configurar Firebase Admin:', error.message);
    console.error('⚠️ O saldo não será salvo se o Firebase não estiver configurado.');
}

const db = admin.firestore(); // Referência ao Banco de Dados

const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.USER_BASE_URL || 'https://sliced-game-teste.onrender.com';
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// 2. Configuração do SDK Mercado Pago
let paymentClient;
if (ACCESS_TOKEN) {
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    paymentClient = new Payment(client);
    console.log('✅ SDK Mercado Pago configurado.');
}

// 3. Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));

// 4. WebSocket Setup
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const paymentClients = new Map();

function avisarFrontend(paymentId, status) {
    const idString = String(paymentId);
    if (paymentClients.has(idString)) {
        const ws = paymentClients.get(idString);
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'payment_status', status: status, paymentId: idString }));
            if (status === 'approved') {
                setTimeout(() => { ws.close(); paymentClients.delete(idString); }, 2000);
            }
        }
    }
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.paymentId) {
                paymentClients.set(String(data.paymentId), ws);
            }
        } catch (e) { console.error('Erro WS:', e); }
    });
    ws.on('close', () => { /* Limpeza se necessário */ });
});

// ==================================================================
// 5. FUNÇÃO AUXILIAR: ATUALIZAR SALDO NO FIRESTORE (NOVO)
// ==================================================================
async function adicionarSaldoUsuario(uid, valor) {
    if (!db) return;

    // Caminho exato baseado no seu auth.js: SLICED -> data -> Usuários -> {uid}
    const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(uid);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            
            if (!doc.exists) {
                throw new Error("Usuário não encontrado!");
            }

            const dadosAtuais = doc.data();
            // Pega o saldo atual ou 0 se não existir. Garante que é número.
            const saldoAtual = parseFloat(dadosAtuais.saldo) || 0;
            const valorAdicionar = parseFloat(valor);
            
            const novoSaldo = saldoAtual + valorAdicionar;

            // Atualiza o saldo e registra a transação (opcional, mas recomendado)
            t.update(userRef, { 
                saldo: novoSaldo,
                ultimaRecarga: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`💰 Saldo atualizado! User: ${uid} | Antigo: ${saldoAtual} | Novo: ${novoSaldo}`);
        });
    } catch (e) {
        console.error('Erro ao atualizar saldo no Firestore:', e);
    }
}

// ==================================================================
// 6. ROTAS
// ==================================================================

app.post('/api/deposit/create', async (req, res) => {
    // ... (Código de criação do PIX permanece igual ao anterior) ...
    // Apenas copiei a lógica simplificada para economizar espaço na resposta
    try {
        let { amount, userId, payerCpf, firstName } = req.body;
        if (!payerCpf) payerCpf = '';
        payerCpf = payerCpf.replace(/\D/g, '');
        
        const emailSeguro = `cliente_${Date.now()}@emailtemp.com`;
        const paymentBody = {
            transaction_amount: parseFloat(amount),
            description: `Recarga SLICED`,
            payment_method_id: 'pix',
            payer: {
                email: emailSeguro,
                first_name: firstName || 'Cliente',
                identification: { type: 'CPF', number: payerCpf }
            },
            notification_url: `${BASE_URL}/api/webhook/mercadopago`,
            metadata: {
                user_id: userId // IMPORTANTE: O ID do usuário vai aqui para usarmos no webhook
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
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ROTA WEBHOOK ATUALIZADA
app.post('/api/webhook/mercadopago', async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    if (!paymentId) return res.status(200).send('OK');

    try {
        const payment = await paymentClient.get({ id: String(paymentId) });
        const status = payment.status;

        console.log(`🔔 Webhook: ID ${paymentId} | Status: ${status}`);

        if (status === 'approved') {
            const userId = payment.metadata.user_id;
            const amount = payment.transaction_amount;

            console.log(`✅ Pagamento Aprovado! Adicionando R$ ${amount} para o user ${userId}`);

            // 1. Atualiza o banco de dados
            if (userId && amount) {
                await adicionarSaldoUsuario(userId, amount);
            }

            // 2. Avisa o frontend para fechar o popup e tocar o som
            avisarFrontend(String(paymentId), 'approved');
        }
    } catch (error) {
        console.error('Erro Webhook:', error.message);
    }
    res.status(200).send('OK');
});

// ROTA DE SALDO REAL (Lendo do Firestore)
app.get('/api/user/:uid/balance', async (req, res) => {
    const { uid } = req.params;

    try {
        if (!db) {
            return res.json({ success: true, data: { balance: 0.00 }, msg: 'DB Offline' });
        }

        const userDoc = await db.collection('SLICED').doc('data').collection('Usuários').doc(uid).get();

        if (userDoc.exists) {
            const dados = userDoc.data();
            const saldo = parseFloat(dados.saldo) || 0.00;
            res.json({ success: true, data: { balance: saldo } });
        } else {
            res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('Erro ao ler saldo:', error);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

app.post('/api/withdraw/request', (req, res) => {
    // Aqui você também deve implementar lógica para deduzir do saldo no futuro
    res.json({ success: true, message: 'Solicitação de saque recebida.' });
});

server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR ON NA PORTA ${PORT}`);
});