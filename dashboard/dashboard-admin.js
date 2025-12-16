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
    collectionGroup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Estado global
let currentEditingUserId = null;
let allUsers = [];
let allTransactions = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    setupEventListeners();
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
        
        console.log(`💰 Total de usuários: ${usuariosSnapshot.size}`);
        console.log(`💰 Faturamento total (soma dos saldos): R$ ${totalRevenue.toFixed(2)}`);
        console.log(`💰 Taxa da plataforma (20%): R$ ${platformFee.toFixed(2)}`);
    } catch (error) {
        console.error('Erro ao calcular faturamento:', error);
        document.getElementById('totalRevenue').textContent = 'R$ 0,00';
        document.getElementById('platformFee').textContent = 'R$ 0,00';
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
                
                withdrawalsHTML.push(`
                    <tr>
                        <td>${data.userName || data.nomeCompleto || 'N/A'}</td>
                        <td style="color: #00ff88; font-weight: 700;">R$ ${(data.valor || data.amount || 0).toFixed(2)}</td>
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
