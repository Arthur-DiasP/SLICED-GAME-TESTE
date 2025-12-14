// --- ARQUIVO: server2.js (Final: MP + Firebase Admin + WebSocket + Saque Seguro + Webhook Otimizado) ---

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const admin = require('firebase-admin'); 
const { WebSocketServer } = require('ws');

// Carrega as variáveis do arquivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001; 

// ===== CONFIGURAÇÃO DE URLS =====
const HOST = process.env.HOST || 'localhost'; 
const FRONTEND_LOCAL_URL = `http://${HOST}:${PORT}`;

// URL base do Render (para Webhooks). Deve ser o domínio HTTPS/WSS público.
const RENDER_BACKEND_URL = 'https://sliced-game-front-back-render.onrender.com';
const BASE_URL = process.env.USER_BASE_URL || RENDER_BACKEND_URL; 

// ===== DADOS MERCADO PAGO (Via .env) =====
const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

// ==================================================================
// 💡 INICIALIZAÇÃO DO FIREBASE ADMIN SDK E FUNÇÕES DE SALDO
// ==================================================================
let firestore;
let FieldValue;

try {
    // Carrega o arquivo de credenciais do Firebase Admin
    const serviceAccount = require('./sliced-4f1e3-firebase-adminsdk-fbsvc-3a6db902e2.json'); 

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });

    firestore = admin.firestore();
    FieldValue = admin.firestore.FieldValue;
    console.log('✅ Firebase Admin SDK configurado com sucesso.');

} catch (error) {
    console.error('❌ ERRO ao inicializar o Firebase Admin SDK (Chave de Serviço):', error.message);
}

/**
 * Atualiza o saldo do usuário NO DOCUMENTO DE CADASTRO.
 * @param {string} userId O UID do usuário.
 * @param {number} valor O valor a ser incrementado (positivo ou negativo).
 */
async function atualizarSaldoUsuario(userId, valor) {
    if (!firestore) return console.error('Firestore não inicializado.');
    
    // 🎯 CHAVE: O saldo é atualizado NO DOCUMENTO DO USUÁRIO.
    const userRef = firestore.collection('SLICED').doc('data').collection('Usuários').doc(userId);
    
    try {
        await userRef.update({
            balance: FieldValue.increment(valor)
        });
        console.log(`✅ [DB] Saldo de ${userId} atualizado com ${valor > 0 ? '+' : ''}R$ ${valor.toFixed(2)}.`);
        return true;
    } catch (error) {
        // Se o documento existir, mas o campo balance não, ele o cria.
        if (error.code === 5 || error.code === 'not-found') { 
            console.log(`⚠️ Campo 'balance' não encontrado. Criando campo com R$ ${valor.toFixed(2)}.`);
            // Usa merge: true para não apagar nome, email, etc.
            await userRef.set({ balance: valor, uid: userId }, { merge: true });
            return true;
        }
        console.error(`❌ [DB] Erro ao atualizar saldo para ${userId}:`, error.message);
        return false;
    }
}
// ==================================================================


// Configuração do SDK do Mercado Pago
let mercadoPagoClient;
let paymentClient;

if (!MERCADO_PAGO_ACCESS_TOKEN) {
    console.error('⚠️  ERRO CRÍTICO: Token de acesso do Mercado Pago não encontrado no arquivo .env!');
} else {
    try {
        mercadoPagoClient = new MercadoPagoConfig({
            accessToken: MERCADO_PAGO_ACCESS_TOKEN,
            options: {
                timeout: 5000,
            }
        });
        paymentClient = new Payment(mercadoPagoClient);
        console.log('✅ SDK do Mercado Pago configurado com sucesso.');
    } catch (error) {
        console.error('❌ ERRO ao inicializar o SDK do Mercado Pago:', error.message);
    }
}

// --- MIDDLEWARES ---
app.use(cors());
app.use(bodyParser.json());

// Configuração para servir arquivos estáticos e rotas HTML
app.use(express.static(path.join(__dirname)));
app.use('/usuário', express.static(path.join(__dirname, 'usuário')));


// ==================================================================
// 💡 CONFIGURAÇÃO WEB SOCKET
// ==================================================================
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const paymentClients = new Map(); 

/**
 * Notifica o cliente via WebSocket sobre o status do pagamento.
 */
function notifyClient(paymentId, status, valor) {
    if (paymentClients.has(paymentId)) {
        const ws = paymentClients.get(paymentId);
        if (ws.readyState === 1) { // 1 === WebSocket.OPEN
            console.log(`🔊 [WS] Enviando status '${status}' para o paymentId: ${paymentId}`);
            ws.send(JSON.stringify({ 
                type: 'payment_status', 
                status: status, 
                paymentId: paymentId,
                valor: valor 
            }));
            
            // Fecha a conexão após um status final
            if (status === 'approved' || status === 'rejected' || status === 'cancelled') {
                setTimeout(() => {
                    ws.close();
                    paymentClients.delete(paymentId);
                }, 500); 
            }
        }
    }
}

wss.on('connection', (ws) => {
    let paymentIdForClient = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'register' && data.paymentId) {
                paymentIdForClient = data.paymentId;
                paymentClients.set(paymentIdForClient, ws);
                console.log(`🔗 [WS] Cliente registrado para o paymentId: ${paymentIdForClient}`);
            }
        } catch (e) {
            console.error('❌ [WS] Erro ao processar mensagem JSON:', message);
        }
    });

    ws.on('close', () => {
        if (paymentIdForClient) {
            paymentClients.delete(paymentIdForClient);
            console.log(`💔 [WS] Conexão encerrada para o paymentId: ${paymentIdForClient}`);
        }
    });
});
// ==================================================================


// ROTA POST: GERAR PIX (MERCADO PAGO)
app.post('/api/deposit/create', async (req, res) => {
    if (!paymentClient) {
        return res.status(500).json({ 
            success: false, 
            message: 'Erro de configuração do SDK Mercado Pago.' 
        });
    }

    try {
        const { amount, userId, email, firstName, lastName, payerCpf } = req.body;
        
        const paymentData = {
            transaction_amount: parseFloat(amount),
            description: `Depósito SLICED - ${userId}`,
            payment_method_id: 'pix',
            payer: {
                email: email,
                first_name: firstName,
                last_name: lastName,
                identification: {
                    type: 'CPF',
                    number: payerCpf
                }
            },
            notification_url: `${BASE_URL}/api/webhook/mercadopago`,
            metadata: {
                user_id: userId // CRÍTICO: Usado para identificar quem deve receber o crédito
            }
        };

        const payment = await paymentClient.create({ body: paymentData });

        if (payment && payment.id) {
            
            const qrCodeBase64 = payment.point_of_interaction?.transaction_data?.qr_code_base64;
            const pixCopiaECola = payment.point_of_interaction?.transaction_data?.qr_code;

            res.status(200).json({
                success: true,
                data: {
                    paymentId: payment.id, 
                    status: payment.status,
                    qrCodeBase64: `data:image/png;base64,${qrCodeBase64}`,
                    pixCopiaECola: pixCopiaECola
                }
            });

        } else {
             console.error('❌ Erro Mercado Pago na criação:', payment);
             return res.status(400).json({ success: false, message: 'Falha ao criar o pagamento PIX.' });
        }

    } catch (error) {
        const errorMessage = error.message || 'Erro desconhecido';
        return res.status(500).json({ 
            success: false, 
            message: `Erro interno ao processar API: ${errorMessage}`,
            detail: error.response?.data || error
        });
    }
});


// ==================================================================
// ROTA WEBHOOK (MERCADO PAGO) - OTIMIZADA PARA O FORMATO CONFIRMADO
// ==================================================================
app.post('/api/webhook/mercadopago', async (req, res) => {
    // 1. Tenta obter o ID do pagamento do CORPO (Formato JSON confirmado: req.body.data.id)
    let paymentId = req.body.data ? req.body.data.id : null;
    let topic = req.body.type || req.body.topic || null;

    // 2. Fallback para parâmetros de QUERY (segurança)
    if (!paymentId) {
        paymentId = req.query.id || req.query['data.id'] || null;
        topic = req.query.topic || req.query.type;
    }
    
    // Converte para string e garante que o tipo é 'payment'
    if (paymentId) paymentId = String(paymentId);
    
    if (!paymentId || topic !== 'payment') {
        // Responde 200 para evitar que o MP tente reenviar a notificação inútil
        return res.status(200).send('OK - Notificação não processada (tópico diferente ou ID ausente)');
    }
    
    try {
        // 1. Consultar o Status Real do Pagamento no MP usando o ID CORRETO
        const payment = await paymentClient.get({ id: paymentId });
        const status = payment.status; 
        const valor = payment.transaction_amount;
        const userId = payment.metadata.user_id; 

        console.log(`🔔 Webhook PROCESSADO: Payment ID ${paymentId}. Status: ${status}. User: ${userId}. Valor: R$ ${valor}`);

        if (status === 'approved') {
            // A. AÇÃO CRÍTICA: Atualiza o campo 'balance' no documento do usuário
            await atualizarSaldoUsuario(userId, valor);
        }
        
        // B. NOTIFICAÇÃO DO USUÁRIO EM TEMPO REAL
        notifyClient(paymentId, status, valor);
        
        res.status(200).send('OK');
        
    } catch (error) {
        console.error('❌ Erro Crítico ao processar webhook (Busca MP falhou, ID:', paymentId, '):', error.message);
        // Responde 200 para o Mercado Pago não entrar em loop de erro
        res.status(200).send('OK - Falha na busca, veja logs.');
    }
});

// ==================================================================
// 🔑 ROTA: BUSCAR SALDO REAL DO FIRESTORE (Lê do Documento de Cadastro)
// ==================================================================
app.get('/api/user/:uid/balance', async (req, res) => {
    const userId = req.params.uid;

    if (!firestore) {
        return res.status(500).json({ success: false, message: 'Serviço de Banco de Dados indisponível.' });
    }

    try {
        // Lê o campo 'balance' do documento de cadastro do usuário.
        const userRef = firestore.collection('SLICED').doc('data').collection('Usuários').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.warn(`Usuário não encontrado no Firestore: ${userId}. Retornando saldo zero.`);
            return res.json({ success: true, data: { balance: 0.00 } });
        }

        const userData = userDoc.data();
        const balance = userData.balance !== undefined ? parseFloat(userData.balance) : 0.00;

        res.json({ 
            success: true, 
            data: { 
                balance: balance.toFixed(2)
            } 
        });

    } catch (error) {
        console.error('❌ Erro ao buscar saldo no Firestore:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno ao consultar saldo.' 
        });
    }
});


// ==================================================================
// 💸 ROTA: SOLICITAÇÃO DE SAQUE PIX (Com Transação de Saldo)
// ==================================================================
app.post('/api/withdraw/request', async (req, res) => {
    if (!firestore) {
        return res.status(500).json({ success: false, message: 'Serviço de Banco de Dados indisponível.' });
    }

    try {
        const { userId, amount, pixKey, pixKeyType } = req.body;
        const withdrawAmount = parseFloat(amount);

        if (!userId) {
             return res.status(400).json({ success: false, message: 'ID do usuário ausente.' });
        }

        // 1. Validação do Mínimo de Saque (R$ 20,00)
        if (isNaN(withdrawAmount) || withdrawAmount < 20.00) {
             return res.status(400).json({ success: false, message: 'O valor mínimo para saque é de R$ 20,00.' });
        }
        
        console.log(`\n💸 [Server 2] Tentativa de Saque`);
        console.log(`👤 Usuário: ${userId} | Valor Solicitado: R$ ${withdrawAmount}`);
        console.log(`🔑 Chave PIX (${pixKeyType}): ${pixKey}`);

        const userRef = firestore.collection('SLICED').doc('data').collection('Usuários').doc(userId);

        // 2. Transação Firestore: Garante a integridade da dedução do saldo
        const result = await firestore.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new Error("Usuário não encontrado.");
            }

            const userData = userDoc.data();
            const currentBalance = userData.balance || 0;

            // 3. Validação de Saldo Suficiente
            if (currentBalance < withdrawAmount) {
                throw new Error("Saldo Insuficiente"); 
            }

            // 4. Dedução Atômica
            const newBalance = currentBalance - withdrawAmount;
            
            // Atualiza o campo 'balance' no documento do usuário
            transaction.update(userRef, { 
                balance: newBalance
            });

            return { success: true, newBalance: newBalance };
        });

        // Se a transação foi bem-sucedida:
        console.log(`✅ [DB] Dedução de R$ ${withdrawAmount} realizada. Novo Saldo: R$ ${result.newBalance}`);
        
        res.json({ 
            success: true, 
            message: 'Solicitação de saque recebida. O saldo foi deduzido e o PIX será processado em 24h.' 
        });
        
    } catch (error) {
        let errorMessage = 'Erro interno ao processar saque.';

        // Mapeamento de erros específicos
        if (error.message === "Saldo Insuficiente") {
            errorMessage = 'Saldo insuficiente para este saque.';
        } else if (error.message === "Usuário não encontrado.") {
             errorMessage = 'Usuário não registrado no sistema.';
        } else {
             console.error('❌ Erro Crítico na Transação de Saque:', error);
        }

        res.status(400).json({ 
            success: false, 
            message: errorMessage
        });
    }
});


// ==================================================================
// INICIALIZAÇÃO DO SERVIDOR (HTTP + WS)
// ==================================================================
server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 SERVER 2 RODANDO NA PORTA ${PORT}`);
    console.log(`=================================================`);
    console.log(`  🌐 HOST (Browser): ${FRONTEND_LOCAL_URL}`);
    console.log(`  📢 WEBHOOKS MP: ${BASE_URL}/api/webhook/mercadopago`);
    console.log(`  📡 WebSocket Server Inicializado.`);
    console.log(`=================================================`);
});