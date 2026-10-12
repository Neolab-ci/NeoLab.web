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

let globalEleveData = null;
let allCourses = [];
let studentViewMode = 'grid';

document.addEventListener("DOMContentLoaded", function() {
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    // 1. VÉRIFICATION STRICTE DE LA SESSION DE L'ÉLÈVE
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Élève authentifié avec succès :", user.uid);
            // Charger les données du profil et les cours adaptés à sa filière
            chargerDonneesProfil(user.uid);
            remplirSelectFilieresFirestore();
            chargerCatalogueCoursMultiFiliere();
        } else {
            console.warn("Accès non autorisé : Aucun élève connecté.");
            window.location.href = "auth.html"; // Redirection vers la page de connexion
        }
    });

    // NAVIGATION PAR ONGLETS
    document.querySelectorAll('.sidebar ul li').forEach(item => {
        item.addEventListener('click', function() {
            const targetPage = this.getAttribute('data-page');
            if (!targetPage) return; 

            document.querySelectorAll('.sidebar ul li').forEach(li => li.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.content section').forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active-section');
            });

            const targetSection = document.getElementById(targetPage);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.classList.add('active-section');
            }
        });
    });

    // MISE À JOUR DU PROFIL ET DE LA FILIÈRE DE L'ÉLÈVE
    document.getElementById('form-update-profile')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const nom = document.getElementById('settings-nom').value;
        const sexe = document.getElementById('settings-sexe').value;
        const filiereId = document.getElementById('settings-filiere').value;
        const niveau = document.getElementById('settings-niveau').value;

        db.collection('eleves').doc(user.uid).update({
            nom: nom,
            sexe: sexe,
            filiere_id: filiereId,
            niveauEtudes: niveau
        })
        .then(() => {
            alert("✨ Profil et filière mis à jour avec succès !");
            chargerDonneesProfil(user.uid);
        })
        .catch(err => alert("Erreur lors de la mise à jour : " + err.message));
    });

    // COMMUTATION DE VUE (GRILLE / LISTE)
    document.getElementById('btn-view-grid')?.addEventListener('click', () => changeStudentView('grid'));
    document.getElementById('btn-view-list')?.addEventListener('click', () => changeStudentView('list'));

    // FILTRE MANUEL DE COURS PAR FILIÈRE
    document.getElementById('select-filter-filiere')?.addEventListener('change', function() {
        filtrerEtAfficherCours(this.value);
    });

    // ENVOI DE MESSAGE DE CONTACT / SUPPORT VERS FIRESTORE
    document.getElementById('contactFormStudent')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user || !globalEleveData) return;

        const sujet = document.getElementById('msg-sujet').value;
        const message = document.getElementById('msg-contenu').value;

        db.collection("messages_contact").add({
            studentUid: user.uid,
            nom_complet: globalEleveData.nom || "Élève",
            email: user.email,
            sujet: sujet,
            message: message,
            envoye_le: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            alert("✨ Votre message a bien été transmis à l'administration !");
            document.getElementById('contactFormStudent').reset();
        })
        .catch(err => alert("Erreur d'envoi : " + err.message));
    });

    // MODE SOMBRE
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    }
    themeToggle?.addEventListener('change', function() {
        if (this.checked) {
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });

    // DÉCONNEXION
    document.getElementById('btn-logout')?.addEventListener('click', () => {
        if (confirm("Voulez-vous vous déconnecter ?")) {
            auth.signOut().then(() => { window.location.href = "../../index.html"; });
        }
    });
});

// ==========================================
// CHARGEMENT DU PROFIL ET REMPLISSAGE DES FORMULAIRES
// ==========================================
function chargerDonneesProfil(uid) {
    db.collection('eleves').doc(uid).get().then((doc) => {
        if (doc.exists) {
            globalEleveData = doc.data();
            const avatarURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(globalEleveData.nom)}`;

            if (document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = `${globalEleveData.nom} 👋`;
            if (document.getElementById('user-display-avatar')) {
                document.getElementById('user-display-avatar').src = avatarURL;
                document.getElementById('user-display-avatar').style.display = "block";
            }

            if (document.getElementById('dash-filiere')) document.getElementById('dash-filiere').innerText = globalEleveData.filiere_id || globalEleveData.niveauEtudes || "Général";
            if (document.getElementById('profile-card-avatar')) document.getElementById('profile-card-avatar').src = avatarURL;
            if (document.getElementById('profile-card-nom')) document.getElementById('profile-card-nom').innerText = globalEleveData.nom;
            if (document.getElementById('profile-card-email')) document.getElementById('profile-card-email').innerText = globalEleveData.email;
            if (document.getElementById('profile-card-sexe')) document.getElementById('profile-card-sexe').innerText = globalEleveData.sexe || "Non renseigné";
            if (document.getElementById('profile-card-filiere')) document.getElementById('profile-card-filiere').innerText = globalEleveData.filiere_id || "Non définie";
            if (document.getElementById('profile-card-niveau')) document.getElementById('profile-card-niveau').innerText = globalEleveData.niveauEtudes || "Non défini";
            if (document.getElementById('profile-card-date')) document.getElementById('profile-card-date').innerText = globalEleveData.dateInscription || "N/A";

            // Pré-remplir les champs des paramètres
            if (document.getElementById('settings-nom')) document.getElementById('settings-nom').value = globalEleveData.nom || "";
            if (document.getElementById('settings-sexe')) document.getElementById('settings-sexe').value = globalEleveData.sexe || "Homme";
            if (document.getElementById('settings-niveau')) document.getElementById('settings-niveau').value = globalEleveData.niveauEtudes || "";
            if (document.getElementById('settings-filiere') && globalEleveData.filiere_id) {
                document.getElementById('settings-filiere').value = globalEleveData.filiere_id;
            }

            // Mettre à jour l'affichage des cours en fonction de la filière de l'élève connecté
            chargerCatalogueCoursMultiFiliere();
        } else {
            console.error("Profil élève introuvable.");
            auth.signOut().then(() => { window.location.href = "auth.html"; });
        }
    }).catch(err => console.error("Erreur de chargement du profil :", err));
}

// REMPLIR TOUS LES MENUS DÉROULANTS DE FILIÈRES DEPUIS FIRESTORE
function remplirSelectFilieresFirestore() {
    db.collection('filieres').get().then((snapshot) => {
        const selectSettings = document.getElementById('settings-filiere');
        const selectFilter = document.getElementById('select-filter-filiere');

        if (selectSettings) selectSettings.innerHTML = `<option value="">-- Sélectionnez votre filière --</option>`;
        if (selectFilter) selectFilter.innerHTML = `<option value="toutes">Toutes les filières</option>`;

        snapshot.forEach((doc) => {
            const fil = doc.data();
            const filId = doc.id;
            const filNom = fil.nom || filId;

            if (selectSettings) {
                selectSettings.innerHTML += `<option value="${filId}">${filNom}</option>`;
            }
            if (selectFilter) {
                selectFilter.innerHTML += `<option value="${filId}">${filNom}</option>`;
            }
        });

        if (globalEleveData && globalEleveData.filiere_id && selectSettings) {
            selectSettings.value = globalEleveData.filiere_id;
        }
    });
}

// CHARGER LES COURS DEPUIS FIRESTORE
function chargerCatalogueCoursMultiFiliere() {
    db.collection('cours').onSnapshot((snapshot) => {
        allCourses = [];
        snapshot.forEach((doc) => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });

        if (document.getElementById('dash-cours')) document.getElementById('dash-cours').innerText = allCourses.length;
        
        // Par défaut, on filtre selon la filière propre de l'élève connecté, ou 'toutes' s'il n'en a pas encore
        const filiereEleve = (globalEleveData && globalEleveData.filiere_id) ? globalEleveData.filiere_id : 'toutes';
        
        // Sélectionne automatiquement la valeur dans le filtre s'il existe
        const selectFilter = document.getElementById('select-filter-filiere');
        if (selectFilter && globalEleveData && globalEleveData.filiere_id) {
            selectFilter.value = globalEleveData.filiere_id;
        }

        filtrerEtAfficherCours(filiereEleve);
    });
}

// LOGIQUE DE FILTRAGE MULTI-FILIÈRES (FILIÈRE UNIQUE OU TABLEAU `filieres_ids`)
function filtrerEtAfficherCours(filiereId) {
    const container = document.getElementById('student-courses-grid');
    if (!container) return;

    let coursFiltres = allCourses;
    if (filiereId !== 'toutes') {
        coursFiltres = allCourses.filter(c => {
            // Vérifie si le cours contient la filière dans un tableau `filieres_ids` OU correspond à `filiere_id` / `category`
            if (Array.isArray(c.filieres_ids) && c.filieres_ids.includes(filiereId)) {
                return true;
            }
            if (c.filiere_id === filiereId || c.category === filiereId) {
                return true;
            }
            return false;
        });
    }

    if (coursFiltres.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">Aucun cours disponible pour cette sélection.</p>`;
        return;
    }

    container.innerHTML = coursFiltres.map(c => `
        <div class="card" style="padding:15px; border-radius:10px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
                <span style="font-size:0.75rem; color:#3b82f6; font-weight:bold; text-transform:uppercase;">${c.filiere_id || c.category || 'Commun'}</span>
                <h3 style="font-size:1.1rem; margin:5px 0; color:var(--text-main);">${c.titre || c.title}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${c.description || c.short || ''}</p>
            </div>
            <a href="${c.media_url || c.pdf || c.videoUrl || '#'}" target="_blank" style="display:inline-block; padding:8px 12px; background:var(--primary); color:white; border-radius:6px; font-size:0.85rem; text-decoration:none; font-weight:bold; text-align:center;">
                Consulter le cours
            </a>
        </div>
    `).join('');
}

function changeStudentView(mode) {
    studentViewMode = mode;
    const grid = document.getElementById('student-courses-grid');
    if (!grid) return;
    grid.className = mode === 'grid' ? 'cards grid-mode' : 'cards list-mode';
}