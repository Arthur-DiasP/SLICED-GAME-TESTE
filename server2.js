// ==================================================================
// ARQUIVO: server2.js (Versão Final: Anti-Duplicidade + Secret Files)
// ==================================================================

require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const { WebSocketServer } = require('ws');

// 1. CONFIGURAÇÃO FIREBASE ADMIN
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;

try {
    let serviceAccount;
    // Caminhos possíveis para a chave
    const renderPath = '/etc/secrets/sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';
    const localPathGen = './serviceAccountKey.json';
    const localPathSpec = './sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';

    if (fs.existsSync(renderPath)) serviceAccount = require(renderPath);
    else if (fs.existsSync(localPathGen)) serviceAccount = require(localPathGen);
    else if (fs.existsSync(localPathSpec)) serviceAccount = require(localPathSpec);
    else if (process.env.FIREBASE_CREDENTIALS) serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    else throw new Error('Nenhuma credencial encontrada.');

    if (!admin.apps.length) {
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log('🔥 [Firebase] Admin conectado!');

} catch (error) {
    console.warn('❌ Erro Firebase:', error.message);
}

// 2. CONFIGURAÇÕES
const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.USER_BASE_URL || 'https://sliced-game-teste.onrender.com';
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

let paymentClient;
if (ACCESS_TOKEN) {
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    paymentClient = new Payment(client);
    console.log('✅ [MP] SDK Configurado.');
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));

// 3. WEBSOCKET
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
    ws.on('message', (m) => {
        try {
            const d = JSON.parse(m);
            if (d.type === 'register' && d.paymentId) paymentClients.set(String(d.paymentId), ws);
        } catch (e) {}
    });
});

// ==================================================================
// 4. LÓGICA DE SALDO BLINDADA (CORREÇÃO DOS R$ 6,00)
// ==================================================================
async function processarPagamento(uid, valor, paymentId) {
    if (!db) return false;

    const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(uid);
    // Cria uma subcoleção para rastrear pagamentos já processados
    const transacaoRef = userRef.collection('Transacoes').doc(String(paymentId));

    try {
        await db.runTransaction(async (t) => {
            // 1. Verifica se o pagamento JÁ EXISTE
            const transDoc = await t.get(transacaoRef);
            if (transDoc.exists) {
                console.log(`🛑 [DB] Pagamento ${paymentId} DUPLICADO - Ignorando.`);
                return; // PARA AQUI. Não soma nada.
            }

            // 2. Lê usuário
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error('Usuário não encontrado');

            const dados = userDoc.data();
            const saldoAtual = Number(dados.saldo) || 0;
            const valorAdicionar = Number(valor);
            const novoSaldo = saldoAtual + valorAdicionar;

            // 3. Grava o novo saldo
            t.set(userRef, { 
                saldo: novoSaldo,
                ultimaRecarga: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // 4. Grava o recibo (para impedir duplicação futura)
            t.set(transacaoRef, {
                valor: valorAdicionar,
                data: admin.firestore.FieldValue.serverTimestamp(),
                paymentId: String(paymentId)
            });

            console.log(`✅ [DB] Saldo Atualizado: ${saldoAtual} + ${valorAdicionar} = ${novoSaldo}`);
        });
    } catch (e) {
        console.error('❌ [DB] Erro Transação:', e.message);
    }
}

// 5. ROTAS
app.post('/api/deposit/create', async (req, res) => {
    try {
        let { amount, userId, payerCpf, firstName } = req.body;
        if (!payerCpf) payerCpf = ''; 
        payerCpf = payerCpf.replace(/\D/g, '');
        
        const paymentBody = {
            transaction_amount: parseFloat(amount),
            description: `Recarga SLICED`,
            payment_method_id: 'pix',
            payer: {
                email: `cliente_${Date.now()}@emailtemp.com`,
                first_name: firstName || 'Cliente',
                identification: { type: 'CPF', number: payerCpf }
            },
            notification_url: `${BASE_URL}/api/webhook/mercadopago`,
            metadata: { user_id: userId }
        };

        const payment = await paymentClient.create({ body: paymentBody });
        
        if(payment && payment.id) {
            res.json({ success: true, data: { 
                paymentId: payment.id, 
                qrCodeBase64: `data:image/png;base64,${payment.point_of_interaction.transaction_data.qr_code_base64}`,
                pixCopiaECola: payment.point_of_interaction.transaction_data.qr_code 
            }});
        }
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

app.post('/api/webhook/mercadopago', async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    res.status(200).send('OK'); // Responde rápido

    if (!paymentId) return;

    try {
        const payment = await paymentClient.get({ id: String(paymentId) });
        
        if (payment.status === 'approved') {
            const userId = payment.metadata.user_id;
            const amount = payment.transaction_amount;

            if (userId && amount) {
                // Chama a função blindada
                await processarPagamento(userId, amount, String(paymentId));
                avisarFrontend(String(paymentId), 'approved');
            }
        }
    } catch (e) { console.error(e); }
});

app.get('/api/user/:uid/balance', async (req, res) => {
    if (!db) return res.json({ success: true, data: { balance: 0.00 } });
    try {
        const doc = await db.collection('SLICED').doc('data').collection('Usuários').doc(req.params.uid).get();
        const saldo = doc.exists ? (Number(doc.data().saldo) || 0) : 0;
        res.json({ success: true, data: { balance: saldo } });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/withdraw/request', (req, res) => res.json({ success: true }));

server.listen(PORT, () => console.log(`🚀 Server ON na porta ${PORT}`));