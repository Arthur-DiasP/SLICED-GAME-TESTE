// Dashboard Data Manager - Conexão com Firebase Firestore
import { db } from '../controle-dados/firebase-config.js';
import { 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit,
    where,
    onSnapshot,
    doc,
    getDoc,
    Timestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Importar sistema de rastreamento online
import { 
    getTotalUsuariosOnline,
    escutarUsuariosOnline 
} from '../controle-dados/online-tracker.js';

// ===== FUNÇÕES DE ESTATÍSTICAS =====

/**
 * Buscar total de usuários ONLINE (em tempo real)
 */
export async function getTotalUsuarios() {
    try {
        return await getTotalUsuariosOnline();
    } catch (error) {
        console.error('Erro ao buscar total de usuários online:', error);
        return 0;
    }
}


/**
 * Buscar total de partidas jogadas
 */
export async function getTotalPartidas() {
    try {
        const partidasRef = collection(db, 'partidas');
        const snapshot = await getDocs(partidasRef);
        return snapshot.size;
    } catch (error) {
        console.error('Erro ao buscar total de partidas:', error);
        return 0;
    }
}

/**
 * Buscar total de conquistas desbloqueadas
 */
export async function getTotalConquistas() {
    try {
        const conquistasRef = collection(db, 'conquistas');
        const snapshot = await getDocs(conquistasRef);
        return snapshot.size;
    } catch (error) {
        console.error('Erro ao buscar total de conquistas:', error);
        return 0;
    }
}

/**
 * Calcular tempo médio online (em horas)
 */
export async function getTempoMedioOnline() {
    try {
        const usuariosRef = collection(db, 'SLICED');
        const snapshot = await getDocs(usuariosRef);
        
        let totalTempo = 0;
        let count = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.tempoOnline) {
                totalTempo += data.tempoOnline;
                count++;
            }
        });
        
        if (count === 0) return 0;
        
        // Retornar em horas com 1 casa decimal
        const mediaMinutos = totalTempo / count;
        return (mediaMinutos / 60).toFixed(1);
    } catch (error) {
        console.error('Erro ao calcular tempo médio online:', error);
        return 0;
    }
}

/**
 * Buscar estatísticas completas do dashboard
 */
export async function getEstatisticasDashboard() {
    try {
        const [usuarios, partidas, conquistas, tempoMedio] = await Promise.all([
            getTotalUsuarios(),
            getTotalPartidas(),
            getTotalConquistas(),
            getTempoMedioOnline()
        ]);

        return {
            usuarios,
            partidas,
            conquistas,
            tempoMedio
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            usuarios: 0,
            partidas: 0,
            conquistas: 0,
            tempoMedio: 0
        };
    }
}

/**
 * Escutar mudanças em tempo real no número de usuários online
 * @param {function} callback - Função chamada quando o número de usuários online muda
 */
export function escutarUsuariosOnlineCount(callback) {
    return escutarUsuariosOnline((usuarios) => {
        callback(usuarios.length);
    });
}


// ===== FUNÇÕES DE ATIVIDADES RECENTES =====

/**
 * Buscar atividades recentes
 */
export async function getAtividadesRecentes(limite = 10) {
    try {
        const atividadesRef = collection(db, 'atividades');
        const q = query(atividadesRef, orderBy('timestamp', 'desc'), limit(limite));
        const snapshot = await getDocs(q);
        
        const atividades = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            atividades.push({
                id: doc.id,
                tipo: data.tipo || 'game',
                titulo: data.titulo || 'Atividade',
                descricao: data.descricao || '',
                timestamp: data.timestamp,
                ...data
            });
        });
        
        return atividades;
    } catch (error) {
        console.error('Erro ao buscar atividades recentes:', error);
        return [];
    }
}

/**
 * Escutar atividades em tempo real
 */
export function escutarAtividades(callback, limite = 10) {
    try {
        const atividadesRef = collection(db, 'atividades');
        const q = query(atividadesRef, orderBy('timestamp', 'desc'), limit(limite));
        
        return onSnapshot(q, (snapshot) => {
            const atividades = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                atividades.push({
                    id: doc.id,
                    tipo: data.tipo || 'game',
                    titulo: data.titulo || 'Atividade',
                    descricao: data.descricao || '',
                    timestamp: data.timestamp,
                    ...data
                });
            });
            callback(atividades);
        });
    } catch (error) {
        console.error('Erro ao escutar atividades:', error);
        return () => {}; // Retorna função vazia para unsubscribe
    }
}

// ===== FUNÇÕES DE TOP JOGADORES =====

/**
 * Buscar top jogadores por pontuação
 */
export async function getTopJogadores(limite = 5) {
    try {
        const usuariosRef = collection(db, 'SLICED');
        const q = query(usuariosRef, orderBy('pontuacao', 'desc'), limit(limite));
        const snapshot = await getDocs(q);
        
        const jogadores = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            jogadores.push({
                id: doc.id,
                nome: data.nomeCompleto || 'Jogador',
                nivel: data.nivel || 1,
                pontuacao: data.pontuacao || 0,
                avatar: data.avatar || null,
                ...data
            });
        });
        
        return jogadores;
    } catch (error) {
        console.error('Erro ao buscar top jogadores:', error);
        return [];
    }
}

// ===== FUNÇÕES DE JOGOS =====

/**
 * Buscar estatísticas de um jogo específico
 */
export async function getEstatisticasJogo(nomeJogo) {
    try {
        const jogoRef = doc(db, 'jogos', nomeJogo);
        const jogoDoc = await getDoc(jogoRef);
        
        if (jogoDoc.exists()) {
            return jogoDoc.data();
        }
        
        return {
            jogadores: 0,
            partidas: 0,
            online: 0
        };
    } catch (error) {
        console.error(`Erro ao buscar estatísticas do jogo ${nomeJogo}:`, error);
        return {
            jogadores: 0,
            partidas: 0,
            online: 0
        };
    }
}

/**
 * Buscar todos os jogos disponíveis
 */
export async function getTodosJogos() {
    try {
        const jogosRef = collection(db, 'jogos');
        const snapshot = await getDocs(jogosRef);
        
        const jogos = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            jogos.push({
                id: doc.id,
                nome: data.nome || doc.id,
                descricao: data.descricao || '',
                icone: data.icone || '🎮',
                status: data.status || 'ativo',
                jogadores: data.jogadores || 0,
                partidas: data.partidas || 0,
                online: data.online || 0,
                ...data
            });
        });
        
        return jogos;
    } catch (error) {
        console.error('Erro ao buscar jogos:', error);
        return [];
    }
}

// ===== FUNÇÕES AUXILIARES =====

/**
 * Formatar timestamp para texto relativo (ex: "2 min atrás")
 */
export function formatarTempoRelativo(timestamp) {
    if (!timestamp) return 'Agora';
    
    const agora = new Date();
    const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = agora - data;
    const diffSeg = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSeg / 60);
    const diffHora = Math.floor(diffMin / 60);
    const diffDia = Math.floor(diffHora / 24);
    
    if (diffSeg < 60) return 'Agora';
    if (diffMin < 60) return `${diffMin} min atrás`;
    if (diffHora < 24) return `${diffHora}h atrás`;
    if (diffDia < 7) return `${diffDia}d atrás`;
    
    return data.toLocaleDateString('pt-BR');
}

/**
 * Obter iniciais do nome
 */
export function obterIniciais(nome) {
    if (!nome) return '??';
    
    const partes = nome.trim().split(' ');
    if (partes.length === 1) {
        return partes[0].substring(0, 2).toUpperCase();
    }
    
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

/**
 * Formatar número com separadores de milhar
 */
export function formatarNumero(numero) {
    return numero.toLocaleString('pt-BR');
}

/**
 * Obter ícone baseado no tipo de atividade
 */
export function obterIconeAtividade(tipo) {
    const icones = {
        'game': '🎮',
        'achievement': '🏆',
        'user': '👤',
        'quiz': '❓',
        'record': '📊',
        'profile': '👥'
    };
    
    return icones[tipo] || '📌';
}

/**
 * Obter classe CSS baseada no tipo de atividade
 */
export function obterClasseAtividade(tipo) {
    const classes = {
        'game': 'game',
        'achievement': 'achievement',
        'user': 'user',
        'quiz': 'game',
        'record': 'achievement',
        'profile': 'user'
    };
    
    return classes[tipo] || 'game';
}

// ===== FUNÇÕES DE INICIALIZAÇÃO =====

/**
 * Inicializar dados do dashboard
 */
export async function inicializarDashboard() {
    try {
        console.log('🔄 Carregando dados do dashboard...');
        
        const [stats, atividades, topJogadores, jogos] = await Promise.all([
            getEstatisticasDashboard(),
            getAtividadesRecentes(6),
            getTopJogadores(5),
            getTodosJogos()
        ]);
        
        console.log('✅ Dados carregados com sucesso!');
        
        return {
            stats,
            atividades,
            topJogadores,
            jogos
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar dashboard:', error);
        return {
            stats: { usuarios: 0, partidas: 0, conquistas: 0, tempoMedio: 0 },
            atividades: [],
            topJogadores: [],
            jogos: []
        };
    }
}
