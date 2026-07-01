// ==========================================
// 1. VÉRIFICATION DE LA SESSION SUR CETTE PAGE
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    
    // On écoute le changement d'état de connexion de Firebase
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // 🔓 L'ÉLÈVE EST CONNECTÉ
            console.log("Session active pour l'élève :", user.uid);
            
            // --- METS ICI LES FONCTIONS À RETENIR UNIQUEMENT POUR L'ÉLÈVE ---
            // Exemple : afficher son nom, charger ses notes, etc.
            // initialiserEspaceEleve(user);

        } else {
            // 🔒 AUCUN ÉLÈVE CONNECTÉ
            console.log("Aucune session trouvée.");
            
            // Si cette page est PRIVÉE (réservée aux élèves), on le redirige :
            // window.location.href = "connexion.html";
        }
    });
});

// Configuration Firebase
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

// 1. Gestion du changement d'onglet (Connexion / Inscription)
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

// ==========================================
// LOGIQUE DE CONNEXION 
// ==========================================
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const role = document.getElementById('login-role').value;
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    // 1. SI C'EST UN ADMINISTRATEUR
    if (role === 'admin') {
        db.collection('admins')
          .where('email', '==', email)
          .get()
          .then(snapshot => {
              if (!snapshot.empty) {
                  alert("Connexion réussie ! Bienvenue sur le Panneau d'Administration.");
                  window.location.href = "../../admin/&admin.html"; 
              } else {
                  alert("Accès refusé. Cet email n'est pas enregistré comme Administrateur.");
              }
          })
          .catch(error => console.error("Erreur connexion admin:", error));
    }

    // 2. SI C'EST UN ÉLÈVE (CORRIGÉ AVEC AUTH + REDIRECTION CHEZ TOI)
    else if (role === 'eleve') {
        auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            alert("Connexion réussie ! Redirection vers votre Espace Élève...");
            window.location.href = "../../espace/eleve/eleve.html"; 
        })
        .catch(error => {
            alert("Erreur : Email ou mot de passe incorrect.");
            console.error(error);
        });
    }

    // 3. SI C'EST UN PROFESSEUR
    else if (role === 'professeur') {
        db.collection('professeurs')
          .where('email', '==', email)
          .where('password_init', '==', password)
          .get()
          .then(snapshot => {
              if (!snapshot.empty) {
                  alert("Connexion réussie ! Redirection vers votre Espace Professeur...");
                  window.location.href = "../../espace/professeur/professeur.html"; 
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
              alert("⚠️ Votre compte est toujours en attente de validation par l'administration.");
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
        const niveau = document.getElementById('reg-niveau').value;

        // 1. Création dans Firebase Auth
        auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            
            // 2. Écriture synchronisée avec l'UID de session
            return db.collection('eleves').doc(user.uid).set({
                uid: user.uid,
                nom: nom,
                email: email,
                sexe: sexe,
                password_init: password,
                niveauEtudes: niveau,
                dateInscription: dateActuelle
            });
        })
        .then(() => {
            alert("Compte Élève créé avec succès !");
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
            alert("✉️ Demande d'inscription envoyée à l'administration !");
            switchForm('login'); 
        })
        .catch(error => alert("Erreur lors du dépôt de candidature : " + error.message));
    }
});