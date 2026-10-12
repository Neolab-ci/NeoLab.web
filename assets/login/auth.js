// ==========================================
// CONFIGURATION ET INITIALISATION FIREBASE
// ==========================================
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
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", function () {
    // Charger les filières dans le menu déroulant à l'ouverture de la page
    chargerFilieresInscription();
});

// 1. Gestion des onglets (Connexion / Inscription)
function switchForm(formType) {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-register').classList.remove('active');
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

// 2. Basculement dynamique des champs selon le rôle (Élève vs Professeur)
function toggleRegistrationFields() {
    const role = document.getElementById('reg-role').value;
    const groupFiliere = document.getElementById('reg-group-filiere');
    const groupNiveau = document.getElementById('reg-group-niveau');
    const groupSpecialite = document.getElementById('reg-group-specialite');
    
    if (role === 'eleve') {
        groupFiliere.style.display = 'block';
        groupNiveau.style.display = 'block';
        groupSpecialite.style.display = 'none';
        document.getElementById('reg-filiere').required = true;
        document.getElementById('reg-niveau').required = true;
        document.getElementById('reg-specialite').required = false;
    } else {
        groupFiliere.style.display = 'none';
        groupNiveau.style.display = 'none';
        groupSpecialite.style.display = 'block';
        document.getElementById('reg-filiere').required = false;
        document.getElementById('reg-niveau').required = false;
        document.getElementById('reg-specialite').required = true;
    }
}

// 3. Charger les filières depuis Firestore pour alimenter le menu déroulant
function chargerFilieresInscription() {
    db.collection('filieres').get().then((snapshot) => {
        const selectFiliere = document.getElementById('reg-filiere');
        if (!selectFiliere) return;

        selectFiliere.innerHTML = '<option value="">-- Sélectionnez votre filière --</option>';
        
        if (snapshot.empty) {
            selectFiliere.innerHTML = '<option value="">Aucune filière disponible (Contactez l\'admin)</option>';
            return;
        }

        snapshot.forEach((doc) => {
            const fil = doc.data();
            const filId = doc.id;
            const filNom = fil.nom || filId;
            selectFiliere.innerHTML += `<option value="${filId}">${filNom}</option>`;
        });
    }).catch(err => {
        console.error("Erreur de chargement des filières :", err);
    });
}

// ==========================================
// LOGIQUE DE CONNEXION
// ==========================================
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const role = document.getElementById('login-role').value;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (role === 'eleve') {
        auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("Connexion réussie ! Redirection vers votre Espace Élève...");
            window.location.href = "../../espace/eleve/eleve.html";
        })
        .catch(error => {
            alert("Erreur : Email ou mot de passe incorrect.");
            console.error(error);
        });
    } else if (role === 'professeur') {
        db.collection('professeurs')
          .where('email', '==', email)
          .where('password_init', '==', password)
          .get()
          .then(snapshot => {
              if (!snapshot.empty) {
                  alert("Connexion réussie ! Redirection vers votre Espace Professeur...");
                  window.location.href = "../../acceuil.html";  
              } else {
                  verifierSiProfEnAttente(email, password);
              }
          })
          .catch(error => console.error("Erreur connexion professeur:", error));
    }
});

function verifierSiProfEnAttente(email, password) {
    db.collection('profs_en_attente')
      .where('email', '==', email)
      .get()
      .then(snapshot => {
          if (!snapshot.empty) {
              alert("⚠️ Votre compte est en attente de validation par l'administration.");
          } else {
              alert("Email ou mot de passe incorrect.");
          }
      });
}

// ==========================================
// LOGIQUE D'INSCRIPTION EN LIGNE
// ==========================================
document.getElementById('register-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const role = document.getElementById('reg-role').value;
    const nom = document.getElementById('reg-nom').value;
    const sexe = document.getElementById('reg-sexe').value;
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const dateActuelle = new Date().toLocaleDateString('fr-FR');

    if (password.length < 6) {
        alert("Le mot de passe doit contenir au moins 6 caractères.");
        return;
    }

    if (role === 'eleve') {
        const filiereId = document.getElementById('reg-filiere').value;
        const niveau = document.getElementById('reg-niveau').value;

        if (!filiereId) {
            alert("Veuillez sélectionner une filière valide.");
            return;
        }

        // 1. Création du compte dans Firebase Auth
        auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // 2. Enregistrement des données de l'élève avec sa filière liée
            return db.collection('eleves').doc(user.uid).set({
                uid: user.uid,
                nom: nom,
                email: email,
                sexe: sexe,
                password_init: password,
                filiere_id: filiereId,
                niveauEtudes: niveau,
                dateInscription: dateActuelle
            });
        })
        .then(() => {
            alert("Compte Élève créé avec succès ! Bienvenue sur NeoLab-CI.");
            window.location.href = "../../espace/eleve/eleve.html";
        })
        .catch(error => alert("Erreur lors de l'inscription : " + error.message));

    } else if (role === 'professeur') {
        const specialite = document.getElementById('reg-specialite').value;

        db.collection('profs_en_attente').add({
            nom: nom,
            email: email,
            sexe: sexe,
            password_init: password,
            specialite: specialite,
            dateDemande: dateActuelle,
            statut: 'en_attente'
        })
        .then(() => {
            alert("✉️ Demande d'inscription envoyée à l'administration ! Veuillez patienter.");
            switchForm('login'); 
        })
        .catch(error => alert("Erreur lors du dépôt de candidature : " + error.message));
    }
});

document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const role = document.getElementById('login-role').value;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const container = document.querySelector('.auth-container');

    if (role === 'eleve') {
        auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Effet d'ouverture du cahier en cas de succès
            container.classList.add('opening');
            setTimeout(() => {
                window.location.href = "eleve_2.html"; 
            }, 600);
        })
        .catch(error => {
            // Effet de cahier fermé / refusé en cas d'erreur
            container.classList.add('shake');
            setTimeout(() => container.classList.remove('shake'), 400);
            alert("Erreur : Email ou mot de passe incorrect. Le cahier reste fermé !");
            console.error(error);
        });
    }
});