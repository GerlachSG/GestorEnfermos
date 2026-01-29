/**
 * Sistema de Autenticação
 * - Responsáveis: Login por nome (sem senha)
 * - Administradores: Login com email/senha via Firebase Auth
 */

const Auth = {
    STORAGE_KEY: 'gestor_enfermos_usuario',

    /**
     * Realiza login como responsável de setor
     * @param {string} nome - Nome do usuário
     * @param {string} setorId - ID do setor
     * @returns {Promise<Object>} Dados do usuário logado
     */
    async login(nome, setorId) {
        try {
            // Busca o setor para validar o nome
            const setor = await DB.getSetor(setorId);

            // Verifica se o nome está na lista de responsáveis (case-insensitive)
            const nomeNormalizado = nome.trim().toLowerCase();
            const responsavelEncontrado = setor.responsaveis.find(
                r => r.toLowerCase() === nomeNormalizado
            );

            if (!responsavelEncontrado) {
                throw new Error('Nome não encontrado na lista de responsáveis deste setor');
            }

            // Salva a sessão
            const usuario = {
                nome: responsavelEncontrado,
                setorId: setorId,
                setorNome: setor.nome,
                isAdmin: false,
                tipo: 'responsavel'
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));

            return usuario;
        } catch (error) {
            console.error('Erro no login:', error);
            throw error;
        }
    },

    /**
     * Realiza login como administrador via Firebase Auth
     * @param {string} email - Email do administrador
     * @param {string} senha - Senha do administrador
     * @returns {Promise<Object>} Dados do usuário logado
     */
    async loginAdmin(email, senha) {
        try {
            // Verifica se o email está cadastrado como admin no Firestore
            const isAdmin = await DB.verificarEmailAdmin(email);
            if (!isAdmin) {
                throw new Error('Este email não está autorizado como administrador');
            }

            // Faz login com Firebase Authentication
            const userCredential = await auth.signInWithEmailAndPassword(email, senha);
            const user = userCredential.user;

            // Salva a sessão
            const usuario = {
                nome: user.email.split('@')[0], // Usa parte do email como nome
                email: user.email,
                uid: user.uid,
                setorId: null,
                setorNome: null,
                isAdmin: true,
                tipo: 'admin'
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));

            return usuario;
        } catch (error) {
            console.error('Erro no login admin:', error);

            // Mensagens de erro mais amigáveis
            if (error.message === 'Este email não está autorizado como administrador') {
                throw error;
            } else if (error.code === 'auth/user-not-found') {
                throw new Error('Email não cadastrado');
            } else if (error.code === 'auth/wrong-password') {
                throw new Error('Senha incorreta');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Email inválido');
            } else if (error.code === 'auth/too-many-requests') {
                throw new Error('Muitas tentativas. Aguarde um momento');
            } else {
                throw new Error('Erro ao fazer login');
            }
        }
    },

    /**
     * Realiza logout
     */
    async logout() {
        const usuario = this.getUsuario();

        // Se for admin, faz logout do Firebase Auth também
        if (usuario?.isAdmin) {
            try {
                await auth.signOut();
            } catch (error) {
                console.error('Erro ao fazer logout do Firebase Auth:', error);
            }
        }

        localStorage.removeItem(this.STORAGE_KEY);
    },

    /**
     * Obtém o usuário logado
     * @returns {Object|null} Dados do usuário ou null
     */
    getUsuario() {
        const dados = localStorage.getItem(this.STORAGE_KEY);
        return dados ? JSON.parse(dados) : null;
    },

    /**
     * Verifica se o usuário é administrador
     * @returns {boolean}
     */
    isAdmin() {
        const usuario = this.getUsuario();
        return usuario?.isAdmin === true;
    },

    /**
     * Verifica se o usuário é responsável por um setor específico
     * @param {string} setorId - ID do setor
     * @returns {boolean}
     */
    isResponsavel(setorId) {
        const usuario = this.getUsuario();
        return usuario?.setorId === setorId;
    },

    /**
     * Verifica se está logado
     * @returns {boolean}
     */
    isLogado() {
        return this.getUsuario() !== null;
    },

    /**
     * Verifica se pode editar um setor (admin ou responsável do setor)
     * @param {string} setorId - ID do setor
     * @returns {boolean}
     */
    podeEditar(setorId) {
        return this.isAdmin() || this.isResponsavel(setorId);
    },

    /**
     * Realiza login como administrador via Google
     * @returns {Promise<Object>} Dados do usuário logado
     */
    async loginAdminGoogle() {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await auth.signInWithPopup(provider);
            const user = result.user;

            // Verifica se o email está cadastrado como admin no Firestore
            const isAdmin = await DB.verificarEmailAdmin(user.email);
            if (!isAdmin) {
                // Faz logout do Firebase Auth pois o usuário não é admin
                await auth.signOut();
                throw new Error('Este email não está autorizado como administrador');
            }

            // Salva a sessão
            const usuario = {
                nome: user.displayName || user.email.split('@')[0],
                email: user.email,
                uid: user.uid,
                photoURL: user.photoURL,
                setorId: null,
                setorNome: null,
                isAdmin: true,
                tipo: 'admin'
            };

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuario));

            return usuario;
        } catch (error) {
            console.error('Erro no login Google:', error);

            if (error.message === 'Este email não está autorizado como administrador') {
                throw error;
            } else if (error.code === 'auth/popup-closed-by-user') {
                throw new Error('Login cancelado');
            } else if (error.code === 'auth/popup-blocked') {
                throw new Error('Pop-up bloqueado pelo navegador');
            } else {
                throw new Error('Erro ao fazer login com Google');
            }
        }
    },

    /**
     * Lista todos os administradores cadastrados
     * @returns {Promise<Array>} Lista de administradores
     */
    async listarAdmins() {
        try {
            // Usa Firebase Admin SDK via Cloud Function ou lista do Auth
            // Por enquanto, retorna lista vazia (precisa de backend)
            return [];
        } catch (error) {
            console.error('Erro ao listar admins:', error);
            throw error;
        }
    },

    /**
     * Adiciona um novo administrador
     * @param {string} email - Email do novo admin
     * @param {string} senha - Senha do novo admin
     * @returns {Promise<Object>} Dados do admin criado
     */
    async adicionarAdmin(email, senha) {
        try {
            // Cria novo usuário no Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, senha);
            return {
                uid: userCredential.user.uid,
                email: userCredential.user.email
            };
        } catch (error) {
            console.error('Erro ao adicionar admin:', error);

            if (error.code === 'auth/email-already-in-use') {
                throw new Error('Este email já está cadastrado');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Email inválido');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Senha muito fraca (mínimo 6 caracteres)');
            } else {
                throw new Error('Erro ao adicionar administrador');
            }
        }
    },

    /**
     * Remove um administrador
     * @param {string} uid - UID do admin a ser removido
     * @returns {Promise<void>}
     */
    async removerAdmin(uid) {
        try {
            // Nota: Remover usuário requer Firebase Admin SDK no backend
            // Por enquanto, apenas mostra mensagem
            throw new Error('Função disponível apenas via painel do Firebase');
        } catch (error) {
            console.error('Erro ao remover admin:', error);
            throw error;
        }
    }
};

// Exporta para uso global
window.Auth = Auth;
