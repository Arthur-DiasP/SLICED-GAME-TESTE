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
            const elHeaderEmail = document.getElementById('userEmail');

            if(elNome) elNome.value = usuarioAtual.nome || '';
            if(elEmail) elEmail.value = usuarioAtual.email || '';
            if(elCpf && usuarioAtual.cpf) elCpf.value = usuarioAtual.cpf;
            if(elHeaderNome) elHeaderNome.textContent = usuarioAtual.nome;
            if(elHeaderEmail) elHeaderEmail.textContent = usuarioAtual.email;

            // Salva sessão atualizada
            sessionStorage.setItem('loggedInUser', JSON.stringify(usuarioAtual));

            // 🚀 CHAMA O SALDO IMEDIATAMENTE
            buscarSaldo(usuarioAtual.uid);

            // ✅ ESCONDE O LOADING E MOSTRA O CONTEÚDO
            const loadingSection = document.getElementById('loadingSection');
            const contentSection = document.getElementById('contentSection');
            
            if(loadingSection) loadingSection.style.display = 'none';
            if(contentSection) contentSection.style.display = 'block';

        } else {
            console.warn('Sem sessão. Faça login.');
            // Se não houver sessão, redireciona para o login
            window.location.href = '/login/login.html';
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
    const withdrawForm = document.getElementById('withdrawForm');
    const pixKeyWarning = document.getElementById('pixKeyWarning');
    const pixKeyInfo = document.getElementById('pixKeyInfo');
    const btnConfirmWithdraw = document.getElementById('btnConfirmWithdraw');
    
    if(btnSaque && modalSaque) {
        btnSaque.addEventListener('click', async () => {
            // Verifica se tem chave PIX cadastrada
            let hasPixKey = false;
            let pixKeyData = null;

            if (usuarioAtual) {
                try {
                    const userDoc = await firebase.firestore()
                        .collection('SLICED')
                        .doc(usuarioAtual.uid)
                        .get();

                    if (userDoc.exists && userDoc.data().pixKey) {
                        hasPixKey = true;
                        pixKeyData = userDoc.data().pixKey;
                    }
                } catch (error) {
                    console.error('Erro ao verificar chave PIX:', error);
                }
            }

            // Mostra modal
            modalSaque.classList.add('show');

            // Configura visualização baseado na chave PIX
            if (hasPixKey && pixKeyData) {
                // Tem chave PIX - mostra informações e habilita formulário
                pixKeyWarning.style.display = 'none';
                pixKeyInfo.style.display = 'block';
                withdrawForm.style.display = 'block';
                btnConfirmWithdraw.disabled = false;

                // Preenche informações da chave PIX
                const typeLabels = {
                    'cpf': 'CPF',
                    'email': 'E-mail',
                    'telefone': 'Telefone',
                    'aleatoria': 'Chave Aleatória'
                };

                document.getElementById('pixKeyInfoType').textContent = typeLabels[pixKeyData.type] || pixKeyData.type;
                document.getElementById('pixKeyInfoValue').textContent = pixKeyData.value;

                // Mostra saldo disponível no placeholder
                const inputVal = document.getElementById('withdrawAmount');
                if(inputVal) {
                    const saldoAtual = sessionStorage.getItem('userBalance') || 0;
                    inputVal.placeholder = `Disponível: R$ ${parseFloat(saldoAtual).toFixed(2)}`;
                }
            } else {
                // Não tem chave PIX - mostra aviso e desabilita formulário
                pixKeyWarning.style.display = 'block';
                pixKeyInfo.style.display = 'none';
                withdrawForm.style.display = 'none';
                btnConfirmWithdraw.disabled = true;
            }
        });
    }
    
    if(btnFechaSaque && modalSaque) {
        btnFechaSaque.addEventListener('click', () => modalSaque.classList.remove('show'));
    }

    // Validação do formulário de saque
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const amount = parseFloat(document.getElementById('withdrawAmount').value);
            const saldoAtual = parseFloat(sessionStorage.getItem('userBalance') || 0);

            // Validação de valor mínimo
            if (amount < 20) {
                alert('O valor mínimo para saque é R$ 20,00');
                return;
            }

            // Validação de saldo suficiente
            if (amount > saldoAtual) {
                alert(`Saldo insuficiente! Você tem R$ ${saldoAtual.toFixed(2)} disponível.`);
                return;
            }

            // Busca chave PIX cadastrada
            try {
                const userDoc = await firebase.firestore()
                    .collection('SLICED')
                    .doc(usuarioAtual.uid)
                    .get();

                if (!userDoc.exists || !userDoc.data().pixKey) {
                    alert('Você precisa cadastrar uma chave PIX antes de solicitar um saque.');
                    modalSaque.classList.remove('show');
                    return;
                }

                const pixKeyData = userDoc.data().pixKey;

                // Cria solicitação de saque no Firebase
                const withdrawalRef = await firebase.firestore()
                    .collection('SLICED')
                    .doc(usuarioAtual.uid)
                    .collection('withdrawals')
                    .add({
                        amount: amount,
                        pixKey: pixKeyData.value,
                        pixKeyType: pixKeyData.type,
                        status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        userId: usuarioAtual.uid,
                        userName: usuarioAtual.nome
                    });

                console.log('✅ Saque solicitado:', withdrawalRef.id);

                // Mostra mensagem de sucesso
                alert(`Saque de R$ ${amount.toFixed(2)} solicitado com sucesso!\n\nSua solicitação será processada em até 24 horas úteis.`);

                // Fecha modal e recarrega histórico
                modalSaque.classList.remove('show');
                withdrawForm.reset();
                
                // Recarrega histórico
                setTimeout(() => {
                    if (usuarioAtual) {
                        loadWithdrawHistory();
                    }
                }, 500);

            } catch (error) {
                console.error('Erro ao solicitar saque:', error);
                alert('Erro ao processar solicitação de saque. Tente novamente.');
            }
        });
    }

    // ============================================
    // GERENCIAMENTO DE CHAVE PIX
    // ============================================

    const pixKeyDisplay = document.getElementById('pixKeyDisplay');
    const pixKeyForm = document.getElementById('formPixKey');
    const pixKeyTypeSelect = document.getElementById('pixKeyTypeSelect');
    const pixKeyInput = document.getElementById('pixKeyInput');
    const pixKeyHint = document.getElementById('pixKeyHint');
    const btnEditPixKey = document.getElementById('btnEditPixKey');
    const btnRemovePixKey = document.getElementById('btnRemovePixKey');
    const btnCancelPixKey = document.getElementById('btnCancelPixKey');

    let savedPixKey = null;

    // Máscaras de formatação
    function formatCPF(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }

    function formatPhone(value) {
        return value
            .replace(/\D/g, '')
            .replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2')
            .replace(/(-\d{4})\d+?$/, '$1');
    }

    // Carregar chave PIX salva do Firebase
    async function loadPixKey() {
        if (!usuarioAtual) return;

        try {
            const userDoc = await firebase.firestore()
                .collection('SLICED')
                .doc(usuarioAtual.uid)
                .get();

            if (userDoc.exists) {
                const data = userDoc.data();
                if (data.pixKey) {
                    savedPixKey = data.pixKey;
                    showPixKeyDisplay();
                } else {
                    showPixKeyForm();
                }
            } else {
                showPixKeyForm();
            }
        } catch (error) {
            console.error('Erro ao carregar chave PIX:', error);
            showPixKeyForm();
        }
    }

    // Mostrar display da chave salva
    function showPixKeyDisplay() {
        if (!savedPixKey) return;

        const typeLabels = {
            'cpf': 'CPF',
            'email': 'E-mail',
            'telefone': 'Telefone',
            'aleatoria': 'Chave Aleatória'
        };

        document.getElementById('pixKeyTypeDisplay').textContent = typeLabels[savedPixKey.type] || savedPixKey.type;
        document.getElementById('pixKeyValueDisplay').textContent = savedPixKey.value;

        pixKeyDisplay.style.display = 'block';
        pixKeyForm.style.display = 'none';
    }

    // Mostrar formulário de chave PIX
    function showPixKeyForm() {
        pixKeyDisplay.style.display = 'none';
        pixKeyForm.style.display = 'block';
        btnCancelPixKey.style.display = savedPixKey ? 'flex' : 'none';
    }

    // Evento de mudança de tipo de chave
    if (pixKeyTypeSelect) {
        pixKeyTypeSelect.addEventListener('change', (e) => {
            const type = e.target.value;
            pixKeyInput.value = '';
            pixKeyInput.readOnly = false;
            pixKeyHint.textContent = '';

            switch(type) {
                case 'cpf':
                    if (usuarioAtual.cpf) {
                        pixKeyInput.value = usuarioAtual.cpf;
                        pixKeyInput.readOnly = true;
                        pixKeyHint.textContent = '✓ CPF do seu cadastro (bloqueado)';
                        pixKeyHint.style.color = '#00ff88';
                    } else {
                        pixKeyInput.placeholder = '000.000.000-00';
                        pixKeyHint.textContent = 'Digite seu CPF';
                    }
                    break;

                case 'email':
                    if (usuarioAtual.email) {
                        pixKeyInput.value = usuarioAtual.email;
                        pixKeyInput.readOnly = true;
                        pixKeyHint.textContent = '✓ E-mail do seu cadastro (bloqueado)';
                        pixKeyHint.style.color = '#00ff88';
                    } else {
                        pixKeyInput.placeholder = 'seu@email.com';
                        pixKeyHint.textContent = 'Digite seu e-mail';
                    }
                    break;

                case 'telefone':
                    const telefone = document.getElementById('telefone')?.value;
                    if (telefone) {
                        pixKeyInput.value = telefone;
                        pixKeyInput.readOnly = true;
                        pixKeyHint.textContent = '✓ Telefone do seu cadastro (bloqueado)';
                        pixKeyHint.style.color = '#00ff88';
                    } else {
                        pixKeyInput.placeholder = '(00) 00000-0000';
                        pixKeyHint.textContent = 'Digite seu telefone';
                    }
                    break;

                case 'aleatoria':
                    pixKeyInput.placeholder = 'Cole sua chave aleatória';
                    pixKeyHint.textContent = 'Chave aleatória gerada pelo seu banco';
                    pixKeyHint.style.color = 'rgba(255, 255, 255, 0.6)';
                    break;

                default:
                    pixKeyInput.placeholder = 'Digite sua chave PIX';
                    pixKeyHint.textContent = '';
            }
        });
    }

    // Aplicar máscaras ao digitar
    if (pixKeyInput) {
        pixKeyInput.addEventListener('input', (e) => {
            const type = pixKeyTypeSelect.value;
            
            if (type === 'cpf' && !pixKeyInput.readOnly) {
                e.target.value = formatCPF(e.target.value);
            } else if (type === 'telefone' && !pixKeyInput.readOnly) {
                e.target.value = formatPhone(e.target.value);
            }
        });
    }

    // Salvar chave PIX
    if (pixKeyForm) {
        pixKeyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const type = pixKeyTypeSelect.value;
            const value = pixKeyInput.value.trim();

            if (!type || !value) {
                alert('Preencha todos os campos!');
                return;
            }

            try {
                await firebase.firestore()
                    .collection('SLICED')
                    .doc(usuarioAtual.uid)
                    .set({
                        pixKey: { type, value }
                    }, { merge: true });

                savedPixKey = { type, value };
                showPixKeyDisplay();
                
                // Mostra mensagem de sucesso
                const successMsg = document.getElementById('successMessage');
                if (successMsg) {
                    successMsg.textContent = '✓ Chave PIX salva com sucesso!';
                    successMsg.classList.add('show');
                    setTimeout(() => successMsg.classList.remove('show'), 3000);
                }
            } catch (error) {
                console.error('Erro ao salvar chave PIX:', error);
                alert('Erro ao salvar chave PIX. Tente novamente.');
            }
        });
    }

    // Editar chave PIX
    if (btnEditPixKey) {
        btnEditPixKey.addEventListener('click', () => {
            if (savedPixKey) {
                pixKeyTypeSelect.value = savedPixKey.type;
                pixKeyInput.value = savedPixKey.value;
                
                // Dispara evento de mudança para configurar o campo
                pixKeyTypeSelect.dispatchEvent(new Event('change'));
            }
            showPixKeyForm();
        });
    }

    // Remover chave PIX
    if (btnRemovePixKey) {
        btnRemovePixKey.addEventListener('click', async () => {
            if (!confirm('Tem certeza que deseja remover sua chave PIX?')) return;

            try {
                await firebase.firestore()
                    .collection('SLICED')
                    .doc(usuarioAtual.uid)
                    .update({
                        pixKey: firebase.firestore.FieldValue.delete()
                    });

                savedPixKey = null;
                pixKeyTypeSelect.value = '';
                pixKeyInput.value = '';
                showPixKeyForm();

                const successMsg = document.getElementById('successMessage');
                if (successMsg) {
                    successMsg.textContent = '✓ Chave PIX removida com sucesso!';
                    successMsg.classList.add('show');
                    setTimeout(() => successMsg.classList.remove('show'), 3000);
                }
            } catch (error) {
                console.error('Erro ao remover chave PIX:', error);
                alert('Erro ao remover chave PIX. Tente novamente.');
            }
        });
    }

    // Cancelar edição
    if (btnCancelPixKey) {
        btnCancelPixKey.addEventListener('click', () => {
            if (savedPixKey) {
                showPixKeyDisplay();
            } else {
                pixKeyTypeSelect.value = '';
                pixKeyInput.value = '';
                pixKeyHint.textContent = '';
            }
        });
    }

    // ============================================
    // HISTÓRICO DE SAQUES
    // ============================================

    async function loadWithdrawHistory() {
        if (!usuarioAtual) return;

        const loadingEl = document.getElementById('withdrawHistoryLoading');
        const emptyEl = document.getElementById('withdrawHistoryEmpty');
        const listEl = document.getElementById('withdrawHistoryList');

        try {
            const snapshot = await firebase.firestore()
                .collection('SLICED')
                .doc(usuarioAtual.uid)
                .collection('withdrawals')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();

            loadingEl.style.display = 'none';

            if (snapshot.empty) {
                emptyEl.style.display = 'block';
                listEl.style.display = 'none';
            } else {
                emptyEl.style.display = 'none';
                listEl.style.display = 'block';
                listEl.innerHTML = '';

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const item = createWithdrawItem(data);
                    listEl.appendChild(item);
                });
            }
        } catch (error) {
            console.error('Erro ao carregar histórico de saques:', error);
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
        }
    }

    function createWithdrawItem(data) {
        const div = document.createElement('div');
        div.className = 'withdraw-item';

        const statusLabels = {
            'pending': 'Pendente',
            'processing': 'Processando',
            'approved': 'Aprovado',
            'rejected': 'Rejeitado'
        };

        const statusClass = data.status || 'pending';
        const statusLabel = statusLabels[statusClass] || 'Pendente';

        const amount = parseFloat(data.amount || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });

        const date = data.createdAt?.toDate ? 
            data.createdAt.toDate().toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }) : 'Data não disponível';

        const pixKey = data.pixKey || 'N/A';
        const pixKeyId = 'pixKey_' + Math.random().toString(36).substr(2, 9);

        div.innerHTML = `
            <div class="withdraw-item-header">
                <div class="withdraw-amount">${amount}</div>
                <div class="withdraw-status ${statusClass}">${statusLabel}</div>
            </div>
            <div class="withdraw-item-details">
                <div class="withdraw-detail">
                    <span class="withdraw-detail-label">Data</span>
                    <span class="withdraw-detail-value">${date}</span>
                </div>
                <div class="withdraw-detail">
                    <span class="withdraw-detail-label">Chave PIX</span>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="withdraw-detail-value" id="${pixKeyId}" style="font-size: 0.85rem;">${pixKey}</span>
                        <button 
                            class="btn-copy-pix-key" 
                            onclick="copyPixKey('${pixKeyId}')"
                            title="Copiar chave PIX"
                            style="background: rgba(0, 255, 136, 0.2); border: 1px solid rgba(0, 255, 136, 0.3); padding: 6px 10px; border-radius: 8px; cursor: pointer; transition: all 0.3s ease; display: flex; align-items: center; gap: 4px;"
                        >
                            <i class="material-icons" style="font-size: 16px; color: #00ff88;">content_copy</i>
                            <span style="font-size: 0.75rem; color: #00ff88; font-weight: 600;">Copiar</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        return div;
    }

    // Função global para copiar chave PIX
    window.copyPixKey = function(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const text = element.textContent;
        
        // Copia para clipboard
        navigator.clipboard.writeText(text).then(() => {
            // Feedback visual
            const button = element.parentElement.querySelector('.btn-copy-pix-key');
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

    // Inicializar chave PIX e histórico quando o usuário estiver carregado
    setTimeout(() => {
        if (usuarioAtual) {
            loadPixKey();
            loadWithdrawHistory();
        }
    }, 500);
});