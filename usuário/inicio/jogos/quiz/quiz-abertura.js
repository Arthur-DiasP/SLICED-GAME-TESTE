import { db } from '../../../../controle-dados/firebase-config.js';
import { collection, query, where, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const matchesList = document.getElementById('matchesList');

console.log("🔄 Iniciando sincronia com o Quiz...");

const quizRef = collection(db, 'SLICED', 'data', 'quiz');
const q = query(quizRef, where('type', '==', 'match'));

const updateIntervals = new Map();

function getTimeRemaining(horario) {
    const now = new Date();
    const [hours, minutes] = horario.split(':').map(Number);
    
    const matchTime = new Date();
    matchTime.setHours(hours, minutes, 0, 0);
    
    const total = matchTime - now;
    
    return {
        total,
        hours: Math.floor((total / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((total / 1000 / 60) % 60),
        seconds: Math.floor((total / 1000) % 60),
        isPast: total < 0,
        isStarting: total >= 0 && total <= 5000
    };
}

function formatTimeRemaining(timeObj) {
    if (timeObj.isPast) {
        return '<span style="color: #ff4757;">Partida encerrada</span>';
    }
    
    if (timeObj.isStarting) {
        return `<span style="color: #38ef7d; font-weight: 900; animation: pulse 0.5s infinite;">COMEÇANDO AGORA! ${timeObj.seconds}s</span>`;
    }
    
    const h = String(timeObj.hours).padStart(2, '0');
    const m = String(timeObj.minutes).padStart(2, '0');
    const s = String(timeObj.seconds).padStart(2, '0');
    
    if (timeObj.hours > 0) {
        return `${h}:${m}:${s}`;
    } else {
        return `${m}:${s}`;
    }
}

onSnapshot(q, (snapshot) => {
    console.log(`📡 Recebidos ${snapshot.size} registros do banco.`);

    updateIntervals.forEach(interval => clearInterval(interval));
    updateIntervals.clear();

    matchesList.innerHTML = '';

    if (snapshot.empty) {
        matchesList.innerHTML = '<div class="no-matches">Nenhuma partida encontrada no banco de dados.</div>';
        return;
    }

    let matches = [];
    snapshot.forEach(doc => {
        matches.push({ id: doc.id, ...doc.data() });
    });

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTimeInMinutes = currentHours * 60 + currentMinutes;

    matches = matches.filter(match => {
        const [hours, minutes] = match.horario.split(':').map(Number);
        const matchTimeInMinutes = hours * 60 + minutes;
        const timeDiff = currentTimeInMinutes - matchTimeInMinutes;
        return timeDiff < 3;
    });

    matches.sort((a, b) => {
        const horarioA = a.horario || '';
        const horarioB = b.horario || '';
        return horarioA.localeCompare(horarioB);
    });

    console.log("📋 Partidas processadas:", matches);

    if (matches.length === 0) {
        matchesList.innerHTML = '<div class="no-matches">Nenhuma partida disponível no momento.</div>';
        return;
    }

    matches.forEach(match => {
        console.log("🔍 Processando partida:", {
            id: match.id,
            horario: match.horario,
            prize: match.prize,
            winnersCount: match.winnersCount,
            entryFee: match.entryFee
        });

        const card = document.createElement('div');
        card.className = 'match-card';
        
        const entryFeeDisplay = (!match.entryFee || match.entryFee == 0) ? 'Grátis' : `R$ ${parseFloat(match.entryFee).toFixed(2)}`;
        const entryFeeClass = (!match.entryFee || match.entryFee == 0) ? 'fee-free' : 'fee-paid';

        // Restaurando a estrutura HTML compatível com o CSS original
        card.innerHTML = `
            <div class="match-time">⏰ ${match.horario}</div>
            <div class="countdown" id="timer-${match.id}">--:--</div>
            
            <div class="match-info-row">
                <div class="match-prize">🏆 ${match.prize}</div>
                <div class="match-winners">👥 ${match.winnersCount || 1} Ganhador(es)</div>
            </div>

            <div class="match-info-row" style="justify-content: center; margin-top: 8px;">
                <div class="${entryFeeClass}" style="font-weight: bold; font-size: 1.1rem; ${entryFeeClass === 'fee-free' ? 'color: #38ef7d;' : 'color: #ff4757;'}">
                    🎟️ Entrada: ${entryFeeDisplay}
                </div>
            </div>

            <div class="match-question">❓ ${match.questionData ? match.questionData.text : 'Pergunta surpresa'}</div>
            
            <button class="btn-enter" onclick="entrarPartida('${match.id}', '${match.horario}')" style="
                margin-top: 15px;
                width: 100%;
                padding: 12px;
                background: var(--spfc-red);
                color: white;
                border: none;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1rem;
                cursor: pointer;
                transition: background 0.3s;
            " onmouseover="this.style.background='#c20613'" onmouseout="this.style.background='#e30613'">
                Entrar na Partida
            </button>
        `;
        matchesList.appendChild(card);

        const updateTimer = () => {
            const timeObj = getTimeRemaining(match.horario);
            const timerEl = document.getElementById(`timer-${match.id}`);
            
            if (timerEl) {
                timerEl.innerHTML = formatTimeRemaining(timeObj);
                
                if (timeObj.isStarting || (timeObj.isPast && timeObj.total > -120000)) {
                    window.location.href = `quiz-jogo.html?matchId=${match.id}`;
                }
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        updateIntervals.set(match.id, interval);
    });

}, (error) => {
    console.error("❌ Erro na sincronia:", error);
    matchesList.innerHTML = `<div class="no-matches" style="color:red">Erro de conexão: ${error.message}</div>`;
});

window.entrarPartida = (id, horario) => {
    // Lógica extra de validação se necessário
    window.location.href = `quiz-jogo.html?matchId=${id}`;
};