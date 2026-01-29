# Configuração do Firebase - Passo a Passo

Este guia explica como configurar o Firebase para o Sistema Gestor de Enfermos.

---

## 1. Criar Projeto no Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"**
3. Digite um nome: `gestor-enfermos-saobento` (ou similar)
4. Pode desativar o Google Analytics (não é necessário)
5. Clique em **"Criar projeto"**

---

## 2. Adicionar App Web

1. Na página inicial do projeto, clique no ícone **Web** (`</>`)
2. Digite um apelido: `Gestor Enfermos Web`
3. **NÃO** marque "Firebase Hosting" (por enquanto)
4. Clique em **"Registrar app"**
5. **Copie as configurações** que aparecem (já estão no arquivo `firebase-config.js`)

---

## 3. Criar Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha **"Iniciar no modo de teste"** (para desenvolvimento)
4. Selecione a região mais próxima (ex: `southamerica-east1` para Brasil)
5. Clique em **"Ativar"**

---

## 4. Configurar Regras de Segurança do Firestore

Vá em **Firestore > Regras** e substitua por:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Qualquer pessoa pode ler setores e enfermos
    match /setores/{setorId} {
      allow read: if true;
      allow write: if true; // Simplificado para desenvolvimento
      
      match /enfermos/{enfermoId} {
        allow read: if true;
        allow write: if true;
      }
    }
  }
}
```

Clique em **"Publicar"**.

> ⚠️ **Importante**: Para produção real, implemente regras mais restritivas.

---

## 5. Habilitar Firebase Authentication

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, clique em **"Email/Password"**
4. **Ative** a opção "Email/Password"
5. Clique em **"Salvar"**

---

## 6. Cadastrar Administradores

Os administradores agora são cadastrados no **Firebase Authentication** (não mais no Firestore).

### Como cadastrar:

1. Vá em **Authentication > Users**
2. Clique em **"Add user"** (Adicionar usuário)
3. Preencha:
   - **Email**: `admin@saobento.com` (ou o email que preferir)
   - **Password**: Crie uma senha forte
4. Clique em **"Add user"**

Repita para cada administrador que precisar.

### Exemplo de administradores:

| Email | Senha (exemplo) |
|-------|-----------------|
| `admin@saobento.com` | `Admin@2026` |
| `padre.jose@saobento.com` | `Padre@2026` |

> 💡 **Dica**: Anote os emails e senhas em local seguro!

---

## 7. Popular o Banco de Dados

1. Abra o arquivo **`popular-banco.html`** no navegador
2. Clique em **"Iniciar População do Banco"**
3. Aguarde a conclusão (você verá o log em tempo real)

Isso irá adicionar:
- 4 setores (Centro, Norte, Sul, Leste)
- 26 enfermos distribuídos nos setores

---

## 8. Testar a Aplicação

1. Abra o arquivo `index.html` no navegador
2. Você verá a lista de setores
3. Clique em um setor para ver os enfermos
4. Clique no ícone ⚙️ (engrenagem) no header para fazer login como admin
5. Use o email e senha cadastrados no passo 6

---

## Estrutura Final

### Firestore:
```
📁 setores
    📄 {id_auto}
    │   ├── nome: "Setor Centro"
    │   ├── horario: "Sábado, 14h"
    │   ├── responsaveis: ["Maria A. Santos", "João P. Silva"]
    │   │
    │   📁 enfermos
    │       📄 {id_auto}
    │           ├── nome: "José da Silva"
    │           ├── endereco: "Rua das Flores, 123"
    │           ├── status: "ativo"
    │           └── dataCriacao: timestamp
```

### Firebase Authentication:
```
👤 admin@saobento.com
👤 padre.jose@saobento.com
```

---

## Fluxos de Uso

### Responsável de Setor:
1. Abre a página e vê os setores
2. Clica em um setor
3. Clica no botão ✏️ ou ✗ de um enfermo
4. Sistema pede login (apenas nome + setor)
5. Faz a edição/remoção (fica pendente)

### Administrador:
1. Clica no ícone ⚙️ no header
2. Faz login com email e senha
3. Clica em "Pendências"
4. Aprova ou rejeita as solicitações

---

## Dúvidas Frequentes

### Como adicionar mais administradores?
Vá em **Authentication > Users > Add user** e cadastre o email e senha.

### Como adicionar mais setores?
Vá em **Firestore > setores > Add document** com os campos `nome`, `horario` e `responsaveis` (array).

### Como alterar um responsável?
Edite o campo `responsaveis` diretamente no Firestore (é um array de strings).

### Esqueci a senha de um admin
Vá em **Authentication > Users**, clique nos 3 pontinhos do usuário e escolha "Reset password".

---

## Hospedagem (Opcional)

Para deixar o site online gratuitamente:

1. No Firebase Console, vá em **Hosting**
2. Clique em **"Começar"**
3. Instale o Firebase CLI: `npm install -g firebase-tools`
4. No terminal, na pasta do projeto:
   ```bash
   firebase login
   firebase init hosting
   firebase deploy
   ```

O site ficará disponível em `https://gestor-enfermos-saobento.web.app`
