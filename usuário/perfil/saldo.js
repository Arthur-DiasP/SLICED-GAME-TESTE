// js/saldo.js

// Nota: Assumimos que o perfil.js já salvou 'loggedInUser' na sessionStorage
// com os campos uid, email, nome e cpf preenchidos e válidos.

document.addEventListener('DOMContentLoaded', () => {

    // ======================================================================
    // 🛠️ CONSTANTES DE URLS (API e WebSocket)
    // ======================================================================
    const RENDER_BASE_DOMAIN = 'https://sliced-game-teste.onrender.com';
    const PRODUCTION_FRONTEND_DOMAIN = 'https://sliced-teste.onrender.com';

    // Configurações de URL
    const PRODUCTION_API_URL = `https://${RENDER_BASE_DOMAIN}/api`;
    const LOCAL_API_URL = 'http://localhost:3001/api';
    const PRODUCTION_WS_URL = `wss://${RENDER_BASE_DOMAIN}`;
    const LOCAL_WS_URL = `ws://localhost:3001`;

    let API_BASE;
    let WS_BASE_URL;

    // Determina se está em ambiente de produção ou local
    if (window.location.hostname === PRODUCTION_FRONTEND_DOMAIN) {
        API_BASE = PRODUCTION_API_URL;
        WS_BASE_URL = PRODUCTION_WS_URL;
    } else {
        API_BASE = LOCAL_API_URL;
        WS_BASE_URL = LOCAL_WS_URL;
    }
    // ======================================================================

    // --- Variáveis de Estado e Seletores ---
    const rawDepositAmount = sessionStorage.getItem('depositAmount');
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    const pixValueDisplay = document.getElementById('pix-value-display');
    const pixQrCodeEl = document.getElementById('pix-qr-code');
    const pixCopyPasteCodeEl = document.getElementById('pix-copia-cola-input');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const copyMessage = document.getElementById('copy-message');
    const pixDetailsArea = document.getElementById('pix-details-area');
    const pixLoadingArea = document.getElementById('pix-loading-area');
    const pixExpirationTime = document.getElementById('pix-expiration-time');
    const paymentSuccessArea = document.getElementById('payment-success-area'); // NOVA ÁREA

    // Variáveis do WebSocket
    let paymentWebSocket = null;
    let currentPaymentId = null;


    // Verifica se há dados e usuário
    if (!rawDepositAmount || !loggedInUser || !loggedInUser.uid || !loggedInUser.cpf) {
        alert('Erro: Dados do depósito ou CPF do usuário ausentes. Retorne ao perfil.');
        window.location.href = 'perfil.html';
        return;
    }

    const depositAmount = parseFloat(rawDepositAmount);
    pixValueDisplay.textContent = `R$ ${depositAmount.toFixed(2).replace('.', ',')}`;

    // ==================================================================
    // 1. LÓGICA DO WEB SOCKET
    // ==================================================================

    function initWebSocket(paymentId) {
        currentPaymentId = paymentId;

        // Fecha conexões anteriores se houver
        if (paymentWebSocket) paymentWebSocket.close();

        paymentWebSocket = new WebSocket(WS_BASE_URL);

        paymentWebSocket.onopen = () => {
            console.log('🔗 WebSocket conectado. Registrando paymentId...');
            paymentWebSocket.send(JSON.stringify({
                type: 'register',
                paymentId: currentPaymentId
            }));
        };

        paymentWebSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if (data.type === 'payment_status') {
                console.log(`[WS] Status recebido: ${data.status}`);

                if (data.status === 'approved') {
                    // AÇÃO DE SUCESSO!
                    // 1. Oculta PIX e mostra área de sucesso
                    pixDetailsArea.style.display = 'none';
                    pixLoadingArea.style.display = 'none';
                    paymentSuccessArea.style.display = 'block';

                    // 2. Fecha o WebSocket (o backend também fará isso)
                    paymentWebSocket.close();

                    // Nota: O redirecionamento agora é feito pelo botão na área de sucesso,
                    // mas se quiser automático, descomente a linha abaixo:
                    // setTimeout(() => { window.location.href = 'perfil.html'; }, 3000); 

                } else if (data.status === 'rejected' || data.status === 'cancelled') {
                    // AÇÃO DE FALHA
                    alert('❌ Pagamento rejeitado ou cancelado. Tente novamente.');
                    window.location.href = 'perfil.html';
                }
            }
        };

        paymentWebSocket.onerror = (error) => {
            console.error('❌ Erro no WebSocket:', error);
            alert('A conexão em tempo real falhou. Verifique seu saldo no perfil em alguns minutos.');
        };

        paymentWebSocket.onclose = () => {
            console.log('💔 WebSocket fechado.');
        };
    }

    // ==================================================================
    // 2. FUNÇÃO PARA GERAR O PIX (CHAMADA API - SEM INPUT DE USUÁRIO)
    // ==================================================================

    async function generatePixPayment() {
        pixLoadingArea.style.display = 'block';
        pixDetailsArea.style.display = 'none';

        try {
            // Usa o CPF e dados salvos na sessão, removendo a necessidade de input
            const cpfLimpo = loggedInUser.cpf.replace(/\D/g, '');

            // Assume que o nome completo existe e tenta separá-lo
            const nomeCompleto = loggedInUser.nomeCompleto || loggedInUser.nome || 'SLICED User';
            const firstName = nomeCompleto.split(' ')[0];
            const lastName = nomeCompleto.split(' ').slice(1).join(' ') || 'User';

            const requestData = {
                amount: depositAmount,
                userId: loggedInUser.uid,
                email: loggedInUser.email || 'usuario@sliced.com',
                firstName: firstName,
                lastName: lastName,
                payerCpf: cpfLimpo // CPF do usuário logado é usado como CPF do pagador
            };

            const apiUrl = `${API_BASE}/deposit/create`;
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const responseText = await response.text();
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 50)}...`);
            }

            if (!result.success) {
                throw new Error(result.message || 'Erro ao gerar PIX');
            }

            const { paymentId, pixCopiaECola, qrCodeBase64 } = result.data;

            // --- Exibição dos Dados ---
            document.getElementById('deposit-title').textContent = 'Pague o PIX para Continuar';
            document.getElementById('deposit-instructions').textContent = 'Seu pagamento de R$ ' + depositAmount.toFixed(2).replace('.', ',') + ' está pendente.';

            pixQrCodeEl.src = qrCodeBase64;
            pixCopyPasteCodeEl.value = pixCopiaECola;

            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 1);
            pixExpirationTime.textContent = expirationDate.toLocaleString('pt-BR');

            // Oculta loading e mostra detalhes
            pixLoadingArea.style.display = 'none';
            pixDetailsArea.style.display = 'block';

            console.log('✅ PIX gerado com sucesso! Iniciando WebSocket.');

            // 3. INICIAR CONEXÃO WEB SOCKET
            initWebSocket(paymentId);

        } catch (error) {
            console.error('❌ Erro Crítico no PIX:', error);

            let errorMessage = error.message.includes('Failed to fetch')
                ? `Não foi possível conectar ao servidor: ${API_BASE}.`
                : error.message;

            alert(`Não foi possível gerar o PIX: ${errorMessage}`);

            // Exibe erro no loading area
            pixLoadingArea.innerHTML = `
                <p style="color: red; margin-bottom: 15px;">❌ Erro: ${errorMessage}</p>
                <button onclick="window.location.href='perfil.html'" style="padding: 10px 20px; background: #00ff88; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Voltar para o Perfil
                </button>
            `;
            pixLoadingArea.style.display = 'block';
            pixDetailsArea.style.display = 'none';
        }
    }

    // --- 3. Event Listener para Copiar o Código ---
    copyPixBtn.addEventListener('click', () => {
        pixCopyPasteCodeEl.select();
        document.execCommand('copy');

        copyMessage.style.display = 'block';
        setTimeout(() => { copyMessage.style.display = 'none'; }, 3000);
    });

    // Inicia o processo de geração do PIX
    generatePixPayment();
});