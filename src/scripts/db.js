/**
 * Funções de acesso ao Firestore
 * Gerencia setores, enfermos e pendências
 */

const DB = {
    /**
     * Busca todos os setores
     * @returns {Promise<Array>} Lista de setores com id e dados
     */
    async getSetores() {
        try {
            const snapshot = await db.collection('setores').orderBy('nome').get();
            const setores = [];

            for (const doc of snapshot.docs) {
                const setor = { id: doc.id, ...doc.data() };

                // Conta enfermos e pendências
                const enfermosSnapshot = await db
                    .collection('setores')
                    .doc(doc.id)
                    .collection('enfermos')
                    .get();

                setor.totalEnfermos = enfermosSnapshot.size;
                setor.pendencias = enfermosSnapshot.docs.filter(
                    e => e.data().status !== 'ativo'
                ).length;

                setores.push(setor);
            }

            return setores;
        } catch (error) {
            console.error('Erro ao buscar setores:', error);
            throw error;
        }
    },

    /**
     * Busca um setor específico
     * @param {string} setorId - ID do setor
     * @returns {Promise<Object>} Dados do setor
     */
    async getSetor(setorId) {
        try {
            const doc = await db.collection('setores').doc(setorId).get();

            if (!doc.exists) {
                throw new Error('Setor não encontrado');
            }

            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Erro ao buscar setor:', error);
            throw error;
        }
    },

    /**
     * Busca enfermos de um setor
     * @param {string} setorId - ID do setor
     * @returns {Promise<Array>} Lista de enfermos
     */
    async getEnfermos(setorId) {
        try {
            const snapshot = await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .orderBy('nome')
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Erro ao buscar enfermos:', error);
            throw error;
        }
    },

    /**
     * Adiciona um novo enfermo
     * @param {string} setorId - ID do setor
     * @param {Object} dados - { nome, endereco }
     * @returns {Promise<string>} ID do enfermo criado
     */
    async addEnfermo(setorId, dados) {
        try {
            const docRef = await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .add({
                    nome: dados.nome,
                    endereco: dados.endereco,
                    idade: dados.idade,
                    status: 'ativo',
                    dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
                });

            return docRef.id;
        } catch (error) {
            console.error('Erro ao adicionar enfermo:', error);
            throw error;
        }
    },

    /**
     * Solicita remoção de um enfermo (marca como pendente)
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     * @param {string} motivo - Motivo da remoção
     */
    async solicitarRemocao(setorId, enfermoId, motivo) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId)
                .update({
                    status: 'pendente_remocao',
                    motivoPendencia: motivo,
                    dataPendencia: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Erro ao solicitar remoção:', error);
            throw error;
        }
    },

    /**
     * Solicita edição de um enfermo (marca como pendente)
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     * @param {Object} novosDados - { nome, endereco }
     */
    async solicitarEdicao(setorId, enfermoId, novosDados) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId)
                .update({
                    status: 'pendente_edicao',
                    edicaoPendente: {
                        nome: novosDados.nome,
                        endereco: novosDados.endereco,
                        idade: novosDados.idade
                    },
                    dataPendencia: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Erro ao solicitar edição:', error);
            throw error;
        }
    },

    /**
     * Solicita adição de um novo enfermo (marca como pendente)
     * @param {string} setorId - ID do setor
     * @param {Object} dados - { nome, endereco, idade }
     */
    async solicitarAdicao(setorId, dados) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .add({
                    nome: dados.nome,
                    endereco: dados.endereco,
                    idade: dados.idade,
                    status: 'pendente_adicao',
                    dataPendencia: firebase.firestore.FieldValue.serverTimestamp()
                });
        } catch (error) {
            console.error('Erro ao solicitar adição:', error);
            throw error;
        }
    },

    /**
     * Busca todas as pendências (para admin)
     * @returns {Promise<Array>} Lista de pendências de todos os setores
     */
    async getPendencias() {
        try {
            const setoresSnapshot = await db.collection('setores').get();
            const pendencias = [];

            for (const setorDoc of setoresSnapshot.docs) {
                const setorData = setorDoc.data();

                const enfermosSnapshot = await db
                    .collection('setores')
                    .doc(setorDoc.id)
                    .collection('enfermos')
                    .where('status', 'in', ['pendente_remocao', 'pendente_edicao', 'pendente_adicao'])
                    .get();

                for (const enfermoDoc of enfermosSnapshot.docs) {
                    pendencias.push({
                        setorId: setorDoc.id,
                        setorNome: setorData.nome,
                        enfermoId: enfermoDoc.id,
                        ...enfermoDoc.data()
                    });
                }
            }

            return pendencias;
        } catch (error) {
            console.error('Erro ao buscar pendências:', error);
            throw error;
        }
    },

    /**
     * Aprova uma pendência
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     * @param {string} tipo - 'remocao' ou 'edicao'
     */
    async aprovarPendencia(setorId, enfermoId, tipo) {
        try {
            const enfermoRef = db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId);

            if (tipo === 'remocao') {
                // Remove o enfermo completamente
                await enfermoRef.delete();
            } else if (tipo === 'edicao') {
                // Aplica a edição pendente
                const doc = await enfermoRef.get();
                const dados = doc.data();

                await enfermoRef.update({
                    nome: dados.edicaoPendente.nome,
                    endereco: dados.edicaoPendente.endereco,
                    idade: dados.edicaoPendente.idade,
                    status: 'ativo',
                    edicaoPendente: firebase.firestore.FieldValue.delete(),
                    dataPendencia: firebase.firestore.FieldValue.delete()
                });
            } else if (tipo === 'adicao') {
                // Torna o enfermo ativo
                await enfermoRef.update({
                    status: 'ativo',
                    dataPendencia: firebase.firestore.FieldValue.delete(),
                    dataCriacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Erro ao aprovar pendência:', error);
            throw error;
        }
    },

    /**
     * Rejeita uma pendência (restaura status ativo)
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     */
    async rejeitarPendencia(setorId, enfermoId) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId)
                .update({
                    status: 'ativo',
                    motivoPendencia: firebase.firestore.FieldValue.delete(),
                    edicaoPendente: firebase.firestore.FieldValue.delete(),
                    dataPendencia: firebase.firestore.FieldValue.delete()
                });
        } catch (error) {
            console.error('Erro ao rejeitar pendência:', error);
            throw error;
        }
    },

    /**
     * Verifica se um email está cadastrado como administrador
     * @param {string} email - Email a verificar
     * @returns {Promise<boolean>} True se for admin
     */
    async verificarEmailAdmin(email) {
        if (!email) return false;

        try {
            const snapshot = await db.collection('admins')
                .where('email', '==', email.toLowerCase())
                .limit(1)
                .get();

            return !snapshot.empty;
        } catch (error) {
            console.error('Erro ao verificar email admin:', error);
            throw error;
        }
    },

    /**
     * Autoriza um email como administrador no Firestore
     * @param {string} nome - Nome do administrador
     * @param {string} email - Email a autorizar
     */
    async autorizarAdmin(nome, email) {
        try {
            const emailLower = email.toLowerCase();
            // Verifica se já existe para evitar duplicatas
            const snapshot = await db.collection('admins')
                .where('email', '==', emailLower)
                .get();

            if (snapshot.empty) {
                await db.collection('admins').add({
                    nome: nome.toUpperCase(),
                    email: emailLower,
                    dataAutorizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Se já existe, apenas atualiza o nome se necessário
                const docId = snapshot.docs[0].id;
                await db.collection('admins').doc(docId).update({
                    nome: nome.toUpperCase()
                });
            }
        } catch (error) {
            console.error('Erro ao autorizar admin:', error);
            throw error;
        }
    },

    /**
     * Lista todos os administradores autorizados no Firestore
     * @returns {Promise<Array>}
     */
    async listarAdmins() {
        try {
            const snapshot = await db.collection('admins').get();
            const admins = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Ordena em memória para não excluir documentos sem o campo 'nome'
            return admins.sort((a, b) => {
                const nomeA = (a.nome || '').toUpperCase();
                const nomeB = (b.nome || '').toUpperCase();
                return nomeA.localeCompare(nomeB);
            });
        } catch (error) {
            console.error('Erro ao listar admins do Firestore:', error);
            throw error;
        }
    },

    /**
     * Edita um enfermo diretamente (para admins)
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     * @param {Object} dados - { nome, endereco }
     */
    async editarEnfermoDireto(setorId, enfermoId, dados) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId)
                .update({
                    nome: dados.nome,
                    endereco: dados.endereco,
                    idade: dados.idade
                });
        } catch (error) {
            console.error('Erro ao editar enfermo:', error);
            throw error;
        }
    },

    /**
     * Remove um enfermo diretamente (para admins)
     * @param {string} setorId - ID do setor
     * @param {string} enfermoId - ID do enfermo
     */
    async removerEnfermoDireto(setorId, enfermoId) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .collection('enfermos')
                .doc(enfermoId)
                .delete();
        } catch (error) {
            console.error('Erro ao remover enfermo:', error);
            throw error;
        }
    },

    /**
     * Adiciona um responsável ao setor
     * @param {string} setorId - ID do setor
     * @param {Object} responsavel - { nome, telefone }
     */
    async addResponsavel(setorId, responsavel) {
        try {
            await db
                .collection('setores')
                .doc(setorId)
                .update({
                    responsaveis: firebase.firestore.FieldValue.arrayUnion(responsavel)
                });
        } catch (error) {
            console.error('Erro ao adicionar responsável:', error);
            throw error;
        }
    },

    /**
     * Remove um responsável do setor
     * @param {string} setorId - ID do setor
     * @param {Object} responsavel - Objeto do responsável a remover
     */
    async removeResponsavel(setorId, responsavel) {
        try {
            // Usa arrayRemove para remover o objeto exato
            await db
                .collection('setores')
                .doc(setorId)
                .update({
                    responsaveis: firebase.firestore.FieldValue.arrayRemove(responsavel)
                });
        } catch (error) {
            console.error('Erro ao remover responsável:', error);
            throw error;
        }
    },

    /**
     * Edita um responsável do setor
     * @param {string} setorId - ID do setor
     * @param {Object} responsavelAntigo - Objeto atual { nome, telefone }
     * @param {Object} responsavelNovo - Novo objeto { nome, telefone }
     */
    async editarResponsavel(setorId, responsavelAntigo, responsavelNovo) {
        try {
            // Busca o setor atual
            const doc = await db.collection('setores').doc(setorId).get();
            const setor = doc.data();

            // Atualiza o array de responsáveis
            // Lida com compatibilidade: se for string, compara string
            const novosResponsaveis = setor.responsaveis.map(r => {
                // Se r for string (legado)
                if (typeof r === 'string') {
                    return r === responsavelAntigo.nome ? responsavelNovo : r;
                }
                // Se r for objeto
                if (r.nome === responsavelAntigo.nome && r.telefone === responsavelAntigo.telefone) {
                    return responsavelNovo;
                }
                return r;
            });

            await db
                .collection('setores')
                .doc(setorId)
                .update({
                    responsaveis: novosResponsaveis
                });
        } catch (error) {
            console.error('Erro ao editar responsável:', error);
            throw error;
        }
    }
};

// Exporta para uso global
window.DB = DB;
