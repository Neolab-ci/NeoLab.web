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
    
    // ==========================================
    // 1. GESTION DU THÈME (BLANC PAR DÉFAUT)
    // ==========================================
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('theme') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            
            if (isDark) {
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            } else {
                localStorage.setItem('theme', 'light');
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        });
    }

    // ==========================================
    // 2. GESTION DE LA SESSION ET PERSONNALISATION
    // ==========================================
    auth.onAuthStateChanged((user) => {
        const authActionContainer = document.getElementById('dynamic-auth-action');
        const heroMainBtn = document.getElementById('hero-main-btn');
        const heroSubtitle = document.getElementById('hero-subtitle-text');
        const heroDesc = document.getElementById('hero-desc-text');
        const studentSection = document.getElementById('personalized-student-section');
        
        const linkCours = document.getElementById('link-cours');
        const linkProjets = document.getElementById('link-projets');
        const linkComposants = document.getElementById('link-composants');

        if (user) {
            console.log("Utilisateur connecté :", user.email);

            // Bouton de navigation
            if (authActionContainer) {
                authActionContainer.innerHTML = `<a href="espace/eleve/eleve.html" class="btn-connect" style="background: var(--primary); color: white;">Mon Espace Élève</a>`;
            }

            // Bouton principal du Hero
            if (heroMainBtn) {
                heroMainBtn.href = "espace/eleve/eleve.html";
                heroMainBtn.innerHTML = `Accéder à mon Espace <i class="fa-solid fa-arrow-right"></i>`;
            }

            // Déverrouiller les liens protégés vers les pages principales
            [linkCours, linkProjets, linkComposants].forEach(link => {
                if (link) link.replaceWith(link.cloneNode(true));
            });
            document.getElementById('link-cours').href = "pages/cours/cours.html";
            document.getElementById('link-projets').href = "pages/projet/projet.html";
            document.getElementById('link-composants').href = "pages/composant/composants.html";

            // Charger les infos de l'élève pour adapter l'accueil à sa filière
            db.collection('eleves').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    const filiereId = data.filiere_id || "général";

                    if (heroSubtitle) {
                        heroSubtitle.innerText = `Bon retour, ${data.nom} ! Votre espace en filière ${filiereId.toUpperCase()} est actif.`;
                    }
                    if (heroDesc) {
                        heroDesc.innerText = "Retrouvez ci-dessous un aperçu rapide de vos cours recommandés.";
                    }

                    chargerApercuCoursEleve(filiereId);
                }
            });

        } else {
            console.log("Visiteur non connecté (Déconnexion / Mode visiteur).");

            if (authActionContainer) {
                authActionContainer.innerHTML = `<a href="assets/login/auth.html" class="btn-connect">INSCRIPTION</a>`;
            }

            if (heroMainBtn) {
                heroMainBtn.href = "assets/login/auth.html";
                heroMainBtn.innerHTML = `Se connecter <i class="fa-solid fa-bolt"></i>`;
            }

            if (heroSubtitle) {
                heroSubtitle.innerText = "La référence pour toutes vos filières d'études : Informatique, Électronique, Sciences Éco, Gestion et bien plus.";
            }
            if (heroDesc) {
                heroDesc.innerText = "Accédez à des cours structurés, des cahiers de notes interactifs, des TP corrigés et des espaces de travail adaptés à chaque cursus académique.";
            }

            if (studentSection) {
                studentSection.style.display = "none";
            }

            // Protéger l'accès aux pages pour les visiteurs
            ['link-cours', 'link-projets', 'link-composants'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.addEventListener('click', function(e) {
                        e.preventDefault();
                        afficherModaleConnexionRequise();
                    });
                }
            });
        }
    });

    // ==========================================
    // 3. MENU MOBILE & SCROLL TO TOP
    // ==========================================
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });
    }

    const scrollTopBtn = document.getElementById('scrollTopBtn');
    if (scrollTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                scrollTopBtn.style.opacity = '1';
                scrollTopBtn.style.pointerEvents = 'auto';
            } else {
                scrollTopBtn.style.opacity = '0';
                scrollTopBtn.style.pointerEvents = 'none';
            }
        });
        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

// ==========================================
// CHARGER L'APERÇU DES COURS (REDIRIGE VERS LA PAGE COURS)
// ==========================================
function chargerApercuCoursEleve(filiereId) {
    const section = document.getElementById('personalized-student-section');
    const container = document.getElementById('home-student-courses-grid');
    const spanFiliere = document.getElementById('student-filiere-name');

    if (!section || !container) return;
    section.style.display = "block";
    if (spanFiliere) spanFiliere.innerText = filiereId.toUpperCase();

    db.collection('cours').onSnapshot((snapshot) => {
        let coursFiltres = [];
        snapshot.forEach((doc) => {
            const c = doc.data();
            if (
                (Array.isArray(c.filieres_ids) && c.filieres_ids.includes(filiereId)) ||
                c.filiere_id === filiereId ||
                c.category === filiereId
            ) {
                coursFiltres.push(c);
            }
        });

        if (coursFiltres.length === 0) {
            container.innerHTML = `<p style="color: var(--text-muted); grid-column: 1/-1;">Aucun cours spécifique trouvé pour le moment dans votre filière.</p>`;
            return;
        }

        // Redirige vers la page de catalogue des cours (`pages/cours/cours.html`)
        container.innerHTML = coursFiltres.slice(0, 3).map(c => `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); padding: 20px; border-radius: 12px;">
                <span style="font-size: 0.75rem; color: var(--accent); font-weight: bold; text-transform: uppercase;">${c.category || filiereId}</span>
                <h4 style="font-size: 1.05rem; margin: 8px 0; color: var(--text-main);">${c.titre || c.title}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px;">${c.description || c.short || ''}</p>
                <a href="pages/cours/cours.html" style="font-size: 0.85rem; color: var(--primary); font-weight: bold;">Consulter le cours →</a>
            </div>
        `).join('');
    });
}

function afficherModaleConnexionRequise() {
    if (document.getElementById('neolab-auth-modal')) return;
    const modalHTML = `
        <div class="neolab-modal-overlay" id="neolab-auth-modal">
            <div class="neolab-modal-content">
                <h3>🔒 Accès Réservé</h3>
                <p>Vous devez être connecté pour accéder à cet espace pédagogique et consulter les filtres de cours.</p>
                <div class="neolab-modal-actions">
                    <a href="assets/login/auth.html" class="btn-primary" style="padding: 10px 20px; font-size: 0.9rem;">Se connecter</a>
                    <button onclick="fermerModaleConnexion()" class="btn-secondary" style="padding: 10px 20px; font-size: 0.9rem; cursor: pointer;">Fermer</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fermerModaleConnexion() {
    const modal = document.getElementById('neolab-auth-modal');
    if (modal) modal.remove();
}