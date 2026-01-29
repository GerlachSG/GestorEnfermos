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
    /**
     * Realiza login como responsável de setor
     * @param {string} nome - Nome do usuário
     * @param {string} telefone - Telefone do usuário
     * @returns {Promise<Object>} Dados do usuário logado
     */
    async login(nome, telefone) {
        try {
            // Busca todos os setores para encontrar o responsável
            const setores = await DB.getSetores();
            const nomeNormalizado = nome.trim().toUpperCase();
            const telefoneLimpo = telefone.replace(/\D/g, ''); // Remove formatação para comparar se necessário, mas o DB deve salvar com formatação? 
            // Melhor: compara o valor exato salvo (com máscara). Vamos assumir que salva "99999-9999".

            let responsavelEncontrado = null;
            let setorEncontrado = null;

            for (const setor of setores) {
                if (!setor.responsaveis) continue;

                const encontrado = setor.responsaveis.find(r => {
                    // Se for objeto (novo formato)
                    if (typeof r === 'object' && r.nome && r.telefone) {
                        return r.nome.toUpperCase() === nomeNormalizado && r.telefone === telefone;
                    }
                    // Se for string (legado) - ignoramos ou permitimos login apenas com nome?
                    // Por segurança, vamos exigir o novo formato. Antigos devem ser recadastrados.
                    return false;
                });

                if (encontrado) {
                    responsavelEncontrado = encontrado;
                    setorEncontrado = setor;
                    break;
                }
            }

            if (!responsavelEncontrado) {
                throw new Error('Nome e celular não conferem ou você não está cadastrado.');
            }

            // Salva a sessão
            const usuario = {
                nome: responsavelEncontrado.nome,
                telefone: responsavelEncontrado.telefone,
                setorId: setorEncontrado.id,
                setorNome: setorEncontrado.nome,
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

            // Busca os dados do admin no Firestore para pegar o nome correto
            const adminDoc = await db.collection('admins').where('email', '==', email.toLowerCase()).limit(1).get();
            const adminData = adminDoc.docs[0].data();

            // Salva a sessão
            const usuario = {
                nome: adminData.nome || user.email.split('@')[0],
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
            // Adiciona escopos explicitamente para garantir que o e-mail venha
            provider.addScope('email');
            provider.addScope('profile');

            // Garante que o usuário possa escolher a conta toda vez
            provider.setCustomParameters({ prompt: 'select_account' });

            const result = await auth.signInWithPopup(provider).catch(error => {
                // Se der erro de credencial já existente, podemos tentar vincular ou dar instrução
                if (error.code === 'auth/account-exists-with-different-credential') {
                    throw new Error('E-mail já vinculado a outro método (Senha). Use o login por e-mail e senha.');
                }
                throw error;
            });

            const user = result.user;
            let email = user.email;

            // Se o e-mail principal for nulo, tenta buscar nos provedores vinculados
            if (!email && user.providerData && user.providerData.length > 0) {
                const googleData = user.providerData.find(p => p.providerId === 'google.com');
                if (googleData) email = googleData.email;
            }

            if (!email) {
                // Se ainda for nulo, tenta pegar do objeto de perfil adicional
                const additionalUserInfo = result.additionalUserInfo;
                if (additionalUserInfo && additionalUserInfo.profile) {
                    email = additionalUserInfo.profile.email;
                }
            }

            if (!email) {
                await auth.signOut();
                throw new Error('Não foi possível obter o e-mail da sua conta Google. Verifique se o seu perfil Google permite compartilhar o e-mail.');
            }

            // Verifica se o email está cadastrado como admin no Firestore
            const isAdmin = await DB.verificarEmailAdmin(email);
            if (!isAdmin) {
                // Faz logout do Firebase Auth pois o usuário não é admin
                await auth.signOut();
                throw new Error('Este email não está autorizado como administrador');
            }

            // Busca os dados do admin no Firestore para pegar o nome correto
            const adminDoc = await db.collection('admins').where('email', '==', email.toLowerCase()).limit(1).get();
            const adminData = adminDoc.docs[0].data();

            // Salva a sessão
            const usuario = {
                nome: adminData.nome || user.displayName || email.split('@')[0],
                email: email,
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
            return await DB.listarAdmins();
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
    async adicionarAdmin(nome, email, senha) {
        try {
            // 1. Autoriza no Firestore primeiro (Fonte da verdade)
            await DB.autorizarAdmin(nome, email);

            // 2. Tenta gerar a conta no Auth (Pode falhar se já existir)
            try {
                await auth.createUserWithEmailAndPassword(email, senha);
            } catch (authError) {
                // Se o erro for que o email já está em uso, apenas ignoramos 
                // pois o email já foi autorizado no Firestore no passo 1.
                if (authError.code === 'auth/email-already-in-use') {
                    console.log('Conta Auth já existe, mas email foi autorizado no banco.');
                    return { email, status: 'authorized' };
                }
                throw authError;
            }

            return { email, status: 'created' };
        } catch (error) {
            console.error('Erro ao adicionar admin:', error);

            if (error.code === 'auth/invalid-email') {
                throw new Error('Email inválido');
            } else if (error.code === 'auth/weak-password') {
                throw new Error('Senha muito fraca (mínimo 6 caracteres)');
            } else {
                throw new Error(error.message || 'Erro ao adicionar administrador');
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
