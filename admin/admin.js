// ==========================================
// 1. CONFIGURATION ET INITIALISATION FIREBASE
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBRGYbiSp26ba_cxj7REHKkOqSylQf1DfQ",
    authDomain: "neolab-ci.firebaseapp.com",
    projectId: "neolab-ci",
    storageBucket: "neolab-ci.firebasestorage.app",
    messagingSenderId: "121581894561",
    appId: "1:121581894561:web:c2056aa29364fce97a69e0"
};

// Initialisation des services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// 2. GESTION DE LA NAVIGATION (SPA)
// ==========================================
const menus = document.querySelectorAll('.sidebar li[data-page]');
const sections = document.querySelectorAll('section');
const btnLogout = document.getElementById('btn-logout');

function afficherSection(id) {
    // Cacher toutes les sections
    sections.forEach(section => {
        section.classList.remove('active-section');
    });

    // Afficher la section cible
    const sectionCible = document.getElementById(id);
    if (sectionCible) {
        sectionCible.classList.add('active-section');
    }

    // Gérer l'état actif dans la sidebar
    menus.forEach(menu => {
        menu.classList.remove('active');
    });

    const menuActif = document.querySelector(`.sidebar li[data-page="${id}"]`);
    if (menuActif) {
        menuActif.classList.add('active');
    }
}

// Écouteur de clic sur les menus de navigation
menus.forEach(menu => {
    menu.addEventListener('click', () => {
        let page = menu.dataset.page;
        if (page) {
            afficherSection(page);
        }
    });
});

// Affichage initial par défaut sur le Tableau de bord
afficherSection('dashboard');

// ==========================================
// 3. SYNCHRONISATION DES DONNÉES DE L'ÉLÈVE
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        console.log("Élève connecté (UID) :", user.uid);
        
        try {
            // Récupérer le document de l'élève dans Firestore
            const docRef = doc(db, "eleves", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();

                // 1. Mise à jour du nom d'affichage (Ex: Emmanuel 👋)
                const prenomEleve = data.prenom || user.displayName || 'Élève';
                document.getElementById('user-display-name').innerText = `${prenomEleve} 👋`;

                // 2. Remplissage dynamique des statistiques du tableau de bord
                if (data.stats) {
                    document.getElementById('dash-cours').innerText = data.stats.coursSuivis ?? 0;
                    document.getElementById('dash-moyenne').innerText = data.stats.moyenne ?? "0.0";
                    document.getElementById('dash-temps').innerText = `${data.stats.tempsEtude ?? 0} h`;
                    document.getElementById('dash-certifs').innerText = data.stats.certificats ?? 0;
                }
            } else {
                console.log("Aucun profil Firestore trouvé. Affichage des données par défaut.");
                document.getElementById('user-display-name').innerText = `${user.displayName || 'Élève'} 👋`;
            }
        } catch (error) {
            console.error("Erreur lors de la récupération des données Firestore :", error);
        }
    } else {
        console.log("Aucun utilisateur connecté. Redirection requise.");
        // Une fois ta page d'authentification créée, tu pourras activer la redirection :
        // window.location.href = "connexion.html";
    }
});

// ==========================================
// 4. GESTION DE LA DÉCONNEXION RÉELLE
// ==========================================
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        signOut(auth).then(() => {
            console.log("Déconnexion réussie.");
            alert("Vous avez été déconnecté.");
            // Redirection vers l'accueil ou la page de connexion
            // window.location.href = "connexion.html";
        }).catch((error) => {
            console.error("Erreur lors de la déconnexion :", error);
        });
    });
}