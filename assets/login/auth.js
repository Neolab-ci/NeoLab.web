// Configuration Firebase (Identique à ton espace admin)
const firebaseConfig = {
    apiKey: "AIzaSyBRGYbiSp26ba_cxj7REHKkOqSylQf1DfQ",
    authDomain: "neolab-ci.firebaseapp.com",
    projectId: "neolab-ci",
    storageBucket: "neolab-ci.firebasestorage.app",
    messagingSenderId: "121581894561",
    appId: "1:121581894561:web:c2056aa29364fce97a69e0"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 1. Gestion du changement d'onglet (Connexion / Inscription)
function switchForm(formType) {
    // Boutons
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
    // Formulaires
    document.getElementById('login-form').classList.remove('active');
    document.getElementById('register-form').classList.remove('active');

    if (formType === 'login') {
        document.getElementById('tab-login').classList.add('active');
        document.getElementById('login-form').classList.add('active');
    } else {
        document.getElementById('tab-register').classList.add('active');
        document.getElementById('register-form').classList.add('active');
    }
}

// 2. Affichage dynamique des champs selon le rôle à l'inscription
function toggleRegistrationFields() {
    const role = document.getElementById('reg-role').value;
    const groupNiveau = document.getElementById('reg-group-niveau');
    const groupSpecialite = document.getElementById('reg-group-specialite');
    
    if (role === 'eleve') {
        groupNiveau.style.display = 'block';
        groupSpecialite.style.display = 'none';
        document.getElementById('reg-niveau').required = true;
        document.getElementById('reg-specialite').required = false;
    } else {
        groupNiveau.style.display = 'none';
        groupSpecialite.style.display = 'block';
        document.getElementById('reg-niveau').required = false;
        document.getElementById('reg-specialite').required = true;
    }
}
