// --- START OF FILE sx.js ---

// Importar Firebase Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Configuração Firebase
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCTX7MMnhHr_QgDpjPuZGuRyG4Uk9GpQAE",
  authDomain: "sliced-4f1e3.firebaseapp.com",
  projectId: "sliced-4f1e3",
  storageBucket: "sliced-4f1e3.firebasestorage.app",
  messagingSenderId: "800471538497",
  appId: "1:800471538497:web:c7d7b9eb55c72687365fc0",
  measurementId: "G-GDYH409PE2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let currentUserData = null;

// =============================================
// INICIALIZAÇÃO - Usar localStorage
// =============================================
function initializeSX() {
    // Busca o usuário logado do localStorage
    const sessao = localStorage.getItem('spfc_user_session');
    
    if (!sessao) {
        console.warn('⚠️ Usuário não está logado');
        window.location.href = '../../login/login.html';
        return;
    }

    try {
        currentUserData = JSON.parse(sessao);
        console.log(`✅ Usuário logado: ${currentUserData.nomeCompleto} (${currentUserData.uid})`);
        
        // Verificar status SX
        checkSXStatus();
    } catch (error) {
        console.error('❌ Erro ao parsear dados do usuário:', error);
        window.location.href = '../../login/login.html';
    }
}

// Inicializa quando a página carrega
initializeSX();

// =============================================
// PARTÍCULAS DE FUNDO
// =============================================
function generateParticles() {
    const particlesContainer = document.getElementById('particles');
    const particleCount = 30;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (Math.random() * 5 + 8) + 's';
        particlesContainer.appendChild(particle);
    }
}

generateParticles();

// =============================================
// PREVIEW DE IMAGEM
// =============================================
const imageUrlInput = document.getElementById('imageUrl');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');

imageUrlInput.addEventListener('blur', function() {
    const url = this.value.trim();
    if (url) {
        previewImg.src = url;
        previewImg.onerror = function() {
            alert('URL de imagem inválida. Por favor, verifique o link.');
            imagePreview.style.display = 'none';
        };
        previewImg.onload = function() {
            imagePreview.style.display = 'block';
        };
    } else {
        imagePreview.style.display = 'none';
    }
});

window.removePreview = function() {
    imageUrlInput.value = '';
    imagePreview.style.display = 'none';
};

// =============================================
// VERIFICAR STATUS SX
// =============================================
async function checkSXStatus() {
    if (!currentUserData || !currentUserData.uid) {
        return;
    }

    try {
        // CORREÇÃO AQUI: Mudado de 'Usuário' para 'Usuários' (Plural) para bater com o auth.js
        const userRef = doc(db, 'SLICED', 'data', 'Usuários', currentUserData.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Verifica campo sxData dentro do documento do usuário
            if (userData.sxData) {
                const sxStatus = userData.sxData.status; // 'pending', 'approved', 'rejected'
                
                document.getElementById('sxForm').style.display = 'none';
                
                if (sxStatus === 'approved') {
                    // Já aprovado
                    document.getElementById('successMessage').style.display = 'block';
                    document.querySelector('.form-subtitle').textContent = 'Você já é um Sócio Exclusivo!';
                    console.log('✅ Usuário é SX Aprovado');
                } else if (sxStatus === 'pending') {
                    // Pendente
                    document.getElementById('pendingMessage').style.display = 'block';
                    document.querySelector('.form-subtitle').textContent = 'Sua solicitação está em análise.';
                    console.log('🟡 Usuário com solicitação SX Pendente');
                    
                    // Exibir os dados salvos mesmo se pendente
                    displaySavedData(userData.sxData);
                }
            }
        } else {
            console.warn("Documento do usuário não encontrado no Firestore.");
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status SX:', error);
    }
}

// =============================================
// SUBMISSÃO DO FORMULÁRIO
// =============================================
const sxForm = document.getElementById('sxForm');

// Função para mostrar notificação toast
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastMessage.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}

// Função para formatar data
function formatDate(isoDate) {
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
}

// Função para obter o emoji da rede social
function getSocialEmoji(network) {
    const emojis = {
        'Instagram': '📸',
        'TikTok': '🎵',
        'Youtube': '📹',
        'Twitch': '💜',
        'Twitter': '🐦',
        'LinkedIn': '💼',
        'Outro': '🌐'
    };
    return emojis[network] || '🌐';
}

// Função para obter o emoji da categoria
function getCategoryEmoji(category) {
    const emojis = {
        'Empresa': '🏢',
        'Time': '⚽',
        'Influencer': '📱',
        'Atleta': '🏃',
        'Cantor': '🎤',
        'Youtuber': '🎬'
    };
    return emojis[category] || '✨';
}

// Função para exibir card com dados salvos
function displaySavedData(sxData) {
    const savedDataCard = document.getElementById('savedDataCard');
    
    // Preencher os dados
    document.getElementById('savedCategory').textContent = `${getCategoryEmoji(sxData.category)} ${sxData.category}`;
    document.getElementById('savedSocialNetwork').textContent = `${getSocialEmoji(sxData.socialNetwork)} ${sxData.socialNetwork}`;
    document.getElementById('savedProfileName').textContent = sxData.profileName;
    document.getElementById('savedFollowers').textContent = sxData.followersCount;
    document.getElementById('savedDate').textContent = formatDate(sxData.requestDate);
    
    // Configurar imagem
    const savedImage = document.getElementById('savedImage');
    savedImage.src = sxData.imageUrl;
    savedImage.onerror = function() {
        savedImage.style.display = 'none';
    };
    
    // Exibir o card com animação
    savedDataCard.style.display = 'block';
    
    // Scroll suave para o card
    setTimeout(() => {
        savedDataCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300);
}

sxForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Captura campos
    const category = document.getElementById('category').value;
    const socialNetwork = document.getElementById('socialNetwork').value;
    const profileName = document.getElementById('profileName').value;
    const followersCount = document.getElementById('followersCount').value;
    const imageUrl = document.getElementById('imageUrl').value;
    
    // Validação
    if (!category || !socialNetwork || !profileName || !followersCount || !imageUrl) {
        alert('Por favor, preencha todos os campos!');
        return;
    }
    
    if (!currentUserData || !currentUserData.uid) {
        alert('Erro: Sessão expirada. Faça login novamente.');
        window.location.href = '../../login/login.html';
        return;
    }
    
    try {
        console.log('📝 Enviando solicitação SX...');
        
        // CORREÇÃO AQUI: Mudado de 'Usuário' para 'Usuários' (Plural)
        const userRef = doc(db, 'SLICED', 'data', 'Usuários', currentUserData.uid);
        
        // Objeto com dados SX
        const sxData = {
            category: category,
            socialNetwork: socialNetwork,
            profileName: profileName,
            followersCount: followersCount,
            imageUrl: imageUrl,
            status: 'pending', // Status inicial
            requestDate: new Date().toISOString()
        };

        // Salvar no documento do usuário usando merge para não sobrescrever outros dados (CPF, Nome, etc)
        // Isso criará um campo "sxData" dentro do documento do usuário contendo os dados acima
        await setDoc(userRef, {
            sxData: sxData
        }, { merge: true });
        
        console.log('✅ Solicitação SX enviada com sucesso para o perfil do usuário!');
        
        // Mostrar notificação de sucesso
        showToast('Dados salvos no seu perfil com sucesso!', 3000);
        
        // Aguardar um pouco para a notificação aparecer
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Exibir card com dados salvos
        displaySavedData(sxData);
        
        // Ocultar o formulário mas manter visível
        sxForm.style.opacity = '0.5';
        sxForm.style.pointerEvents = 'none';
        
        // Atualizar subtítulo
        document.querySelector('.form-subtitle').textContent = 'Solicitação enviada! Confira os dados abaixo:';
        
        // Mostrar aviso de pendente também
        document.getElementById('pendingMessage').style.display = 'block';
        
    } catch (error) {
        console.error('❌ Erro ao enviar solicitação SX:', error);
        showToast('Erro ao processar solicitação. Tente novamente.', 3000);
    }
});