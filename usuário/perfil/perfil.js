// ==================================================================
// ARQUIVO: perfil.js (Conexão Total: Auth + Backend Saldo)
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // ------------------------------------------------------------------
    // 1. CONFIGURAÇÃO DO SERVIDOR (API)
    // ------------------------------------------------------------------
    const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
    let API_BASE;

    // Detecta automaticamente se está no Render ou Localhost
    if (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online') {
        API_BASE = `https://${PROD_DOMAIN}/api`;
        console.log('🌍 Modo Produção Ativado');
    } else {
        API_BASE = 'http://localhost:3001/api';
        console.log('🏠 Modo Desenvolvimento (Localhost)');
    }

    // ------------------------------------------------------------------
    // 2. ELEMENTOS DA TELA
    // ------------------------------------------------------------------
    const elSaldoValor = document.getElementById('balanceAmount');
    const btnAtualizarSaldo = document.getElementById('btnRefreshBalance');
    
    // Variáveis Globais
    let usuarioAtual = null;

    // ------------------------------------------------------------------
    // 3. FUNÇÃO: BUSCAR SALDO NO SERVIDOR
    // ------------------------------------------------------------------
    async function buscarSaldoServidor(uid) {
        if (!uid) return;

        // Feedback visual de carregamento
        if (elSaldoValor) {
            elSaldoValor.style.opacity = '0.5';
            elSaldoValor.innerHTML = '<span style="font-size: 1rem">Carregando...</span>';
        }

        try {
            console.log(`🔄 [API] Buscando saldo para UID: ${uid}`);
            
            // Faz a chamada ao seu Backend (server2.js)
            const resposta = await fetch(`${API_BASE}/user/${uid}/balance`);
            const dados = await resposta.json();

            if (dados.success) {
                const saldoNumerico = parseFloat(dados.data.balance);
                
                // Formata para Real Brasileiro (R$ 5,00)
                const saldoFormatado = saldoNumerico.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });

                console.log(`💰 [API] Saldo recebido: ${saldoNumerico} -> ${saldoFormatado}`);

                if (elSaldoValor) {
                    elSaldoValor.textContent = saldoFormatado;
                    elSaldoValor.style.opacity = '1';
                    
                    // Salva na sessão para a página de saque/depósito usar rápido
                    sessionStorage.setItem('userBalance', saldoNumerico);
                }
            } else {
                console.error('❌ Erro na API:', dados.message);
                if (elSaldoValor) elSaldoValor.textContent = 'Erro';
            }
        } catch (erro) {
            console.error('❌ Erro de Conexão:', erro);
            if (elSaldoValor) elSaldoValor.textContent = 'R$ ---';
        } finally {
            if (elSaldoValor) elSaldoValor.style.opacity = '1';
        }
    }

    // ------------------------------------------------------------------
    // 4. INICIALIZAÇÃO (CONECTANDO COM AUTH.JS)
    // ------------------------------------------------------------------
    function iniciarPerfil() {
        console.log('🚀 Iniciando Perfil...');

        // 1. Tenta ler a sessão criada pelo auth.js (localStorage)
        const sessaoAuth = localStorage.getItem('spfc_user_session');

        if (sessaoAuth) {
            const dadosUsuario = JSON.parse(sessaoAuth);
            
            // Configura o usuário atual
            usuarioAtual = {
                uid: dadosUsuario.uid,
                nome: dadosUsuario.nomeCompleto,
                email: dadosUsuario.email,
                cpf: dadosUsuario.cpf // O auth.js costuma salvar o CPF formatado
            };

            // Salva na sessionStorage (para saldo.html e outras páginas usarem sem re-login)
            sessionStorage.setItem('loggedInUser', JSON.stringify(usuarioAtual));

            console.log('✅ Usuário Autenticado:', usuarioAtual.uid);

            // 2. Busca o saldo IMEDIATAMENTE
            buscarSaldoServidor(usuarioAtual.uid);

        } else {
            console.warn('⚠️ Nenhuma sessão do Auth.js encontrada.');
            if (elSaldoValor) elSaldoValor.textContent = 'R$ 0,00';
            // Opcional: Redirecionar para login
            // window.location.href = '../../login/login.html';
        }
    }

    // Executa a inicialização
    iniciarPerfil();

    // ------------------------------------------------------------------
    // 5. EVENTOS (Botão de Atualizar)
    // ------------------------------------------------------------------
    if (btnAtualizarSaldo) {
        btnAtualizarSaldo.addEventListener('click', () => {
            // Animação de giro
            const icone = btnAtualizarSaldo.querySelector('.material-icons');
            if (icone) icone.style.transform = 'rotate(360deg)';
            
            // Recarrega
            if (usuarioAtual && usuarioAtual.uid) {
                buscarSaldoServidor(usuarioAtual.uid);
            }

            // Para a animação
            setTimeout(() => {
                if (icone) icone.style.transform = 'none';
            }, 600);
        });
    }

    // ------------------------------------------------------------------
    // 6. LÓGICA DOS BOTÕES DE DEPÓSITO (Redirecionamento)
    // ------------------------------------------------------------------
    const botoesDeposito = document.querySelectorAll('.deposit-option-btn');
    const inputDepositoCustom = document.getElementById('custom-deposit-amount');
    const btnDepositoCustom = document.getElementById('deposit-custom-btn');

    function irParaPagamento(valor) {
        if (!valor || valor <= 0) return alert('Valor inválido');
        
        sessionStorage.setItem('depositAmount', valor.toFixed(2));
        // Garante que os dados do usuário vão junto
        sessionStorage.setItem('loggedInUser', JSON.stringify(usuarioAtual));
        
        window.location.href = 'saldo.html';
    }

    // Botões Fixos
    botoesDeposito.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const val = parseFloat(e.target.dataset.value);
            irParaPagamento(val);
        });
    });

    // Botão Customizado
    if (btnDepositoCustom && inputDepositoCustom) {
        inputDepositoCustom.addEventListener('input', () => {
            const val = parseFloat(inputDepositoCustom.value);
            btnDepositoCustom.disabled = isNaN(val) || val < 100; // Mínimo 100
        });

        btnDepositoCustom.addEventListener('click', () => {
            irParaPagamento(parseFloat(inputDepositoCustom.value));
        });
    }

    // ------------------------------------------------------------------
    // 7. LÓGICA DE SAQUE (Modal)
    // ------------------------------------------------------------------
    const btnSaque = document.getElementById('btnWithdraw');
    const modalSaque = document.getElementById('withdrawModal');
    const btnFecharModal = document.getElementById('closeWithdrawModal');
    const formSaque = document.getElementById('withdrawForm');
    const inputValorSaque = document.getElementById('withdrawAmount');

    if (btnSaque) {
        btnSaque.addEventListener('click', () => {
            modalSaque.classList.add('show');
            // Atualiza o placeholder com o saldo atual conhecido
            const saldoAtual = sessionStorage.getItem('userBalance') || '0.00';
            if (inputValorSaque) {
                inputValorSaque.placeholder = `Máx: R$ ${parseFloat(saldoAtual).toFixed(2)}`;
            }
        });
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', () => {
            modalSaque.classList.remove('show');
        });
    }

    if (formSaque) {
        formSaque.addEventListener('submit', async (e) => {
            e.preventDefault();
            alert('Funcionalidade de saque será implementada em breve no backend.');
            modalSaque.classList.remove('show');
        });
    }

});