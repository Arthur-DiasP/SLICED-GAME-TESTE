// js/perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // === Seletores do DOM ===
    const depositOptionButtons = document.querySelectorAll('.deposit-option-btn');
    const customDepositInput = document.getElementById('custom-deposit-amount');
    const depositCustomBtn = document.getElementById('deposit-custom-btn');
    
    // Elementos Financeiros
    const balanceAmountDisplay = document.getElementById('balanceAmount'); // Onde o saldo é exibido
    const btnRefreshBalance = document.getElementById('btnRefreshBalance');
    const btnWithdraw = document.getElementById('btnWithdraw');
    const withdrawModal = document.getElementById('withdrawModal');
    const closeWithdrawModal = document.getElementById('closeWithdrawModal');
    const withdrawForm = document.getElementById('withdrawForm');
    const withdrawLoading = document.getElementById('withdrawLoading');
    const withdrawAmountInput = document.getElementById('withdrawAmount');
    const successMessage = document.getElementById('successMessage'); // Selecionar o elemento de sucesso

    // Variáveis de Ambiente
    const API_BASE = 'https://sliced-game-teste.onrender.com/api';

    // === Variável para armazenar dados do usuário e saldo ===
    let currentUser = null; 
    let currentBalance = 0.00; // Saldo real em memória

    // === CONSTANTE DE DEPÓSITO MÍNIMO PERSONALIZADO ===
    const MIN_CUSTOM_DEPOSIT = 100.00; // NOVO MÍNIMO DE R$ 100,00

    
    // ============================================
    // FUNÇÃO PARA CARREGAR SALDO DO BACKEND
    // ============================================
    async function loadBalance() {
        if (!currentUser || !currentUser.uid) {
            // Tenta obter o usuário da session novamente, caso tenha sido preenchido
            const sessionData = sessionStorage.getItem('loggedInUser');
            if (sessionData) {
                currentUser = JSON.parse(sessionData);
            } else {
                 balanceAmountDisplay.textContent = 'R$ 0,00';
                 return;
            }
        }

        try {
            const response = await fetch(`${API_BASE}/user/${currentUser.uid}/balance`);
            const result = await response.json();

            if (result.success) {
                const balance = parseFloat(result.data.balance);
                currentBalance = balance; // Atualiza o saldo em memória
                balanceAmountDisplay.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;
            } else {
                console.error('Erro ao carregar saldo:', result.message);
                balanceAmountDisplay.textContent = 'R$ 0,00';
            }
        } catch (error) {
            console.error('Erro ao carregar saldo (fetch):', error);
            balanceAmountDisplay.textContent = 'R$ 0,00';
        }
    }


    // === Inicialização: Tenta carregar dados e saldo IMEDIATAMENTE (0ms) ===
    setTimeout(() => {
        try {
            const sessao = localStorage.getItem('spfc_user_session');
            if (sessao) {
                const dadosSessao = JSON.parse(sessao);
                
                const nomeCompleto = document.getElementById('nomeCompleto')?.value || dadosSessao.nomeCompleto || 'Usuário';
                const email = document.getElementById('email')?.value || dadosSessao.email || '';
                const cpf = document.getElementById('cpf')?.value || '';
                
                currentUser = {
                    uid: dadosSessao.uid,
                    email: email,
                    nome: nomeCompleto,
                    nomeCompleto: nomeCompleto,
                    cpf: cpf
                };

                // Salva na sessionStorage (usado pelo saldo.js)
                sessionStorage.setItem('loggedInUser', JSON.stringify(currentUser));
                
                console.log('✅ Dados do usuário carregados para depósito.');
                
                // CARREGA SALDO IMEDIATAMENTE
                loadBalance(); 
            } else {
                console.warn('⚠️ Sessão não encontrada. Necessário Login.');
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }, 0);


    // ==================================================================
    // 💡 NOVA FUNÇÃO: Trata o status de retorno do Mercado Pago (back_urls)
    // ==================================================================
    function handleDepositStatus() {
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        
        if (status) {
            let message = '';
            let isSuccess = false;

            switch (status) {
                case 'deposit_success':
                    // Se o WebSocket falhou, esta é a garantia da mensagem
                    message = '✓ Depósito concluído com sucesso! Seu saldo foi atualizado.';
                    isSuccess = true;
                    break;
                case 'deposit_pending':
                    message = '⏳ Seu depósito está pendente de confirmação. Verifique seu saldo em instantes.';
                    break;
                case 'deposit_failure':
                    message = '❌ Depósito falhou ou foi cancelado. Tente novamente.';
                    break;
            }

            if (message) {
                // Exibe a mensagem
                successMessage.textContent = message;
                successMessage.classList.add('show');
                
                // Força a recarga do saldo se for um status final ou pendente
                loadBalance(); 

                // Limpa o parâmetro da URL para não exibir de novo ao recarregar
                const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
                window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
            }
        }
    }
    
    // Chama a nova função após a inicialização do DOM
    handleDepositStatus(); 


    /**
     * Função principal para iniciar o fluxo de depósito.
     * @param {number} amount O valor selecionado para depósito.
     */
    function startDepositFlow(amount) {
        if (amount <= 0 || isNaN(amount)) {
            alert('Por favor, selecione ou digite um valor válido para depósito.');
            return;
        }
        
        // Validação para depósito personalizado (se vier do campo custom)
        if (amount >= MIN_CUSTOM_DEPOSIT && customDepositInput && parseFloat(customDepositInput.value) === amount) {
             if (amount < MIN_CUSTOM_DEPOSIT) {
                 alert(`O valor mínimo para depósito personalizado é de R$ ${MIN_CUSTOM_DEPOSIT.toFixed(2).replace('.', ',')}.`);
                 return;
             }
        }

        // Atualizar dados do usuário antes de redirecionar 
        try {
            const sessao = localStorage.getItem('spfc_user_session');
            if (sessao) {
                const dadosSessao = JSON.parse(sessao);
                const nomeCompleto = document.getElementById('nomeCompleto')?.value || dadosSessao.nomeCompleto || 'Usuário';
                const email = document.getElementById('email')?.value || dadosSessao.email || '';
                const cpf = document.getElementById('cpf')?.value || '';
                
                const userData = {
                    uid: dadosSessao.uid,
                    email: email,
                    nome: nomeCompleto,
                    nomeCompleto: nomeCompleto,
                    cpf: cpf
                };
                
                sessionStorage.setItem('loggedInUser', JSON.stringify(userData));
            }
        } catch (error) {
            console.error('Erro ao atualizar dados do usuário na sessão:', error);
        }

        // Salvar o valor do depósito
        sessionStorage.setItem('depositAmount', amount.toFixed(2));
        
        // Redirecionar para a página de saldo
        window.location.href = 'saldo.html';
    }

    // === EVENT LISTENERS DE DEPÓSITO ===

    // Botões de Opções Fixas (incluindo R$ 0,50)
    depositOptionButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const amount = parseFloat(e.target.dataset.value);
            startDepositFlow(amount);
        });
    });

    // Campo de Valor Personalizado (Regra de R$ 100,00)
    if (customDepositInput) {
        customDepositInput.addEventListener('input', () => {
            const value = parseFloat(customDepositInput.value);
            
            // Habilita o botão APENAS se o valor for >= R$ 100,00
            if (depositCustomBtn) {
                depositCustomBtn.disabled = isNaN(value) || value < MIN_CUSTOM_DEPOSIT;
            }
        });
    }

    // Botão de Depósito Personalizado
    if (depositCustomBtn) {
        depositCustomBtn.addEventListener('click', () => {
            const amount = parseFloat(customDepositInput.value);
            startDepositFlow(amount);
        });
    }


    // Botão de atualizar saldo
    btnRefreshBalance.addEventListener('click', () => {
        btnRefreshBalance.style.transform = 'rotate(360deg)';
        loadBalance();
        setTimeout(() => {
            btnRefreshBalance.style.transform = '';
        }, 600);
    });

    // Abrir modal de saque
    btnWithdraw.addEventListener('click', () => {
        withdrawModal.classList.add('show');
        // Exibe o saldo atual no placeholder para o usuário
        withdrawAmountInput.placeholder = `Mínimo R$ 20,00 (Seu saldo: R$ ${currentBalance.toFixed(2).replace('.', ',')})`;
    });

    // Fechar modal de saque
    closeWithdrawModal.addEventListener('click', () => {
        withdrawModal.classList.remove('show');
    });

    // Fechar modal ao clicar fora
    withdrawModal.addEventListener('click', (e) => {
        if (e.target === withdrawModal) {
            withdrawModal.classList.remove('show');
        }
    });

    // Submeter formulário de saque
    withdrawForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUser) return;

        const amount = withdrawAmountInput.value;
        const pixKeyType = document.getElementById('pixKeyType').value;
        const pixKey = document.getElementById('pixKey').value;
        const withdrawAmount = parseFloat(amount);
        
        const MIN_WITHDRAWAL = 20.00;
        
        // 1. Validação do Mínimo de Saque (Frontend)
        if (isNaN(withdrawAmount) || withdrawAmount < MIN_WITHDRAWAL) {
            alert(`Valor de saque mínimo é de R$ ${MIN_WITHDRAWAL.toFixed(2).replace('.', ',')}.`);
            return;
        }

        // 2. Validação de Saldo Suficiente (Frontend - Pré-check)
        if (withdrawAmount > currentBalance) {
            alert(`Saldo insuficiente. Seu saldo atual é de R$ ${currentBalance.toFixed(2).replace('.', ',')}.`);
            return;
        }

        if (!pixKeyType || !pixKey) {
            alert('Preencha todos os campos da chave PIX.');
            return;
        }

        // Mostrar loading
        withdrawForm.style.display = 'none';
        withdrawLoading.style.display = 'block';

        try {
            const response = await fetch(`${API_BASE}/withdraw/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: currentUser.uid,
                    amount: withdrawAmount,
                    pixKey: pixKey,
                    pixKeyType: pixKeyType
                })
            });

            const result = await response.json();

            withdrawLoading.style.display = 'none';
            withdrawForm.style.display = 'block';

            if (result.success) {
                alert(result.message);
                withdrawModal.classList.remove('show');
                withdrawForm.reset();

                // Atualizar saldo após o sucesso (o Backend já deduziu)
                loadBalance();
            } else {
                alert('Erro ao solicitar saque: ' + result.message);
            }
        } catch (error) {
            console.error('Erro ao solicitar saque:', error);
            withdrawLoading.style.display = 'none';
            withdrawForm.style.display = 'block';
            alert('Erro de conexão ao solicitar saque. Tente novamente.');
        }
    });
});