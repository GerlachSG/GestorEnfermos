/**
 * Lógica Principal da Aplicação
 * Gerencia modais, renderização e interações
 */

/**
 * Formata nome abreviando sobrenomes do meio
 * Ex: "PEDRO GONÇALVES CARRILO" → "PEDRO G. CARRILO"
 * @param {string} nomeCompleto - Nome completo
 * @returns {string} Nome formatado
 */
function formatarNomeExibicao(nomeCompleto) {
    if (!nomeCompleto) return '';

    const partes = nomeCompleto.trim().split(/\s+/);

    if (partes.length <= 2) {
        // Só tem primeiro e último nome, retorna como está
        return partes.join(' ');
    }

    // Primeiro nome + sobrenomes do meio abreviados + último nome
    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    const meios = partes.slice(1, -1).map(nome => nome.charAt(0).toUpperCase() + '.');

    return [primeiro, ...meios, ultimo].join(' ');
}

// Estado da aplicação
const App = {
    setorAtual: null,
    setores: [],

    /**
     * Inicializa a aplicação
     */
    async init() {
        this.bindEvents();
        this.atualizarUI();
        await this.carregarSetores();
    },

    /**
     * Vincula eventos aos elementos
     */
    bindEvents() {
        // Botões do header
        document.getElementById('btn-admin').addEventListener('click', () => this.abrirModal('modal-login-admin'));
        document.getElementById('btn-logout').addEventListener('click', () => this.fazerLogout());
        document.getElementById('btn-pendencias').addEventListener('click', () => this.abrirPendencias());
        document.getElementById('btn-gerenciar-admins').addEventListener('click', () => this.abrirGerenciarAdmins());

        // Fechar modais
        document.querySelectorAll('[data-close-modal]').forEach(el => {
            el.addEventListener('click', () => this.fecharTodosModais());
        });

        // Fechar modais voltando para o setor
        document.querySelectorAll('[data-close-to-setor]').forEach(el => {
            el.addEventListener('click', () => this.fecharModalVoltarSetor());
        });

        // ESC para fechar modais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.fecharTodosModais();
        });

        // Formulário de login responsável
        document.getElementById('form-login').addEventListener('submit', (e) => this.handleLogin(e));

        // Formulário de login admin
        document.getElementById('form-login-admin').addEventListener('submit', (e) => this.handleLoginAdmin(e));

        // Botão de login com Google
        document.getElementById('btn-google-login').addEventListener('click', () => this.handleGoogleLogin());

        // Formulário de adicionar admin
        document.getElementById('form-add-admin').addEventListener('submit', (e) => this.handleAdicionarAdmin(e));

        // Formulário de adicionar enfermo
        document.getElementById('form-adicionar').addEventListener('submit', (e) => this.handleAdicionarEnfermo(e));

        // Formulário de editar enfermo
        document.getElementById('form-editar').addEventListener('submit', (e) => this.handleEditarEnfermo(e));

        // Formulário de remover enfermo
        document.getElementById('form-remover').addEventListener('submit', (e) => this.handleRemoverEnfermo(e));

        // Botão de adicionar enfermo
        document.getElementById('btn-add-enfermo').addEventListener('click', () => this.abrirAdicionarEnfermo());

        // Motivo de remoção - mostrar campo para "Outro"
        document.getElementById('remover-motivo').addEventListener('change', (e) => {
            const outroContainer = document.getElementById('remover-outro-container');
            const erroEl = document.getElementById('remover-erro');
            if (e.target.value === 'Outro') {
                outroContainer.classList.remove('hidden');
            } else {
                outroContainer.classList.add('hidden');
                erroEl.classList.add('hidden');
            }
        });

        // Formulário de responsável
        document.getElementById('form-responsavel').addEventListener('submit', (e) => this.handleSalvarResponsavel(e));
    },

    /**
     * Atualiza a interface baseado no estado de login
     */
    atualizarUI() {
        const usuario = Auth.getUsuario();
        const btnLogout = document.getElementById('btn-logout');
        const btnLogoutText = document.getElementById('btn-logout-text');
        const btnPendencias = document.getElementById('btn-pendencias');
        const btnGerenciarAdmins = document.getElementById('btn-gerenciar-admins');
        const btnAdmin = document.getElementById('btn-admin');

        if (usuario) {
            btnLogout.classList.remove('hidden');
            btnLogoutText.textContent = `Sair (${usuario.nome.split(' ')[0]})`;

            // Esconde botão de admin quando logado
            btnAdmin.classList.add('hidden');

            if (usuario.isAdmin) {
                btnPendencias.classList.remove('hidden');
                btnGerenciarAdmins.classList.remove('hidden');
            } else {
                btnPendencias.classList.add('hidden');
                btnGerenciarAdmins.classList.add('hidden');
            }
        } else {
            btnLogout.classList.add('hidden');
            btnPendencias.classList.add('hidden');
            btnGerenciarAdmins.classList.add('hidden');
            btnAdmin.classList.remove('hidden');
        }
    },

    /**
     * Carrega e renderiza os setores
     */
    async carregarSetores() {
        const container = document.getElementById('lista-setores');

        try {
            this.setores = await DB.getSetores();

            if (this.setores.length === 0) {
                container.innerHTML = '<p class="loading">Nenhum setor cadastrado</p>';
                return;
            }

            // SVG icon for pending badge
            const iconPendingBadge = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

            container.innerHTML = this.setores.map(setor => `
                <article class="setor-card" data-setor-id="${setor.id}">
                    <h2 class="setor-card__nome">${setor.nome}</h2>
                    <p class="setor-card__horario">${setor.horario}</p>
                    <div class="setor-card__info">
                        <span>${setor.totalEnfermos} enfermo${setor.totalEnfermos !== 1 ? 's' : ''}</span>
                        ${setor.pendencias > 0 ? `
                            <span class="setor-card__badge">
                                ${iconPendingBadge}${setor.pendencias} pendência${setor.pendencias !== 1 ? 's' : ''}
                            </span>
                        ` : ''}
                    </div>
                </article>
            `).join('');

            // Adiciona eventos de clique nos cards
            container.querySelectorAll('.setor-card').forEach(card => {
                card.addEventListener('click', () => {
                    const setorId = card.dataset.setorId;
                    this.abrirSetor(setorId);
                });
            });

            // Atualiza select de setores no login
            this.atualizarSelectSetores();

        } catch (error) {
            container.innerHTML = '<p class="loading">Erro ao carregar setores. Verifique a conexão.</p>';
            console.error(error);
        }
    },

    /**
     * Atualiza o select de setores no modal de login
     */
    atualizarSelectSetores() {
        const select = document.getElementById('login-setor');
        select.innerHTML = '<option value="">Selecione...</option>' +
            this.setores.map(s => `<option value="${s.id}">${s.nome}</option>`).join('');
    },

    /**
     * Abre o modal de um setor específico
     */
    async abrirSetor(setorId) {
        try {
            const setor = await DB.getSetor(setorId);
            const enfermos = await DB.getEnfermos(setorId);

            this.setorAtual = setorId;

            // Preenche dados do setor
            document.getElementById('setor-nome').textContent = setor.nome;
            document.getElementById('setor-horario').textContent = setor.horario;

            // Responsáveis
            const listaResponsaveis = document.getElementById('setor-responsaveis');
            const isAdmin = Auth.isAdmin();

            const iconRemoveSmall = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
            const iconAdd = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;

            let responsaveisHtml = setor.responsaveis.map(r => {
                const nomeExibicao = formatarNomeExibicao(r);
                if (isAdmin) {
                    return `<li class="responsavel-item" data-responsavel="${r}" title="Clique para editar">${nomeExibicao}<button class="responsavel-remove" data-remove-responsavel="${r}" title="Remover">${iconRemoveSmall}</button></li>`;
                }
                return `<li>${nomeExibicao}</li>`;
            }).join('');

            // Adiciona botão de + se for admin
            if (isAdmin) {
                responsaveisHtml += `<li class="responsavel-add" id="btn-add-responsavel" title="Adicionar responsável">${iconAdd}</li>`;
            }

            listaResponsaveis.innerHTML = responsaveisHtml;

            // Eventos para responsáveis (admin)
            if (isAdmin) {
                listaResponsaveis.querySelectorAll('.responsavel-item').forEach(item => {
                    item.addEventListener('click', (e) => {
                        if (!e.target.classList.contains('responsavel-remove')) {
                            const nome = item.dataset.responsavel;
                            this.abrirEditarResponsavel(nome);
                        }
                    });
                });

                listaResponsaveis.querySelectorAll('[data-remove-responsavel]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const nome = btn.dataset.removeResponsavel;
                        this.confirmarRemoverResponsavel(nome);
                    });
                });

                const btnAddResp = document.getElementById('btn-add-responsavel');
                if (btnAddResp) {
                    btnAddResp.addEventListener('click', () => this.abrirAdicionarResponsavel());
                }
            }

            // Enfermos
            const listaEnfermos = document.getElementById('setor-enfermos');
            const usuario = Auth.getUsuario();
            const podeEditar = usuario && (usuario.isAdmin || usuario.setorId === setorId);

            if (enfermos.length === 0) {
                listaEnfermos.innerHTML = '<li class="loading">Nenhum enfermo cadastrado</li>';
            } else {
                // SVG icons for edit and remove buttons
                const iconEdit = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
                const iconRemove = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
                const iconPending = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

                listaEnfermos.innerHTML = enfermos.map(e => {
                    const isPendente = e.status !== 'ativo';
                    const statusTexto = e.status === 'pendente_remocao'
                        ? `${iconPending}Remoção pendente: ${e.motivoPendencia}`
                        : e.status === 'pendente_edicao'
                            ? `${iconPending}Edição pendente`
                            : '';

                    return `
                        <li class="enfermo-item ${isPendente ? 'enfermo-item--pendente' : ''}">
                            <div class="enfermo-item__info">
                                <div class="enfermo-item__nome">${e.nome}</div>
                                <div class="enfermo-item__endereco">${e.endereco}</div>
                                ${statusTexto ? `<div class="enfermo-item__status">${statusTexto}</div>` : ''}
                            </div>
                            ${!isPendente ? `
                                <div class="enfermo-item__actions">
                                    <button class="btn btn--icon-trans btn--small" data-editar="${e.id}" title="Editar">${iconEdit}</button>
                                    <button class="btn btn--icon-trans btn--small" data-remover="${e.id}" title="Remover">${iconRemove}</button>
                                </div>
                            ` : ''}
                        </li>
                    `;
                }).join('');

                // Eventos de editar/remover
                listaEnfermos.querySelectorAll('[data-editar]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const enfermoId = btn.dataset.editar;
                        const enfermo = enfermos.find(en => en.id === enfermoId);
                        this.abrirEditarEnfermo(enfermo);
                    });
                });

                listaEnfermos.querySelectorAll('[data-remover]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const enfermoId = btn.dataset.remover;
                        const enfermo = enfermos.find(en => en.id === enfermoId);
                        this.abrirRemoverEnfermo(enfermo);
                    });
                });
            }

            // Botão de adicionar
            const btnAdd = document.getElementById('btn-add-enfermo');
            if (podeEditar) {
                btnAdd.classList.remove('hidden');
            } else {
                btnAdd.classList.add('hidden');
            }

            this.abrirModal('modal-setor');

        } catch (error) {
            this.mostrarToast('Erro ao carregar setor', 'error');
            console.error(error);
        }
    },

    /**
     * Abre modal de adicionar enfermo
     */
    abrirAdicionarEnfermo() {
        const usuario = Auth.getUsuario();

        if (!usuario) {
            this.fecharTodosModais();
            this.abrirModal('modal-login');
            return;
        }

        document.getElementById('adicionar-setor-id').value = this.setorAtual;
        document.getElementById('form-adicionar').reset();
        this.abrirModal('modal-adicionar');
    },

    /**
     * Abre modal de editar enfermo
     */
    abrirEditarEnfermo(enfermo) {
        const usuario = Auth.getUsuario();

        if (!usuario) {
            this.fecharTodosModais();
            this.abrirModal('modal-login');
            return;
        }

        document.getElementById('editar-id').value = enfermo.id;
        document.getElementById('editar-setor-id').value = this.setorAtual;
        document.getElementById('editar-nome').value = enfermo.nome;
        document.getElementById('editar-endereco').value = enfermo.endereco;

        this.abrirModal('modal-editar');
    },

    /**
     * Abre modal de remover enfermo
     */
    abrirRemoverEnfermo(enfermo) {
        const usuario = Auth.getUsuario();

        if (!usuario) {
            this.fecharTodosModais();
            this.abrirModal('modal-login');
            return;
        }

        document.getElementById('remover-id').value = enfermo.id;
        document.getElementById('remover-setor-id').value = this.setorAtual;
        document.getElementById('remover-nome-enfermo').textContent = `Remover: ${enfermo.nome}`;
        document.getElementById('form-remover').reset();

        // Reset outro container state
        document.getElementById('remover-outro-container').classList.add('hidden');
        document.getElementById('remover-erro').classList.add('hidden');

        this.abrirModal('modal-remover');
    },

    /**
     * Abre modal de pendências (admin)
     */
    async abrirPendencias() {
        if (!Auth.isAdmin()) {
            this.mostrarToast('Acesso restrito a administradores', 'error');
            return;
        }

        const lista = document.getElementById('lista-pendencias');
        lista.innerHTML = '<li class="loading">Carregando...</li>';

        this.abrirModal('modal-pendencias');

        try {
            const pendencias = await DB.getPendencias();

            if (pendencias.length === 0) {
                lista.innerHTML = '<li class="pendencia--vazia">Nenhuma pendência no momento</li>';
                return;
            }

            // SVG icons for buttons
            const iconCheck = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const iconX = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

            lista.innerHTML = pendencias.map(p => {
                const tipo = p.status === 'pendente_remocao' ? 'Remoção' : 'Edição';
                const detalhe = p.status === 'pendente_remocao'
                    ? `Motivo: ${p.motivoPendencia}`
                    : `Novo: ${p.edicaoPendente.nome} - ${p.edicaoPendente.endereco}`;

                return `
                    <li class="pendencia-item">
                        <div class="pendencia-item__header">
                            <span class="pendencia-item__tipo">${tipo}</span>
                            <span class="pendencia-item__setor">${p.setorNome}</span>
                        </div>
                        <div class="pendencia-item__nome">${p.nome}</div>
                        <div class="pendencia-item__detalhe">${detalhe}</div>
                        <div class="pendencia-item__actions">
                            <button class="btn btn--primary btn--small" data-aprovar="${p.setorId}|${p.enfermoId}|${p.status === 'pendente_remocao' ? 'remocao' : 'edicao'}">
                                ${iconCheck} Aprovar
                            </button>
                            <button class="btn btn--outline btn--small" data-rejeitar="${p.setorId}|${p.enfermoId}">
                                ${iconX} Rejeitar
                            </button>
                        </div>
                    </li>
                `;
            }).join('');

            // Eventos de aprovar/rejeitar
            lista.querySelectorAll('[data-aprovar]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const [setorId, enfermoId, tipo] = btn.dataset.aprovar.split('|');
                    await this.aprovarPendencia(setorId, enfermoId, tipo);
                });
            });

            lista.querySelectorAll('[data-rejeitar]').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const [setorId, enfermoId] = btn.dataset.rejeitar.split('|');
                    await this.rejeitarPendencia(setorId, enfermoId);
                });
            });

        } catch (error) {
            lista.innerHTML = '<li class="loading">Erro ao carregar pendências</li>';
            console.error(error);
        }
    },

    /**
     * Handle do formulário de login
     */
    async handleLogin(e) {
        e.preventDefault();

        const nome = document.getElementById('login-nome').value.toUpperCase();
        const setorId = document.getElementById('login-setor').value;
        const erroEl = document.getElementById('login-erro');

        erroEl.classList.add('hidden');

        try {
            if (!setorId) {
                erroEl.textContent = 'Selecione um setor';
                erroEl.classList.remove('hidden');
                return;
            }

            await Auth.login(nome, setorId);
            this.mostrarToast('Identificação confirmada!');

            this.atualizarUI();
            this.fecharTodosModais();

            // Se estava tentando editar/remover, reabre o setor
            if (this.setorAtual) {
                await this.abrirSetor(this.setorAtual);
            }

        } catch (error) {
            erroEl.textContent = error.message || 'Nome não encontrado';
            erroEl.classList.remove('hidden');
        }
    },

    /**
     * Handle do formulário de login admin
     */
    async handleLoginAdmin(e) {
        e.preventDefault();

        const email = document.getElementById('admin-email').value;
        const senha = document.getElementById('admin-senha').value;
        const erroEl = document.getElementById('admin-erro');

        erroEl.classList.add('hidden');

        try {
            await Auth.loginAdmin(email, senha);
            this.mostrarToast('Bem-vindo, administrador!');

            this.atualizarUI();
            this.fecharTodosModais();

        } catch (error) {
            erroEl.textContent = error.message || 'Email ou senha incorretos';
            erroEl.classList.remove('hidden');
        }
    },

    /**
     * Handle do formulário de adicionar enfermo
     */
    async handleAdicionarEnfermo(e) {
        e.preventDefault();

        const setorId = document.getElementById('adicionar-setor-id').value;
        const nome = document.getElementById('adicionar-nome').value.toUpperCase();
        const endereco = document.getElementById('adicionar-endereco').value.toUpperCase();

        try {
            await DB.addEnfermo(setorId, { nome, endereco });
            this.mostrarToast('Enfermo adicionado com sucesso!');
            this.fecharModal('modal-adicionar');
            await this.abrirSetor(setorId);
            await this.carregarSetores();
        } catch (error) {
            this.mostrarToast('Erro ao adicionar enfermo', 'error');
            console.error(error);
        }
    },

    /**
     * Handle do formulário de editar enfermo
     */
    async handleEditarEnfermo(e) {
        e.preventDefault();

        const enfermoId = document.getElementById('editar-id').value;
        const setorId = document.getElementById('editar-setor-id').value;
        const nome = document.getElementById('editar-nome').value.toUpperCase();
        const endereco = document.getElementById('editar-endereco').value.toUpperCase();

        try {
            // Se for admin, edita diretamente
            if (Auth.isAdmin()) {
                await DB.editarEnfermoDireto(setorId, enfermoId, { nome, endereco });
                this.mostrarToast('Enfermo atualizado com sucesso!');
            } else {
                await DB.solicitarEdicao(setorId, enfermoId, { nome, endereco });
                this.mostrarToast('Edição solicitada. Aguardando aprovação.');
            }
            this.fecharModal('modal-editar');
            await this.abrirSetor(setorId);
            await this.carregarSetores();
        } catch (error) {
            this.mostrarToast('Erro ao editar enfermo', 'error');
            console.error(error);
        }
    },

    /**
     * Handle do formulário de remover enfermo
     */
    async handleRemoverEnfermo(e) {
        e.preventDefault();

        const enfermoId = document.getElementById('remover-id').value;
        const setorId = document.getElementById('remover-setor-id').value;
        let motivo = document.getElementById('remover-motivo').value;
        const erroEl = document.getElementById('remover-erro');

        // Se motivo for "Outro", validar campo customizado
        if (motivo === 'Outro') {
            const outroMotivo = document.getElementById('remover-outro-motivo').value.trim().toUpperCase();
            if (outroMotivo.length < 4) {
                erroEl.classList.remove('hidden');
                return;
            }
            motivo = `OUTRO: ${outroMotivo}`;
            erroEl.classList.add('hidden');
        }

        try {
            // Se for admin, remove diretamente
            if (Auth.isAdmin()) {
                await DB.removerEnfermoDireto(setorId, enfermoId);
                this.mostrarToast('Enfermo removido com sucesso!');
            } else {
                await DB.solicitarRemocao(setorId, enfermoId, motivo);
                this.mostrarToast('Remoção solicitada. Aguardando aprovação.');
            }
            this.fecharModal('modal-remover');
            await this.abrirSetor(setorId);
            await this.carregarSetores();
        } catch (error) {
            this.mostrarToast('Erro ao remover enfermo', 'error');
            console.error(error);
        }
    },

    /**
     * Aprova uma pendência
     */
    async aprovarPendencia(setorId, enfermoId, tipo) {
        try {
            await DB.aprovarPendencia(setorId, enfermoId, tipo);
            this.mostrarToast('Pendência aprovada!');
            await this.abrirPendencias();
            await this.carregarSetores();
        } catch (error) {
            this.mostrarToast('Erro ao aprovar pendência', 'error');
            console.error(error);
        }
    },

    /**
     * Rejeita uma pendência
     */
    async rejeitarPendencia(setorId, enfermoId) {
        try {
            await DB.rejeitarPendencia(setorId, enfermoId);
            this.mostrarToast('Pendência rejeitada. Enfermo restaurado.');
            await this.abrirPendencias();
            await this.carregarSetores();
        } catch (error) {
            this.mostrarToast('Erro ao rejeitar pendência', 'error');
            console.error(error);
        }
    },

    /**
     * Faz logout
     */
    async fazerLogout() {
        const usuario = Auth.getUsuario();
        const wasAdmin = usuario?.isAdmin;

        await Auth.logout();
        this.atualizarUI();
        this.mostrarToast('Você saiu do sistema');

        // Se era admin, recarrega a página para limpar estado
        if (wasAdmin) {
            location.reload();
            return;
        }

        // Recarrega o setor atual se estiver aberto
        if (this.setorAtual && document.getElementById('modal-setor').classList.contains('active')) {
            this.abrirSetor(this.setorAtual);
        }
    },

    /**
     * Abre um modal
     */
    abrirModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    },

    /**
     * Fecha um modal específico
     */
    fecharModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    /**
     * Fecha todos os modais
     */
    fecharTodosModais() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    },

    /**
     * Fecha modal atual e volta para o setor
     */
    fecharModalVoltarSetor() {
        // Fecha modais de editar e remover
        this.fecharModal('modal-editar');
        this.fecharModal('modal-remover');

        // Reabre o setor se houver um setor atual
        if (this.setorAtual) {
            this.abrirSetor(this.setorAtual);
        }
    },

    /**
     * Mostra uma notificação toast
     */
    mostrarToast(mensagem, tipo = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');

        toast.className = 'toast';
        toast.classList.add(`toast--${tipo}`);
        toastMessage.textContent = mensagem;

        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },

    /**
     * Handle do login com Google
     */
    async handleGoogleLogin() {
        try {
            await Auth.loginAdminGoogle();
            this.mostrarToast('Bem-vindo, administrador!');
            this.atualizarUI();
            this.fecharTodosModais();
        } catch (error) {
            this.mostrarToast(error.message || 'Erro ao fazer login com Google', 'error');
        }
    },

    /**
     * Abre modal de gerenciar administradores
     */
    async abrirGerenciarAdmins() {
        if (!Auth.isAdmin()) {
            this.mostrarToast('Acesso restrito a administradores', 'error');
            return;
        }

        const lista = document.getElementById('lista-admins');
        lista.innerHTML = '<li class="loading">Carregando...</li>';

        this.abrirModal('modal-gerenciar-admins');

        try {
            // Mostra o admin atual logado
            const usuario = Auth.getUsuario();
            const iconUser = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

            lista.innerHTML = `
                <li class="admin-item">
                    <div class="admin-item__email">
                        ${iconUser}
                        <span style="margin-left: 8px;">${usuario.nome || usuario.email}</span>
                    </div>
                    <span class="admin-item__badge">Você</span>
                </li>
                <li style="padding: var(--spacing-md); color: var(--color-text-muted); font-size: 14px; text-align: center;">
                    Para adicionar novos administradores, use o formulário acima.
                </li>
            `;
        } catch (error) {
            lista.innerHTML = '<li class="loading">Erro ao carregar</li>';
            console.error(error);
        }
    },

    /**
     * Handle do formulário de adicionar admin
     */
    async handleAdicionarAdmin(e) {
        e.preventDefault();

        const email = document.getElementById('novo-admin-email').value;
        const senha = document.getElementById('novo-admin-senha').value;
        const erroEl = document.getElementById('add-admin-erro');

        erroEl.classList.add('hidden');

        try {
            await Auth.adicionarAdmin(email, senha);
            this.mostrarToast(`Administrador ${email} adicionado com sucesso!`);
            document.getElementById('form-add-admin').reset();
            await this.abrirGerenciarAdmins();
        } catch (error) {
            erroEl.textContent = error.message || 'Erro ao adicionar administrador';
            erroEl.classList.remove('hidden');
        }
    },

    /**
     * Abre modal para adicionar responsável
     */
    abrirAdicionarResponsavel() {
        document.getElementById('responsavel-nome').value = '';
        document.getElementById('responsavel-nome-antigo').value = '';
        document.getElementById('modal-responsavel-titulo').textContent = 'Adicionar Responsável';
        document.getElementById('btn-salvar-responsavel').textContent = 'Adicionar';
        this.abrirModal('modal-responsavel');
    },

    /**
     * Abre modal para editar responsável
     */
    abrirEditarResponsavel(nome) {
        document.getElementById('responsavel-nome').value = nome;
        document.getElementById('responsavel-nome-antigo').value = nome;
        document.getElementById('modal-responsavel-titulo').textContent = 'Editar Responsável';
        document.getElementById('btn-salvar-responsavel').textContent = 'Salvar';
        this.abrirModal('modal-responsavel');
    },

    /**
     * Confirma remoção de responsável
     */
    async confirmarRemoverResponsavel(nome) {
        if (!confirm(`Remover o responsável "${nome}"?`)) {
            return;
        }

        try {
            await DB.removeResponsavel(this.setorAtual, nome);
            this.mostrarToast('Responsável removido!');
            await this.abrirSetor(this.setorAtual);
        } catch (error) {
            this.mostrarToast('Erro ao remover responsável', 'error');
            console.error(error);
        }
    },

    /**
     * Salva responsável (adicionar ou editar)
     */
    async handleSalvarResponsavel(e) {
        e.preventDefault();

        const nome = document.getElementById('responsavel-nome').value.trim().toUpperCase();
        const nomeAntigo = document.getElementById('responsavel-nome-antigo').value;
        const erroEl = document.getElementById('responsavel-erro');

        if (!nome) {
            erroEl.textContent = 'Digite o nome do responsável';
            erroEl.classList.remove('hidden');
            return;
        }

        erroEl.classList.add('hidden');

        try {
            if (nomeAntigo) {
                // Editando
                await DB.editarResponsavel(this.setorAtual, nomeAntigo, nome);
                this.mostrarToast('Responsável atualizado!');
            } else {
                // Adicionando
                await DB.addResponsavel(this.setorAtual, nome);
                this.mostrarToast('Responsável adicionado!');
            }

            this.fecharModal('modal-responsavel');
            await this.abrirSetor(this.setorAtual);
        } catch (error) {
            erroEl.textContent = 'Erro ao salvar responsável';
            erroEl.classList.remove('hidden');
            console.error(error);
        }
    }
};

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());
