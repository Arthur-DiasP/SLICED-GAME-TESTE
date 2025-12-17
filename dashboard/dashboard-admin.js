// Dashboard Admin - SLICED
// Gerenciamento completo de usuários, saldo e saques

import { db } from '../controle-dados/firebase-config.js';
import {
    collection,
    getDocs,
    doc,
    updateDoc,
    query,
    where,
    orderBy,
    onSnapshot,
    collectionGroup,
    addDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { verificarAutenticacao } from '../controle-dados/auth.js';

// Estado global
let currentEditingUserId = null;
let allUsers = [];
let allTransactions = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    // Verificar autenticação e permissão de admin
    verificarAutenticacao(async (user) => {
        if (!user) {
            // Usuário não está logado, redirecionar para login
            alert('Você precisa estar logado para acessar o dashboard.');
            window.location.href = '../login/login.html';
            return;
        }

        // Verificar se o usuário é admin
        try {
            const userRef = doc(db, 'SLICED', 'data', 'Usuários', user.uid);
            const userDoc = await getDoc(userRef);
            
            if (!userDoc.exists()) {
                alert('Usuário não encontrado no banco de dados.');
                window.location.href = '../login/login.html';
                return;
            }

            const userData = userDoc.data();
            
            // Verificar se o usuário tem permissão de admin
            if (!userData.isAdmin) {
                alert('Acesso negado! Você não tem permissão para acessar o dashboard administrativo.');
                window.location.href = '../usuário/inicio/inicio.html';
                return;
            }

            // Usuário é admin, carregar dados do dashboard
            console.log('✅ Usuário autenticado como admin:', userData.nomeCompleto);
            loadDashboardData();
            setupEventListeners();
            loadPlatformFeeWithdrawals();
        } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            alert('Erro ao verificar permissões. Tente novamente.');
            window.location.href = '../login/login.html';
        }
    });
});

// ===== CARREGAR DADOS =====
async function loadDashboardData() {
    try {
        await Promise.all([
            loadUsers(),
            loadWithdrawals(),
            loadTransactionsAndRevenue()
        ]);
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

// Carregar usuários
async function loadUsers() {
    try {
        // Buscar usuários na subcoleção correta: SLICED/data/Usuários
        const usersRef = collection(db, 'SLICED', 'data', 'Usuários');
        const snapshot = await getDocs(usersRef);
        
        allUsers = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Adiciona o usuário com todos os dados
            allUsers.push({
                id: doc.id,
                nomeCompleto: data.nomeCompleto || 'N/A',
                email: data.email || 'N/A',
                cpf: data.cpf || 'N/A',
                balance: data.saldo || 0, // Saldo está no mesmo documento
                dataCadastro: data.dataCriacao || data.dataCadastro,
                telefone: data.telefone || 'N/A',
                ativo: data.ativo !== false,
                ultimoAcesso: data.ultimoAcesso
            });
        });

        // Atualiza o contador de usuários
        document.getElementById('totalUsers').textContent = allUsers.length;
        
        // Renderiza a tabela
        renderUsers(allUsers);
        
        console.log(`✅ ${allUsers.length} usuários carregados com sucesso!`);
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        document.getElementById('totalUsers').textContent = '0';
    }
}

// Renderizar tabela de usuários
function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
                    Nenhum usuário encontrado
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.nomeCompleto || 'N/A'}</td>
            <td>${user.email || 'N/A'}</td>
            <td>${user.cpf || 'N/A'}</td>
            <td style="color: #00ff88; font-weight: 700;">R$ ${(user.balance || 0).toFixed(2)}</td>
            <td>${formatDate(user.dataCadastro)}</td>
            <td>
                <button class="edit-btn" onclick="openEditModal('${user.id}')">
                    Editar
                </button>
            </td>
        </tr>
    `).join('');
}

// Carregar transações e calcular faturamento
async function loadTransactionsAndRevenue() {
    try {
        // Busca todos os usuários
        const usuariosRef = collection(db, 'SLICED', 'data', 'Usuários');
        const usuariosSnapshot = await getDocs(usuariosRef);
        
        let totalRevenue = 0;
        
        // Soma o saldo de todos os usuários
        usuariosSnapshot.forEach(userDoc => {
            const userData = userDoc.data();
            const userBalance = Number(userData.saldo || 0);
            totalRevenue += userBalance;
        });
        
        // Calcula taxa da plataforma (20%)
        const platformFee = totalRevenue * 0.20;

        document.getElementById('totalRevenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
        document.getElementById('platformFee').textContent = `R$ ${platformFee.toFixed(2)}`;
        document.getElementById('currentPlatformFee').textContent = `R$ ${platformFee.toFixed(2)}`;
        
        // Carrega e atualiza valores retirados
        await updatePlatformFeeWithdrawals(platformFee);
        
        console.log(`💰 Total de usuários: ${usuariosSnapshot.size}`);
        console.log(`💰 Faturamento total (soma dos saldos): R$ ${totalRevenue.toFixed(2)}`);
        console.log(`💰 Taxa da plataforma (20%): R$ ${platformFee.toFixed(2)}`);
    } catch (error) {
        console.error('Erro ao calcular faturamento:', error);
        document.getElementById('totalRevenue').textContent = 'R$ 0,00';
        document.getElementById('platformFee').textContent = 'R$ 0,00';
        document.getElementById('currentPlatformFee').textContent = 'R$ 0,00';
    }
}

// Carregar solicitações de saque
async function loadWithdrawals() {
    try {
        // Busca solicitações de saque na coleção Saques (se existir)
        const withdrawalsRef = collection(db, 'SLICED', 'data', 'Saques');
        
        try {
            const withdrawalsSnapshot = await getDocs(withdrawalsRef);
            const withdrawalsBody = document.getElementById('withdrawalsTableBody');
            
            if (withdrawalsSnapshot.empty) {
                withdrawalsBody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 40px; color: #888;">
                            Nenhuma solicitação de saque no momento
                        </td>
                    </tr>
                `;
                document.getElementById('pendingWithdrawals').textContent = '0';
                return;
            }
            
            let pendingCount = 0;
            const withdrawalsHTML = [];
            
            withdrawalsSnapshot.forEach(doc => {
                const data = doc.data();
                const isPending = data.status === 'pending' || data.status === 'pendente';
                
                if (isPending) pendingCount++;
                
                // Gera ID único para a chave PIX
                const pixKeyId = 'pixKey_' + doc.id;
                const pixKey = data.pixKey || 'N/A';
                
                withdrawalsHTML.push(`
                    <tr>
                        <td>${data.userName || data.nomeCompleto || 'N/A'}</td>
                        <td style="color: #00ff88; font-weight: 700;">R$ ${(data.valor || data.amount || 0).toFixed(2)}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span id="${pixKeyId}" style="font-size: 0.85rem; font-family: monospace;">${pixKey}</span>
                                <button 
                                    class="btn-copy-pix" 
                                    onclick="copyPixKey('${pixKeyId}')"
                                    title="Copiar chave PIX"
                                    style="padding: 6px 10px; background: rgba(0, 255, 136, 0.2); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 6px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px;"
                                >
                                    <i class="material-icons" style="font-size: 16px; color: #00ff88;">content_copy</i>
                                    <span style="font-size: 0.75rem; color: #00ff88; font-weight: 600;">Copiar</span>
                                </button>
                            </div>
                        </td>
                        <td>${formatDate(data.dataSolicitacao || data.createdAt)}</td>
                        <td>
                            <span class="status-badge ${isPending ? 'status-pendente' : 'status-concluido'}">
                                ${isPending ? 'Pendente' : 'Concluído'}
                            </span>
                        </td>
                        <td>
                            ${isPending ? `
                                <button class="edit-btn" onclick="approveWithdrawal('${doc.id}')">
                                    Aprovar
                                </button>
                            ` : '-'}
                        </td>
                    </tr>
                `);
            });
            
            withdrawalsBody.innerHTML = withdrawalsHTML.join('');
            document.getElementById('pendingWithdrawals').textContent = pendingCount;
            
        } catch (collectionError) {
            // Se a coleção não existir, mostra mensagem padrão
            const withdrawalsBody = document.getElementById('withdrawalsTableBody');
            withdrawalsBody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: #888;">
                        Nenhuma solicitação de saque no momento
                    </td>
                </tr>
            `;
            document.getElementById('pendingWithdrawals').textContent = '0';
        }
    } catch (error) {
        console.error('Erro ao carregar saques:', error);
    }
}

// Aprovar saque
window.approveWithdrawal = async function(withdrawalId) {
    if (!confirm('Deseja aprovar esta solicitação de saque?')) return;
    
    try {
        const withdrawalRef = doc(db, 'SLICED', 'data', 'Saques', withdrawalId);
        await updateDoc(withdrawalRef, {
            status: 'approved',
            approvedAt: new Date(),
            approvedBy: 'admin'
        });
        
        alert('Saque aprovado com sucesso!');
        loadWithdrawals();
    } catch (error) {
        console.error('Erro ao aprovar saque:', error);
        alert('Erro ao aprovar saque. Verifique o console.');
    }
}

// ===== BUSCA E FILTROS =====
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const filterType = document.getElementById('filterType');

    searchInput.addEventListener('input', filterUsers);
    filterType.addEventListener('change', filterUsers);
}

function filterUsers() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterType = document.getElementById('filterType').value;

    let filtered = allUsers;

    // Filtrar por busca
    if (searchTerm) {
        filtered = filtered.filter(user => 
            (user.nomeCompleto?.toLowerCase().includes(searchTerm)) ||
            (user.email?.toLowerCase().includes(searchTerm)) ||
            (user.cpf?.includes(searchTerm))
        );
    }

    // Filtrar por tipo
    if (filterType === 'active') {
        filtered = filtered.filter(user => user.isOnline === true);
    } else if (filterType === 'inactive') {
        filtered = filtered.filter(user => user.isOnline !== true);
    }

    renderUsers(filtered);
}

// ===== MODAL EDIÇÃO =====
window.openEditModal = function(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    currentEditingUserId = userId;

    document.getElementById('editName').value = user.nomeCompleto || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editCPF').value = user.cpf || '';
    document.getElementById('editBalance').value = user.balance || 0;

    document.getElementById('editUserModal').style.display = 'flex';
}

window.closeEditModal = function() {
    document.getElementById('editUserModal').style.display = 'none';
    currentEditingUserId = null;
}

// Salvar edições
document.getElementById('editUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentEditingUserId) return;

    try {
        // Atualiza todos os dados do usuário em SLICED/data/Usuários
        const userRef = doc(db, 'SLICED', 'data', 'Usuários', currentEditingUserId);
        await updateDoc(userRef, {
            nomeCompleto: document.getElementById('editName').value,
            email: document.getElementById('editEmail').value,
            cpf: document.getElementById('editCPF').value,
            saldo: parseFloat(document.getElementById('editBalance').value)
        });

        alert('Usuário atualizado com sucesso!');
        closeEditModal();
        loadUsers();
    } catch (error) {
        console.error('Erro ao atualizar usuário:', error);
        alert('Erro ao atualizar usuário. Verifique o console.');
    }
});

// ===== UTILITÁRIOS =====
function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        return 'N/A';
    }

    return date.toLocaleDateString('pt-BR');
}

// Fechar modal ao clicar fora
window.addEventListener('click', (e) => {
    const modal = document.getElementById('editUserModal');
    if (e.target === modal) {
        closeEditModal();
    }
});

// ===== GERENCIAMENTO DA TAXA DA PLATAFORMA =====

// Carregar retiradas da taxa da plataforma
async function loadPlatformFeeWithdrawals() {
    try {
        const withdrawalsRef = collection(db, 'SLICED', 'data', 'PlatformFeeWithdrawals');
        const snapshot = await getDocs(withdrawalsRef);
        
        let totalWithdrawn = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            totalWithdrawn += Number(data.amount || 0);
        });
        
        return totalWithdrawn;
    } catch (error) {
        console.error('Erro ao carregar retiradas da taxa:', error);
        return 0;
    }
}

// Atualizar valores da taxa da plataforma
async function updatePlatformFeeWithdrawals(currentFee) {
    const totalWithdrawn = await loadPlatformFeeWithdrawals();
    const available = currentFee - totalWithdrawn;
    
    document.getElementById('totalWithdrawnFromFee').textContent = `R$ ${totalWithdrawn.toFixed(2)}`;
    document.getElementById('availablePlatformFee').textContent = `R$ ${available.toFixed(2)}`;
    
    // Mostra/esconde indicador vermelho no card
    const withdrawnIndicator = document.getElementById('platformFeeWithdrawn');
    const withdrawnAmount = document.getElementById('platformFeeWithdrawnAmount');
    
    if (totalWithdrawn > 0) {
        withdrawnIndicator.style.display = 'block';
        withdrawnAmount.textContent = `R$ ${totalWithdrawn.toFixed(2)}`;
    } else {
        withdrawnIndicator.style.display = 'none';
    }
}

// Formulário de retirada da taxa
const platformFeeForm = document.getElementById('platformFeeWithdrawForm');
if (platformFeeForm) {
    platformFeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('platformFeeWithdrawAmount').value);
        
        if (!amount || amount <= 0) {
            alert('Digite um valor válido!');
            return;
        }
        
        // Verifica saldo disponível
        const currentFeeText = document.getElementById('currentPlatformFee').textContent;
        const currentFee = parseFloat(currentFeeText.replace('R$ ', '').replace(',', '.'));
        const totalWithdrawn = await loadPlatformFeeWithdrawals();
        const available = currentFee - totalWithdrawn;
        
        if (amount > available) {
            alert(`Saldo insuficiente! Disponível: R$ ${available.toFixed(2)}`);
            return;
        }
        
        if (!confirm(`Confirmar retirada de R$ ${amount.toFixed(2)} da taxa da plataforma?`)) {
            return;
        }
        
        try {
            // Registra a retirada
            const withdrawalsRef = collection(db, 'SLICED', 'data', 'PlatformFeeWithdrawals');
            await addDoc(withdrawalsRef, {
                amount: amount,
                createdAt: new Date(),
                createdBy: 'admin'
            });
            
            alert('Retirada registrada com sucesso!');
            document.getElementById('platformFeeWithdrawAmount').value = '';
            
            // Atualiza os valores
            await loadTransactionsAndRevenue();
        } catch (error) {
            console.error('Erro ao registrar retirada:', error);
            alert('Erro ao registrar retirada. Verifique o console.');
        }
    });
}

// Função para copiar chave PIX
window.copyPixKey = function(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visual
        const button = element.parentElement.querySelector('.btn-copy-pix');
        if (button) {
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="material-icons" style="font-size: 16px; color: #4ade80;">check</i><span style="font-size: 0.75rem; color: #4ade80; font-weight: 600;">Copiado!</span>';
            button.style.background = 'rgba(74, 222, 128, 0.2)';
            button.style.borderColor = 'rgba(74, 222, 128, 0.3)';
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.style.background = 'rgba(0, 255, 136, 0.2)';
                button.style.borderColor = 'rgba(0, 255, 136, 0.3)';
            }, 2000);
        }
    }).catch(err => {
        console.error('Erro ao copiar:', err);
        alert('Erro ao copiar chave PIX');
    });
};
