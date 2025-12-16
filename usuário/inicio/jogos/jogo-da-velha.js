// --- START OF FILE jogo-da-velha.js ---

// Importar configuração do Firebase
import { db } from './firebase-config.js';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    query,
    deleteDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Importar widget de saldo
import { initBalanceWidget } from '../../../controle-dados/balance-widget.js';

// =============================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// =============================================
const BET_VALUES = [1, 10, 30, 50, 100, 200, 350, 500, 1000, 2000, 3000, 5000];
const TURN_LIMIT = 10; // Tempo limite por jogada em segundos
const PLATFORM_FEE = 0.20; // Taxa da plataforma (20%)

// Configuração da API (mesma lógica do perfil.js e balance-widget.js)
const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
const API_BASE = (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online')
    ? `https://${PROD_DOMAIN}/api`
    : 'http://localhost:3001/api';

let gameState = {
    playerId: null,
    playerName: '',
    matchId: null,
    selectedBet: 0,
    playerSymbol: null,     // 'X' ou 'O'
    isPlayerTurn: false,
    board: Array(9).fill(null),
    scores: { X: 0, O: 0 },
    round: 1,

    // Listeners do Firebase (para limpar depois)
    waitingListener: null,
    matchListener: null,

    // Flags de estado
    gameActive: false,
    inQueue: false,
    timerInterval: null,

    // Estado específico de Sala Privada
    privateRoomCode: null,
    isPrivate: false
};

let lobbyListeners = []; // Listeners dos contadores do lobby público

// =============================================
// SISTEMA DE VIEWS (NAVEGAÇÃO ENTRE TELAS)
// =============================================
function switchView(viewId) {
    // Lista de todas as "páginas" do jogo
    const views = ['lobbyView', 'privateSetupView', 'waitingView', 'matchmakingView', 'gameView'];

    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block'; // ou flex, dependendo do CSS, mas block funciona com .view-section
}

// =============================================
// ANIMAÇÃO DE MATCHMAKING (ESTILO 8 BALL POOL)
// =============================================
function showMatchmakingAnimation(matchData) {
    console.log('🎬 [Matchmaking] Iniciando animação...');
    
    // Muda para a view de matchmaking
    switchView('matchmakingView');
    
    // Preenche os dados
    const betValue = matchData.betValue || gameState.selectedBet;
    const entryFee = betValue / 2;
    
    // Valor da sala
    document.getElementById('matchmakingBetValue').innerText = 
        betValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Player 1 (sempre X)
    const isPlayer1 = gameState.playerId === matchData.player1.id;
    document.getElementById('matchmakingPlayer1Name').innerText = 
        isPlayer1 ? 'Você' : matchData.player1.name;
    document.getElementById('matchmakingPlayer1Fee').innerText = 
        entryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Player 2 (sempre O)
    document.getElementById('matchmakingPlayer2Name').innerText = 
        !isPlayer1 ? 'Você' : matchData.player2.name;
    document.getElementById('matchmakingPlayer2Fee').innerText = 
        entryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Valores das moedas
    const formattedEntry = entryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formattedTotal = betValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    document.getElementById('coinLeftValue').innerText = formattedEntry;
    document.getElementById('coinRightValue').innerText = formattedEntry;
    document.getElementById('coinTotalValue').innerText = formattedTotal;
    
    console.log('✅ [Matchmaking] Animação configurada');
    console.log(`   Player 1: ${matchData.player1.name} (X)`);
    console.log(`   Player 2: ${matchData.player2.name} (O)`);
    console.log(`   Aposta: ${formattedTotal}`);
    
    // Após 10 segundos, inicia o jogo
    setTimeout(() => {
        console.log('🎮 [Matchmaking] Transição para o jogo...');
        const symbol = isPlayer1 ? 'X' : 'O';
        setupGame(matchData.matchId, symbol);
    }, 10000); // Aumentado para 10 segundos
}

// =============================================
// INICIALIZAÇÃO
// =============================================
function generatePlayerId() {
    return 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

async function init() {
    // Busca o usuário logado do localStorage
    const sessao = localStorage.getItem('spfc_user_session');
    if (!sessao) {
        alert('Você precisa estar logado para jogar!');
        window.location.href = '/usuário/inicio/inicio.html';
        return;
    }

    const userData = JSON.parse(sessao);
    gameState.playerId = userData.uid;
    gameState.playerName = userData.nomeCompleto || 'Jogador';
    console.log(`Logado como: ${gameState.playerName} (${gameState.playerId})`);

    // Inicializa o widget de saldo
    initBalanceWidget(gameState.playerId);

    gameState.inQueue = false;

    // Inicia no Lobby Público
    renderBetGrid('betGrid', false); // Renderiza cards públicos com contadores
    switchView('lobbyView');
}

// =============================================
// FUNÇÕES DE GERENCIAMENTO DE SALDO
// =============================================

/**
 * Verifica se o usuário tem saldo suficiente
 * @param {number} amount - Valor necessário
 * @returns {Promise<boolean>}
 */
async function checkBalance(amount) {
    try {
        const response = await fetch(`${API_BASE}/user/${gameState.playerId}/balance`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const balance = parseFloat(result.data.balance) || 0;
            return balance >= amount;
        }
        return false;
    } catch (error) {
        console.error('Erro ao verificar saldo:', error);
        return false;
    }
}

/**
 * Cobra a entrada da partida (metade do valor da sala)
 * @param {number} betValue - Valor total da sala
 * @returns {Promise<boolean>} - true se sucesso
 */
async function chargeEntryFee(betValue) {
    const entryFee = betValue / 2; // Metade do valor da sala
    
    try {
        const response = await fetch(`${API_BASE}/game/charge`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: gameState.playerId,
                amount: entryFee,
                gameType: 'jogo-da-velha',
                betValue: betValue,
                description: `Entrada no Jogo da Velha - Sala R$ ${betValue.toFixed(2)}`
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Cobrado R$ ${entryFee.toFixed(2)} de entrada`);
            return true;
        } else {
            console.error('❌ Erro ao cobrar entrada:', result.message);
            alert(result.message || 'Erro ao processar pagamento da entrada');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao cobrar entrada:', error);
        alert('Erro ao processar pagamento. Tente novamente.');
        return false;
    }
}

/**
 * Credita o prêmio ao vencedor (80% do valor total da sala)
 * @param {number} betValue - Valor total da sala
 * @returns {Promise<boolean>}
 */
async function creditWinnerPrize(betValue) {
    const totalPrize = betValue; // Valor total da sala
    const winnerPrize = totalPrize * (1 - PLATFORM_FEE); // 80% do total
    
    try {
        const response = await fetch(`${API_BASE}/game/credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: gameState.playerId,
                amount: winnerPrize,
                gameType: 'jogo-da-velha',
                betValue: betValue,
                description: `Vitória no Jogo da Velha - Sala R$ ${betValue.toFixed(2)}`
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Creditado R$ ${winnerPrize.toFixed(2)} ao vencedor`);
            return true;
        } else {
            console.error('❌ Erro ao creditar prêmio:', result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao creditar prêmio:', error);
        return false;
    }
}

/**
 * Renderiza os botões de aposta.
 * @param {string} elementId - ID do container HTML (betGrid ou privateBetGrid)
 * @param {boolean} isPrivateMode - Se true, não mostra contadores de jogadores online
 */
function renderBetGrid(elementId, isPrivateMode) {
    // Se for modo público, limpa listeners antigos para não duplicar
    if (!isPrivateMode) clearLobbyListeners();

    const grid = document.getElementById(elementId);
    if (!grid) return;
    grid.innerHTML = '';

    BET_VALUES.forEach(val => {
        const card = document.createElement('div');
        card.className = 'bet-card';

        const formattedVal = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const entryFee = val / 2;
        const formattedEntry = entryFee.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let htmlContent = `<div class="bet-amount">${formattedVal}</div>`;
        htmlContent += `<div class="entry-fee">Entrada: ${formattedEntry}</div>`;

        if (!isPrivateMode) {
            // Lobby Público: Mostra quantas pessoas estão esperando
            htmlContent += `
                <div class="player-count-container" id="container-${val}">
                    <span class="status-dot"></span>
                    <span class="player-count-text" id="count-${val}">Verificando...</span>
                </div>
            `;
        } else {
            // Modo Privado: Apenas visual limpo
            htmlContent += `<p style="font-size:0.8rem; color:#888;">Selecionar</p>`;
        }

        card.innerHTML = htmlContent;

        // Ação do Clique
        card.onclick = () => {
            if (isPrivateMode) {
                createPrivateRoom(val); // Cria sala privada
            } else {
                joinQueue(val); // Entra na fila pública
            }
        };

        grid.appendChild(card);

        // Adiciona listener do Firebase APENAS se for público
        if (!isPrivateMode) {
            const queueRef = collection(db, 'SLICED', 'data', 'waiting_rooms', `bet_${val}`, 'players');
            const unsub = onSnapshot(queueRef, (snapshot) => {
                const count = snapshot.size;
                const textEl = document.getElementById(`count-${val}`);
                const containerEl = document.getElementById(`container-${val}`);

                if (textEl && containerEl) {
                    if (count > 0) {
                        textEl.innerText = `${count} na fila`;
                        containerEl.classList.add('has-players');
                    } else {
                        textEl.innerText = `Vazio`;
                        containerEl.classList.remove('has-players');
                    }
                }
            });
            lobbyListeners.push(unsub);
        }
    });
}

function clearLobbyListeners() {
    lobbyListeners.forEach(unsub => unsub());
    lobbyListeners = [];
}

// =============================================
// MODO PRIVADO: LÓGICA E UI
// =============================================

// 1. Botão "Jogar com Amigos" clicado -> Vai para tela de Setup
window.goToPrivateMode = function () {
    switchView('privateSetupView');
    // Reseta para o Passo 1
    document.getElementById('privateStep1').style.display = 'block';
    document.getElementById('privateStep2').style.display = 'none';
    document.getElementById('privateStep3').style.display = 'none';
};

// 2. Voltar do Modo Privado para o Lobby
window.backToPublicLobby = function () {
    // Se tiver sala criada, pergunta se quer sair
    if (gameState.privateRoomCode) {
        if (!confirm("Isso cancelará a sala criada. Deseja sair?")) return;
        cancelPrivateRoom();
    }
    switchView('lobbyView');
    renderBetGrid('betGrid', false); // Reativa listeners públicos
};

// 3. Clicou em "Criar Sala" -> Mostra grid de apostas limpo
window.showPrivateBetSelection = function () {
    document.getElementById('privateStep1').style.display = 'none';
    document.getElementById('privateStep2').style.display = 'block';
    renderBetGrid('privateBetGrid', true); // Renderiza modo privado (sem contadores)
};

window.backToPrivateStep1 = function () {
    document.getElementById('privateStep2').style.display = 'none';
    document.getElementById('privateStep1').style.display = 'block';
};

// 4. Escolheu o valor -> Gera código e cria no Firebase
async function createPrivateRoom(betValue) {
    const entryFee = betValue / 2;
    
    // Verifica se tem saldo suficiente
    const hasSufficientBalance = await checkBalance(entryFee);
    if (!hasSufficientBalance) {
        alert(`Saldo insuficiente! Você precisa de pelo menos R$ ${entryFee.toFixed(2)} para criar esta sala.`);
        // Volta para seleção de valor
        document.getElementById('privateStep2').style.display = 'block';
        document.getElementById('privateStep3').style.display = 'none';
        return;
    }

    // Gera código curto (ex: XF92A)
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    gameState.privateRoomCode = roomCode;
    gameState.selectedBet = betValue;
    gameState.isPrivate = true;

    // Atualiza UI para o Passo 3 (Esperando amigo)
    document.getElementById('privateStep2').style.display = 'none';
    document.getElementById('privateStep3').style.display = 'block';
    document.getElementById('displayRoomCode').innerText = roomCode;

    // Salva no Firebase
    const roomRef = doc(db, 'SLICED', 'data', 'private_rooms', roomCode);
    await setDoc(roomRef, {
        creatorId: gameState.playerId,
        creatorName: gameState.playerName,
        betValue: betValue,
        status: 'waiting', // waiting -> full -> active
        createdAt: serverTimestamp()
    });

    // Fica escutando a sala para quando o amigo entrar
    gameState.waitingListener = onSnapshot(roomRef, async (snap) => {
        if (!snap.exists()) return; // Sala cancelada
        const data = snap.data();

        if (data.status === 'full' && data.joinerId) {
            // Amigo entrou! Cobra entrada e cria partida
            if (gameState.waitingListener) gameState.waitingListener();

            const charged = await chargeEntryFee(betValue);
            if (!charged) {
                alert('Erro ao processar pagamento. Sala cancelada.');
                await deleteDoc(roomRef);
                location.reload();
                return;
            }

            const opponent = { id: data.joinerId, name: data.joinerName || 'Oponente' };
            await createMatch(opponent, true); // true = modo privado
        }
    });
}

// 5. Entrar em uma sala existente
window.joinPrivateRoom = async function () {
    const codeInput = document.getElementById('roomCodeInput');
    const code = codeInput.value.toUpperCase().trim();

    if (code.length < 3) {
        alert("Código inválido.");
        return;
    }

    const roomRef = doc(db, 'SLICED', 'data', 'private_rooms', code);
    const snap = await getDoc(roomRef);

    if (!snap.exists()) {
        alert("Sala não encontrada!");
        return;
    }

    const data = snap.data();
    if (data.status !== 'waiting') {
        alert("Esta sala já está cheia ou o jogo começou.");
        return;
    }
    if (data.creatorId === gameState.playerId) {
        alert("Você não pode entrar na sua própria sala.");
        return;
    }

    // Verifica saldo antes de entrar
    const entryFee = data.betValue / 2;
    const hasSufficientBalance = await checkBalance(entryFee);
    if (!hasSufficientBalance) {
        alert(`Saldo insuficiente! Você precisa de pelo menos R$ ${entryFee.toFixed(2)} para entrar nesta sala.`);
        return;
    }

    // Cobra a entrada
    const charged = await chargeEntryFee(data.betValue);
    if (!charged) {
        alert('Erro ao processar pagamento.');
        return;
    }

    // Entra na sala
    gameState.selectedBet = data.betValue;
    gameState.isPrivate = true;
    gameState.privateRoomCode = code;

    // Avisa o criador via Firebase
    await updateDoc(roomRef, {
        joinerId: gameState.playerId,
        joinerName: gameState.playerName,
        status: 'full'
    });

    // Vai para tela de carregamento genérica enquanto espera o matchId
    switchView('waitingView');
    document.querySelector('#waitingView .waiting-text').innerText = "Conectando à Sala...";
    document.getElementById('waitingSubText').innerText = "Aguardando início da partida...";

    // Escuta o convite da Match (O criador vai gerar o ID e enviar)
    listenForMatchInvites();
};

window.cancelPrivateRoom = async function () {
    if (gameState.privateRoomCode) {
        try {
            await deleteDoc(doc(db, 'SLICED', 'data', 'private_rooms', gameState.privateRoomCode));
        } catch (e) { console.error(e); }
        gameState.privateRoomCode = null;
    }
    if (gameState.waitingListener) gameState.waitingListener();

    // Volta para o início do modo privado
    document.getElementById('privateStep3').style.display = 'none';
    document.getElementById('privateStep1').style.display = 'block';
};

window.copyRoomCode = function () {
    const code = document.getElementById('displayRoomCode').innerText;
    navigator.clipboard.writeText(code).then(() => {
        alert("Código copiado para a área de transferência!");
    });
};

// =============================================
// MODO PÚBLICO: MATCHMAKING
// =============================================
async function joinQueue(betValue) {
    const entryFee = betValue / 2;
    
    // Verifica se tem saldo suficiente
    const hasSufficientBalance = await checkBalance(entryFee);
    if (!hasSufficientBalance) {
        alert(`Saldo insuficiente! Você precisa de pelo menos R$ ${entryFee.toFixed(2)} para entrar nesta sala.`);
        return;
    }

    clearLobbyListeners();
    gameState.selectedBet = betValue;
    gameState.inQueue = true;
    gameState.isPrivate = false;

    // Muda para tela de espera
    switchView('waitingView');
    const formattedVal = betValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.querySelector('#waitingView .waiting-text').innerText = "Procurando Oponente...";
    document.getElementById('waitingSubText').innerText = `Aposta: ${formattedVal}`;

    const inviteUnsub = await listenForMatchInvites();

    const queueRef = collection(db, 'SLICED', 'data', 'waiting_rooms', `bet_${betValue}`, 'players');
    const myRef = doc(queueRef, gameState.playerId);

    await setDoc(myRef, {
        id: gameState.playerId,
        name: gameState.playerName,
        timestamp: serverTimestamp()
    });

    gameState.waitingListener = onSnapshot(query(queueRef), async (snapshot) => {
        const players = snapshot.docs.map(d => d.data());
        console.log(`🔍 [Matchmaking] Jogadores na fila: ${players.length}`, players.map(p => p.name));
        
        const opponent = players.find(p => p.id !== gameState.playerId);

        if (opponent) {
            console.log(`✅ [Matchmaking] Oponente encontrado: ${opponent.name} (${opponent.id})`);
            console.log(`🎮 [Matchmaking] Meu ID: ${gameState.playerId}, ID Oponente: ${opponent.id}`);
            
            // Para a escuta da fila para evitar múltiplas cobranças
            if (gameState.waitingListener) {
                gameState.waitingListener();
                gameState.waitingListener = null;
            }

            // Cobra a entrada de AMBOS os jogadores
            console.log(`💰 [Matchmaking] Cobrando entrada de R$ ${(betValue / 2).toFixed(2)}...`);
            const charged = await chargeEntryFee(betValue);
            if (!charged) {
                console.error('❌ [Matchmaking] Falha ao cobrar entrada');
                // Se falhou ao cobrar, remove da fila e volta ao lobby
                await deleteDoc(myRef);
                inviteUnsub();
                alert('Erro ao processar pagamento. Voltando ao lobby.');
                location.reload();
                return;
            }
            console.log(`✅ [Matchmaking] Entrada cobrada com sucesso!`);

            // Apenas o jogador com menor ID cria a partida
            if (gameState.playerId < opponent.id) {
                console.log(`🎯 [Matchmaking] Sou o criador da partida (menor ID)`);
                inviteUnsub();
                await createMatch(opponent, false);
            } else {
                console.log(`⏳ [Matchmaking] Aguardando criação da partida pelo oponente (maior ID)`);
            }
            // O jogador com maior ID apenas aguarda o convite da partida
            // (o listener listenForMatchInvites já está ativo)
        }
    });
}

// =============================================
// CRIAÇÃO E GERENCIAMENTO DE PARTIDA (COMUM)
// =============================================

async function listenForMatchInvites() {
    console.log('👂 [Matchmaking] Iniciando escuta de convites de partida...');
    const q = query(collection(db, 'SLICED', 'data', 'matches'));
    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                console.log('📨 [Matchmaking] Nova partida detectada:', data.matchId);
                console.log('🔍 [Matchmaking] Player2 ID:', data.player2?.id, 'Meu ID:', gameState.playerId);
                
                // Se sou o player 2 desta partida e ela está ativa
                if (data.player2 && data.player2.id === gameState.playerId && data.status === 'active') {
                    console.log('🎉 [Matchmaking] Convite aceito! Entrando na partida como Player 2 (O)');
                    if (gameState.waitingListener) gameState.waitingListener();

                    gameState.inQueue = false;
                    gameState.matchId = data.matchId;
                    
                    // Mostra animação de matchmaking
                    showMatchmakingAnimation(data);
                }
            }
        });
    });
}

async function createMatch(opponent, isPrivateMode = false) {
    console.log('🎮 [Matchmaking] Criando partida...');
    console.log('👤 [Matchmaking] Oponente:', opponent.name, '(', opponent.id, ')');
    
    if (gameState.matchListener) {
        console.warn('⚠️ [Matchmaking] Já existe um listener de partida ativo');
        return;
    }
    if (gameState.waitingListener) gameState.waitingListener();

    const matchId = `match_${gameState.selectedBet}_${gameState.playerId}_${opponent.id}`;
    gameState.matchId = matchId;
    gameState.inQueue = false;

    const matchData = {
        matchId: matchId,
        betValue: gameState.selectedBet,
        status: 'active',
        lastMove: serverTimestamp(),
        player1: { id: gameState.playerId, name: gameState.playerName, symbol: 'X' },
        player2: { id: opponent.id, name: opponent.name, symbol: 'O' },
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        scores: { X: 0, O: 0 },
        round: 1,
        suddenDeathIndex: null, // Índice sincronizado para morte súbita
        isPrivate: isPrivateMode
    };

    console.log('💾 [Matchmaking] Salvando partida no Firebase:', matchId);
    try {
        await setDoc(doc(db, 'SLICED', 'data', 'matches', matchId), matchData);
        console.log('✅ [Matchmaking] Partida criada com sucesso!');

        if (!isPrivateMode) {
            // Limpa fila pública
            const queueRef = collection(db, 'SLICED', 'data', 'waiting_rooms', `bet_${gameState.selectedBet}`, 'players');
            await deleteDoc(doc(queueRef, gameState.playerId));
            await deleteDoc(doc(queueRef, opponent.id));
        } else {
            // Limpa sala privada
            if (gameState.privateRoomCode) {
                await deleteDoc(doc(db, 'SLICED', 'data', 'private_rooms', gameState.privateRoomCode));
            }
        }

        // Mostra animação de matchmaking
        showMatchmakingAnimation(matchData);
    } catch (e) {
        console.error("Erro ao criar partida:", e);
    }
}

// =============================================
// MOTOR DO JOGO E UPDATES
// =============================================
function setupGame(matchId, symbol) {
    gameState.playerSymbol = symbol;
    gameState.gameActive = true;

    // Oculta o widget de saldo durante a partida
    const balanceWidget = document.getElementById('balance-widget');
    if (balanceWidget) {
        balanceWidget.style.display = 'none';
    }

    // Muda para tela do Jogo
    switchView('gameView');
    createBoardUI();

    // Marca presença do jogador no Firebase e inicia o jogo
    const matchRef = doc(db, 'SLICED', 'data', 'matches', matchId);
    const presenceField = symbol === 'X' ? 'player1Online' : 'player2Online';
    
    // Atualiza o lastMove para iniciar o timer de todos os jogadores simultaneamente
    updateDoc(matchRef, {
        [presenceField]: true,
        [`${presenceField}Timestamp`]: serverTimestamp(),
        lastMove: serverTimestamp() // Inicia o timer para todos
    }).catch(e => console.error('Erro ao marcar presença:', e));

    gameState.matchListener = onSnapshot(matchRef, (docSnap) => {
        if (!docSnap.exists()) {
            if (gameState.gameActive) { 
                console.log('⚠️ [Jogo] Partida não existe mais');
                backToMenu(); 
            }
            return;
        }
        updateGameState(docSnap.data());
    });

    // Atualiza presença a cada 3 segundos
    gameState.presenceInterval = setInterval(async () => {
        if (gameState.gameActive && gameState.matchId) {
            try {
                await updateDoc(matchRef, {
                    [presenceField]: true,
                    [`${presenceField}Timestamp`]: serverTimestamp()
                });
            } catch (e) {
                console.error('Erro ao atualizar presença:', e);
            }
        }
    }, 3000);
}

function updateGameState(data) {
    gameState.board = data.board;
    gameState.scores = data.scores || { X: 0, O: 0 };
    gameState.round = data.round || 1;

    // Atualiza Placar
    document.getElementById('currentRoundDisplay').innerText = `${data.round} / 3`;
    document.getElementById('scoreP1Value').innerText = data.scores.X;
    document.getElementById('scoreP2Value').innerText = data.scores.O;

    // Verifica se algum jogador saiu (desconectou)
    const mySymbol = gameState.playerSymbol;
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    const opponentOnlineField = opponentSymbol === 'X' ? 'player1Online' : 'player2Online';
    const opponentTimestampField = `${opponentOnlineField}Timestamp`;
    
    // Se o oponente está marcado como offline ou não atualizou presença há mais de 8 segundos
    if (data[opponentOnlineField] === false || 
        (data[opponentTimestampField] && isTimestampOld(data[opponentTimestampField], 8))) {
        
        console.log('🏆 [Jogo] Oponente desconectou! Vitória automática!');
        
        // Marca vitória automática
        if (gameState.gameActive && data.status === 'active') {
            gameState.gameActive = false;
            clearInterval(gameState.timerInterval);
            clearInterval(gameState.presenceInterval);
            
            // Mostra notificação de vitória
            showOpponentDisconnectedWin();
            return;
        }
    }

    // Verifica Morte Súbita
    if (data.status === 'sudden_death') {
        startSuddenDeathUI(data.suddenDeathIndex);
        return;
    }

    // Verifica Fim de Jogo
    if (data.status === 'finished') {
        gameState.gameActive = false;
        clearInterval(gameState.timerInterval);
        clearInterval(gameState.presenceInterval);
        document.getElementById('timerContainer').classList.remove('active');
        document.getElementById('board').classList.add('disabled');
        document.getElementById('suddenDeathContainer').style.display = 'none';

        setTimeout(() => handleGameOver(data.winner), 500);
        return;
    }

    // Jogo Normal
    renderBoard();

    const turnDisplay = document.getElementById('turnDisplay');
    const boardEl = document.getElementById('board');

    // Atualiza Nomes
    const isP1 = gameState.playerId === data.player1.id;
    document.getElementById('p1Name').innerText = isP1 ? "Você (X)" : data.player1.name + " (X)";
    document.getElementById('p2Name').innerText = !isP1 ? "Você (O)" : data.player2.name + " (O)";

    gameState.isPlayerTurn = (data.currentPlayer === gameState.playerSymbol) && (data.status === 'active');

    if (gameState.isPlayerTurn) {
        turnDisplay.innerText = "SUA VEZ DE JOGAR!";
        turnDisplay.className = "turn-info my-turn";
        boardEl.classList.remove('disabled');
        document.getElementById('timerContainer').classList.add('active');

        if (data.lastMove) startTurnTimer(data.lastMove);
    } else {
        turnDisplay.innerText = "Aguardando oponente...";
        turnDisplay.className = "turn-info opponent-turn";
        boardEl.classList.add('disabled');
        document.getElementById('timerContainer').classList.remove('active');
        clearInterval(gameState.timerInterval);
    }
}

// Função auxiliar para verificar se um timestamp é antigo
function isTimestampOld(timestamp, secondsThreshold) {
    if (!timestamp || !timestamp.toDate) return false;
    const now = new Date();
    const timestampDate = timestamp.toDate();
    const diffSeconds = (now - timestampDate) / 1000;
    return diffSeconds > secondsThreshold;
}

// Mostra notificação de vitória por desconexão do oponente
async function showOpponentDisconnectedWin() {
    const modal = document.getElementById('resultModal');
    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMessage');
    const icon = document.getElementById('resultIcon');
    
    // Calcula o prêmio: 80% do valor total da sala
    const totalPrize = gameState.selectedBet;
    const winnerPrize = totalPrize * (1 - PLATFORM_FEE); // 80% do total
    const formattedWin = winnerPrize.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    
    // Credita o prêmio ao vencedor (que permaneceu)
    const credited = await creditWinnerPrize(gameState.selectedBet);
    
    icon.innerText = "🏆";
    title.innerText = "VITÓRIA POR W.O.!";
    title.style.color = "#4ade80";
    
    if (credited) {
        msg.innerText = `Seu oponente saiu da partida!\n\nVocê ganhou ${formattedWin}!`;
    } else {
        msg.innerText = `Seu oponente saiu da partida! Você venceu!\n\n(Erro ao processar prêmio - contate o suporte)`;
    }
    
    modal.style.display = 'flex';
    
    // Atualiza o status da partida no Firebase e depois remove
    try {
        const matchRef = doc(db, 'SLICED', 'data', 'matches', gameState.matchId);
        
        // Primeiro atualiza o status
        await updateDoc(matchRef, {
            status: 'finished',
            winner: gameState.playerId,
            finishReason: 'opponent_disconnected'
        });
        
        // Aguarda 2 segundos e depois remove a partida
        setTimeout(async () => {
            try {
                await deleteDoc(matchRef);
                console.log('✅ [Cleanup] Partida removida após vitória por W.O.');
            } catch (e) {
                console.error('❌ [Cleanup] Erro ao remover partida:', e);
            }
        }, 2000);
        
    } catch (e) {
        console.error('Erro ao atualizar status da partida:', e);
    }
}

// =============================================
// LOGICA: TEMPORIZADOR
// =============================================
function startTurnTimer(lastMoveTimestamp) {
    clearInterval(gameState.timerInterval);
    const timerBar = document.getElementById('timerBar');
    const timerText = document.getElementById('timerText');

    const update = () => {
        let startTime = (lastMoveTimestamp && typeof lastMoveTimestamp.toDate === 'function') ? lastMoveTimestamp.toDate() : new Date();
        const elapsed = (new Date() - startTime) / 1000;
        const remaining = Math.max(0, TURN_LIMIT - elapsed);

        timerBar.style.width = `${(remaining / TURN_LIMIT) * 100}%`;
        timerText.innerText = Math.ceil(remaining);

        // Cores
        timerBar.className = 'timer-bar';
        timerText.className = 'timer-text';
        if (remaining <= 3) { timerBar.classList.add('danger'); timerText.classList.add('danger'); }
        else if (remaining <= 6) { timerBar.classList.add('warning'); timerText.classList.add('warning'); }

        // Tempo Esgotado
        if (remaining <= 0) {
            clearInterval(gameState.timerInterval);
            if (gameState.isPlayerTurn && gameState.gameActive) handleTimeOut();
        }
    };
    update();
    gameState.timerInterval = setInterval(update, 100);
}

async function handleTimeOut() {
    // Passa a vez
    const nextPlayerSymbol = gameState.playerSymbol === 'X' ? 'O' : 'X';
    try {
        await updateDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId), {
            currentPlayer: nextPlayerSymbol,
            lastMove: serverTimestamp()
        });
    } catch (e) { console.error(e); }
}

// =============================================
// LOGICA: TABULEIRO E RODADAS
// =============================================
async function makeMove(index) {
    if (!gameState.isPlayerTurn || !gameState.gameActive) return;
    if (gameState.board[index] !== null) return;

    clearInterval(gameState.timerInterval);
    gameState.isPlayerTurn = false;
    document.getElementById('board').classList.add('disabled');

    const newBoard = [...gameState.board];
    newBoard[index] = gameState.playerSymbol;

    const roundWinner = checkWinner(newBoard);
    const isBoardFull = !newBoard.includes(null);

    let updates = {
        board: newBoard,
        currentPlayer: gameState.playerSymbol === 'X' ? 'O' : 'X',
        lastMove: serverTimestamp()
    };

    if (roundWinner || isBoardFull) {
        let newScores = { ...gameState.scores };
        if (roundWinner) newScores[roundWinner]++;

        updates.scores = newScores;
        updates.board = Array(9).fill(null); // Limpa tabuleiro

        // Fim da Melhor de 3?
        if (newScores.X >= 2 || newScores.O >= 2) {
            updates.status = 'finished';
            updates.winner = newScores.X > newScores.O ? (await getPlayerIdBySymbol('X')) : (await getPlayerIdBySymbol('O'));
        }
        else if (gameState.round >= 3) {
            // Fim da Rodada 3
            if (newScores.X !== newScores.O) {
                updates.status = 'finished';
                updates.winner = newScores.X > newScores.O ? (await getPlayerIdBySymbol('X')) : (await getPlayerIdBySymbol('O'));
            } else {
                // EMPATE TOTAL -> MORTE SÚBITA
                updates.status = 'sudden_death';
                updates.suddenDeathIndex = Math.floor(Math.random() * 100);
            }
        }
        else {
            updates.round = gameState.round + 1;
        }
    }

    try {
        await updateDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId), updates);
    } catch (e) {
        gameState.isPlayerTurn = true;
        document.getElementById('board').classList.remove('disabled');
    }
}

async function getPlayerIdBySymbol(symbol) {
    const snap = await getDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId));
    const data = snap.data();
    return symbol === 'X' ? data.player1.id : data.player2.id;
}

// =============================================
// LOGICA: MORTE SÚBITA (MATRIX)
// =============================================
function startSuddenDeathUI(winningIndex) {
    gameState.gameActive = false;
    clearInterval(gameState.timerInterval);

    // Esconde o tabuleiro de jogo (opcional, ou apenas sobrepõe)
    document.getElementById('gameView').style.display = 'none';
    document.getElementById('suddenDeathContainer').style.display = 'block';

    generateMatrix(winningIndex);
}

function generateMatrix(winningIndex) {
    const grid = document.getElementById('matrixGrid');
    grid.innerHTML = '';
    const size = 100;

    // Fallback se não vier índice sincronizado
    const targetIndex = (typeof winningIndex === 'number') ? winningIndex : Math.floor(Math.random() * size);

    for (let i = 0; i < size; i++) {
        const cell = document.createElement('div');
        cell.className = 'matrix-cell';

        if (i === targetIndex) {
            cell.innerText = 'P';
            cell.onmousedown = (e) => {
                e.preventDefault();
                handleSuddenDeathWin();
            };
        } else {
            cell.innerText = 'B';
            if (Math.random() > 0.8) cell.style.opacity = 0.5;
        }
        grid.appendChild(cell);
    }
}

async function handleSuddenDeathWin() {
    document.getElementById('matrixGrid').style.pointerEvents = 'none';
    try {
        await updateDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId), {
            status: 'finished',
            winner: gameState.playerId
        });
    } catch (e) { console.error(e); }
}

// =============================================
// UI UTILITÁRIOS
// =============================================
function createBoardUI() {
    const board = document.getElementById('board');
    board.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.onclick = () => makeMove(i);
        board.appendChild(cell);
    }
}

function renderBoard() {
    const cells = document.querySelectorAll('.cell');
    gameState.board.forEach((value, index) => {
        const cell = cells[index];
        cell.className = 'cell';
        cell.classList.remove('x', 'o');

        if (value) {
            cell.classList.add(value.toLowerCase());
            cell.innerText = value === 'X' ? '❌' : '⭕';
        } else {
            cell.innerText = '';
        }
    });
}

function checkWinner(board) {
    const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (let c of wins) {
        if (board[c[0]] && board[c[0]] === board[c[1]] && board[c[0]] === board[c[2]]) return board[c[0]];
    }
    return null;
}

async function handleGameOver(winnerId) {
    const modal = document.getElementById('resultModal');
    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMessage');
    const icon = document.getElementById('resultIcon');
    
    // Calcula o prêmio: 80% do valor total da sala
    const totalPrize = gameState.selectedBet;
    const winnerPrize = totalPrize * (1 - PLATFORM_FEE); // 80% do total
    const formattedWin = winnerPrize.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // LIMPA A PARTIDA DO FIREBASE PARA NÃO MOSTRAR CONTADORES FANTASMAS
    try {
        if (gameState.matchId) {
            console.log('🧹 [Cleanup] Removendo partida do Firebase:', gameState.matchId);
            await deleteDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId));
            console.log('✅ [Cleanup] Partida removida com sucesso');
        }
    } catch (e) {
        console.error('❌ [Cleanup] Erro ao remover partida:', e);
    }

    modal.style.display = 'flex';

    if (winnerId === gameState.playerId) {
        // Credita o prêmio ao vencedor
        const credited = await creditWinnerPrize(gameState.selectedBet);
        
        icon.innerText = "🏆";
        title.innerText = "VENCEDOR SUPREMO!";
        title.style.color = "#4ade80";
        
        if (credited) {
            msg.innerText = `Você dominou e ganhou ${formattedWin}!`;
        } else {
            msg.innerText = `Você venceu! (Erro ao processar prêmio - contate o suporte)`;
        }
    } else {
        icon.innerText = "💀";
        title.innerText = "ELIMINADO";
        title.style.color = "#e60000";
        msg.innerText = `Você perdeu tudo.`;
    }
}

async function backToMenu() {
    // Limpa a partida do Firebase se ainda existir
    try {
        if (gameState.matchId) {
            console.log('🧹 [Cleanup] Removendo partida ao voltar ao menu:', gameState.matchId);
            await deleteDoc(doc(db, 'SLICED', 'data', 'matches', gameState.matchId));
            console.log('✅ [Cleanup] Partida removida');
        }
    } catch (e) {
        console.error('❌ [Cleanup] Erro ao remover partida:', e);
    }
    
    // Limpa listeners
    if (gameState.matchListener) {
        gameState.matchListener();
        gameState.matchListener = null;
    }
    if (gameState.waitingListener) {
        gameState.waitingListener();
        gameState.waitingListener = null;
    }
    
    location.reload();
}

// Cleanup ao fechar
window.addEventListener('beforeunload', async () => {
    if (gameState.inQueue && !gameState.isPrivate) {
        // Remove da fila pública
        try {
            await deleteDoc(doc(db, 'SLICED', 'data', 'waiting_rooms', `bet_${gameState.selectedBet}`, 'players', gameState.playerId));
        } catch (e) { }
    }
    
    // Se estiver em uma partida ativa, marca como offline para o oponente ganhar
    if (gameState.matchId && gameState.gameActive) {
        try {
            const matchRef = doc(db, 'SLICED', 'data', 'matches', gameState.matchId);
            const presenceField = gameState.playerSymbol === 'X' ? 'player1Online' : 'player2Online';
            
            // Marca como offline - o oponente receberá vitória automática
            await updateDoc(matchRef, {
                [presenceField]: false,
                [`${presenceField}Timestamp`]: serverTimestamp()
            });
            
            console.log('🚪 [Saída] Jogador marcado como offline ao sair da partida');
        } catch (e) { 
            console.error('Erro ao marcar saída:', e);
        }
    }
});

// Expor funções para o HTML
window.joinQueue = joinQueue;
window.backToMenu = backToMenu;
window.init = init;
window.onload = init;