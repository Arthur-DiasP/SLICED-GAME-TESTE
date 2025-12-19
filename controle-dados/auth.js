// Sistema de Autenticação SLICED - APENAS FIRESTORE
import { db } from './firebase-config.js';
import { 
    collection, 
    doc, 
    setDoc, 
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Chave para armazenar sessão no localStorage
const SESSION_KEY = 'spfc_user_session';

// Função para gerar hash SHA-256 da senha
async function hashSenha(senha) {
    const encoder = new TextEncoder();
    const data = encoder.encode(senha);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// Função para gerar ID único
function gerarUID() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Função para verificar se e-mail já existe
async function emailExiste(email) {
    try {
        const usuariosCollection = collection(db, 'SLICED', 'data', 'Usuários');
        const q = query(usuariosCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Erro ao verificar e-mail:', error);
        return false;
    }
}

// Função para verificar se CPF já existe
async function cpfExiste(cpf) {
    try {
        const usuariosCollection = collection(db, 'SLICED', 'data', 'Usuários');
        const q = query(usuariosCollection, where('cpf', '==', cpf));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Erro ao verificar CPF:', error);
        return false;
    }
}

// Função para cadastrar novo usuário
export async function cadastrarUsuario(dadosUsuario) {
    try {
        const { email, senha, nomeCompleto, cpf, dataNascimento, telefone, referralCode } = dadosUsuario;

        // Verificar se e-mail já existe
        if (await emailExiste(email)) {
            return { success: false, error: 'Este e-mail já está cadastrado.' };
        }

        // Formatar CPF e Telefone
        const cpfFormatado = formatarCPF(cpf);
        const telefoneFormatado = formatarTelefone(telefone);

        // Verificar se CPF já existe (usando formatado)
        if (await cpfExiste(cpfFormatado)) {
            return { success: false, error: 'Este CPF já está cadastrado.' };
        }

        // Gerar UID único
        const uid = gerarUID();

        // Hash da senha
        const senhaHash = await hashSenha(senha);

        // Dados base do usuário
        const dadosNovoUsuario = {
            uid: uid,
            nomeCompleto: nomeCompleto,
            email: email,
            cpf: cpfFormatado,
            dataNascimento: dataNascimento,
            telefone: telefoneFormatado,
            senhaHash: senhaHash,
            dataCriacao: serverTimestamp(),
            ultimoAcesso: serverTimestamp(),
            ativo: true
        };

        // Se houver código de referência, adicionar
        if (referralCode) {
            dadosNovoUsuario.indicadoPor = referralCode;
            dadosNovoUsuario.indicadoEm = serverTimestamp();
        }

        // Criar documento do usuário no Firestore (subcoleção Usuários)
        await setDoc(doc(db, 'SLICED', 'data', 'Usuários', uid), dadosNovoUsuario);

        // Criar sessão automaticamente após cadastro
        const dadosSessao = {
            uid: uid,
            email: email,
            nomeCompleto: nomeCompleto
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(dadosSessao));

        console.log('Usuário cadastrado com sucesso!');
        return { success: true, user: dadosSessao };
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        return { success: false, error: 'Erro ao cadastrar usuário. Tente novamente.' };
    }
}

// Função para fazer login
export async function fazerLogin(email, senha) {
    try {
        // Buscar usuário por e-mail na subcoleção Usuários
        const usuariosCollection = collection(db, 'SLICED', 'data', 'Usuários');
        const q = query(usuariosCollection, where('email', '==', email));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            return { success: false, error: 'E-mail ou senha incorretos.' };
        }

        // Pegar o primeiro documento (e-mail é único)
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();

        // Verificar se a conta está ativa
        if (!userData.ativo) {
            return { success: false, error: 'Esta conta foi desabilitada.' };
        }

        // Verificar senha
        const senhaHash = await hashSenha(senha);
        if (senhaHash !== userData.senhaHash) {
            return { success: false, error: 'E-mail ou senha incorretos.' };
        }

        // Atualizar último acesso
        await setDoc(doc(db, 'SLICED', 'data', 'Usuários', userData.uid), {
            ultimoAcesso: serverTimestamp()
        }, { merge: true });

        // Criar sessão
        const dadosSessao = {
            uid: userData.uid,
            email: userData.email,
            nomeCompleto: userData.nomeCompleto
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(dadosSessao));

        console.log('Login realizado com sucesso!');
        return { success: true, user: dadosSessao };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
}

// Função para fazer logout
export async function fazerLogout() {
    try {
        localStorage.removeItem(SESSION_KEY);
        console.log('Logout realizado com sucesso!');
        return { success: true };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, error: 'Erro ao fazer logout.' };
    }
}

// Função para obter dados do usuário do Firestore
export async function obterDadosUsuario(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'SLICED', 'data', 'Usuários', uid));
        
        if (userDoc.exists()) {
            const dados = userDoc.data();
            // Remover hash da senha dos dados retornados
            delete dados.senhaHash;
            return { success: true, dados: dados };
        } else {
            return { success: false, error: 'Usuário não encontrado' };
        }
    } catch (error) {
        console.error('Erro ao obter dados do usuário:', error);
        return { success: false, error: 'Erro ao obter dados do usuário.' };
    }
}

// Função para atualizar dados do usuário no Firestore
export async function atualizarDadosUsuario(uid, dadosAtualizados) {
    try {
        // Remover campos que não devem ser atualizados
        const dadosPermitidos = { ...dadosAtualizados };
        delete dadosPermitidos.uid;
        delete dadosPermitidos.email;
        delete dadosPermitidos.senhaHash;
        delete dadosPermitidos.dataCriacao;

        // Atualizar documento do usuário
        await setDoc(doc(db, 'SLICED', 'data', 'Usuários', uid), dadosPermitidos, { merge: true });

        console.log('Dados do usuário atualizados com sucesso!');
        return { success: true };
    } catch (error) {
        console.error('Erro ao atualizar dados do usuário:', error);
        return { success: false, error: 'Erro ao atualizar dados do usuário.' };
    }
}

// Função para verificar se usuário está autenticado
export function verificarAutenticacao(callback) {
    try {
        const sessao = localStorage.getItem(SESSION_KEY);
        
        if (sessao) {
            const dadosSessao = JSON.parse(sessao);
            
            // Verificar se o usuário ainda existe no Firestore
            getDoc(doc(db, 'SLICED', 'data', 'Usuários', dadosSessao.uid))
                .then(userDoc => {
                    if (userDoc.exists() && userDoc.data().ativo) {
                        callback(dadosSessao);
                    } else {
                        // Usuário não existe mais ou foi desabilitado
                        localStorage.removeItem(SESSION_KEY);
                        callback(null);
                    }
                })
                .catch(error => {
                    console.error('Erro ao verificar autenticação:', error);
                    callback(null);
                });
        } else {
            callback(null);
        }
    } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        callback(null);
    }
}

// Função para obter usuário atual da sessão
export function obterUsuarioAtual() {
    try {
        const sessao = localStorage.getItem(SESSION_KEY);
        if (sessao) {
            return JSON.parse(sessao);
        }
        return null;
    } catch (error) {
        console.error('Erro ao obter usuário atual:', error);
        return null;
    }
}

// Função para validar CPF
export function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        return false;
    }

    let soma = 0;
    let resto;

    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;

    return true;
}

// Função para formatar CPF
export function formatarCPF(cpf) {
    cpf = cpf.replace(/[^\d]/g, '');
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para formatar telefone
export function formatarTelefone(telefone) {
    telefone = telefone.replace(/[^\d]/g, '');
    if (telefone.length === 11) {
        return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    } else if (telefone.length === 10) {
        return telefone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return telefone;
}

// Função para validar e-mail
export function validarEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
