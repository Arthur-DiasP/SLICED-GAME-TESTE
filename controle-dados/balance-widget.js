// ============================================================================
// WIDGET DE SALDO - Componente Reutilizável
// ============================================================================

/**
 * Busca o saldo do usuário através da API
 * @param {string} userId - ID do usuário
 * @returns {Promise<number>} - Saldo do usuário
 */
export async function fetchUserBalance(userId) {
    try {
        // Configuração da API (mesma lógica do perfil.js)
        const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
        const API_BASE = (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online')
            ? `https://${PROD_DOMAIN}/api`
            : 'http://localhost:3001/api';

        console.log('🔄 Widget: Buscando saldo via API...');
        const response = await fetch(`${API_BASE}/user/${userId}/balance`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const balance = parseFloat(result.data.balance) || 0;
            console.log('✅ Widget: Saldo obtido:', balance);
            return balance;
        }
        
        console.warn('⚠️ Widget: Resposta da API sem sucesso');
        return 0;
    } catch (error) {
        console.error('❌ Widget: Erro ao buscar saldo:', error);
        return 0;
    }
}

/**
 * Formata valor monetário para exibição
 * @param {number} value - Valor a ser formatado
 * @returns {string} - Valor formatado (ex: R$ 1.234,56)
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

/**
 * Inicializa o widget de saldo na página
 * @param {string} userId - ID do usuário logado
 */
export async function initBalanceWidget(userId) {
    const balanceWidget = document.getElementById('balance-widget');
    if (!balanceWidget) {
        console.warn('Widget de saldo não encontrado na página');
        return;
    }

    // Mostra loading
    balanceWidget.innerHTML = `
        <div class="balance-widget-loading">
            <div class="spinner-small"></div>
        </div>
    `;

    try {
        // Busca o saldo
        const balance = await fetchUserBalance(userId);
        
        // Atualiza o widget
        balanceWidget.innerHTML = `
            <div class="balance-widget-content" onclick="window.location.href='/usuário/perfil/perfil.html'">
                <div class="balance-icon">
                    <i class="material-icons">account_balance_wallet</i>
                </div>
                <div class="balance-info">
                    <div class="balance-label">Saldo</div>
                    <div class="balance-value">${formatCurrency(balance)}</div>
                </div>
                <div class="balance-arrow">
                    <i class="material-icons">chevron_right</i>
                </div>
            </div>
        `;
        
        console.log('✅ Widget de saldo inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar widget:', error);
        balanceWidget.innerHTML = `
            <div class="balance-widget-error">
                <i class="material-icons">error_outline</i>
                <span>Erro ao carregar saldo</span>
            </div>
        `;
    }
}

/**
 * Atualiza o saldo em tempo real (pode ser chamado após transações)
 * @param {string} userId - ID do usuário
 */
export async function refreshBalance(userId) {
    await initBalanceWidget(userId);
}

