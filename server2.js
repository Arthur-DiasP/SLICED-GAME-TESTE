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

// ==================================================================
// 1. CONFIGURAÇÃO FIREBASE ADMIN (BLINDADA CONTRA ERROS)
// ==================================================================
const admin = require('firebase-admin');

let db = null; // Inicializa nulo

try {
    let serviceAccount;
    
    // 1. Tenta carregar da Variável de Ambiente (Render/Produção)
    if (process.env.FIREBASE_CREDENTIALS) {
        console.log('🔄 [Firebase] Carregando credenciais via Variável de Ambiente...');
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    } 
    // 2. Se não, tenta carregar do arquivo local (Desenvolvimento)
    else {
        console.log('🔄 [Firebase] Tentando carregar arquivo local serviceAccountKey.json...');
        // O require está dentro do try para não travar o servidor se o arquivo não existir
        serviceAccount = require('./serviceAccountKey.json');
    }

    // Inicializa o App
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    // Conecta no Firestore
    db = admin.firestore();
    console.log('🔥 [Firebase] Admin conectado e pronto para salvar saldo!');

} catch (error) {
    console.warn('⚠️ [AVISO] Não foi possível conectar ao Firebase Admin.');
    console.warn('❌ Motivo:', error.message);
    console.warn('💡 Se estiver no Render, verifique a variável FIREBASE_CREDENTIALS.');
    console.warn('💡 Se estiver local, verifique o arquivo serviceAccountKey.json.');
    // O servidor continuará rodando, mas sem salvar saldo
}

// ==================================================================
// 2. CONFIGURAÇÕES GERAIS
// ==================================================================
const app = express();
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.USER_BASE_URL || 'https://sliced-game-teste.onrender.com';
const ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// Configuração do SDK Mercado Pago
let paymentClient;
if (ACCESS_TOKEN) {
    const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
    paymentClient = new Payment(client);
    console.log('✅ [MP] SDK Mercado Pago configurado.');
} else {
    console.error('❌ [MP] Token do Mercado Pago não encontrado no .env!');
}

// Middlewares
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));

// ==================================================================
// 3. WEB SOCKET (Notificação em Tempo Real)
// ==================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const paymentClients = new Map();

function avisarFrontend(paymentId, status) {
    const idString = String(paymentId);
    console.log(`🔍 [WS] Tentando notificar ID: "${idString}"`);

    if (paymentClients.has(idString)) {
        const ws = paymentClients.get(idString);
        if (ws.readyState === 1) {
            ws.send(JSON.stringify({
                type: 'payment_status',
                status: status,
                paymentId: idString
            }));
            console.log(`📡 [WS] Notificação enviada: ${status}`);

            if (status === 'approved') {
                setTimeout(() => {
                    ws.close();
                    paymentClients.delete(idString);
                }, 2000);
            }
        }
    } else {
        console.log(`⚠️ [WS] ID ${idString} não conectado no momento.`);
    }
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.paymentId) {
                const strPaymentId = String(data.paymentId);
                paymentClients.set(strPaymentId, ws);
                console.log(`🔗 [WS] Cliente registrado aguardando ID: "${strPaymentId}"`);
            }
        } catch (e) { console.error('Erro WS:', e); }
    });
    ws.on('close', () => {
        paymentClients.forEach((clientWs, key) => {
            if (clientWs === ws) paymentClients.delete(key);
        });
    });
});

// ==================================================================
// 4. FUNÇÃO DE BANCO DE DADOS (FIRESTORE)
// ==================================================================
async function adicionarSaldoUsuario(uid, valor) {
    if (!db) {
        console.error('❌ [DB] Tentativa de salvar saldo falhou: Banco de dados não conectado.');
        return;
    }

    // Caminho: SLICED -> data -> Usuários -> {uid}
    const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(uid);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            
            if (!doc.exists) {
                throw new Error(`Usuário ${uid} não encontrado no Firestore.`);
            }

            const dadosAtuais = doc.data();
            // Pega o saldo atual (ou 0 se não existir) e garante que é número
            const saldoAtual = parseFloat(dadosAtuais.saldo) || 0;
            const valorAdicionar = parseFloat(valor);
            
            const novoSaldo = saldoAtual + valorAdicionar;

            // Atualiza
            t.update(userRef, { 
                saldo: novoSaldo,
                ultimaRecarga: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`💰 [DB] Saldo Atualizado! UID: ${uid} | +R$ ${valorAdicionar} | Total: R$ ${novoSaldo.toFixed(2)}`);
        });
    } catch (e) {
        console.error('❌ [DB] Erro ao atualizar saldo:', e.message);
    }
}

// ==================================================================
// 5. ROTAS DA API
// ==================================================================

// Criar Pagamento PIX
app.post('/api/deposit/create', async (req, res) => {
    if (!paymentClient) return res.status(500).json({ success: false, message: 'Servidor sem Token MP.' });

    try {
        let { amount, userId, payerCpf, firstName } = req.body;
        if (!payerCpf) payerCpf = '';
        payerCpf = payerCpf.replace(/\D/g, '');

        // Email temporário para evitar erro de auto-pagamento em testes
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
                user_id: userId // Guarda o ID do usuário para usar no webhook
            }
        };

        const payment = await paymentClient.create({ body: paymentBody });

        if (payment && payment.id) {
            console.log(`💳 [API] PIX Criado. ID: ${payment.id} | User: ${userId} | Valor: ${amount}`);
            res.json({
                success: true,
                data: {
                    paymentId: payment.id,
                    qrCodeBase64: `data:image/png;base64,${payment.point_of_interaction.transaction_data.qr_code_base64}`,
                    pixCopiaECola: payment.point_of_interaction.transaction_data.qr_code
                }
            });
        } else {
            throw new Error('Sem ID no retorno do MP.');
        }

    } catch (error) {
        console.error('❌ [API] Erro criação:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Webhook (Recebe notificação do Mercado Pago)
app.post('/api/webhook/mercadopago', async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    if (!paymentId) return res.status(200).send('OK');

    try {
        const payment = await paymentClient.get({ id: String(paymentId) });
        const status = payment.status;

        console.log(`🔔 [Webhook] ID: ${paymentId} | Status: ${status}`);

        if (status === 'approved') {
            const userId = payment.metadata.user_id;
            const amount = payment.transaction_amount;

            if (userId && amount) {
                // 1. Atualiza Saldo no Firebase
                await adicionarSaldoUsuario(userId, amount);
                
                // 2. Avisa o Frontend (popup e som)
                avisarFrontend(String(paymentId), 'approved');
            } else {
                console.error('❌ [Webhook] Metadados (user_id) não encontrados no pagamento.');
            }
        }
    } catch (error) {
        console.error('❌ [Webhook] Erro:', error.message);
    }
    
    res.status(200).send('OK');
});

// Consultar Saldo (Lê do Firebase)
app.get('/api/user/:uid/balance', async (req, res) => {
    const { uid } = req.params;

    if (!db) {
        // Se o banco não conectou, retorna 0 mas avisa erro
        return res.json({ success: true, data: { balance: 0.00 }, warning: 'DB Offline' });
    }

    try {
        // Caminho exato igual ao auth.js
        const userDoc = await db.collection('SLICED').doc('data').collection('Usuários').doc(uid).get();

        if (userDoc.exists) {
            const dados = userDoc.data();
            const saldo = parseFloat(dados.saldo) || 0.00;
            res.json({ success: true, data: { balance: saldo } });
        } else {
            res.status(404).json({ success: false, message: 'Usuário não encontrado' });
        }
    } catch (error) {
        console.error('❌ [API] Erro ao ler saldo:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

// Solicitação de Saque
app.post('/api/withdraw/request', async (req, res) => {
    // Exemplo básico (aqui você deveria descontar do saldo também)
    console.log('💸 [API] Saque solicitado:', req.body);
    res.json({ success: true, message: 'Solicitação de saque recebida com sucesso.' });
});

// ==================================================================
// 6. INICIALIZAÇÃO
// ==================================================================
server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 SERVIDOR RODANDO NA PORTA ${PORT}`);
    console.log(`📡 Webhook URL: ${BASE_URL}/api/webhook/mercadopago`);
    console.log(`🔥 Banco de Dados: ${db ? 'CONECTADO ✅' : 'DESCONECTADO ❌'}`);
    console.log(`=============================================`);
});