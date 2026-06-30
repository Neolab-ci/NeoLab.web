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

document.addEventListener("DOMContentLoaded", function() {

    // ==========================================
    // VÉRIFICATION STRICTE DE LA SESSION (AUTH)
    // ==========================================
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Session valide trouvée pour l'élève :", user.email);
            // On récupère directement le profil grâce à l'UID unique
            chargerDonneesProfil(user.uid);
        } else {
            console.warn("Aucune session active. Redirection vers auth.html...");
            const newLocal = window.location.href = "../../assets/login/auth.html";
        }
    });

    // ==========================================
    // LOGIQUE DE NAVIGATION (ONGLETS)
    // ==========================================
    document.querySelectorAll('.sidebar ul li').forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            if (!targetPage) return; 

            document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.content section').forEach(section => {
                section.classList.remove('active-section');
                section.style.display = 'none';
            });

            const targetSection = document.getElementById(targetPage);
            if (targetSection) {
                targetSection.classList.add('active-section');
                targetSection.style.display = 'block';
            }
        });
    });

    // Déconnexion
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (confirm("Voulez-vous vous déconnecter de NeoLab-CI ?")) {
                auth.signOut().then(() => {
                    window.location.href = "../../index.html";
                });
            }
        });
    }

    // ==========================================
    // RÉCUPÉRATION DU PROFIL DEPUIS FIRESTORE
    // ==========================================
    function chargerDonneesProfil(uid) {
        db.collection('eleves').doc(uid).get()
        .then((doc) => {
            if (doc.exists) {
                const data = doc.data();
                
                // Génération automatique d'un avatar robotique basé sur le nom
                const avatarURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.nom)}`;

                // Injection Header
                const txtName = document.getElementById('user-display-name');
                const imgAvatar = document.getElementById('user-display-avatar');
                if (txtName) txtName.innerText = `${data.nom} 👋`;
                if (imgAvatar) {
                    imgAvatar.src = avatarURL;
                    imgAvatar.style.display = "block";
                }

                // Injection Onglet Profil
                if(document.getElementById('profile-card-avatar')) document.getElementById('profile-card-avatar').src = avatarURL;
                if(document.getElementById('profile-card-nom')) document.getElementById('profile-card-nom').innerText = data.nom;
                if(document.getElementById('profile-card-email')) document.getElementById('profile-card-email').innerText = data.email;
                if(document.getElementById('profile-card-sexe')) document.getElementById('profile-card-sexe').innerText = data.sexe || "Non défini";
                if(document.getElementById('profile-card-niveau')) document.getElementById('profile-card-niveau').innerText = data.niveauEtudes || "Non défini";
                if(document.getElementById('profile-card-date')) document.getElementById('profile-card-date').innerText = data.dateInscription || "Inconnue";

                // Activation des flux de données en temps réel
                activerFluxTempsReel(data.niveauEtudes);
            } else {
                console.error("Fiche de profil Firestore introuvable pour cet UID.");
                alert("Profil introuvable dans la base de données.");
                auth.signOut().then(() => { window.location.href = "../../assets/login/auth.html"; });
            }
        })
        .catch(error => console.error("Erreur d'accès à Firestore :", error));
    }

    // ==========================================
    // SYNC EN TEMPS RÉEL (COURS & DEVOIRS)
    // ==========================================
    function activerFluxTempsReel(niveauEleve) {
        db.collection('cours').onSnapshot((snapshot) => {
            const dashCount = document.getElementById('dash-cours');
            if (dashCount) dashCount.innerText = snapshot.size;

            const gridCours = document.getElementById('student-courses-grid');
            if (!gridCours) return;

            gridCours.innerHTML = "";
            if (snapshot.empty) {
                gridCours.innerHTML = `<p style="color: var(--text-muted);">Aucun cours disponible pour le moment.</p>`;
                return;
            }

            snapshot.forEach((doc) => {
                const cours = doc.data();
                const defaultThumb = 'https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop';
                const imageSrc = cours.imageURL || defaultThumb;

                gridCours.innerHTML += `
                    <div class="card">
                        <img src="${imageSrc}" alt="${cours.titre}" style="width:100%; height:130px; object-fit:cover; border-radius:10px; margin-bottom:15px; border: 1px solid var(--border-color);">
                        <span style="font-size: 0.75rem; background: var(--primary-glow); color: var(--accent); padding: 3px 8px; border-radius: 20px; font-weight: bold;">${cours.niveau}</span>
                        <h3 style="margin: 10px 0 5px 0; font-size: 1.1rem; color: var(--text-main);">${cours.titre}</h3>
                        <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 15px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${cours.description || 'Aucune description disponible.'}</p>
                        <a href="${cours.mediaURL}" target="_blank" style="display: inline-block; text-align:center; width:100%; background: var(--primary); color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold;">
                            Ouvrir le cours
                        </a>
                    </div>`;
            });
        });

        const gridExercices = document.getElementById('student-exercises-grid');
        if (gridExercices) {
            gridExercices.innerHTML = `<p style="color: var(--text-muted);">Aucun exercice disponible pour le moment.</p>`;
        }
    }
});