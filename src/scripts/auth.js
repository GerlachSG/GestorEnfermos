const Auth = {
    STORAGE_KEY: 'gestor_enfermos_usuario_v2',

    identify(nome, telefone) {
        const user = DB.findUserByNamePhone(nome, telefone);
        if (!user) {
            throw new Error('NOME OU TELEFONE NÃO ENCONTRADO.');
        }
        return user;
    },

    login(nome, telefone, senha = '') {
        const user = this.identify(nome, telefone);
        if (user.role === 'coordenador' && String(user.senha || '') !== String(senha || '')) {
            throw new Error('SENHA DO COORDENADOR INCORRETA.');
        }

        const session = {
            id: user.id,
            nome: user.nome,
            telefone: user.telefone,
            role: user.role,
            setores: user.setores || []
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
        return session;
    },

    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    getUsuario() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) return null;
            const session = JSON.parse(raw);
            const current = DB.getUsuario(session.id);
            if (!current || current.ativo === false) {
                this.logout();
                return null;
            }
            return {
                id: current.id,
                nome: current.nome,
                telefone: current.telefone,
                role: current.role,
                setores: current.setores || []
            };
        } catch (error) {
            this.logout();
            return null;
        }
    },

    isCoordenador() {
        return this.getUsuario()?.role === 'coordenador';
    },

    can(action, setorId = null) {
        return DB.can(this.getUsuario(), action, setorId);
    }
};

window.Auth = Auth;
