/**
 * Configuração do Firebase
 * 
 * INSTRUÇÕES:
 * 1. Acesse https://console.firebase.google.com
 * 2. Crie um novo projeto ou use um existente
 * 3. Vá em "Configurações do projeto" > "Seus aplicativos"
 * 4. Clique em "Web" (</>)
 * 5. Copie as configurações e substitua abaixo
 */

const firebaseConfig = {
    apiKey: "AIzaSyAfbq4wOWlGxjnU0DeK8a-YIi2b5XEKces",
    authDomain: "gestor-enfermos-saobento.firebaseapp.com",
    projectId: "gestor-enfermos-saobento",
    storageBucket: "gestor-enfermos-saobento.firebasestorage.app",
    messagingSenderId: "486954140232",
    appId: "1:486954140232:web:270237bbbc91a361ac0e7d",
    measurementId: "G-05NMR27N2F"
};


// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao Firestore
const db = firebase.firestore();

// Referência ao Auth
const auth = firebase.auth();

// Exporta para uso global
window.db = db;
window.auth = auth;
