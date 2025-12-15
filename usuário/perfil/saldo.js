document.addEventListener('DOMContentLoaded', () => {

    // ======================================================================
    // 1. CONFIGURAÇÃO DE URLS (AUTOMÁTICA)
    // ======================================================================
    // Se o domínio atual for o do Render, usa as URLs de produção.
    // Se for localhost ou 127.0.0.1, usa as URLs locais.
    
    const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
    
    let API_BASE;
    let WS_BASE_URL;

    if (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online') {
        // Produção (Render)
        API_BASE = `https://${PROD_DOMAIN}/api`;
        WS_BASE_URL = `wss://${PROD_DOMAIN}`; // WSS é WebSocket Seguro (HTTPS)
        console.log('🌍 Ambiente de Produção Detectado');
    } else {
        // Localhost
        API_BASE = 'http://localhost:3001/api';
        WS_BASE_URL = 'ws://localhost:3001';
        console.log('🏠 Ambiente Local Detectado');
    }

    // ======================================================================
    // 2. RECUPERAÇÃO DE DADOS DA SESSÃO
    // ======================================================================
    const rawDepositAmount = sessionStorage.getItem('depositAmount');
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    // Elementos do DOM
    const pixValueDisplay = document.getElementById('pix-value-display');
    const pixQrCodeEl = document.getElementById('pix-qr-code');
    const pixCopyPasteCodeEl = document.getElementById('pix-copia-cola-input');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const copyMessage = document.getElementById('copy-message');
    const pixDetailsArea = document.getElementById('pix-details-area');
    const pixLoadingArea = document.getElementById('pix-loading-area');
    const pixExpirationTime = document.getElementById('pix-expiration-time');
    const paymentSuccessArea = document.getElementById('payment-success-area');

    // Validação Básica
    if (!rawDepositAmount || !loggedInUser) {
        alert('Dados da sessão perdidos. Por favor, inicie o depósito novamente.');
        window.location.href = 'perfil.html';
        return;
    }

    const depositAmount = parseFloat(rawDepositAmount);
    pixValueDisplay.textContent = `R$ ${depositAmount.toFixed(2).replace('.', ',')}`;

    // ======================================================================
    // 3. LÓGICA DO WEBSOCKET (NOTIFICAÇÃO EM TEMPO REAL)
    // ======================================================================
    let paymentWebSocket = null;

    function initWebSocket(paymentId) {
        // Fecha conexão anterior se existir
        if (paymentWebSocket) paymentWebSocket.close();

        console.log(`🔌 Conectando ao WebSocket em: ${WS_BASE_URL}...`);
        paymentWebSocket = new WebSocket(WS_BASE_URL);

        // Quando conectar, envia o ID que queremos "vigiar"
        paymentWebSocket.onopen = () => {
            console.log('✅ WebSocket Conectado! Monitorando ID:', paymentId);
            paymentWebSocket.send(JSON.stringify({
                type: 'register',
                paymentId: paymentId
            }));
        };

        // Quando receber mensagem do servidor
        paymentWebSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 Mensagem recebida:', data);

                if (data.type === 'payment_status' && data.status === 'approved') {
                    handlePaymentSuccess();
                }
            } catch (e) {
                console.error('Erro ao processar mensagem WS:', e);
            }
        };

        paymentWebSocket.onerror = (error) => {
            console.warn('⚠️ Erro na conexão WebSocket (pode ser normal em localhost sem HTTPS):', error);
        };
    }

    // Função visual de sucesso
    function handlePaymentSuccess() {
        console.log('🎉 PAGAMENTO CONFIRMADO!');
        
        // Esconde o QR Code e mostra a tela de sucesso
        pixDetailsArea.style.display = 'none';
        pixLoadingArea.style.display = 'none';
        paymentSuccessArea.style.display = 'block'; // Certifique-se que esse ID existe no HTML
        document.getElementById('deposit-title').textContent = 'Sucesso!';
        document.getElementById('deposit-instructions').textContent = 'Depósito confirmado.';

        // Fecha o socket
        if (paymentWebSocket) paymentWebSocket.close();
    }

    // ======================================================================
    // 4. FUNÇÃO PARA GERAR O PIX NO BACKEND
    // ======================================================================
    async function generatePixPayment() {
        pixLoadingArea.style.display = 'block';
        pixDetailsArea.style.display = 'none';

        try {
            // Prepara os dados (limpa CPF)
            const cpfLimpo = loggedInUser.cpf ? loggedInUser.cpf.replace(/\D/g, '') : '';
            const nomeCompleto = loggedInUser.nomeCompleto || 'Usuario Sliced';
            const [firstName, ...rest] = nomeCompleto.split(' ');
            const lastName = rest.join(' ') || 'Cliente';

            const requestData = {
                amount: depositAmount,
                userId: loggedInUser.uid,
                email: loggedInUser.email || 'email@teste.com',
                firstName: firstName,
                lastName: lastName,
                payerCpf: cpfLimpo
            };

            console.log('📤 Solicitando PIX ao servidor...');
            
            const response = await fetch(`${API_BASE}/deposit/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erro desconhecido do servidor');
            }

            const { paymentId, qrCodeBase64, pixCopiaECola } = result.data;

            console.log('📥 PIX Gerado! ID:', paymentId);

            // Atualiza a tela com o QR Code
            pixQrCodeEl.src = qrCodeBase64;
            pixCopyPasteCodeEl.value = pixCopiaECola;
            
            // Define vencimento visual (1 hora)
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 1);
            pixExpirationTime.textContent = expirationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Mostra os detalhes
            pixLoadingArea.style.display = 'none';
            pixDetailsArea.style.display = 'block';
            document.getElementById('deposit-title').textContent = 'Escaneie o QR Code';

            // 🚀 INICIA O MONITORAMENTO EM TEMPO REAL
            initWebSocket(paymentId);

        } catch (error) {
            console.error('❌ Erro:', error);
            
            // Tratamento especial para erro de CPF
            let msgErro = error.message;
            if (msgErro.includes('CPF')) {
                msgErro = 'Seu CPF no cadastro é inválido para PIX. Atualize seu perfil.';
            }

            pixLoadingArea.innerHTML = `
                <div style="color: #ff4444; padding: 20px;">
                    <i class="material-icons" style="font-size: 40px;">error_outline</i>
                    <p><strong>Não foi possível gerar o PIX</strong></p>
                    <p>${msgErro}</p>
                    <button onclick="window.location.href='perfil.html'" class="btn btn-primary" style="margin-top:15px;">Voltar ao Perfil</button>
                </div>
            `;
        }
    }

    // ======================================================================
    // 5. EVENTOS DE INTERFACE
    // ======================================================================
    
    // Botão Copiar
    copyPixBtn.addEventListener('click', () => {
        pixCopyPasteCodeEl.select();
        pixCopyPasteCodeEl.setSelectionRange(0, 99999); // Mobile
        navigator.clipboard.writeText(pixCopyPasteCodeEl.value)
            .then(() => {
                copyMessage.style.display = 'block';
                setTimeout(() => { copyMessage.style.display = 'none'; }, 2000);
            })
            .catch(() => alert('Não foi possível copiar automaticamente. Selecione e copie manualmente.'));
    });

    // Iniciar processo
    generatePixPayment();
});