// Importar Firebase Firestore
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { fazerLogout } from '../../controle-dados/auth.js'; // Reaproveitando logout

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
const loadingSection = document.getElementById('loadingSection');
const contentSection = document.getElementById('contentSection');

// =============================================
// INICIALIZAÇÃO
// =============================================
function initializeSX() {
    // Busca do localStorage (seguindo padrão dos outros arquivos que usam tracker-config)
    // Mas como este arquivo estava usando localStorage direto no prompt original, mantive a lógica robusta
    const sessao = localStorage.getItem('spfc_user_session');
    
    if (!sessao) {
        window.location.href = '../../login/login.html';
        return;
    }

    try {
        currentUserData = JSON.parse(sessao);
        
        // Atualizar Header
        document.getElementById('userName').textContent = currentUserData.nomeCompleto;
        document.getElementById('userEmail').textContent = currentUserData.email;

        checkSXStatus();
    } catch (error) {
        console.error('Erro sessão:', error);
        window.location.href = '../../login/login.html';
    }
}

initializeSX();

// Logout
document.getElementById('btnLogout').addEventListener('click', async () => {
    if(confirm('Sair?')) {
        await fazerLogout();
        window.location.href = '../../login/login.html';
    }
});

// =============================================
// VERIFICAR STATUS SX
// =============================================
async function checkSXStatus() {
    if (!currentUserData || !currentUserData.uid) return;

    try {
        const userRef = doc(db, 'SLICED', 'data', 'Usuários', currentUserData.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Remover loading
            loadingSection.style.display = 'none';
            contentSection.style.display = 'block';

            if (userData.sxData) {
                const sxStatus = userData.sxData.status;
                const form = document.getElementById('sxForm');
                
                if (sxStatus === 'concluido') {
                    form.style.display = 'none';
                    document.getElementById('successMessage').style.display = 'block';
                } else if (sxStatus === 'pending') {
                    form.style.display = 'none';
                    document.getElementById('pendingMessage').style.display = 'block';
                    displaySavedData(userData.sxData);
                }
            }
        } else {
            // Documento não existe (erro raro se logado)
            loadingSection.style.display = 'none';
            contentSection.style.display = 'block';
        }
    } catch (error) {
        console.error('Erro status SX:', error);
        loadingSection.style.display = 'none';
        contentSection.style.display = 'block';
    }
}

// =============================================
// FORMULÁRIO E PREVIEW
// =============================================
const imageUrlInput = document.getElementById('imageUrl');
const imagePreview = document.getElementById('imagePreview');
const previewImg = document.getElementById('previewImg');

imageUrlInput.addEventListener('blur', function() {
    const url = this.value.trim();
    if (url) {
        previewImg.src = url;
        previewImg.onload = () => imagePreview.style.display = 'block';
        previewImg.onerror = () => {
            showToast('Link de imagem inválido');
            imagePreview.style.display = 'none';
        };
    }
});

window.removePreview = function() {
    imageUrlInput.value = '';
    imagePreview.style.display = 'none';
};

const sxForm = document.getElementById('sxForm');

sxForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const category = document.getElementById('category').value;
    const socialNetwork = document.getElementById('socialNetwork').value;
    const profileName = document.getElementById('profileName').value;
    const followersCount = document.getElementById('followersCount').value;
    const imageUrl = document.getElementById('imageUrl').value;
    
    if (!currentUserData || !currentUserData.uid) return;
    
    // Animação de loading no botão
    const btn = sxForm.querySelector('.btn-submit');
    const originalBtnContent = btn.innerHTML;
    btn.innerHTML = '<div class="spinner-gold-small" style="width:20px;height:20px;border-width:2px;"></div>';
    btn.disabled = true;

    try {
        const userRef = doc(db, 'SLICED', 'data', 'Usuários', currentUserData.uid);
        
        const sxData = {
            category,
            socialNetwork,
            profileName,
            followersCount,
            imageUrl,
            status: 'pending',
            requestDate: new Date().toISOString()
        };

        await setDoc(userRef, { sxData: sxData }, { merge: true });
        
        showToast('Solicitação enviada!');
        
        // Atualizar UI
        sxForm.style.display = 'none';
        document.getElementById('pendingMessage').style.display = 'block';
        displaySavedData(sxData);
        
    } catch (error) {
        console.error('Erro envio:', error);
        showToast('Erro ao enviar. Tente novamente.');
        btn.innerHTML = originalBtnContent;
        btn.disabled = false;
    }
});

// Helpers
function showToast(msg) {
    const toast = document.getElementById('toast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function displaySavedData(data) {
    document.getElementById('savedDataCard').style.display = 'block';
    document.getElementById('savedCategory').textContent = data.category;
    document.getElementById('savedProfileName').textContent = data.profileName;
    document.getElementById('savedFollowers').textContent = data.followersCount;
    
    const date = new Date(data.requestDate);
    document.getElementById('savedDate').textContent = date.toLocaleDateString('pt-BR');
}