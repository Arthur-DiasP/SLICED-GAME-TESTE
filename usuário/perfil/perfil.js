// ==================================================================
// ARQUIVO: perfil.js (Carregamento Automático Imediato)
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Configura URL da API
    const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
    const API_BASE = (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online')
        ? `https://${PROD_DOMAIN}/api`
        : 'http://localhost:3001/api';

    const elSaldo = document.getElementById('balanceAmount');
    const btnRefresh = document.getElementById('btnRefreshBalance');
    let usuarioAtual = null;

    // --- FUNÇÃO DE BUSCA DE SALDO ---
    async function buscarSaldo(uid) {
        if(!uid) return;

        // Mostra "..." enquanto carrega para o usuário saber que está processando
        if (elSaldo) elSaldo.innerHTML = '<span style="opacity:0.7; font-size:0.8em">Atualizando...</span>';

        try {
            console.log('🔄 Buscando saldo...');
            const res = await fetch(`${API_BASE}/user/${uid}/balance`);
            const json = await res.json();

            if (json.success) {
                const valor = parseFloat(json.data.balance);
                
                // Formata R$ 5,50
                const valorFormatado = valor.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                });

                if (elSaldo) {
                    elSaldo.textContent = valorFormatado;
                    elSaldo.style.opacity = '1';
                }
                
                // Guarda no cache local
                sessionStorage.setItem('userBalance', valor);
            }
        } catch (e) {
            console.error('Erro ao buscar saldo:', e);
            if (elSaldo) elSaldo.textContent = 'R$ ---';
        }
    }

    // --- INICIALIZAÇÃO IMEDIATA ---
    function iniciar() {
        // 1. Pega dados do localStorage (auth.js)
        const sessao = localStorage.getItem('spfc_user_session');
        
        if (sessao) {
            const dados = JSON.parse(sessao);
            usuarioAtual = {
                uid: dados.uid,
                nome: dados.nomeCompleto,
                email: dados.email,
                cpf: dados.cpf
            };

            // Preenche campos visuais do perfil
            const elNome = document.getElementById('nomeCompleto');
            const elEmail = document.getElementById('email');
            const elCpf = document.getElementById('cpf');
            const elHeaderNome = document.getElementById('userName');

            if(elNome) elNome.value = usuarioAtual.nome || '';
            if(elEmail) elEmail.value = usuarioAtual.email || '';
            if(elCpf && usuarioAtual.cpf) elCpf.value = usuarioAtual.cpf;
            if(elHeaderNome) elHeaderNome.textContent = usuarioAtual.nome;

            // Salva sessão atualizada
            sessionStorage.setItem('loggedInUser', JSON.stringify(usuarioAtual));

            // 🚀 CHAMA O SALDO IMEDIATAMENTE
            buscarSaldo(usuarioAtual.uid);

        } else {
            console.warn('Sem sessão. Faça login.');
        }
    }

    // Executa assim que o script lê
    iniciar();

    // --- BOTÃO DE REFRESH MANUAL ---
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            const icon = btnRefresh.querySelector('i');
            if(icon) icon.style.transform = 'rotate(360deg)';
            
            if(usuarioAtual) buscarSaldo(usuarioAtual.uid);

            setTimeout(() => { if(icon) icon.style.transform = 'none'; }, 500);
        });
    }

    // --- BOTÕES DE DEPÓSITO ---
    const btnsDeposito = document.querySelectorAll('.deposit-option-btn');
    const inputCustom = document.getElementById('custom-deposit-amount');
    const btnCustom = document.getElementById('deposit-custom-btn');

    function irPagar(valor) {
        if(!valor || valor <= 0) return alert('Valor inválido');
        sessionStorage.setItem('depositAmount', valor.toFixed(2));
        window.location.href = 'saldo.html';
    }

    btnsDeposito.forEach(btn => {
        btn.addEventListener('click', (e) => irPagar(parseFloat(e.target.dataset.value)));
    });

    if(btnCustom && inputCustom) {
        inputCustom.addEventListener('input', () => {
            const v = parseFloat(inputCustom.value);
            btnCustom.disabled = isNaN(v) || v < 100;
        });
        btnCustom.addEventListener('click', () => irPagar(parseFloat(inputCustom.value)));
    }

    // --- MODAL DE SAQUE ---
    const btnSaque = document.getElementById('btnWithdraw');
    const modalSaque = document.getElementById('withdrawModal');
    const btnFechaSaque = document.getElementById('closeWithdrawModal');
    
    if(btnSaque && modalSaque) {
        btnSaque.addEventListener('click', () => {
            modalSaque.classList.add('show');
            const inputVal = document.getElementById('withdrawAmount');
            if(inputVal && usuarioAtual) {
                // Mostra saldo atual no placeholder
                const saldoAtual = sessionStorage.getItem('userBalance') || 0;
                inputVal.placeholder = `Disp: R$ ${parseFloat(saldoAtual).toFixed(2)}`;
            }
        });
    }
    
    if(btnFechaSaque && modalSaque) {
        btnFechaSaque.addEventListener('click', () => modalSaque.classList.remove('show'));
    }
});