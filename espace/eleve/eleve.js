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

    // VÉRIFICATION DE LA SESSION ÉLÈVE
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Élève connecté :", user.email);
            chargerDonneesProfil(user.uid);
            chargerFiliereSelector();
            chargerCatalogueCours();
        } else {
            window.location.href = "../../assets/login/auth.html";
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

    // COMMUTATION DE VUE (GRILLE / LISTE)
    document.getElementById('btn-view-grid')?.addEventListener('click', () => changeStudentView('grid'));
    document.getElementById('btn-view-list')?.addEventListener('click', () => changeStudentView('list'));

    // FILTRE DE COURS PAR FILIÈRE
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
            alert("✨ Votre message a bien été transmis à l'équipe NeoLab-CI !");
            document.getElementById('contactFormStudent').reset();
        })
        .catch(err => alert("Erreur d'envoi du message : " + err.message));
    });

    // GESTION DU MODE SOMBRE
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

// CHARGER LE PROFIL DE L'ÉLÈVE
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

            if (document.getElementById('dash-filiere')) document.getElementById('dash-filiere').innerText = globalEleveData.niveauEtudes || "Général";
            if (document.getElementById('profile-card-avatar')) document.getElementById('profile-card-avatar').src = avatarURL;
            if (document.getElementById('profile-card-nom')) document.getElementById('profile-card-nom').innerText = globalEleveData.nom;
            if (document.getElementById('profile-card-email')) document.getElementById('profile-card-email').innerText = globalEleveData.email;
            if (document.getElementById('profile-card-sexe')) document.getElementById('profile-card-sexe').innerText = globalEleveData.sexe || "Non renseigné";
            if (document.getElementById('profile-card-niveau')) document.getElementById('profile-card-niveau').innerText = globalEleveData.niveauEtudes || "Non renseigné";
            if (document.getElementById('profile-card-date')) document.getElementById('profile-card-date').innerText = globalEleveData.dateInscription || "N/A";
        }
    });
}

// CHARGER LES FILIÈRES DISPONIBLES EN BASE POUR LE FILTRE
function chargerFiliereSelector() {
    db.collection('filieres').get().then((snapshot) => {
        const select = document.getElementById('select-filter-filiere');
        if (!select) return;

        snapshot.forEach((doc) => {
            const fil = doc.data();
            select.innerHTML += `<option value="${doc.id}">${fil.nom || doc.id}</option>`;
        });
    });
}

// CHARGER LES COURS FIRESTORE
function chargerCatalogueCours() {
    db.collection('cours').onSnapshot((snapshot) => {
        allCourses = [];
        snapshot.forEach((doc) => {
            allCourses.push({ id: doc.id, ...doc.data() });
        });

        if (document.getElementById('dash-cours')) document.getElementById('dash-cours').innerText = allCourses.length;
        filtrerEtAfficherCours('toutes');
    });
}

// FILTRER ET AFFICHER LES COURS DANS L'ESPACE ÉLÈVE
function filtrerEtAfficherCours(filiereId) {
    const container = document.getElementById('student-courses-grid');
    if (!container) return;

    let coursFiltres = allCourses;
    if (filiereId !== 'toutes') {
        coursFiltres = allCourses.filter(c => (c.filiere_id === filiereId || c.category === filiereId));
    }

    if (coursFiltres.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);">Aucun cours disponible pour cette filière.</p>`;
        return;
    }

    container.innerHTML = coursFiltres.map(c => `
        <div class="card" style="padding:15px; border-radius:10px;">
            <span style="font-size:0.75rem; color:#3b82f6; font-weight:bold; text-transform:uppercase;">${c.filiere_id || c.category || 'Général'}</span>
            <h3 style="font-size:1.1rem; margin:5px 0;">${c.titre || c.title}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">${c.description || c.short || ''}</p>
            <a href="${c.media_url || c.pdf || '#'}" target="_blank" style="display:inline-block; padding:8px 12px; background:var(--primary); color:white; border-radius:6px; font-size:0.85rem; text-decoration:none; font-weight:bold;">
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