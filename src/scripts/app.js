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
function formatarNomeExibicao(responsavel) {
    if (!responsavel) return '';

    // Se for objeto, usa a propriedade nome
    const nomeCompleto = typeof responsavel === 'object' ? responsavel.nome : responsavel;

    const partes = nomeCompleto.trim().split(/\s+/);

    if (partes.length <= 2) {
        return partes.join(' ');
    }

    const primeiro = partes[0];
    const ultimo = partes[partes.length - 1];
    const meios = partes.slice(1, -1).map(nome => nome.charAt(0).toUpperCase() + '.');

    return [primeiro, ...meios, ultimo].join(' ');
}

// Estado da aplicação
const App = {
    setorAtual: null,
    setores: [],
    modalStack: [],

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
            el.addEventListener('click', async () => await this.fecharUltimoModal());
        });

        // Formulário de Remover Responsável
        const formRemoverResp = document.getElementById('form-remover-responsavel');
        if (formRemoverResp) {
            formRemoverResp.addEventListener('submit', (e) => this.handleRemoverResponsavel(e));
        }

        // Fechar modais voltando para o setor
        document.querySelectorAll('[data-close-to-setor]').forEach(el => {
            el.addEventListener('click', async () => await this.fecharModalVoltarSetor());
        });

        // ESC para fechar modais
        document.addEventListener('keydown', async (e) => {
            if (e.key === 'Escape') await this.fecharUltimoModal();
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

        // Input Mask e Uppercase
        document.querySelectorAll('.input-uppercase').forEach(input => {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        });

        document.querySelectorAll('.input-phone').forEach(input => {
            input.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 5) {
                    v = v.substring(0, 5) + '-' + v.substring(5, 9);
                }
                e.target.value = v;
            });
        });
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

            container.innerHTML = this.setores.map((setor, index) => `
                <article class="setor-card" data-setor-id="${setor.id}" style="animation-delay: ${index * 50}ms">
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

        } catch (error) {
            container.innerHTML = '<p class="loading">Erro ao carregar setores. Verifique a conexão.</p>';
            console.error(error);
        }
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
                const isObj = typeof r === 'object';
                const nome = isObj ? r.nome : r;
                // O número só deve ser visível para Admins
                const telefone = (isObj && isAdmin) ? r.telefone : '';
                const nomeExibicao = formatarNomeExibicao(nome);
                const display = `${nomeExibicao} ${telefone ? '<small style="color:var(--color-text-muted); font-weight:normal">(' + telefone + ')</small>' : ''}`;

                if (isAdmin) {
                    return `<li class="responsavel-item" data-responsavel="${nome}" data-telefone="${telefone || ''}" title="Clique para editar">${display}<button class="responsavel-remove" data-remove-nome="${nome}" data-remove-telefone="${telefone || ''}" title="Remover">${iconRemoveSmall}</button></li>`;
                }
                return `<li>${display}</li>`;
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
                        if (!e.target.closest('.responsavel-remove')) {
                            const nome = item.dataset.responsavel;
                            const telefone = item.dataset.telefone;
                            this.abrirEditarResponsavel(nome, telefone);
                        }
                    });
                });

                listaResponsaveis.querySelectorAll('.responsavel-remove').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const nome = btn.dataset.removeNome;
                        const telefone = btn.dataset.removeTelefone;
                        this.confirmarRemoverResponsavel(nome, telefone);
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

                listaEnfermos.innerHTML = enfermos.map((e, index) => {
                    const isPendente = e.status !== 'ativo';
                    const statusTexto = e.status === 'pendente_remocao'
                        ? `${iconPending}Remoção pendente: ${e.motivoPendencia}`
                        : e.status === 'pendente_edicao'
                            ? `${iconPending}Edição pendente`
                            : '';

                    return `
                        <li class="enfermo-item ${isPendente ? 'enfermo-item--pendente' : ''}" style="animation-delay: ${index * 50}ms">
                            <div class="enfermo-item__info">
                                <div class="enfermo-item__nome">${e.nome}</div>
                                <div class="enfermo-item__idade">${e.idade} ANOS</div>
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
            this.abrirModal('modal-login');
            return;
        }

        document.getElementById('editar-id').value = enfermo.id;
        document.getElementById('editar-setor-id').value = this.setorAtual;
        document.getElementById('editar-nome').value = enfermo.nome;
        document.getElementById('editar-endereco').value = enfermo.endereco;
        document.getElementById('editar-idade').value = enfermo.idade || '';

        this.abrirModal('modal-editar');
    },

    /**
     * Abre modal de remover enfermo
     */
    abrirRemoverEnfermo(enfermo) {
        const usuario = Auth.getUsuario();

        if (!usuario) {
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

            lista.innerHTML = pendencias.map((p, index) => {
                const tipo = p.status === 'pendente_remocao' ? 'Remoção' : 'Edição';
                const detalhe = p.status === 'pendente_remocao'
                    ? `Motivo: ${p.motivoPendencia}`
                    : `Novo: ${p.edicaoPendente.nome} - ${p.edicaoPendente.idade} ANOS - ${p.edicaoPendente.endereco}`;

                return `
                    <li class="pendencia-item" style="animation: slideUp var(--transition-smooth) backwards; animation-delay: ${index * 50}ms">
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
        const telefone = document.getElementById('login-telefone').value;
        const erroEl = document.getElementById('login-erro');

        erroEl.classList.add('hidden');

        try {
            await Auth.login(nome, telefone);
            this.mostrarToast('Identificação confirmada!');

            this.atualizarUI();
            await this.fecharTodosModais();

            // Se estava tentando editar/remover, reabre o setor
            if (this.setorAtual) {
                await this.abrirSetor(this.setorAtual);
            }

        } catch (error) {
            erroEl.textContent = error.message;
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
            await this.fecharTodosModais();

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
        const idade = document.getElementById('adicionar-idade').value;

        try {
            await DB.addEnfermo(setorId, { nome, endereco, idade });
            this.mostrarToast('Enfermo adicionado com sucesso!');
            await this.fecharModal('modal-adicionar');
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
        const idade = document.getElementById('editar-idade').value;

        try {
            // Se for admin, edita diretamente
            if (Auth.isAdmin()) {
                await DB.editarEnfermoDireto(setorId, enfermoId, { nome, endereco, idade });
                this.mostrarToast('Enfermo atualizado com sucesso!');
            } else {
                await DB.solicitarEdicao(setorId, enfermoId, { nome, endereco, idade });
                this.mostrarToast('Edição solicitada. Aguardando aprovação.');
            }
            await this.fecharModal('modal-editar');
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
            await this.fecharModal('modal-remover');
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
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
            // Adiciona à pilha se não for o último
            if (this.modalStack[this.modalStack.length - 1] !== modalId) {
                this.modalStack.push(modalId);
            }
        }
    },

    /**
     * Fecha um modal específico
     */
    async fecharModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('closing');

            // Espera a animação acabar (smooth transition é 500ms)
            await new Promise(resolve => setTimeout(resolve, 500));

            modal.classList.remove('active');
            modal.classList.remove('closing');

            // Remove da pilha
            this.modalStack = this.modalStack.filter(id => id !== modalId);
        }

        // Remove estado de edição de qualquer responsável
        document.querySelectorAll('.responsavel-item--editing').forEach(el => {
            el.classList.remove('responsavel-item--editing');
        });
    },

    /**
     * Fecha o último modal aberto (pilha)
     */
    async fecharUltimoModal() {
        if (this.modalStack.length > 0) {
            const modalId = this.modalStack.pop();
            await this.fecharModal(modalId);
        }

        // Sempre remove estado de edição ao fechar qualquer modal
        document.querySelectorAll('.responsavel-item--editing').forEach(el => {
            el.classList.remove('responsavel-item--editing');
        });
    },

    async fecharTodosModais() {
        const modaisAtivos = document.querySelectorAll('.modal.active');
        if (modaisAtivos.length > 0) {
            modaisAtivos.forEach(m => m.classList.add('closing'));
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
            modal.classList.remove('closing');
        });
        this.modalStack = [];

        // Limpa estado de edição
        document.querySelectorAll('.responsavel-item--editing').forEach(el => {
            el.classList.remove('responsavel-item--editing');
        });
    },

    /**
     * Fecha modal atual e volta para o setor
     */
    async fecharModalVoltarSetor() {
        await this.fecharUltimoModal();

        // Se após fechar o último não houver nada na pilha, mas temos um setor atual, reabre o setor
        if (this.modalStack.length === 0 && this.setorAtual) {
            this.abrirSetor(this.setorAtual);
        }
    },

    mostrarToast(mensagem, tipo = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toast-message');
        const closeBtn = document.getElementById('btn-close-toast');

        toast.className = 'toast';
        toast.classList.add(`toast--${tipo}`);
        toastMessage.textContent = mensagem;

        toast.classList.remove('hidden');

        // Limpa o timer anterior se houver
        if (this.toastTimer) clearTimeout(this.toastTimer);

        // Define novo timer para 10 segundos
        this.toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 10000);

        // Configura o botão de fechar
        if (closeBtn) {
            closeBtn.onclick = () => {
                toast.classList.add('hidden');
                if (this.toastTimer) clearTimeout(this.toastTimer);
            };
        }
    },

    /**
     * Handle do login com Google
     */
    async handleGoogleLogin() {
        try {
            await Auth.loginAdminGoogle();
            this.mostrarToast('Bem-vindo, administrador!');
            this.atualizarUI();
            await this.fecharTodosModais();
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
            // Busca a lista real de admins autorizados no Firestore
            const admins = await Auth.listarAdmins();
            const usuarioAtual = Auth.getUsuario();

            const iconUser = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

            if (admins.length === 0) {
                lista.innerHTML = '<li class="loading">Nenhum administrador cadastrado</li>';
                return;
            }

            lista.innerHTML = admins.map((admin, index) => {
                const isVoce = usuarioAtual && usuarioAtual.email.toLowerCase() === admin.email.toLowerCase();
                const nomeExibicao = admin.nome || admin.email.split('@')[0].toUpperCase();

                return `
                    <li class="admin-item" style="animation: slideUp var(--transition-smooth) backwards; animation-delay: ${index * 50}ms">
                        <div class="admin-item__email">
                            ${iconUser}
                            <span style="margin-left: 8px;">${nomeExibicao}</span>
                            <small style="display: block; margin-left: 26px; color: var(--color-text-muted); font-size: 11px; text-transform: none;">${admin.email}</small>
                        </div>
                        ${isVoce ? '<span class="admin-item__badge">Você</span>' : ''}
                    </li>
                `;
            }).join('');

        } catch (error) {
            lista.innerHTML = '<li class="loading">Erro ao carregar lista de administradores</li>';
            console.error(error);
        }
    },

    /**
     * Handle do formulário de adicionar admin
     */
    async handleAdicionarAdmin(e) {
        e.preventDefault();

        const nome = document.getElementById('novo-admin-nome').value.toUpperCase();
        const email = document.getElementById('novo-admin-email').value;
        const senha = document.getElementById('novo-admin-senha').value;
        const erroEl = document.getElementById('add-admin-erro');

        erroEl.classList.add('hidden');

        try {
            const result = await Auth.adicionarAdmin(nome, email, senha);

            if (result.status === 'authorized') {
                this.mostrarToast(`Email ${email} já existente, mas agora está autorizado como admin!`);
            } else {
                this.mostrarToast(`Administrador ${nome} adicionado com sucesso!`);
            }

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
    /**
     * Abre modal para adicionar responsável
     */
    abrirAdicionarResponsavel() {
        this.responsavelEmEdicao = null;
        document.getElementById('responsavel-nome').value = '';
        document.getElementById('responsavel-telefone').value = '';
        document.getElementById('modal-responsavel-titulo').textContent = 'Adicionar Responsável';
        document.getElementById('btn-salvar-responsavel').textContent = 'Adicionar';
        this.abrirModal('modal-responsavel');
    },

    /**
     * Abre modal para editar responsável
     */
    abrirEditarResponsavel(nome, telefone) {
        // Remove edição anterior se houver
        document.querySelectorAll('.responsavel-item--editing').forEach(el => el.classList.remove('responsavel-item--editing'));

        // Encontra o item na lista para destacar
        const itens = document.querySelectorAll('.responsavel-item');
        itens.forEach(item => {
            if (item.dataset.responsavel === nome) {
                item.classList.add('responsavel-item--editing');
            }
        });

        this.responsavelEmEdicao = { nome, telefone };
        document.getElementById('responsavel-nome').value = nome;
        document.getElementById('responsavel-telefone').value = telefone || '';
        document.getElementById('modal-responsavel-titulo').textContent = 'Editar Responsável';
        document.getElementById('btn-salvar-responsavel').textContent = 'Salvar';
        this.abrirModal('modal-responsavel');
    },

    /**
     * Abre modal de confirmação de remoção
     */
    confirmarRemoverResponsavel(nome, telefone) {
        document.getElementById('remover-responsavel-nome').value = nome;
        document.getElementById('remover-responsavel-telefone').value = telefone || '';
        document.getElementById('remover-responsavel-texto').innerHTML = `Deseja remover o responsável <strong>${nome}</strong>?`;
        this.abrirModal('modal-remover-responsavel');
    },

    /**
     * Executa a remoção do responsável
     */
    async handleRemoverResponsavel(e) {
        e.preventDefault();

        const nome = document.getElementById('remover-responsavel-nome').value;
        const telefone = document.getElementById('remover-responsavel-telefone').value;

        try {
            const responsavel = { nome, telefone };
            await DB.removeResponsavel(this.setorAtual, responsavel);
            await this.fecharModal('modal-remover-responsavel');
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
        const telefone = document.getElementById('responsavel-telefone').value.trim();
        const erroEl = document.getElementById('responsavel-erro');

        if (!nome || !telefone) {
            erroEl.textContent = 'Preencha nome e celular';
            erroEl.classList.remove('hidden');
            return;
        }

        if (telefone.length < 10) {
            erroEl.textContent = 'Celular inválido';
            erroEl.classList.remove('hidden');
            return;
        }

        erroEl.classList.add('hidden');

        try {
            const novoResponsavel = { nome, telefone };

            if (this.responsavelEmEdicao) {
                // Editando
                await DB.editarResponsavel(this.setorAtual, this.responsavelEmEdicao, novoResponsavel);
                this.mostrarToast('Responsável atualizado!');
            } else {
                // Adicionando
                await DB.addResponsavel(this.setorAtual, novoResponsavel);
                this.mostrarToast('Responsável adicionado!');
            }

            await this.fecharModal('modal-responsavel');
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
