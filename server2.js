// ==================================================================
// ARQUIVO: server2.js (Versão Final: Secret Files + Webhook + DB Fix)
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
// 1. CONFIGURAÇÃO FIREBASE ADMIN (COM SECRET FILES)
// ==================================================================
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;

try {
    let serviceAccount;

    // A. CAMINHO NO RENDER (Secret Files)
    // Este arquivo é injetado pelo Render na pasta segura
    const renderPath = '/etc/secrets/sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';
    
    // B. CAMINHOS LOCAIS (Para testar no seu PC)
    const localPathGen = './serviceAccountKey.json';
    const localPathSpec = './sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';

    // LÓGICA DE CARREGAMENTO INTELIGENTE:
    if (fs.existsSync(renderPath)) {
        console.log('✅ [Firebase] Carregando via Secret File (Render)...');
        serviceAccount = require(renderPath);
    } 
    else if (fs.existsSync(localPathGen)) {
        console.log('✅ [Firebase] Carregando via Arquivo Local (serviceAccountKey.json)...');
        serviceAccount = require(localPathGen);
    }
    else if (fs.existsSync(localPathSpec)) {
        console.log('✅ [Firebase] Carregando via Arquivo Local Específico...');
        serviceAccount = require(localPathSpec);
    }
    else if (process.env.FIREBASE_CREDENTIALS) {
        console.log('✅ [Firebase] Carregando via Variável de Ambiente...');
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    }
    else {
        throw new Error('Nenhuma credencial do Firebase encontrada.');
    }

    // Inicializa o App se necessário
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }

    db = admin.firestore();
    console.log('🔥 [Firebase] Admin conectado e pronto!');

} catch (error) {
    console.warn('⚠️ [AVISO] Falha ao conectar no Firebase.');
    console.warn('❌ Erro:', error.message);
}

// ==================================================================
// 2. CONFIGURAÇÕES GERAIS DO SERVIDOR
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
// 4. FUNÇÃO DE BANCO DE DADOS (CRIA CAMPO SALDO SE NÃO EXISTIR)
// ==================================================================
async function adicionarSaldoUsuario(uid, valor) {
    if (!db) {
        console.error('❌ [DB] Erro: Banco de dados desconectado.');
        return;
    }

    // O caminho EXATO conforme seu auth.js:
    const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(uid);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(userRef);
            
            if (!doc.exists) {
                throw new Error(`Usuário com UID ${uid} não encontrado no banco.`);
            }

            const dadosAtuais = doc.data();
            
            // Verifica se o campo saldo existe. Se não, assume 0.
            const saldoAtual = Number(dadosAtuais.saldo) || 0; 
            const valorAdicionar = Number(valor);
            
            if (isNaN(valorAdicionar)) throw new Error('Valor inválido');

            const novoSaldo = saldoAtual + valorAdicionar;

            // 'merge: true' cria o campo saldo se ele não existir
            t.set(userRef, { 
                saldo: novoSaldo,
                ultimaRecarga: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log(`✅ [DB] SUCESSO! UID: ${uid}`);
            console.log(`💰 Saldo Anterior: R$ ${saldoAtual.toFixed(2)} | Novo: R$ ${novoSaldo.toFixed(2)}`);
        });
    } catch (e) {
        console.error('❌ [DB] FALHA AO SALVAR SALDO:', e.message);
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
            metadata: { user_id: userId } // ID necessário para o webhook
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

// Webhook (Recebe notificação do Mercado Pago e Atualiza Saldo)
app.post('/api/webhook/mercadopago', async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    
    // Responde rápido para o MP
    res.status(200).send('OK');

    if (!paymentId) return;

    try {
        const payment = await paymentClient.get({ id: String(paymentId) });
        const status = payment.status;

        console.log(`🔔 [Webhook] ID: ${paymentId} | Status: ${status}`);

        if (status === 'approved') {
            const userId = payment.metadata.user_id;
            const amount = payment.transaction_amount;

            if (userId && amount) {
                // 1. Atualiza o banco
                await adicionarSaldoUsuario(userId, amount);
                // 2. Avisa o frontend
                avisarFrontend(String(paymentId), 'approved');
            } else {
                console.error('❌ [Webhook] Metadados incompletos (sem user_id).');
            }
        }
    } catch (error) {
        console.error('❌ [Webhook] Erro:', error.message);
    }
});

// Consultar Saldo (Lê do Firebase)
app.get('/api/user/:uid/balance', async (req, res) => {
    const { uid } = req.params;

    if (!db) return res.json({ success: true, data: { balance: 0.00 }, warning: 'DB Offline' });

    try {
        // Caminho exato igual ao auth.js
        const userDoc = await db.collection('SLICED').doc('data').collection('Usuários').doc(uid).get();

        if (userDoc.exists) {
            const dados = userDoc.data();
            const saldo = parseFloat(dados.saldo) || 0.00;
            res.json({ success: true, data: { balance: saldo } });
        } else {
            // Se o usuário existe mas não tem saldo, retorna 0
            res.json({ success: true, data: { balance: 0.00 } });
        }
    } catch (error) {
        console.error('❌ [API] Erro ao ler saldo:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

// Solicitação de Saque (Futuro)
app.post('/api/withdraw/request', async (req, res) => {
    console.log('💸 [API] Saque solicitado:', req.body);
    res.json({ success: true, message: 'Solicitação recebida.' });
});

// ==================================================================
// 6. INICIALIZAÇÃO
// ==================================================================
server.listen(PORT, () => {
    console.log(`=============================================`);
    console.log(`🚀 SERVIDOR RODANDO NA PORTA ${PORT}`);
    console.log(`🔥 Firebase pronto para gravar saldo!`);
    console.log(`=============================================`);
});