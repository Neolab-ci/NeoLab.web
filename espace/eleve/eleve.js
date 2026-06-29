// ==========================================
// 1. CONFIGURATION ET INITIALISATION FIREBASE
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

// Profil de secours automatique pour le développement (évite que l'écran se fige)
const profilDeSecours = {
    nom: "Emmanuel (Mode Test)",
    email: "emmanuel.test@neolab.ci",
    sexe: "M",
    niveauEtudes: "Licence 1 Électronique",
    dateInscription: new Date().toLocaleDateString('fr-FR')
};

document.addEventListener("DOMContentLoaded", function() {

   // ==========================================
    // 2. VÉRIFICATION DE LA SESSION (AUTH) - REDIRECTION STRICTE
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Élève connecté avec succès :", user.email);
            chargerDonneesProfil(user.email);
        } else {
            console.warn("Aucun utilisateur connecté. Redirection immédiate !");
            // Si personne n'est connecté, on renvoie directement vers auth.html
            window.location.href = "../../assets/login/auth.html";
        }
    });

    // ==========================================
    // 3. GESTION DE LA NAVIGATION (ONGLETS)
    // ==========================================
    document.querySelectorAll('.sidebar ul li').forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            if (!targetPage) return; // Ignore le bouton déconnexion

            // 1. Mise à jour de la Sidebar (Bouton actif)
            document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
            document.querySelectorAll(`.sidebar ul li[data-page="${targetPage}"]`).forEach(li => {
                li.classList.add('active');
            });

            // 2. Bascule des sections de contenu
            document.querySelectorAll('.content section').forEach(section => {
                section.classList.remove('active-section');
                section.style.display = 'none'; // Force la disparition
            });

            const targetSection = document.getElementById(targetPage);
            if (targetSection) {
                targetSection.classList.add('active-section');
                targetSection.style.display = 'block'; // Force l'apparition
            }
        });
    });

    // Déconnexion réelle Firebase
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Voulez-vous vous déconnecter de NeoLab-CI ?")) {
                auth.signOut().then(() => {
                    window.location.href = "auth.html";
                }).catch(() => {
                    // Si on est en mode local sans session Auth active, on simule le retour
                    window.location.href = "auth.html";
                });
            }
        });
    }

    // ==========================================
    // 4. RÉCUPÉRATION DU PROFIL DEPUIS FIRESTORE
    // ==========================================
    function chargerDonneesProfil(email) {
        db.collection('eleves').where('email', '==', email).get()
        .then((snapshot) => {
            if (!snapshot.empty) {
                const data = snapshot.docs[0].data();
                appliquerDonneesInterface(data);
            } else {
                console.error("Utilisateur authentifié mais introuvable dans la collection 'eleves'.");
                appliquerDonneesInterface(profilDeSecours);
            }
        })
        .catch((error) => {
            console.error("Erreur lors du chargement du profil Firestore :", error);
            appliquerDonneesInterface(profilDeSecours);
        });
    }

    // Injection des données dans tous les éléments HTML requis
    function appliquerDonneesInterface(eleve) {
        // Génération de l'avatar techno-robotique gratuit basé sur le nom
        const avatarURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(eleve.nom)}`;

        // Mise à jour du Header supérieur
        const txtName = document.getElementById('user-display-name');
        const imgAvatar = document.getElementById('user-display-avatar');
        if (txtName) txtName.innerText = `${eleve.nom} 👋`;
        if (imgAvatar) imgAvatar.src = avatarURL;

        // Mise à jour complète de la section "Profil"
        const cardAvatar = document.getElementById('profile-card-avatar');
        const cardNom = document.getElementById('profile-card-nom');
        const cardEmail = document.getElementById('profile-card-email');
        const cardSexe = document.getElementById('profile-card-sexe');
        const cardNiveau = document.getElementById('profile-card-niveau');
        const cardDate = document.getElementById('profile-card-date');

        if (cardAvatar) cardAvatar.src = avatarURL;
        if (cardNom) cardNom.innerText = eleve.nom;
        if (cardEmail) cardEmail.innerText = eleve.email;
        if (cardSexe) cardSexe.innerText = eleve.sexe || "Non spécifié";
        if (cardNiveau) cardNiveau.innerText = eleve.niveauEtudes || "Général";
        if (cardDate) cardDate.innerText = eleve.dateInscription || "Date inconnue";

        // Lancement des écoutes en temps réel (Cours et Exercices)
        activerEcoutesTempsReel(eleve.niveauEtudes);
    }

    // ==========================================
    // 5. ENCLENCHEMENT DES ÉCOUTES EN TEMPS RÉEL
    // ==========================================
    function activerEcoutesTempsReel(niveauFiliere) {
        
        // A. Synchronisation de l'onglet "Mes Cours"
        db.collection('cours').onSnapshot((snapshot) => {
            // Met à jour le badge du Dashboard
            const dashCountCours = document.getElementById('dash-cours');
            if (dashCountCours) dashCountCours.innerText = snapshot.size;

            const sectionCours = document.getElementById('cours');
            if (!sectionCours) return;

            // Réinitialise la structure avec la grille cible
            sectionCours.innerHTML = `
                <h1>Mes cours</h1>
                <p style="color: var(--text-muted); margin-bottom: 25px;">Vos cours d'électronique connectés en temps réel.</p>
                <div class="cards" id="student-courses-grid"></div>
            `;

            const gridCours = document.getElementById('student-courses-grid');
            if (snapshot.empty) {
                gridCours.innerHTML = `<p style="color: var(--text-muted);">Aucun cours n'est disponible pour le moment.</p>`;
                return;
            }

            // Génération des cartes de cours
            snapshot.forEach((doc) => {
                const cours = doc.data();
                const defaultThumb = 'https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop';
                const currentThumb = cours.imageURL || defaultThumb;

                gridCours.innerHTML += `
                    <div class="card">
                        <img src="${currentThumb}" alt="${cours.titre}" style="width:100%; height:130px; object-fit:cover; border-radius:10px; margin-bottom:15px; border: 1px solid var(--border-color);">
                        <span style="font-size: 0.75rem; background: var(--primary-glow); color: var(--accent); padding: 3px 8px; border-radius: 20px; font-weight: bold;">${cours.niveau}</span>
                        <h3 style="margin: 10px 0 5px 0; font-size: 1.1rem; color: var(--text-main);">${cours.titre}</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${cours.description || 'Aucune description disponible.'}</p>
                        <a href="${cours.mediaURL}" target="_blank" style="display: inline-block; text-align:center; width:100%; background: var(--primary); color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; transition: var(--transition-fast);">
                            Ouvrir le cours
                        </a>
                    </div>`;
            });
        });

        // B. Préparation pour les Devoirs / Exercices
        const gridExercices = document.getElementById('student-exercises-grid');
        if (gridExercices) {
            gridExercices.innerHTML = `<p style="color: var(--text-muted);">Aucun devoir ou exercice n'a été publié pour votre classe pour l'instant.</p>`;
        }
    }
});