// js/perfil.js

document.addEventListener('DOMContentLoaded', () => {
    // ... (Seletores do DOM e Variáveis de Ambiente/Constantes MIN_CUSTOM_DEPOSIT) ...
    const depositOptionButtons = document.querySelectorAll('.deposit-option-btn');
    const customDepositInput = document.getElementById('custom-deposit-amount');
    const depositCustomBtn = document.getElementById('deposit-custom-btn');
    const balanceAmountDisplay = document.getElementById('balanceAmount');
    const btnRefreshBalance = document.getElementById('btnRefreshBalance');
    const btnWithdraw = document.getElementById('btnWithdraw');
    const withdrawModal = document.getElementById('withdrawModal');
    const closeWithdrawModal = document.getElementById('closeWithdrawModal');
    const withdrawForm = document.getElementById('withdrawForm');
    const withdrawLoading = document.getElementById('withdrawLoading');
    const withdrawAmountInput = document.getElementById('withdrawAmount');

    const API_BASE = 'https://sliced-game-front-back-render.onrender.com/api';
    let currentUser = null;
    let currentBalance = 0.00;
    const MIN_CUSTOM_DEPOSIT = 100.00;


    // ============================================
    // FUNÇÃO PARA CARREGAR SALDO DO BACKEND
    // ============================================
    async function loadBalance() {
        if (!currentUser || !currentUser.uid) {
            // Tenta obter o usuário da session novamente, caso tenha sido preenchido
            // pelo script module do perfil.html
            const sessionData = sessionStorage.getItem('loggedInUser');
            if (sessionData) {
                currentUser = JSON.parse(sessionData);
            } else {
                balanceAmountDisplay.textContent = 'R$ 0,00';
                return;
            }
        }

        try {
            // Puxa o saldo atualizado do Firestore via Backend
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

                // Pega dados do DOM, se existirem (preenchidos pelo tracker-config)
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

                // 💡 CARREGA SALDO IMEDIATAMENTE (solução mais garantida)
                loadBalance();
            } else {
                console.warn('⚠️ Sessão não encontrada. Necessário Login.');
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }, 0); // EXECUTA IMEDIATAMENTE (0ms)


    // ... (As funções startDepositFlow, listeners de depósito, e funções de saque permanecem as mesmas) ...
    // Note que a função loadBalance já está definida acima.

    /**
     * Função principal para iniciar o fluxo de depósito.
     */
    function startDepositFlow(amount) {
        // ... (Validações de valor e mínimo de 100) ...
        if (amount <= 0 || isNaN(amount)) {
            alert('Por favor, selecione ou digite um valor válido para depósito.');
            return;
        }

        if (amount >= MIN_CUSTOM_DEPOSIT && customDepositInput && parseFloat(customDepositInput.value) === amount) {
            if (amount < MIN_CUSTOM_DEPOSIT) {
                alert(`O valor mínimo para depósito personalizado é de R$ ${MIN_CUSTOM_DEPOSIT.toFixed(2).replace('.', ',')}.`);
                return;
            }
        }

        // ... (Atualiza sessionStorage com dados do usuário) ...
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

    // Botões de Opções Fixas
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