/**
 * Configuração Global de Rastreamento de Usuários Online
 * Este script deve ser importado em todas as páginas da área do usuário
 * para garantir que o status "online" seja mantido.
 */

import { verificarAutenticacao, obterDadosUsuario, fazerLogout } from './auth.js';
import { inicializarSistemaOnline } from './online-tracker.js';

/**
 * Inicializa o rastreamento do usuário na página atual
 * @param {Object} options - Opções de configuração
 * @param {Function} options.onUserLoaded - Callback chamado quando dados do usuário são carregados
 * @param {Function} options.onLogout - Callback chamado após logout
 */
export function iniciarRastreamentoGlobal(options = {}) {
    let pararRastreamento = null;

    // Verificar autenticação
    verificarAutenticacao(async (user) => {
        if (!user) {
            // Se não estiver logado e não for página pública, redirecionar
            // Ajuste o caminho conforme a profundidade da página atual
            const currentPath = window.location.pathname;
            
            // Determinar caminho relativo para login
            let loginPath = '../../login/login.html';
            if (currentPath.includes('/jogos/')) {
                loginPath = '../../../login/login.html';
            } else if (currentPath.includes('/quiz/')) {
                loginPath = '../../../../login/login.html';
            }

            console.log('⚠️ Usuário não autenticado. Redirecionando para:', loginPath);
            window.location.href = loginPath;
            return;
        }

        try {
            // Carregar dados completos do usuário
            const resultado = await obterDadosUsuario(user.uid);

            if (resultado.success) {
                const dados = resultado.dados;
                console.log('👤 Usuário autenticado:', dados.nomeCompleto);

                // ===== INICIAR RASTREAMENTO =====
                pararRastreamento = await inicializarSistemaOnline(user.uid, {
                    nomeCompleto: dados.nomeCompleto,
                    email: dados.email,
                    paginaAtual: document.title // Útil para saber onde o usuário está
                });
                console.log('✅ Rastreamento online ativo');
                // ================================

                // Callback para atualizar UI da página específica
                if (options.onUserLoaded) {
                    options.onUserLoaded(dados);
                }

                // Configurar botões de logout se existirem
                const btnLogout = document.getElementById('btnLogout');
                if (btnLogout) {
                    btnLogout.addEventListener('click', async (e) => {
                        e.preventDefault();
                        if (confirm('Deseja realmente sair?')) {
                            if (pararRastreamento) pararRastreamento();
                            
                            await fazerLogout();
                            
                            if (options.onLogout) {
                                options.onLogout();
                            } else {
                                window.location.href = loginPath;
                            }
                        }
                    });
                }

            } else {
                console.error('Erro ao carregar dados do usuário:', resultado.error);
            }
        } catch (error) {
            console.error('Erro no rastreamento global:', error);
        }
    });

    // Garantir limpeza ao fechar a página
    window.addEventListener('unload', () => {
        if (pararRastreamento) pararRastreamento();
    });
}
