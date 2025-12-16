document.addEventListener('DOMContentLoaded', () => {

    // ======================================================================
    // 1. CONFIGURAÇÃO DE URLS (AUTOMÁTICA)
    // ======================================================================
    const PROD_DOMAIN = 'sliced-game-teste.onrender.com';
    
    let API_BASE;
    let WS_BASE_URL;

    // Detecta se está rodando no Render ou em Localhost
    if (window.location.hostname.includes('render') || window.location.hostname === 'www.sliced.online') {
        // Produção (Render)
        API_BASE = `https://${PROD_DOMAIN}/api`;
        WS_BASE_URL = `wss://${PROD_DOMAIN}`; // WSS = WebSocket Seguro
        console.log('🌍 Ambiente de Produção Detectado');
    } else {
        // Localhost
        API_BASE = 'http://localhost:3001/api';
        WS_BASE_URL = 'ws://localhost:3001';
        console.log('🏠 Ambiente Local Detectado');
    }

    // ======================================================================
    // 2. RECUPERAÇÃO E VALIDAÇÃO DE DADOS DO ANÚNCIO
    // ======================================================================
    const adData = JSON.parse(sessionStorage.getItem('adPaymentData'));
    const loggedInUser = JSON.parse(sessionStorage.getItem('loggedInUser'));

    // Elementos do DOM
    const adNameDisplay = document.getElementById('ad-name-display');
    const adCategoryDisplay = document.getElementById('ad-category-display');
    const adBudgetDisplay = document.getElementById('ad-budget-display');
    const pixValueDisplay = document.getElementById('pix-value-display');
    const pixQrCodeEl = document.getElementById('pix-qr-code');
    const pixCopyPasteCodeEl = document.getElementById('pix-copia-cola-input');
    const copyPixBtn = document.getElementById('copy-pix-btn');
    const copyMessage = document.getElementById('copy-message');
    const pixDetailsArea = document.getElementById('pix-details-area');
    const pixLoadingArea = document.getElementById('pix-loading-area');
    const pixExpirationTime = document.getElementById('pix-expiration-time');
    
    // Elementos do Pop-up
    const popupOverlay = document.getElementById('payment-popup');
    const btnClosePopup = document.getElementById('btn-close-popup');

    // Validação de Segurança
    if (!adData || !loggedInUser) {
        alert('Sessão expirada ou dados inválidos. Retornando aos anúncios.');
        window.location.href = 'anuncie.html';
        return;
    }

    // Exibir informações do anúncio
    adNameDisplay.textContent = adData.nome;
    adCategoryDisplay.textContent = `Categoria: ${adData.categoria}`;
    adBudgetDisplay.textContent = `Orçamento Diário: R$ ${parseFloat(adData.orcamento).toFixed(2).replace('.', ',')}`;
    
    // Valor do pagamento (orçamento diário)
    const paymentAmount = parseFloat(adData.orcamento);
    pixValueDisplay.textContent = `R$ ${paymentAmount.toFixed(2).replace('.', ',')}`;

    // ======================================================================
    // 3. LÓGICA DO WEBSOCKET (NOTIFICAÇÃO EM TEMPO REAL)
    // ======================================================================
    let paymentWebSocket = null;

    function initWebSocket(paymentId) {
        // Fecha conexão anterior se existir para evitar duplicidade
        if (paymentWebSocket) paymentWebSocket.close();

        console.log(`🔌 Conectando ao WebSocket: ${WS_BASE_URL}`);
        paymentWebSocket = new WebSocket(WS_BASE_URL);

        paymentWebSocket.onopen = () => {
            console.log('✅ WebSocket Conectado! Monitorando ID:', paymentId);
            // Registra o cliente no servidor para este ID específico
            paymentWebSocket.send(JSON.stringify({
                type: 'register',
                paymentId: paymentId
            }));
        };

        paymentWebSocket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 Mensagem recebida:', data);

                // Se o servidor avisar que foi aprovado
                if (data.type === 'payment_status' && data.status === 'approved') {
                    handlePaymentSuccess();
                }
            } catch (e) {
                console.error('Erro ao processar mensagem WS:', e);
            }
        };

        paymentWebSocket.onerror = (error) => {
            console.warn('⚠️ Aviso WebSocket:', error);
        };
        
        paymentWebSocket.onclose = () => {
            console.log('🔌 WebSocket desconectado.');
        };
    }

    // ======================================================================
    // 4. FUNÇÃO DE SUCESSO (ATIVA O POP-UP)
    // ======================================================================
    function handlePaymentSuccess() {
        console.log('🎉 PAGAMENTO CONFIRMADO!');

        // 1. Tocar som de sucesso (opcional)
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Ignora erro de autoplay
        } catch (e) {}

        // 2. Esconder áreas de pagamento
        pixDetailsArea.style.display = 'none';
        pixLoadingArea.style.display = 'none';
        
        // 3. Mostrar o Pop-up
        if (popupOverlay) {
            popupOverlay.classList.add('show');
        }

        // 4. Atualizar status do anúncio no localStorage
        updateAdStatus(adData.id, 'Pago');

        // 5. Encerrar conexão WebSocket
        if (paymentWebSocket) paymentWebSocket.close();
    }

    // ======================================================================
    // 5. ATUALIZAR STATUS DO ANÚNCIO
    // ======================================================================
    function updateAdStatus(adId, newStatus) {
        const ads = JSON.parse(localStorage.getItem('spfc_ads') || '[]');
        const adIndex = ads.findIndex(ad => ad.id === adId);
        
        if (adIndex !== -1) {
            ads[adIndex].status = newStatus;
            ads[adIndex].dataPagamento = new Date().toLocaleDateString('pt-BR');
            localStorage.setItem('spfc_ads', JSON.stringify(ads));
            console.log('✅ Status do anúncio atualizado para:', newStatus);
        }
    }

    // ======================================================================
    // 6. GERAR O PIX NO BACKEND
    // ======================================================================
    async function generatePixPayment() {
        // Reset visual
        pixLoadingArea.style.display = 'block';
        pixDetailsArea.style.display = 'none';

        try {
            // Preparação dos dados
            const cpfLimpo = loggedInUser.cpf ? loggedInUser.cpf.replace(/\D/g, '') : '';
            const nomeCompleto = loggedInUser.nomeCompleto || 'Usuario Sliced';
            const [firstName, ...rest] = nomeCompleto.split(' ');
            const lastName = rest.join(' ') || 'Cliente';

            const requestData = {
                amount: paymentAmount,
                userId: loggedInUser.uid,
                email: loggedInUser.email || 'email@teste.com',
                firstName: firstName,
                lastName: lastName,
                payerCpf: cpfLimpo,
                // Dados adicionais para identificar que é um pagamento de anúncio
                metadata: {
                    type: 'advertisement',
                    adId: adData.id,
                    adName: adData.nome,
                    adCategory: adData.categoria
                }
            };

            console.log('📤 Solicitando PIX para anúncio...');

            const response = await fetch(`${API_BASE}/deposit/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData)
            });

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.message || 'Erro ao gerar pagamento');
            }

            const { paymentId, qrCodeBase64, pixCopiaECola } = result.data;

            console.log('📥 PIX Gerado! ID:', paymentId);

            // Atualiza Interface
            pixQrCodeEl.src = qrCodeBase64;
            pixCopyPasteCodeEl.value = pixCopiaECola;
            
            // Define hora de vencimento (1 hora à frente)
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 1);
            pixExpirationTime.textContent = expirationDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

            // Exibe resultados
            pixLoadingArea.style.display = 'none';
            pixDetailsArea.style.display = 'block';
            document.getElementById('payment-title').textContent = 'Escaneie o QR Code';

            // Inicia monitoramento
            initWebSocket(paymentId);

        } catch (error) {
            console.error('❌ Erro:', error);
            
            let msgErro = error.message;
            if (msgErro.includes('CPF')) {
                msgErro = 'CPF inválido no cadastro. Atualize seu perfil.';
            }

            pixLoadingArea.innerHTML = `
                <div style="color: #ff4444; padding: 20px;">
                    <i class="material-icons" style="font-size: 48px;">error_outline</i>
                    <p style="margin-top:10px; font-weight:bold;">Erro ao gerar PIX</p>
                    <p>${msgErro}</p>
                    <button onclick="window.location.href='anuncie.html'" class="btn btn-primary" style="margin-top:20px;">
                        Voltar
                    </button>
                </div>
            `;
        }
    }

    // ======================================================================
    // 7. EVENT LISTENERS
    // ======================================================================
    
    // Botão Copiar Código
    copyPixBtn.addEventListener('click', () => {
        pixCopyPasteCodeEl.select();
        pixCopyPasteCodeEl.setSelectionRange(0, 99999); // Mobile
        
        navigator.clipboard.writeText(pixCopyPasteCodeEl.value)
            .then(() => {
                copyMessage.style.display = 'block';
                setTimeout(() => { copyMessage.style.display = 'none'; }, 2000);
            })
            .catch(() => {
                alert('Erro ao copiar. Selecione o texto manualmente.');
            });
    });

    // Botão Fechar Pop-up (Voltar aos Anúncios)
    if (btnClosePopup) {
        btnClosePopup.addEventListener('click', () => {
            window.location.href = 'anuncie.html';
        });
    }

    // Iniciar processo assim que a página carrega
    generatePixPayment();
});
