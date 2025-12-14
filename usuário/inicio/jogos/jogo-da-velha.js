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

// =============================================
// CONFIGURAÇÕES E ESTADO GLOBAL
// =============================================
const BET_VALUES = [10, 30, 50, 100, 200, 350, 500, 1000, 2000, 3000, 5000];
const TURN_LIMIT = 10; // Tempo limite por jogada em segundos

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
    const views = ['lobbyView', 'privateSetupView', 'waitingView', 'gameView'];

    views.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(viewId);
    if (target) target.style.display = 'block'; // ou flex, dependendo do CSS, mas block funciona com .view-section
}

// =============================================
// INICIALIZAÇÃO
// =============================================
function generatePlayerId() {
    return 'user_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

async function init() {
    if (!gameState.playerId) {
        gameState.playerId = generatePlayerId();
        gameState.playerName = 'Jogador ' + Math.floor(Math.random() * 1000);
        console.log(`Logado como: ${gameState.playerName}`);
    }

    gameState.inQueue = false;

    // Inicia no Lobby Público
    renderBetGrid('betGrid', false); // Renderiza cards públicos com contadores
    switchView('lobbyView');
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

        let htmlContent = `<div class="bet-amount">${formattedVal}</div>`;

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
            // Amigo entrou! Criar a partida oficial (Match)
            if (gameState.waitingListener) gameState.waitingListener();

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
        const opponent = players.find(p => p.id !== gameState.playerId);

        if (opponent) {
            // Evita condição de corrida: menor ID cria a match
            if (gameState.playerId < opponent.id) {
                inviteUnsub();
                await createMatch(opponent, false);
            }
        }
    });
}

// =============================================
// CRIAÇÃO E GERENCIAMENTO DE PARTIDA (COMUM)
// =============================================

async function listenForMatchInvites() {
    const q = query(collection(db, 'SLICED', 'data', 'matches'));
    return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                // Se sou o player 2 desta partida e ela está ativa
                if (data.player2 && data.player2.id === gameState.playerId && data.status === 'active') {
                    if (gameState.waitingListener) gameState.waitingListener();

                    gameState.inQueue = false;
                    gameState.matchId = data.matchId;
                    setupGame(data.matchId, 'O');
                }
            }
        });
    });
}

async function createMatch(opponent, isPrivateMode = false) {
    if (gameState.matchListener) return;
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

    try {
        await setDoc(doc(db, 'SLICED', 'data', 'matches', matchId), matchData);

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

        setupGame(matchId, 'X');
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

    // Muda para tela do Jogo
    switchView('gameView');
    createBoardUI();

    gameState.matchListener = onSnapshot(doc(db, 'SLICED', 'data', 'matches', matchId), (docSnap) => {
        if (!docSnap.exists()) {
            if (gameState.gameActive) { backToMenu(); } // Se a sala sumir
            return;
        }
        updateGameState(docSnap.data());
    });
}

function updateGameState(data) {
    gameState.board = data.board;
    gameState.scores = data.scores || { X: 0, O: 0 };
    gameState.round = data.round || 1;

    // Atualiza Placar
    document.getElementById('currentRoundDisplay').innerText = `${data.round} / 3`;
    document.getElementById('scoreP1Value').innerText = data.scores.X;
    document.getElementById('scoreP2Value').innerText = data.scores.O;

    // Verifica Morte Súbita
    if (data.status === 'sudden_death') {
        startSuddenDeathUI(data.suddenDeathIndex);
        return;
    }

    // Verifica Fim de Jogo
    if (data.status === 'finished') {
        gameState.gameActive = false;
        clearInterval(gameState.timerInterval);
        document.getElementById('timerContainer').classList.remove('active');
        document.getElementById('board').classList.add('disabled');
        document.getElementById('suddenDeathContainer').style.display = 'none'; // Fecha overlay

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

function handleGameOver(winnerId) {
    const modal = document.getElementById('resultModal');
    const title = document.getElementById('resultTitle');
    const msg = document.getElementById('resultMessage');
    const icon = document.getElementById('resultIcon');
    const formattedWin = (gameState.selectedBet * 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    modal.style.display = 'flex';

    if (winnerId === gameState.playerId) {
        icon.innerText = "🏆";
        title.innerText = "VENCEDOR SUPREMO!";
        title.style.color = "#4ade80";
        msg.innerText = `Você dominou e ganhou ${formattedWin}!`;
    } else {
        icon.innerText = "💀";
        title.innerText = "ELIMINADO";
        title.style.color = "#e60000";
        msg.innerText = `Você perdeu tudo.`;
    }
}

async function backToMenu() {
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
});

// Expor funções para o HTML
window.joinQueue = joinQueue;
window.backToMenu = backToMenu;
window.init = init;
window.onload = init;