const App = {
    currentView: 'login',
    currentSetorId: null,
    lastSetorSource: 'localidades',
    pendingCoordinator: null,
    toastTimer: null,

    async init() {
        await DB.init();
        this.bindEvents();
        this.populateAutocomplete();
        this.refreshTopbar();

        if (Auth.getUsuario()) {
            this.afterLogin();
        } else {
            this.showView('home');
        }
    },

    bindEvents() {
        document.getElementById('btn-access-system').addEventListener('click', () => this.showView('login'));
        document.getElementById('btn-learn-more').addEventListener('click', () => this.openAboutModal());
        document.getElementById('form-login').addEventListener('submit', event => this.handleLogin(event));
        document.getElementById('login-nome').addEventListener('input', event => {
            event.target.value = DB.normalizeText(event.target.value);
            this.resetCoordinatorStep();
            this.updateNameSuggestions(event.target.value);
        });
        document.getElementById('login-telefone').addEventListener('input', event => {
            event.target.value = this.formatPhone(event.target.value);
            this.resetCoordinatorStep();
        });

        document.getElementById('btn-home').addEventListener('click', () => this.renderLocalidades());
        document.getElementById('btn-logout').addEventListener('click', () => this.logout());
        document.getElementById('btn-dashboard').addEventListener('click', () => this.renderDashboard());
        document.getElementById('btn-voltar-localidades').addEventListener('click', () => this.renderLocalidades());
        document.getElementById('btn-voltar-setores').addEventListener('click', () => this.backFromSetor());
        document.getElementById('btn-dashboard-voltar').addEventListener('click', () => this.renderLocalidades());
        document.getElementById('dashboard-filter').addEventListener('change', () => this.renderDashboard());
        document.getElementById('btn-novo-usuario').addEventListener('click', () => this.openUserModal());
        document.getElementById('toast-close').addEventListener('click', () => this.hideToast());

        document.querySelectorAll('[data-close-modal]').forEach(element => {
            element.addEventListener('click', () => this.closeModal());
        });
        document.querySelectorAll('[data-close-about]').forEach(element => {
            element.addEventListener('click', () => this.closeAboutModal());
        });
    },

    populateAutocomplete() {
        this.updateNameSuggestions('');
    },

    updateNameSuggestions(query) {
        const list = document.getElementById('usuarios-lista');
        const normalizedQuery = DB.normalizeText(query);

        if (normalizedQuery.length < 2) {
            list.innerHTML = '';
            return;
        }

        const suggestions = DB.getUsuarios()
            .filter(user => user.nome.includes(normalizedQuery))
            .slice(0, 6);

        list.innerHTML = suggestions.map(user => `<option value="${this.escape(user.nome)}"></option>`).join('');
    },

    refreshTopbar() {
        const user = Auth.getUsuario();
        document.getElementById('current-user-label').textContent = user
            ? `${user.nome} - ${this.roleLabel(user.role)}`
            : 'ACESSO NÃO IDENTIFICADO';
        document.getElementById('btn-home').classList.toggle('hidden', !user);
        document.getElementById('btn-logout').classList.toggle('hidden', !user);
        document.getElementById('btn-dashboard').classList.toggle('hidden', !user || user.role !== 'coordenador');
    },

    handleLogin(event) {
        event.preventDefault();
        const nome = document.getElementById('login-nome').value;
        const telefone = document.getElementById('login-telefone').value;
        const senha = document.getElementById('login-senha').value;
        const error = document.getElementById('login-error');
        error.classList.add('hidden');

        try {
            const identified = this.pendingCoordinator || Auth.identify(nome, telefone);
            if (identified.role === 'coordenador' && !this.pendingCoordinator) {
                this.pendingCoordinator = identified;
                document.getElementById('password-field').classList.remove('hidden');
                document.getElementById('login-senha').setAttribute('required', 'required');
                document.getElementById('login-senha').focus();
                this.showToast('COORDENADOR CONFIRMADO. DIGITE A SENHA.', 'info');
                return;
            }

            Auth.login(nome, telefone, senha);
            this.pendingCoordinator = null;
            this.afterLogin();
            this.showToast('ACESSO CONFIRMADO.', 'success');
        } catch (loginError) {
            error.textContent = loginError.message;
            error.classList.remove('hidden');
            this.showToast(loginError.message, 'error');
        }
    },

    resetCoordinatorStep() {
        this.pendingCoordinator = null;
        document.getElementById('password-field').classList.add('hidden');
        document.getElementById('login-senha').removeAttribute('required');
        document.getElementById('login-senha').value = '';
    },

    afterLogin() {
        this.refreshTopbar();
        this.renderLocalidades();
    },

    logout() {
        Auth.logout();
        document.getElementById('form-login').reset();
        this.resetCoordinatorStep();
        this.refreshTopbar();
        this.showView('home');
        this.showToast('VOCÊ SAIU DO SISTEMA.', 'warning');
    },

    showView(view) {
        ['home', 'login', 'localidades', 'matriz', 'setor', 'dashboard'].forEach(name => {
            document.getElementById(`view-${name}`).classList.toggle('hidden', name !== view);
        });
        document.getElementById('topbar').classList.toggle('hidden', view === 'home');
        this.currentView = view;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    openAboutModal() {
        document.getElementById('about-modal').classList.remove('hidden');
    },

    closeAboutModal() {
        document.getElementById('about-modal').classList.add('hidden');
    },

    renderLocalidades() {
        this.populateAutocomplete();
        const grid = document.getElementById('localidades-grid');
        grid.innerHTML = DB.getLocalidades().map(localidade => `
            <button class="location-card" type="button" data-localidade="${localidade.id}">
                <img src="${localidade.imagem}" alt="${this.escape(localidade.nome)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('location-card--no-image')">
                <span class="location-card__body">
                    <span class="location-card__fallback" aria-hidden="true">IMAGEM INDISPONÍVEL</span>
                    <h2>${this.escape(localidade.nome)}</h2>
                    <p>${this.escape(localidade.endereco)}</p>
                </span>
            </button>
        `).join('');

        grid.querySelectorAll('[data-localidade]').forEach(button => {
            button.addEventListener('click', () => this.openLocalidade(button.dataset.localidade));
        });

        this.showView('localidades');
    },

    openLocalidade(localidadeId) {
        const localidade = DB.getLocalidades().find(item => item.id === localidadeId);
        if (localidade.matriz) {
            this.renderMatriz();
            return;
        }

        const setor = DB.getSetores().find(item => item.localidadeId === localidadeId);
        this.lastSetorSource = 'localidades';
        this.renderSetor(setor.id);
    },

    renderMatriz() {
        const grid = document.getElementById('matriz-setores-grid');
        const setores = DB.getSetores().filter(setor => setor.localidadeId === 'matriz-sao-bento');
        grid.innerHTML = setores.map(setor => `
            <button class="sector-card" type="button" data-setor="${setor.id}">
                <h2>${this.escape(setor.nome)}</h2>
            </button>
        `).join('');

        grid.querySelectorAll('[data-setor]').forEach(button => {
            button.addEventListener('click', () => {
                this.lastSetorSource = 'matriz';
                this.renderSetor(button.dataset.setor);
            });
        });

        this.showView('matriz');
    },

    renderSetor(setorId) {
        const setor = DB.getSetor(setorId);
        const localidade = DB.getLocalidades().find(item => item.id === setor.localidadeId);
        const user = Auth.getUsuario();
        this.currentSetorId = setorId;
        document.getElementById('setor-hero').style.setProperty('--setor-banner-image', `url("${localidade.imagem}")`);

        document.getElementById('setor-localidade').textContent = localidade.nome;
        document.getElementById('setor-title').textContent = setor.nome;

        this.renderNameList('setor-responsaveis', DB.getSectorUsers(setorId, 'responsavel'));
        this.renderNameList('setor-agentes', DB.getSectorUsers(setorId, 'agente'));
        this.renderEnfermos(setor, user);
        this.renderSetorActions(setor, user);
        this.showView('setor');
    },

    renderNameList(elementId, users) {
        document.getElementById(elementId).innerHTML = users.length
            ? users.map(user => `<li>${this.escape(user.nome)}</li>`).join('')
            : '<li>NENHUM CADASTRADO</li>';
    },

    renderEnfermos(setor, user) {
        const canEdit = DB.can(user, 'edit-enfermo', setor.id);
        const list = document.getElementById('setor-enfermos');
        if (!setor.enfermos.length) {
            list.innerHTML = '<li>NENHUM ENFERMO CADASTRADO</li>';
            return;
        }

        list.innerHTML = setor.enfermos
            .sort((a, b) => a.nome.localeCompare(b.nome))
            .map(enfermo => `
                <li>
                    <div>
                        <strong>${this.escape(enfermo.nome)}</strong>
                        <div class="people-list__meta">IDADE: ${this.escape(enfermo.idade || 'NÃO INFORMADA')}</div>
                    </div>
                    ${canEdit ? `
                        <div class="row-actions">
                            <button class="secondary-action" type="button" data-edit-enfermo="${enfermo.id}">EDITAR</button>
                            <button class="danger-action" type="button" data-remove-enfermo="${enfermo.id}">REMOVER</button>
                        </div>
                    ` : ''}
                </li>
            `).join('');

        list.querySelectorAll('[data-edit-enfermo]').forEach(button => {
            button.addEventListener('click', () => this.openEnfermoModal(setor.id, button.dataset.editEnfermo));
        });
        list.querySelectorAll('[data-remove-enfermo]').forEach(button => {
            button.addEventListener('click', () => this.removeEnfermo(setor.id, button.dataset.removeEnfermo));
        });
    },

    renderSetorActions(setor, user) {
        const actions = document.getElementById('setor-actions');
        const buttons = [];

        if (DB.can(user, 'add-enfermo', setor.id)) {
            buttons.push('<button class="primary-action" type="button" id="btn-add-enfermo">NOVO ENFERMO</button>');
        }
        if (user.role === 'coordenador') {
            buttons.push('<button class="secondary-action" type="button" id="btn-manage-team">GERENCIAR EQUIPE</button>');
            buttons.push('<button class="secondary-action" type="button" id="btn-dashboard-sector">VER RELATÓRIO</button>');
        }

        actions.innerHTML = buttons.join('');

        document.getElementById('btn-add-enfermo')?.addEventListener('click', () => this.openEnfermoModal(setor.id));
        document.getElementById('btn-manage-team')?.addEventListener('click', () => this.openTeamModal(setor.id));
        document.getElementById('btn-dashboard-sector')?.addEventListener('click', () => {
            this.renderDashboard(setor.id);
        });
    },

    backFromSetor() {
        if (this.lastSetorSource === 'matriz') {
            this.renderMatriz();
        } else {
            this.renderLocalidades();
        }
    },

    renderDashboard(preselectedSetorId = null) {
        const user = Auth.getUsuario();
        if (user.role !== 'coordenador') {
            this.showToast('ACESSO RESTRITO AO COORDENADOR.', 'error');
            return;
        }

        const filter = document.getElementById('dashboard-filter');
        if (!filter.options.length) {
            filter.innerHTML = '<option value="todos">TODOS OS SETORES</option>' + DB.getSetores().map(setor => `<option value="${setor.id}">${this.escape(setor.nome)}</option>`).join('');
        }
        if (preselectedSetorId) filter.value = preselectedSetorId;

        const data = DB.getDashboard(filter.value || 'todos');
        const busiestName = data.busiest ? data.busiest.nome : 'SEM DADOS';
        const lastAltered = data.audit[0] ? `${data.audit[0].acao} - ${data.audit[0].alvo}` : 'SEM ALTERAÇÕES';

        document.getElementById('dashboard-metrics').innerHTML = `
            <article class="metric-card"><span>SETOR MAIS MOVIMENTADO</span><strong>${this.escape(busiestName)}</strong><b>${data.busiest?.enfermos.length || 0}</b></article>
            <article class="metric-card"><span>TOTAL DE ENFERMOS</span><strong>CADASTRADOS</strong><b>${data.totalEnfermos}</b></article>
            <article class="metric-card"><span>AGENTES NO FILTRO</span><strong>AGENTES</strong><b>${data.totalAgentes}</b></article>
            <article class="metric-card"><span>IDADE MÉDIA</span><strong>ENFERMOS</strong><b>${data.avgAge}</b></article>
            <article class="metric-card panel--wide"><span>ÚLTIMA ALTERAÇÃO</span><strong>${this.escape(lastAltered)}</strong></article>
        `;

        this.renderSectorTable(data.sectors);
        this.renderUserTable();
        this.renderAuditTable(data.audit);
        this.showView('dashboard');
    },

    renderSectorTable(sectors) {
        document.getElementById('dashboard-sector-table').innerHTML = `
            <thead><tr><th>SETOR</th><th>LOCALIDADE</th><th>ENFERMOS</th><th>RESPONSÁVEIS</th><th>AGENTES</th><th>ÚLTIMA ALTERAÇÃO</th></tr></thead>
            <tbody>
                ${sectors.map(setor => {
                    const localidade = DB.getLocalidades().find(item => item.id === setor.localidadeId);
                    const last = DB.state.audit.find(item => item.setorId === setor.id);
                    return `<tr>
                        <td data-label="SETOR">${this.escape(setor.nome)}</td>
                        <td data-label="LOCALIDADE">${this.escape(localidade.nome)}</td>
                        <td data-label="ENFERMOS">${setor.enfermos.length}</td>
                        <td data-label="RESPONSÁVEIS">${setor.responsaveis.length}</td>
                        <td data-label="AGENTES">${setor.agentes.length}</td>
                        <td data-label="ÚLTIMA ALTERAÇÃO">${last ? DB.formatDate(last.data) : 'SEM REGISTRO'}</td>
                    </tr>`;
                }).join('')}
            </tbody>
        `;
    },

    renderUserTable() {
        document.getElementById('dashboard-user-table').innerHTML = `
            <thead><tr><th>NOME</th><th>FUNÇÃO</th><th>TELEFONE</th><th>SETORES</th><th>AÇÕES</th></tr></thead>
            <tbody>
                ${DB.getUsuarios().map(user => `<tr>
                    <td data-label="NOME">${this.escape(user.nome)}</td>
                    <td data-label="FUNÇÃO">${this.roleLabel(user.role)}</td>
                    <td data-label="TELEFONE">${this.escape(user.telefone)}</td>
                    <td data-label="SETORES">${user.role === 'coordenador' ? 'TODOS' : user.setores.length}</td>
                    <td data-label="AÇÕES"><span class="table-actions"><button class="secondary-action" type="button" data-edit-user="${user.id}">EDITAR</button><button class="danger-action" type="button" data-remove-user="${user.id}">REMOVER</button></span></td>
                </tr>`).join('')}
            </tbody>
        `;

        document.querySelectorAll('[data-edit-user]').forEach(button => button.addEventListener('click', () => this.openUserModal(button.dataset.editUser)));
        document.querySelectorAll('[data-remove-user]').forEach(button => button.addEventListener('click', () => this.removeUser(button.dataset.removeUser)));
    },

    renderAuditTable(audit) {
        document.getElementById('dashboard-audit-table').innerHTML = `
            <thead><tr><th>DATA</th><th>QUEM</th><th>AÇÃO</th><th>SETOR</th><th>ALVO</th></tr></thead>
            <tbody>
                ${audit.length ? audit.map(item => `<tr>
                    <td data-label="DATA">${DB.formatDate(item.data)}</td>
                    <td data-label="QUEM">${this.escape(item.usuarioNome)}</td>
                    <td data-label="AÇÃO">${this.escape(item.acao)}</td>
                    <td data-label="SETOR">${this.escape(item.setorNome || 'GERAL')}</td>
                    <td data-label="ALVO">${this.escape(item.alvo)}</td>
                </tr>`).join('') : '<tr><td colspan="5">NENHUMA ALTERAÇÃO REGISTRADA</td></tr>'}
            </tbody>
        `;
    },

    openEnfermoModal(setorId, enfermoId = null) {
        const setor = DB.getSetor(setorId);
        const enfermo = setor.enfermos.find(item => item.id === enfermoId) || { nome: '', idade: '' };
        this.openModal(enfermoId ? 'EDITAR ENFERMO' : 'NOVO ENFERMO', `
            <input type="hidden" name="id" value="${this.escape(enfermo.id || '')}">
            <label class="field"><span>NOME DO ENFERMO</span><input name="nome" required value="${this.escape(enfermo.nome)}"></label>
            <label class="field"><span>IDADE</span><input name="idade" type="number" min="0" max="120" required value="${this.escape(enfermo.idade)}"></label>
            <button class="primary-action" type="submit">SALVAR</button>
        `, async form => {
            const formData = new FormData(form);
            await DB.saveEnfermo(setorId, Object.fromEntries(formData.entries()), Auth.getUsuario());
            this.closeModal();
            this.renderSetor(setorId);
            this.showToast('ENFERMO SALVO COM SUCESSO.', 'success');
        });
    },

    async removeEnfermo(setorId, enfermoId) {
        if (!confirm('CONFIRMAR REMOÇÃO DO ENFERMO?')) return;
        try {
            await DB.removeEnfermo(setorId, enfermoId, Auth.getUsuario());
            this.renderSetor(setorId);
            this.showToast('ENFERMO REMOVIDO.', 'warning');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openTeamModal(setorId) {
        const setor = DB.getSetor(setorId);
        this.openModal('GERENCIAR EQUIPE DO SETOR', `
            <label class="field"><span>RESPONSÁVEIS</span>${this.checkboxGrid('responsaveis', DB.getUsuarios().filter(u => u.role === 'responsavel'), setor.responsaveis)}</label>
            <label class="field"><span>AGENTES</span>${this.checkboxGrid('agentes', DB.getUsuarios().filter(u => u.role === 'agente'), setor.agentes)}</label>
            <button class="primary-action" type="submit">SALVAR EQUIPE</button>
        `, async form => {
            DB.requirePermission(Auth.getUsuario(), 'manage-users');
            setor.responsaveis = Array.from(form.querySelectorAll('input[name="responsaveis"]:checked')).map(input => input.value);
            setor.agentes = Array.from(form.querySelectorAll('input[name="agentes"]:checked')).map(input => input.value);
            DB.audit(Auth.getUsuario(), 'EDITOU EQUIPE', setor.id, setor.nome);
            await DB.persist();
            this.closeModal();
            this.renderSetor(setorId);
            this.showToast('EQUIPE ATUALIZADA.', 'success');
        });
    },

    openUserModal(userId = null) {
        const user = userId ? DB.getUsuario(userId) : { nome: '', telefone: '', role: 'responsavel', setores: [] };
        this.openModal(userId ? 'EDITAR USUÁRIO' : 'NOVO USUÁRIO', `
            <input type="hidden" name="id" value="${this.escape(user.id || '')}">
            <label class="field"><span>NOME COMPLETO</span><input name="nome" required value="${this.escape(user.nome)}"></label>
            <label class="field"><span>TELEFONE</span><input name="telefone" required maxlength="15" value="${this.escape(user.telefone)}"></label>
            <label class="field"><span>FUNÇÃO</span><select name="role" required>
                <option value="responsavel" ${user.role === 'responsavel' ? 'selected' : ''}>RESPONSÁVEL</option>
                <option value="agente" ${user.role === 'agente' ? 'selected' : ''}>AGENTE</option>
                <option value="coordenador" ${user.role === 'coordenador' ? 'selected' : ''}>COORDENADOR</option>
            </select></label>
            <label class="field"><span>SENHA DO COORDENADOR</span><input name="senha" type="password" value="${this.escape(user.senha || '')}" placeholder="APENAS PARA COORDENADOR"></label>
            <label class="field"><span>SETORES PERMITIDOS</span>${this.checkboxGrid('setores', DB.getSetores().map(setor => ({ id: setor.id, nome: setor.nome })), user.setores || [])}</label>
            <button class="primary-action" type="submit">SALVAR USUÁRIO</button>
        `, async form => {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.setores = Array.from(form.querySelectorAll('input[name="setores"]:checked')).map(input => input.value);
            await DB.saveUser(data, Auth.getUsuario());
            this.populateAutocomplete();
            this.closeModal();
            this.renderDashboard();
            this.showToast('USUÁRIO SALVO.', 'success');
        });
    },

    async removeUser(userId) {
        if (!confirm('CONFIRMAR REMOÇÃO DESTE USUÁRIO?')) return;
        try {
            await DB.removeUser(userId, Auth.getUsuario());
            this.populateAutocomplete();
            this.renderDashboard();
            this.showToast('USUÁRIO REMOVIDO.', 'warning');
        } catch (error) {
            this.showToast(error.message, 'error');
        }
    },

    openModal(title, fieldsHtml, onSubmit) {
        document.getElementById('entity-modal-title').textContent = title;
        const form = document.getElementById('entity-form');
        form.innerHTML = fieldsHtml;
        form.onsubmit = async event => {
            event.preventDefault();
            try {
                await onSubmit(form);
            } catch (error) {
                this.showToast(error.message || 'NÃO FOI POSSÍVEL SALVAR.', 'error');
            }
        };
        form.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(input => {
            input.addEventListener('input', event => {
                event.target.value = DB.normalizeText(event.target.value);
            });
        });
        form.querySelectorAll('input[name="telefone"]').forEach(input => {
            input.addEventListener('input', event => {
                event.target.value = this.formatPhone(event.target.value);
            });
        });
        document.getElementById('entity-modal').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('entity-modal').classList.add('hidden');
        document.getElementById('entity-form').innerHTML = '';
    },

    checkboxGrid(name, items, selected) {
        return `<div class="checkbox-grid">${items.map(item => `
            <label class="check-row">
                <input type="checkbox" name="${name}" value="${item.id}" ${selected.includes(item.id) ? 'checked' : ''}>
                <span>${this.escape(item.nome)}</span>
            </label>
        `).join('')}</div>`;
    },

    formatPhone(value) {
        let digits = DB.onlyDigits(value).slice(0, 11);
        if (digits.length <= 2) return digits;
        if (digits.length <= 6) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
        if (digits.length <= 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    },

    roleLabel(role) {
        return {
            coordenador: 'COORDENADOR',
            responsavel: 'RESPONSÁVEL',
            agente: 'AGENTE'
        }[role] || 'USUÁRIO';
    },

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        document.getElementById('toast-message').textContent = message;
        clearTimeout(this.toastTimer);
        toast.dataset.state = type;
        toast.classList.add('toast--visible');
        this.toastTimer = setTimeout(() => this.hideToast(), 3200);
    },

    hideToast() {
        document.getElementById('toast').classList.remove('toast--visible');
    },

    escape(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init().catch(error => {
        console.error(error);
        document.body.innerHTML = '<main class="login-screen"><div class="login-panel"><h1>ERRO AO CARREGAR</h1><p>VERIFIQUE A CONEXÃO E TENTE NOVAMENTE.</p></div></main>';
    });
});

window.App = App;
