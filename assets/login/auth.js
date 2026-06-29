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



// ==========================================
// LOGIQUE DE CONNEXION ET REDIRECTION AUTOMATIQUE
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
                  // En situation réelle, on utiliserait firebase.auth(), ici on valide via les données du document
                  alert("Connexion réussie ! Bienvenue sur le Panneau d'Administration.");
                  window.location.href = "../admin/&admin.html"; // Redirection vers ton espace admin
              } else {
                  alert("Accès refusé. Cet email n'est pas enregistré comme Administrateur.");
              }
          })
          .catch(error => console.error("Erreur connexion admin:", error));
    }

    // 2. SI C'EST UN ÉLÈVE
    else if (role === 'eleve') {
        db.collection('eleves')
          .where('email', '==', email)
          .where('password_init', '==', password) // Vérification temporaire par champ texte
          .get()
          .then(snapshot => {
              if (!snapshot.empty) {
                  alert("Connexion réussie ! Redirection vers votre Espace Élève...");
                  window.location.href = "../../espace/eleve/eleve.html"; // Redirection vers le futur espace élève
              } else {
                  alert("Email ou mot de passe incorrect ou compte, non existant.");
              }
          })
          .catch(error => console.error("Erreur connexion élève:", error));
    }

    // 3. SI C'EST UN PROFESSEUR
    else if (role === 'professeur') {
        db.collection('professeurs')
          .where('email', '==', email)
          .where('password_init', '==', password)
          .get()
          .then(snapshot => {
              if (!snapshot.empty) {
                  // Le prof est bien validé et actif
                  alert("Connexion réussie ! Redirection vers votre Espace Professeur...");
                  window.location.href = "../../espace/professeur/professeur.html"; // Redirection vers le futur espace prof
              } else {
                  // Si on ne le trouve pas dans les profs actifs, on cherche s'il est encore en attente
                  verifierSiProfEnAttente(email, password);
              }
          })
          .catch(error => console.error("Erreur connexion professeur:", error));
    }
});

// Fonction secondaire pour alerter un prof si son compte n'est pas encore validé
function verifierSiProfEnAttente(email, password) {
    db.collection('profs_en_attente')
      .where('email', '==', email)
      .get()
      .then(snapshot => {
          if (!snapshot.empty) {
              alert("⚠️ Votre compte est toujours en attente de validation par l'administration. Veuillez patienter.");
          } else {
              alert("Email ou mot de passe incorrect.");
          }
      });
}


// ==========================================
// LOGIQUE D'INSCRIPTION EN LIGNE (REGISTRATION)
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

        db.collection('eleves').add({
            nom: nom,
            email: email,
            sexe: sexe,
            password_init: password,
            niveauEtudes: niveau,
            dateInscription: dateActuelle
        })
        .then(() => {
            alert("Compte Élève créé avec succès ! Redirection vers votre tableau de bord.");
            window.location.href = "eleve.html";
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
            alert("✉️ Demande d'inscription envoyée ! Votre profil doit être validé par un administrateur avant de pouvoir vous connecter.");
            switchForm('login'); // Renvoie le prof sur l'onglet connexion
        })
        .catch(error => alert("Erreur lors du dépôt de candidature : " + error.message));
    }
});