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
// 4. LÓGICA DE SALDO BLINDADA (CORREÇÃO DOS R$ 6,00 + AFILIADOS)
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

            // 5. SISTEMA DE AFILIADOS
            // Se o usuário foi indicado por alguém e o valor >= R$10, creditar comissão
            if (dados.indicadoPor && valorAdicionar >= 10) {
                const indicadorUid = dados.indicadoPor;
                const comissao = 0.50; // R$ 0,50 por indicação
                
                // Buscar o indicador
                const indicadorRef = db.collection('SLICED').doc('data').collection('Usuários').doc(indicadorUid);
                const indicadorDoc = await t.get(indicadorRef);
                
                if (indicadorDoc.exists) {
                    const indicadorDados = indicadorDoc.data();
                    const saldoAfiliadoAtual = Number(indicadorDados['afiliado-saldo']) || 0;
                    const novoSaldoAfiliado = saldoAfiliadoAtual + comissao;
                    
                    // Atualizar saldo de afiliado do indicador
                    t.set(indicadorRef, {
                        'afiliado-saldo': novoSaldoAfiliado
                    }, { merge: true });
                    
                    // Registrar a comissão na subcoleção do indicador
                    const comissaoRef = indicadorRef.collection('Comissoes-Afiliado').doc();
                    t.set(comissaoRef, {
                        usuarioIndicado: uid,
                        nomeIndicado: dados.nomeCompleto,
                        valorDeposito: valorAdicionar,
                        comissao: comissao,
                        data: admin.firestore.FieldValue.serverTimestamp(),
                        paymentId: String(paymentId)
                    });
                    
                    console.log(`💰 [AFILIADO] R$ ${comissao.toFixed(2)} creditado para ${indicadorUid} (indicou ${uid})`);
                }
            }
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

// ==================================================================
// 6. ENDPOINTS DE JOGO (APOSTAS)
// ==================================================================

// Cobra entrada do jogo
app.post('/api/game/charge', async (req, res) => {
    if (!db) return res.status(500).json({ success: false, message: 'Banco de dados indisponível' });
    
    try {
        const { userId, amount, gameType, betValue, description } = req.body;
        
        if (!userId || !amount) {
            return res.status(400).json({ success: false, message: 'Dados incompletos' });
        }

        const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(userId);
        
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            
            if (!userDoc.exists) {
                throw new Error('Usuário não encontrado');
            }

            const dados = userDoc.data();
            const saldoAtual = Number(dados.saldo) || 0;
            const valorCobrar = Number(amount);

            if (saldoAtual < valorCobrar) {
                throw new Error(`Saldo insuficiente. Você tem R$ ${saldoAtual.toFixed(2)}, mas precisa de R$ ${valorCobrar.toFixed(2)}`);
            }

            const novoSaldo = saldoAtual - valorCobrar;

            // Atualiza saldo
            t.update(userRef, { 
                saldo: novoSaldo,
                ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            });

            // Registra transação
            const transacaoRef = userRef.collection('Transacoes').doc();
            t.set(transacaoRef, {
                tipo: 'cobranca_jogo',
                gameType: gameType || 'desconhecido',
                betValue: betValue || 0,
                valor: -valorCobrar,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                descricao: description || 'Entrada em jogo',
                data: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`💰 [Game] Cobrado R$ ${valorCobrar.toFixed(2)} de ${userId} - Novo saldo: R$ ${novoSaldo.toFixed(2)}`);
        });

        res.json({ success: true, message: 'Entrada cobrada com sucesso' });

    } catch (e) {
        console.error('❌ [Game] Erro ao cobrar entrada:', e.message);
        res.status(400).json({ success: false, message: e.message });
    }
});

// Credita prêmio ao vencedor
app.post('/api/game/credit', async (req, res) => {
    if (!db) return res.status(500).json({ success: false, message: 'Banco de dados indisponível' });
    
    try {
        const { userId, amount, gameType, betValue, description } = req.body;
        
        if (!userId || !amount) {
            return res.status(400).json({ success: false, message: 'Dados incompletos' });
        }

        const userRef = db.collection('SLICED').doc('data').collection('Usuários').doc(userId);
        
        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            
            if (!userDoc.exists) {
                throw new Error('Usuário não encontrado');
            }

            const dados = userDoc.data();
            const saldoAtual = Number(dados.saldo) || 0;
            const valorCreditar = Number(amount);
            const novoSaldo = saldoAtual + valorCreditar;

            // Atualiza saldo
            t.update(userRef, { 
                saldo: novoSaldo,
                ultimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
            });

            // Registra transação
            const transacaoRef = userRef.collection('Transacoes').doc();
            t.set(transacaoRef, {
                tipo: 'premio_jogo',
                gameType: gameType || 'desconhecido',
                betValue: betValue || 0,
                valor: valorCreditar,
                saldoAnterior: saldoAtual,
                saldoNovo: novoSaldo,
                descricao: description || 'Prêmio de jogo',
                data: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`🎉 [Game] Creditado R$ ${valorCreditar.toFixed(2)} para ${userId} - Novo saldo: R$ ${novoSaldo.toFixed(2)}`);
        });

        res.json({ success: true, message: 'Prêmio creditado com sucesso' });

    } catch (e) {
        console.error('❌ [Game] Erro ao creditar prêmio:', e.message);
        res.status(400).json({ success: false, message: e.message });
    }
});

app.post('/api/withdraw/request', (req, res) => res.json({ success: true }));

server.listen(PORT, () => console.log(`🚀 Server ON na porta ${PORT}`));