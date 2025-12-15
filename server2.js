// ==================================================================
// ARQUIVO: server2.js (Versão Final: Secret Files + Idempotência + Webhook)
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
// 1. CONFIGURAÇÃO FIREBASE ADMIN (COM CARREGAMENTO INTELIGENTE)
// ==================================================================
const admin = require('firebase-admin');
const fs = require('fs');

let db = null;

try {
    let serviceAccount;

    // A. CAMINHO NO RENDER (Secret Files)
    // O arquivo que você salvou na aba "Secret Files" do Render
    const renderPath = '/etc/secrets/sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';
    
    // B. CAMINHOS LOCAIS (Para testar no seu computador)
    const localPathGen = './serviceAccountKey.json';
    const localPathSpec = './sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json';

    // LÓGICA DE CARREGAMENTO:
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
        // Fallback para Variável de Ambiente
        console.log('✅ [Firebase] Carregando via Variável de Ambiente...');
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);
    }
    else {
        throw new Error('Nenhuma credencial do Firebase encontrada (Secret File ou Local).');
    }

    // Inicializa o App
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
// 4. LÓGICA DE SALDO E IDEMPOTÊNCIA (EVITA PAGAMENTO DUPLO)
// ==================================================================
async function processarPagamento(uid, valor, paymentId) {
    if (!db) {
        console.error('❌ [DB] Erro: Banco de dados desconectado.');
        return false;
    }

    // Referência do Usuário (Caminho igual ao auth.js)
    const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(uid);
    // Referência da Transação (Subcoleção para controle)
    const transacaoRef = userRef.collection('Transacoes').doc(String(paymentId));

    try {
        await db.runTransaction(async (t) => {
            // 1. Leituras (Obrigatório ser antes das escritas)
            const userDoc = await t.get(userRef);
            const transDoc = await t.get(transacaoRef);

            if (!userDoc.exists) {
                throw new Error(`Usuário ${uid} não encontrado.`);
            }

            // 🛑 CHECK DE DUPLICIDADE: Se já existe recibo, para aqui.
            if (transDoc.exists) {
                console.log(`✋ [DB] Pagamento ID ${paymentId} já processado. Ignorando.`);
                return; 
            }

            // 2. Cálculos
            const dadosAtuais = userDoc.data();
            const saldoAtual = Number(dadosAtuais.saldo) || 0;
            const valorAdicionar = Number(valor);

            if (isNaN(valorAdicionar)) throw new Error('Valor inválido');

            const novoSaldo = saldoAtual + valorAdicionar;

            // 3. Gravações (Atômicas)
            
            // Atualiza Saldo
            t.set(userRef, { 
                saldo: novoSaldo,
                ultimaRecarga: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Cria Recibo (Impede reprocessamento)
            t.set(transacaoRef, {
                valor: valorAdicionar,
                data: admin.firestore.FieldValue.serverTimestamp(),
                tipo: 'deposito_pix',
                status: 'aprovado',
                paymentId: String(paymentId)
            });

            console.log(`✅ [DB] SALDO ATUALIZADO! UID: ${uid}`);
            console.log(`💰 Anterior: R$ ${saldoAtual.toFixed(2)} | Novo: R$ ${novoSaldo.toFixed(2)}`);
        });
        return true;
    } catch (e) {
        console.error('❌ [DB] FALHA NA TRANSAÇÃO:', e.message);
        return false;
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
            metadata: { user_id: userId } // ID fundamental para o webhook
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

// Webhook (Recebe notificação do MP)
app.post('/api/webhook/mercadopago', async (req, res) => {
    const paymentId = req.query.id || (req.body.data && req.body.data.id);
    
    // Responde rápido para o MP não reenviar
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
                // 1. Processa no Banco (com trava de segurança)
                await processarPagamento(userId, amount, String(paymentId));
                
                // 2. Avisa o Frontend (WebSocket)
                avisarFrontend(String(paymentId), 'approved');
            } else {
                console.error('❌ [Webhook] Metadados incompletos.');
            }
        }
    } catch (error) {
        console.error('❌ [Webhook] Erro:', error.message);
    }
});

// Consultar Saldo (GET)
app.get('/api/user/:uid/balance', async (req, res) => {
    const { uid } = req.params;

    if (!db) return res.json({ success: true, data: { balance: 0.00 }, warning: 'DB Offline' });

    try {
        const userDoc = await db.collection('SLICED').doc('data').collection('Usuários').doc(uid).get();

        if (userDoc.exists) {
            const dados = userDoc.data();
            // Garante retorno numérico
            const saldo = Number(dados.saldo); 
            res.json({ success: true, data: { balance: isNaN(saldo) ? 0.00 : saldo } });
        } else {
            // Usuário existe mas não tem saldo
            res.json({ success: true, data: { balance: 0.00 } });
        }
    } catch (error) {
        console.error('❌ [API] Erro ao ler saldo:', error.message);
        res.status(500).json({ success: false, message: 'Erro interno' });
    }
});

// Solicitação de Saque
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
    console.log(`🛡️ Idempotência Ativa (Sem pagamentos duplos)`);
    console.log(`=============================================`);
});