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
    prizeCredited: false, // 🆕 Flag para evitar crédito duplicado

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
async function showMatchmakingAnimation(matchData) {
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
    
    // 🆕 COBRAR A ENTRADA IMEDIATAMENTE quando as moedas aparecem
    console.log(`💰 [Matchmaking] Cobrando entrada de ${formattedEntry} durante a animação...`);
    const charged = await chargeEntryFee(betValue);
    
    if (!charged) {
        console.error('❌ [Matchmaking] Falha ao cobrar entrada na animação');
        alert('Erro ao processar pagamento. Voltando ao lobby.');
        location.reload();
        return;
    }
    
    console.log('✅ [Matchmaking] Entrada cobrada durante a animação!');
    
    // 🆕 ATUALIZAR o widget de saldo para mostrar a dedução visualmente
    if (gameState.playerId) {
        try {
            // Força atualização do widget de saldo
            const balanceWidget = document.getElementById('balance-widget');
            if (balanceWidget) {
                // Adiciona uma classe para animar a mudança
                balanceWidget.classList.add('balance-updating');
                setTimeout(() => {
                    balanceWidget.classList.remove('balance-updating');
                }, 1000);
            }
            
            // Recarrega o saldo no widget
            await initBalanceWidget(gameState.playerId);
        } catch (error) {
            console.error('Erro ao atualizar widget de saldo:', error);
        }
    }
    
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

    // 🆕 VERIFICAR SE TEM SÓCIO SX SELECIONADO
    await checkSXSelection();
}

// =============================================
// SISTEMA DE SÓCIO SX  
// =============================================

/**
 * Verifica se há um sócio SX selecionado
 * Se não houver, exibe o modal de seleção
 */
async function checkSXSelection() {
    const selectedSX = localStorage.getItem('selectedSX');
   
    if (!selectedSX) {
        // Não tem SX selecionado, mostrar modal
        await showSXModal();
    } else {
        // Tem SX selecionado, valida se ainda é válido (menos de 24h)
        const sxData = JSON.parse(selectedSX);
        const selectedAt = new Date(sxData.selectedAt);
        const now = new Date();
        const hoursDiff = (now - selectedAt) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
            // Seleção expirou, pedir nova seleção
            console.log('⚠️ Seleção de SX expirou (>24h), pedindo nova escolha...');
            await showSXModal();
        } else {
            // Seleção válida, continuar para o lobby
            console.log(`✅ Sócio SX: ${sxData.userName} (${sxData.userId})`);
            gameState.selectedSX = sxData;
            proceedToLobby();
        }
    }
}

/**
 * Continua para o lobby do jogo
 */
function proceedToLobby() {
    renderBetGrid('betGrid', false);
    switchView('lobbyView');
}

/**
 * Exibe o modal de seleção de Sócio SX
 */
async function showSXModal() {
    const modal = document.getElementById('sxSelectionModal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    // Carregar sócios SX aprovados
    await loadSXMembersForModal();
}

/**
 * Carrega os sócios SX aprovados no modal
 */
async function loadSXMembersForModal() {
    try {
        const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js');
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js');

        const firebaseConfig = {
            apiKey: "AIzaSyCTX7MMnhHr_QgDpjPuZGuRyG4Uk9GpQAE",
            authDomain: "sliced-4f1e3.firebaseapp.com",
            projectId: "sliced-4f1e3",
            storageBucket: "sliced-4f1e3.firebasestorage.app",
            messagingSenderId: "800471538497",
            appId: "1:800471538497:web:c7d7b9eb55c72687365fc0"
        };

        const app = initializeApp(firebaseConfig, "sx-modal-loader");
        const dbFirestore = getFirestore(app);
        const usersCollection = collection(dbFirestore, 'SLICED', 'data', 'Usuários');
        const usersSnapshot = await getDocs(usersCollection);

        const gallery = document.getElementById('sxModalGallery');
        const approvedSX = [];
        
        usersSnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.sxData && userData.sxData.status === 'concluido') {
                approvedSX.push({
                    userId: doc.id,
                    userName: userData.sxData.profileName || userData.nomeCompleto,
                    nomeCompleto: userData.nomeCompleto,
                    category: userData.sxData.category,
                    imageUrl: userData.sxData.imageUrl
                });
            }
        });
        
        if (approvedSX.length === 0) {
            gallery.innerHTML = `<div class="sx-loading">Nenhum sócio SX disponível no momento.</div>`;
        } else {
            gallery.innerHTML = '';
            
            // 🆕 Buscar sócio previamente selecionado do localStorage
            const savedSX = localStorage.getItem('selectedSX');
            let previouslySelectedUserId = null;
            
            if (savedSX) {
                try {
                    const sxData = JSON.parse(savedSX);
                    previouslySelectedUserId = sxData.userId;
                } catch (e) {
                    console.error('Erro ao ler SX salvo:', e);
                }
            }
            
            approvedSX.forEach((sxData) => {
                const storyItem = document.createElement('div');
                storyItem.className = 'sx-modal-story';
                
                // 🆕 Se este é o SX previamente selecionado, adicionar classe 'selected'
                const isPreviouslySelected = previouslySelectedUserId === sxData.userId;
                if (isPreviouslySelected) {
                    storyItem.classList.add('selected');
                    // Também atualiza o card de selecionado automaticamente
                    setTimeout(() => {
                        document.getElementById('selectedSxImage').src = sxData.imageUrl;
                        document.getElementById('selectedSxName').textContent = sxData.userName;
                        document.getElementById('selectedSxCategory').textContent = `${getCategoryEmoji(sxData.category)} ${sxData.category}`;
                        document.getElementById('sxModalSelected').style.display = 'block';
                        document.getElementById('btnConfirmSX').style.display = 'block';
                        gameState.tempSelectedSX = sxData;
                    }, 100);
                }
                
                const emoji = getCategoryEmoji(sxData.category);

                storyItem.innerHTML = `
                    <div class="sx-modal-ring">
                        <div class="sx-modal-ring-inner">
                            <img src="${sxData.imageUrl}" class="sx-modal-img" onerror="this.src='https://via.placeholder.com/100/111/fff?text=SX'">
                        </div>
                        <div class="sx-modal-category-badge">${emoji}</div>
                    </div>
                    <div class="sx-modal-name">${sxData.userName}</div>
                `;
                
                // Evento de clique para selecionar
                storyItem.addEventListener('click', () => {
                    selectSX(sxData);
                });
                
                gallery.appendChild(storyItem);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar SX:', error);
        const gallery = document.getElementById('sxModalGallery');
        gallery.innerHTML = `<div class="sx-loading" style="color:#ff4444;">Erro ao carregar sócios.</div>`;
    }
}

/**
 * Seleciona um Sócio SX com animações premium
 */
function selectSX(sxData) {
    const selectedSection = document.getElementById('sxModalSelected');
    const btnConfirm = document.getElementById('btnConfirmSX');
    const gallery = document.getElementById('sxModalGallery');
    
    // Remove classe 'selected' de todos os outros SX
    const allStories = gallery.querySelectorAll('.sx-modal-story');
    allStories.forEach(story => {
        story.classList.remove('selected');
    });
    
    // Encontra o SX clicado e adiciona animação
    const clickedStory = Array.from(allStories).find(story => {
        const nameEl = story.querySelector('.sx-modal-name');
        return nameEl && nameEl.textContent === sxData.userName;
    });
    
    if (clickedStory) {
        // Adiciona classe selected com todas as animações
        clickedStory.classList.add('selected');
        
        // 🎬 Shake na galeria inteira
        gallery.style.animation = 'none';
        setTimeout(() => {
            gallery.style.animation = 'shakeGallery 0.5s ease';
        }, 10);
        
        // 🎉 Cria partículas douradas voando
        createGoldenParticles(clickedStory);
        
        // 📱 Vibração tátil (se disponível)
        if (navigator.vibrate) {
            navigator.vibrate([50, 30, 50]);
        }
    }
    
    // Atualiza informações do card de selecionado
    document.getElementById('selectedSxImage').src = sxData.imageUrl;
    document.getElementById('selectedSxName').textContent = sxData.userName;
    document.getElementById('selectedSxCategory').textContent = `${getCategoryEmoji(sxData.category)} ${sxData.category}`;
    
    // Mostra card e botão com animação
    selectedSection.style.display = 'block';
    btnConfirm.style.display = 'block';
    
    // Armazena temporariamente
    gameState.tempSelectedSX = sxData;
    
    // Scroll suave para o botão após animações
    setTimeout(() => {
        btnConfirm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 400);
    
    // Log com emoji
    console.log(`✨ Sócio SX selecionado: ${sxData.userName} (${sxData.category})`);
}

/**
 * Cria partículas douradas animadas ao selecionar SX
 */
function createGoldenParticles(element) {
    const rect = element.getBoundingClientRect();
    const particleCount = 12;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.style.cssText = `
            position: fixed;
            left: ${rect.left + rect.width / 2}px;
            top: ${rect.top + rect.height / 2}px;
            width: 8px;
            height: 8px;
            background: linear-gradient(135deg, #FFD700, #FFA500);
            border-radius: 50%;
            pointer-events: none;
            z-index: 10000;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.8);
        `;
        
        document.body.appendChild(particle);
        
        // Animação de explosão radial
        const angle = (360 / particleCount) * i;
        const distance = 80 + Math.random() * 40;
        const duration = 800 + Math.random() * 400;
        
        const radians = (angle * Math.PI) / 180;
        const targetX = rect.left + rect.width / 2 + Math.cos(radians) * distance;
        const targetY = rect.top + rect.height / 2 + Math.sin(radians) * distance;
        
        particle.animate([
            {
                transform: 'translate(0, 0) scale(1)',
                opacity: 1
            },
            {
                transform: `translate(${targetX - (rect.left + rect.width / 2)}px, ${targetY - (rect.top + rect.height / 2)}px) scale(0)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }).onfinish = () => {
            particle.remove();
        };
    }
}


/**
 * Confirma a seleção do SX e continua para o jogo
 */
window.confirmSXSelection = function() {
    if (!gameState.tempSelectedSX) return;
    
    // Salva no localStorage com timestamp
    const sxDataToSave = {
        ...gameState.tempSelectedSX,
        selectedAt: new Date().toISOString()
    };
    
    localStorage.setItem('selectedSX', JSON.stringify(sxDataToSave));
    gameState.selectedSX = sxDataToSave;
    
    console.log(`✅ Sócio SX selecionado: ${sxDataToSave.userName}`);
    
    // Fecha o modal com animação
    const modal = document.getElementById('sxSelectionModal');
    modal.style.opacity = '0';
    setTimeout(() => {
        modal.style.display = 'none';
        modal.style.opacity = '1';
        proceedToLobby();
    }, 300);
};

// Adicionar evento ao botão de confirmação
document.addEventListener('DOMContentLoaded', () => {
    const btnConfirm = document.getElementById('btnConfirmSX');
    if (btnConfirm) {
        btnConfirm.addEventListener('click', window.confirmSXSelection);
    }
});

function getCategoryEmoji(category) {
    const emojis = {
        'Empresa': '🏢', 'Time': '⚽', 'Influencer': '📸',
        'Atleta': '🏃', 'Cantor': '🎤', 'Youtuber': '🎬'
    };
    return emojis[category] || '⭐';
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
 * E credita comissão ao Sócio SX (5% dos 20% da plataforma = 1% do total)
 * @param {number} betValue - Valor total da sala
 * @returns {Promise<boolean>}
 */
async function creditWinnerPrize(betValue) {
    const totalPrize = betValue; // Valor total da sala
    const winnerPrize = totalPrize * (1 - PLATFORM_FEE); // 80% do total
    
    try {
        // Creditar ao vencedor
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
            
            // 🆕 CREDITAR COMISSÃO AO SÓCIO SX (5% dos 20% da plataforma = 1% do total)
            if (gameState.selectedSX) {
                await creditSXCommission(betValue);
            }
            
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
 * Credita comissão ao Sócio SX
 * Comissão: 5% do valor total da sala (plataforma fica com 15%)
 * @param {number} betValue - Valor total da sala
 */
async function creditSXCommission(betValue) {
    if (!gameState.selectedSX) {
        console.warn('⚠️ Nenhum Sócio SX selecionado');
        return false;
    }
    
    const sxCommission = betValue * 0.05; // 5% do valor total
    
    try {
        const response = await fetch(`${API_BASE}/game/credit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: gameState.selectedSX.userId,
                amount: sxCommission,
                gameType: 'jogo-da-velha-comissao-sx',
                betValue: betValue,
                description: `Comissão SX - Jogo da Velha - Sala R$ ${betValue.toFixed(2)}`
            })
        });

        const result = await response.json();
        
        if (result.success) {
            console.log(`💎 Comissão de R$ ${sxCommission.toFixed(2)} (5%) creditada ao SX: ${gameState.selectedSX.userName}`);
            
            // 🆕 REGISTRAR ESTATÍSTICA NO FIREBASE
            await registerSXStats(betValue, sxCommission);
            
            return true;
        } else {
            console.error('❌ Erro ao creditar comissão SX:', result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao creditar comissão SX:', error);
        return false;
    }
}

/**
 * Registra estatísticas do Sócio SX no Firebase
 * @param {number} betValue - Valor da sala
 * @param {number} commission - Comissão creditada
 */
async function registerSXStats(betValue, commission) {
    try {
        const { doc, getDoc, setDoc, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
        
        const sxUserId = gameState.selectedSX.userId;
        const sxStatsRef = doc(db, 'SLICED', 'data', 'Usuários', sxUserId, 'SX_Stats', 'summary');
        
        // Buscar stats atuais
        const statsDoc = await getDoc(sxStatsRef);
        const currentStats = statsDoc.exists() ? statsDoc.data() : {
            totalGamesReferenced: 0,
            totalCommissionEarned: 0,
            uniquePlayers: [],
            lastUpdate: null
        };
        
        // Atualizar stats
        const updatedStats = {
            totalGamesReferenced: (currentStats.totalGamesReferenced || 0) + 1,
            totalCommissionEarned: (currentStats.totalCommissionEarned || 0) + commission,
            uniquePlayers: [...new Set([...(currentStats.uniquePlayers || []), gameState.playerId])],
            lastUpdate: serverTimestamp()
        };
        
        await setDoc(sxStatsRef, updatedStats);
        
        console.log(`📊 Estatísticas do SX atualizadas: ${updatedStats.totalGamesReferenced} partidas, R$ ${updatedStats.totalCommissionEarned.toFixed(2)} ganhos`);
        
    } catch (error) {
        console.error('❌ Erro ao registrar stats SX:', error);
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
    // 🆕 VERIFICAÇÃO OBRIGATÓRIA: Deve ter sócio SX selecionado
    if (!gameState.selectedSX) {
        alert('⚠️ Você precisa selecionar um Sócio SX antes de criar uma sala!');
        await showSXModal();
        return;
    }
    
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
            // Amigo entrou! Cria partida (a entrada será cobrada na animação)
            if (gameState.waitingListener) gameState.waitingListener();

            // 🆕 NOTA: A entrada será cobrada na animação de matchmaking
            console.log('💡 [Private] A entrada será cobrada durante a animação...');

            const opponent = { id: data.joinerId, name: data.joinerName || 'Oponente' };
            await createMatch(opponent, true); // true = modo privado
        }
    });
}

// 5. Entrar em uma sala existente
window.joinPrivateRoom = async function () {
    // 🆕 VERIFICAÇÃO OBRIGATÓRIA: Deve ter sócio SX selecionado
    if (!gameState.selectedSX) {
        alert('⚠️ Você precisa selecionar um Sócio SX antes de entrar em uma sala!');
        await showSXModal();
        return;
    }
    
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

    // 🆕 NOTA: A entrada será cobrada na animação de matchmaking
    console.log('💡 [Private] A entrada será cobrada durante a animação...');
    
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
    // 🆕 VERIFICAÇÃO OBRIGATÓRIA: Deve ter sócio SX selecionado
    if (!gameState.selectedSX) {
        alert('⚠️ Você precisa selecionar um Sócio SX antes de procurar uma partida!');
        await showSXModal();
        return;
    }
    
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
            
            // Para a escuta da fila
            if (gameState.waitingListener) {
                gameState.waitingListener();
                gameState.waitingListener = null;
            }

            // 🆕 NOTA: A entrada será cobrada na animação de matchmaking, não aqui
            console.log(`💡 [Matchmaking] A entrada será cobrada durante a animação...`);

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
    gameState.prizeCredited = false; // 🆕 Reseta flag para nova partida

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
        // 🆕 PROTEÇÃO CONTRA CRÉDITO DUPLICADO
        if (!gameState.prizeCredited) {
            console.log('💰 [Prize] Creditando prêmio pela primeira vez...');
            gameState.prizeCredited = true; // Marca como creditado ANTES da chamada
            
            // Credita o prêmio ao vencedor
            const credited = await creditWinnerPrize(gameState.selectedBet);
            
            icon.innerText = "🏆";
            title.innerText = "VENCEDOR SUPREMO!";
            title.style.color = "#4ade80";
            
            if (credited) {
                msg.innerText = `Você dominou e ganhou ${formattedWin}!`;
                console.log('✅ [Prize] Prêmio creditado com sucesso!');
            } else {
                msg.innerText = `Você venceu! (Erro ao processar prêmio - contate o suporte)`;
                console.error('❌ [Prize] Falha ao creditar prêmio');
                gameState.prizeCredited = false; // Reverte a flag se falhou
            }
        } else {
            console.log('⚠️ [Prize] Prêmio já foi creditado anteriormente, pulando...');
            icon.innerText = "🏆";
            title.innerText = "VENCEDOR SUPREMO!";
            title.style.color = "#4ade80";
            msg.innerText = `Você dominou e ganhou ${formattedWin}!`;
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