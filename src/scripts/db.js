const LOCALIDADES = [
    {
        id: 'matriz-sao-bento',
        nome: 'MATRIZ SÃO BENTO',
        endereco: 'AV. ELIZIO GALDINO SOBRINHO, 514 - JD. MORUMBI',
        imagem: 'https://lh3.googleusercontent.com/proxy/h-cctTAvDSQTdqoX1uKKCBmceoqG-uGHL9RSIRKx_abjcEoBrQVcHREIbzoA7JFE3Rt79GH-BuszRCvR57v3Q-XCHHt9g61bEncVF_E3lqS34fQgNvryAzhl175DJtV24cPw32Y4X0LE-krp8h5CBb9bMh52Na2GvgubDw=s680-w680-h510-rw',
        matriz: true
    },
    {
        id: 'capela-santa-edwiges',
        nome: 'CAPELA SANTA EDWIGES',
        endereco: 'AV. MÁRIO FRIGGI, 380 - BOSQUE DOS IPÊS',
        imagem: 'https://lh3.googleusercontent.com/gps-cs-s/APNQkAEp08o0RL2h8uYJTQHYQR1ze9FcCTSKNitd9TXmdWXMXXlf5awkRqviWvf4_30E7hLeLOLrUEcPDnS6eAmIrxsjk2zJdE84JPJUayGjaid_oO8Ks4LGDnJgof1QaSXnHIDVu2Gt=s680-w680-h510-rw',
        matriz: false
    },
    {
        id: 'capela-santo-expedito',
        nome: 'CAPELA SANTO EXPEDITO',
        endereco: 'RUA FRANCISCO ROSA MARQUES, 371 - RES. UNIÃO',
        imagem: 'https://lh3.googleusercontent.com/proxy/2snozSaOHyYT9893Ou9DQlZ9iEW2je_Eu9ndWC64lgrEcGFRXk-dfcTHKHOT7KpcHPOpNz292Sge--PX1jr17I3FTxP4Z_MeFnOn1gOqxhab-WFQUkDg89CDYULG_C3NKfgLr74wAeA2gNZ7eU51KIu1TFiizGrmst46fg=s680-w680-h510-rw',
        matriz: false
    },
    {
        id: 'capela-nossa-senhora-das-gracas',
        nome: 'CAPELA NOSSA SENHORA DAS GRAÇAS',
        endereco: 'AV. JOÃO CÂNDIDO NETO, 413 - JD. MORUMBI',
        imagem: 'https://lh3.googleusercontent.com/proxy/pHDaJqh_fipmCmKH1TqT-FGoDNRs2cM_zPStDwysgW0NUrucRVwXsLxBcLSXWjs72jMRoqU3g7tR7znh858wKRPv3sVBRwa2ix_E0txU1qe8LkRim67PLnA7skIGetpSgHj0fDWKvdYFI4i8Yx1Zc0wrlV_cRB3PCYil2A=s680-w680-h510-rw',
        matriz: false
    }
];

const DB = {
    STORAGE_KEY: 'gestor_enfermos_estado_v2',
    DOC_PATH: ['sistema', 'estado'],
    state: null,

    async init() {
        this.state = await this.loadState();
        await this.persist(false);
        return this.state;
    },

    async loadState() {
        const local = this.readLocalState();

        try {
            if (window.db) {
                const doc = await db.collection(this.DOC_PATH[0]).doc(this.DOC_PATH[1]).get();
                if (doc.exists) {
                    const remote = doc.data();
                    const normalized = this.normalizeState(remote);
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
                    return normalized;
                }
            }
        } catch (error) {
            console.warn('USANDO DADOS LOCAIS POR FALHA NO FIREBASE:', error);
        }

        return local || this.createSeedState();
    },

    readLocalState() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? this.normalizeState(JSON.parse(raw)) : null;
        } catch (error) {
            console.warn('ESTADO LOCAL INVÁLIDO:', error);
            return null;
        }
    },

    normalizeState(data) {
        const seed = this.createSeedState();
        return {
            version: 2,
            updatedAt: data.updatedAt || new Date().toISOString(),
            localities: LOCALIDADES,
            sectors: Array.isArray(data.sectors) && data.sectors.length ? data.sectors : seed.sectors,
            users: Array.isArray(data.users) && data.users.length ? data.users : seed.users,
            audit: Array.isArray(data.audit) ? data.audit : []
        };
    },

    createSeedState() {
        const sectors = [
            ...Array.from({ length: 7 }, (_, index) => ({
                id: `matriz-${index + 1}`,
                localidadeId: 'matriz-sao-bento',
                nome: `SETOR ${index + 1}`,
                responsaveis: index < 3 ? ['u-resp-1'] : ['u-resp-2'],
                agentes: ['u-agente-1'],
                enfermos: this.seedEnfermos(index + 1, 3 + (index % 4))
            })),
            {
                id: 'santa-edwiges-setor',
                localidadeId: 'capela-santa-edwiges',
                nome: 'SETOR CAPELA SANTA EDWIGES',
                responsaveis: ['u-resp-3'],
                agentes: ['u-agente-2'],
                enfermos: this.seedEnfermos(8, 5)
            },
            {
                id: 'santo-expedito-setor',
                localidadeId: 'capela-santo-expedito',
                nome: 'SETOR CAPELA SANTO EXPEDITO',
                responsaveis: ['u-resp-2'],
                agentes: ['u-agente-1'],
                enfermos: this.seedEnfermos(9, 4)
            },
            {
                id: 'nossa-senhora-gracas-setor',
                localidadeId: 'capela-nossa-senhora-das-gracas',
                nome: 'SETOR CAPELA NOSSA SENHORA DAS GRAÇAS',
                responsaveis: ['u-resp-1'],
                agentes: ['u-agente-2'],
                enfermos: this.seedEnfermos(10, 6)
            }
        ];

        return {
            version: 2,
            updatedAt: new Date().toISOString(),
            localities: LOCALIDADES,
            sectors,
            users: [
                { id: 'u-coord-1', nome: 'COORDENADOR PRINCIPAL', telefone: '12 99999-0000', role: 'coordenador', senha: '123456', setores: sectors.map(s => s.id), ativo: true },
                { id: 'u-resp-1', nome: 'MARIA APARECIDA SANTOS', telefone: '12 99988-1122', role: 'responsavel', setores: ['matriz-1', 'matriz-2', 'matriz-3', 'nossa-senhora-gracas-setor'], ativo: true },
                { id: 'u-resp-2', nome: 'JOÃO PEDRO SILVA', telefone: '12 99977-3344', role: 'responsavel', setores: ['matriz-4', 'matriz-5', 'matriz-6', 'matriz-7', 'santo-expedito-setor'], ativo: true },
                { id: 'u-resp-3', nome: 'ANA LUCIA COSTA', telefone: '12 99966-5566', role: 'responsavel', setores: ['santa-edwiges-setor'], ativo: true },
                { id: 'u-agente-1', nome: 'CARLOS MIGUEL PEREIRA', telefone: '12 99955-7788', role: 'agente', setores: sectors.map(s => s.id), ativo: true },
                { id: 'u-agente-2', nome: 'LUCIA FERNANDA ALMEIDA', telefone: '12 99944-9900', role: 'agente', setores: ['santa-edwiges-setor', 'nossa-senhora-gracas-setor'], ativo: true }
            ],
            audit: []
        };
    },

    seedEnfermos(seed, amount) {
        const nomes = ['JOSÉ DA SILVA', 'MARIA OLIVEIRA', 'PEDRO SANTOS', 'ANA COSTA', 'FRANCISCO ALVES', 'HELENA RODRIGUES', 'ROBERTO LIMA', 'TEREZA SOUZA', 'ANTÔNIO FERREIRA', 'ISABEL MARTINS'];
        return Array.from({ length: amount }, (_, index) => ({
            id: `enf-${seed}-${index + 1}`,
            nome: nomes[(seed + index) % nomes.length],
            idade: String(66 + ((seed + index) % 24)),
            status: 'ATIVO',
            criadoEm: new Date(Date.now() - (seed + index) * 86400000).toISOString(),
            atualizadoEm: new Date(Date.now() - index * 3600000).toISOString()
        }));
    },

    async persist(writeRemote = true) {
        this.state.updatedAt = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));

        if (!writeRemote || !window.db) return;

        try {
            await db.collection(this.DOC_PATH[0]).doc(this.DOC_PATH[1]).set(this.state, { merge: false });
        } catch (error) {
            console.warn('NÃO FOI POSSÍVEL SALVAR NO FIREBASE. ALTERAÇÃO FICOU LOCAL:', error);
        }
    },

    getLocalidades() {
        return this.state.localities;
    },

    getSetores() {
        return this.state.sectors;
    },

    getSetor(setorId) {
        return this.state.sectors.find(setor => setor.id === setorId) || null;
    },

    getUsuarios() {
        return this.state.users.filter(user => user.ativo !== false).sort((a, b) => a.nome.localeCompare(b.nome));
    },

    getUsuario(userId) {
        return this.state.users.find(user => user.id === userId) || null;
    },

    findUserByNamePhone(nome, telefone) {
        const normalizedName = this.normalizeText(nome);
        const normalizedPhone = this.onlyDigits(telefone);
        return this.state.users.find(user => user.ativo !== false && this.normalizeText(user.nome) === normalizedName && this.onlyDigits(user.telefone) === normalizedPhone) || null;
    },

    getSectorUsers(setorId, role) {
        const setor = this.getSetor(setorId);
        const ids = role === 'responsavel' ? setor?.responsaveis : setor?.agentes;
        return (ids || []).map(id => this.getUsuario(id)).filter(Boolean);
    },

    can(user, action, setorId = null) {
        if (!user) return false;
        if (user.role === 'coordenador') return true;
        if (action === 'read') return user.role === 'responsavel' || user.role === 'agente';
        if (['add-enfermo', 'edit-enfermo', 'remove-enfermo'].includes(action)) {
            return user.role === 'responsavel' && user.setores.includes(setorId);
        }
        return false;
    },

    async saveEnfermo(setorId, enfermo, actor) {
        this.requirePermission(actor, enfermo.id ? 'edit-enfermo' : 'add-enfermo', setorId);
        const setor = this.getSetor(setorId);
        if (!setor) throw new Error('SETOR NÃO ENCONTRADO.');

        const data = {
            id: enfermo.id || this.newId('enf'),
            nome: this.requiredName(enfermo.nome, 'NOME DO ENFERMO'),
            idade: this.validateAge(enfermo.idade),
            status: 'ATIVO',
            criadoEm: enfermo.criadoEm || new Date().toISOString(),
            atualizadoEm: new Date().toISOString()
        };

        const index = setor.enfermos.findIndex(item => item.id === data.id);
        if (index >= 0) {
            setor.enfermos[index] = { ...setor.enfermos[index], ...data };
            this.audit(actor, 'EDITOU ENFERMO', setorId, data.nome);
        } else {
            setor.enfermos.push(data);
            this.audit(actor, 'ADICIONOU ENFERMO', setorId, data.nome);
        }

        await this.persist();
        return data;
    },

    async removeEnfermo(setorId, enfermoId, actor) {
        this.requirePermission(actor, 'remove-enfermo', setorId);
        const setor = this.getSetor(setorId);
        if (!setor) throw new Error('SETOR NÃO ENCONTRADO.');
        const enfermo = setor.enfermos.find(item => item.id === enfermoId);
        setor.enfermos = setor.enfermos.filter(item => item.id !== enfermoId);
        this.audit(actor, 'REMOVEU ENFERMO', setorId, enfermo?.nome || 'ENFERMO');
        await this.persist();
    },

    async saveUser(dados, actor) {
        this.requirePermission(actor, 'manage-users');
        const role = ['coordenador', 'responsavel', 'agente'].includes(dados.role) ? dados.role : null;
        if (!role) throw new Error('FUNÇÃO INVÁLIDA.');

        const user = {
            id: dados.id || this.newId('usr'),
            nome: this.requiredName(dados.nome, 'NOME DO USUÁRIO'),
            telefone: this.validatePhone(dados.telefone),
            role,
            senha: role === 'coordenador' ? this.requiredPassword(dados.senha) : '',
            setores: role === 'coordenador' ? this.state.sectors.map(setor => setor.id) : (dados.setores || []),
            ativo: true
        };

        const index = this.state.users.findIndex(item => item.id === user.id);
        if (index >= 0) {
            this.state.users[index] = { ...this.state.users[index], ...user };
            this.audit(actor, 'EDITOU USUÁRIO', null, user.nome);
        } else {
            this.state.users.push(user);
            this.audit(actor, 'ADICIONOU USUÁRIO', null, user.nome);
        }

        this.syncSectorAssignments(user);
        await this.persist();
        return user;
    },

    async removeUser(userId, actor) {
        this.requirePermission(actor, 'manage-users');
        const user = this.getUsuario(userId);
        if (!user) throw new Error('USUÁRIO NÃO ENCONTRADO.');
        if (actor.id === userId) throw new Error('VOCÊ NÃO PODE REMOVER SEU PRÓPRIO ACESSO.');
        user.ativo = false;
        this.state.sectors.forEach(setor => {
            setor.responsaveis = setor.responsaveis.filter(id => id !== userId);
            setor.agentes = setor.agentes.filter(id => id !== userId);
        });
        this.audit(actor, 'REMOVEU USUÁRIO', null, user.nome);
        await this.persist();
    },

    syncSectorAssignments(user) {
        this.state.sectors.forEach(setor => {
            setor.responsaveis = setor.responsaveis.filter(id => id !== user.id);
            setor.agentes = setor.agentes.filter(id => id !== user.id);

            if (user.role === 'responsavel' && user.setores.includes(setor.id)) {
                setor.responsaveis.push(user.id);
            }

            if (user.role === 'agente' && user.setores.includes(setor.id)) {
                setor.agentes.push(user.id);
            }
        });
    },

    getDashboard(filterSetorId = 'todos') {
        const sectors = filterSetorId === 'todos' ? this.state.sectors : this.state.sectors.filter(setor => setor.id === filterSetorId);
        const allSectors = this.state.sectors;
        const busiest = [...allSectors].sort((a, b) => b.enfermos.length - a.enfermos.length)[0];
        const altered = [...this.state.audit].filter(item => item.setorId).slice(0, 20);
        const totalEnfermos = sectors.reduce((sum, setor) => sum + setor.enfermos.length, 0);
        const ages = sectors.flatMap(setor => setor.enfermos.map(enfermo => Number(enfermo.idade)).filter(Boolean));
        const avgAge = ages.length ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length) : 0;

        return {
            sectors,
            busiest,
            altered,
            totalEnfermos,
            totalAgentes: sectors.reduce((sum, setor) => sum + setor.agentes.length, 0),
            totalResponsaveis: sectors.reduce((sum, setor) => sum + setor.responsaveis.length, 0),
            avgAge,
            audit: [...this.state.audit].slice(0, 50)
        };
    },

    audit(actor, action, setorId, target) {
        this.state.audit.unshift({
            id: this.newId('aud'),
            data: new Date().toISOString(),
            usuarioId: actor.id,
            usuarioNome: actor.nome,
            acao: action,
            setorId,
            setorNome: setorId ? this.getSetor(setorId)?.nome : '',
            alvo: target || ''
        });
        this.state.audit = this.state.audit.slice(0, 200);
    },

    requirePermission(actor, action, setorId = null) {
        if (!this.can(actor, action, setorId)) {
            throw new Error('VOCÊ NÃO TEM PERMISSÃO PARA ESTA AÇÃO.');
        }
    },

    requiredName(value, label) {
        const text = this.normalizeText(value);
        if (text.length < 3) throw new Error(`${label} PRECISA TER PELO MENOS 3 LETRAS.`);
        return text;
    },

    requiredPassword(value) {
        const text = String(value || '').trim();
        if (text.length < 4) throw new Error('A SENHA PRECISA TER PELO MENOS 4 CARACTERES.');
        return text;
    },

    validateAge(value) {
        const age = Number(value);
        if (!Number.isInteger(age) || age < 0 || age > 120) throw new Error('IDADE INVÁLIDA.');
        return String(age);
    },

    validatePhone(value) {
        const digits = this.onlyDigits(value);
        if (digits.length < 10 || digits.length > 11) throw new Error('TELEFONE INVÁLIDO.');
        if (digits.length === 10) return `${digits.slice(0, 2)} ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
    },

    normalizeText(value) {
        return String(value || '').trim().replace(/\s+/g, ' ').toUpperCase();
    },

    normalizeTypedText(value) {
        return String(value || '').replace(/\s+/g, ' ').toUpperCase();
    },

    onlyDigits(value) {
        return String(value || '').replace(/\D/g, '');
    },

    newId(prefix) {
        return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    },

    formatDate(value) {
        if (!value) return '';
        return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
    }
};

window.DB = DB;
window.LOCALIDADES = LOCALIDADES;
