// Sistema de Rastreamento de Usuários Online - SLICED
import { db } from './firebase-config.js';
import { 
    doc, 
    setDoc, 
    getDoc,
    collection,
    query,
    where,
    getDocs,
    serverTimestamp,
    Timestamp,
    onSnapshot,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Coleção de usuários online
const ONLINE_COLLECTION = 'usuarios_online';

// Tempo limite para considerar usuário offline (5 minutos)
const TIMEOUT_OFFLINE = 5 * 60 * 1000; // 5 minutos em milissegundos

/**
 * Registrar usuário como online
 * @param {string} uid - ID do usuário
 * @param {object} dadosUsuario - Dados do usuário (nome, email, etc)
 */
export async function registrarUsuarioOnline(uid, dadosUsuario = {}) {
    try {
        const onlineRef = doc(db, ONLINE_COLLECTION, uid);
        
        await setDoc(onlineRef, {
            uid: uid,
            nomeCompleto: dadosUsuario.nomeCompleto || 'Usuário',
            email: dadosUsuario.email || '',
            status: 'online',
            ultimaAtualizacao: serverTimestamp(),
            timestampLogin: serverTimestamp()
        });

        console.log('✅ Usuário registrado como online:', uid);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao registrar usuário online:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Atualizar heartbeat do usuário (manter como online)
 * @param {string} uid - ID do usuário
 */
export async function atualizarHeartbeat(uid) {
    try {
        const onlineRef = doc(db, ONLINE_COLLECTION, uid);
        
        await setDoc(onlineRef, {
            ultimaAtualizacao: serverTimestamp(),
            status: 'online'
        }, { merge: true });

        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao atualizar heartbeat:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Remover usuário da lista de online (logout ou saiu da página)
 * @param {string} uid - ID do usuário
 */
export async function removerUsuarioOnline(uid) {
    try {
        const onlineRef = doc(db, ONLINE_COLLECTION, uid);
        await deleteDoc(onlineRef);

        console.log('✅ Usuário removido da lista de online:', uid);
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao remover usuário online:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Obter total de usuários online
 */
export async function getTotalUsuariosOnline() {
    try {
        const onlineRef = collection(db, ONLINE_COLLECTION);
        const snapshot = await getDocs(onlineRef);
        
        // Filtrar usuários que estão realmente online (última atualização < 5 min)
        const agora = Date.now();
        let count = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.ultimaAtualizacao) {
                const ultimaAtualizacao = data.ultimaAtualizacao.toMillis();
                const diff = agora - ultimaAtualizacao;
                
                // Se a última atualização foi há menos de 5 minutos, está online
                if (diff < TIMEOUT_OFFLINE) {
                    count++;
                }
            }
        });
        
        return count;
    } catch (error) {
        console.error('❌ Erro ao obter total de usuários online:', error);
        return 0;
    }
}

/**
 * Obter lista de usuários online
 */
export async function getUsuariosOnline() {
    try {
        const onlineRef = collection(db, ONLINE_COLLECTION);
        const snapshot = await getDocs(onlineRef);
        
        const usuarios = [];
        const agora = Date.now();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.ultimaAtualizacao) {
                const ultimaAtualizacao = data.ultimaAtualizacao.toMillis();
                const diff = agora - ultimaAtualizacao;
                
                // Se a última atualização foi há menos de 5 minutos, está online
                if (diff < TIMEOUT_OFFLINE) {
                    usuarios.push({
                        uid: data.uid,
                        nomeCompleto: data.nomeCompleto,
                        email: data.email,
                        status: data.status,
                        ultimaAtualizacao: data.ultimaAtualizacao
                    });
                }
            }
        });
        
        return usuarios;
    } catch (error) {
        console.error('❌ Erro ao obter usuários online:', error);
        return [];
    }
}

/**
 * Escutar mudanças em tempo real de usuários online
 * @param {function} callback - Função chamada quando há mudanças
 */
export function escutarUsuariosOnline(callback) {
    try {
        const onlineRef = collection(db, ONLINE_COLLECTION);
        
        return onSnapshot(onlineRef, (snapshot) => {
            const usuarios = [];
            const agora = Date.now();
            
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.ultimaAtualizacao) {
                    const ultimaAtualizacao = data.ultimaAtualizacao.toMillis();
                    const diff = agora - ultimaAtualizacao;
                    
                    // Se a última atualização foi há menos de 5 minutos, está online
                    if (diff < TIMEOUT_OFFLINE) {
                        usuarios.push({
                            uid: data.uid,
                            nomeCompleto: data.nomeCompleto,
                            email: data.email,
                            status: data.status,
                            ultimaAtualizacao: data.ultimaAtualizacao
                        });
                    }
                }
            });
            
            callback(usuarios);
        });
    } catch (error) {
        console.error('❌ Erro ao escutar usuários online:', error);
        return () => {}; // Retorna função vazia para unsubscribe
    }
}

/**
 * Iniciar sistema de heartbeat automático
 * Atualiza o status do usuário a cada 2 minutos
 * @param {string} uid - ID do usuário
 */
export function iniciarHeartbeat(uid) {
    // Atualizar a cada 2 minutos (120000ms)
    const intervalId = setInterval(() => {
        atualizarHeartbeat(uid);
    }, 2 * 60 * 1000);

    // Retornar função para parar o heartbeat
    return () => {
        clearInterval(intervalId);
        console.log('⏹️ Heartbeat parado para usuário:', uid);
    };
}

/**
 * Configurar listeners para detectar quando usuário sai da página
 * @param {string} uid - ID do usuário
 */
export function configurarDeteccaoSaida(uid) {
    // Quando a página é fechada ou recarregada
    window.addEventListener('beforeunload', () => {
        // Usar navigator.sendBeacon para garantir que a requisição seja enviada
        // mesmo quando a página está sendo fechada
        removerUsuarioOnline(uid);
    });

    // Quando a aba perde o foco (opcional - pode comentar se não quiser)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Usuário trocou de aba - você pode marcar como "away" se quiser
            // Por enquanto, vamos apenas atualizar o heartbeat
            atualizarHeartbeat(uid);
        } else {
            // Usuário voltou para a aba
            atualizarHeartbeat(uid);
        }
    });
}

/**
 * Limpar usuários inativos (última atualização > 5 minutos)
 * Esta função pode ser chamada periodicamente para limpar a coleção
 */
export async function limparUsuariosInativos() {
    try {
        const onlineRef = collection(db, ONLINE_COLLECTION);
        const snapshot = await getDocs(onlineRef);
        
        const agora = Date.now();
        let removidos = 0;
        
        const promises = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.ultimaAtualizacao) {
                const ultimaAtualizacao = data.ultimaAtualizacao.toMillis();
                const diff = agora - ultimaAtualizacao;
                
                // Se a última atualização foi há mais de 5 minutos, remover
                if (diff >= TIMEOUT_OFFLINE) {
                    promises.push(deleteDoc(doc.ref));
                    removidos++;
                }
            }
        });
        
        await Promise.all(promises);
        
        if (removidos > 0) {
            console.log(`🧹 ${removidos} usuário(s) inativo(s) removido(s)`);
        }
        
        return { success: true, removidos };
    } catch (error) {
        console.error('❌ Erro ao limpar usuários inativos:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Inicializar sistema completo de rastreamento online
 * @param {string} uid - ID do usuário
 * @param {object} dadosUsuario - Dados do usuário
 */
export async function inicializarSistemaOnline(uid, dadosUsuario = {}) {
    try {
        // 1. Registrar usuário como online
        await registrarUsuarioOnline(uid, dadosUsuario);
        
        // 2. Iniciar heartbeat automático
        const pararHeartbeat = iniciarHeartbeat(uid);
        
        // 3. Configurar detecção de saída
        configurarDeteccaoSaida(uid);
        
        console.log('✅ Sistema de rastreamento online inicializado para:', dadosUsuario.nomeCompleto || uid);
        
        // Retornar função para parar tudo
        return () => {
            pararHeartbeat();
            removerUsuarioOnline(uid);
        };
    } catch (error) {
        console.error('❌ Erro ao inicializar sistema online:', error);
        return () => {};
    }
}
