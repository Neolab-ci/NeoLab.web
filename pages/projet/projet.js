// ==========================================
// CONFIGURATION FIREBASE & INITIALISATION
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

let localProjectsArray = [];
let activeCategoryFilter = "all";
let currentSelectedProject = null;
let currentUserUid = null;
let currentUserName = "Étudiant NeoLab";

document.addEventListener("DOMContentLoaded", function () {
    lucide.createIcons();



    // Gestion du Thème Clair / Sombre
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('theme') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) { themeIcon.className = "fa-solid fa-moon"; }
    }
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            themeIcon.className = isDark ? "fa-solid fa-moon" : "fa-solid fa-sun";
        });
    }
// Récupération automatique d'un paramètre de recherche dans l'URL (ex: ?search=Arduino)
const urlParams = new URLSearchParams(window.location.search);
const searchQueryParam = urlParams.get('search');
if (searchQueryParam && document.getElementById("searchInput")) {
    document.getElementById("searchInput").value = searchQueryParam;
}
    // Gestion session utilisateur en temps réel
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserUid = user.uid;
            db.collection("eleves").doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().nom) {
                    currentUserName = doc.data().nom;
                }
            }).catch(() => {
                currentUserName = user.email ? user.email.split('@')[0] : "Étudiant NeoLab";
            });
        } else {
            currentUserUid = null;
        }
    });

    recupererProjetsDepuisFirestore();

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", executerFiltrageGlobal);
    }
});

// ==========================================
// RÉCUPÉRATION DEPUIS FIRESTORE
// ==========================================
function recupererProjetsDepuisFirestore() {
    db.collection("projets").onSnapshot((snapshot) => {
        localProjectsArray = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            localProjectsArray.push({
                id: doc.id,
                titre: data.titre || data.title || "Projet sans nom",
                description: data.descriptions || data.description || data.short || "",
                explications: data.details || data.explications || "Aucune explication détaillée fournie.",
                categorie: (data.categorie || data.category || "arduino").toLowerCase().trim(),
                niveau: (data.niveau || data.level || "debutant").toLowerCase().trim(),
                filiere_id: (data.filiere_id || "informatique").toLowerCase().trim(),
                auteurNom: data.auteur_nom || data.auteurNom || "NeoLab-CI",
                auteurId: data.auteur_id || data.auteurId || "",
                imageProjet: data.img || data.imageProjet || "",
                imageCablage: data.schemat || data.schema || data.imageCablage || "",
                pdf: data.pdf || "",
                videoUrl: data.videoUrl || "",
                utilisateursIds: data.utilisateurs_ids || data.utilisateursIds || []
            });
        });
        executerFiltrageGlobal();
    }, (error) => {
        console.error("Erreur de récupération Firestore : ", error);
    });
}

// ==========================================
// FILTRES & AFFICHAGE DE LA GRILLE
// ==========================================
function selectCategory(categoryName, elem) {
    activeCategoryFilter = categoryName;

    document.querySelectorAll(".cat-btn").forEach((btn) => {
        btn.classList.remove("bg-blue-600/20", "border-blue-500/30", "text-blue-400");
        btn.classList.add("bg-[#0B1120]", "text-gray-400");
    });

    if (elem) {
        elem.classList.remove("bg-[#0B1120]", "text-gray-400");
        elem.classList.add("bg-blue-600/20", "border-blue-500/30", "text-blue-400");
    }

    executerFiltrageGlobal();
}

function executerFiltrageGlobal() {
    const searchString = document.getElementById("searchInput") ? document.getElementById("searchInput").value.toLowerCase().trim() : "";
    const grid = document.getElementById("projectsGrid");
    if (!grid) return;

    grid.innerHTML = "";
    let visibleCount = 0;

    localProjectsArray.forEach((proj) => {
        const matchCat = (activeCategoryFilter === "all" || proj.categorie === activeCategoryFilter);
        const matchSearch = proj.titre.toLowerCase().includes(searchString) || 
                            proj.description.toLowerCase().includes(searchString) ||
                            proj.auteurNom.toLowerCase().includes(searchString);

        if (matchCat && matchSearch) {
            visibleCount++;
            const nbUtilisateurs = proj.utilisateursIds.length;
            const isUtilise = currentUserUid && proj.utilisateursIds.includes(currentUserUid);

            grid.innerHTML += `
                <div class="project-card bg-[#0B1120] border border-blue-500/15 p-5 rounded-2xl cursor-pointer transition-all hover:-translate-y-1 hover:border-blue-500/40 flex flex-col justify-between" onclick="ouvrirProjet('${proj.id}')">
                    <div>
                        <div class="flex items-center justify-between mb-3">
                            <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">${proj.categorie}</span>
                            <span class="text-[10px] text-gray-400 italic">Par ${proj.auteurNom}</span>
                        </div>
                        <h3 class="text-lg font-bold text-white mb-2">${proj.titre}</h3>
                        <p class="text-gray-400 text-xs line-clamp-2">${proj.description}</p>
                    </div>
                    <div class="mt-5 pt-3 border-t border-blue-500/5 flex items-center justify-between text-xs text-gray-400">
                        <span>👥 ${nbUtilisateurs} réalisation${nbUtilisateurs > 1 ? 's' : ''}</span>
                        ${isUtilise ? '<span class="text-emerald-400 font-bold text-[10px]">✅ Réalisé</span>' : ''}
                    </div>
                </div>
            `;
        }
    });

    const alertNoResult = document.getElementById("noResult");
    if (alertNoResult) {
        if (visibleCount === 0) alertNoResult.classList.remove("hidden");
        else alertNoResult.classList.add("hidden");
    }

    lucide.createIcons();
}

// ==========================================
// OUVERTURE DE LA MODALE & GESTION DES MÉDIAS
// ==========================================
function ouvrirProjet(projectId) {
    const proj = localProjectsArray.find(p => p.id === projectId);
    if (!proj) return;
    currentSelectedProject = proj;

    document.getElementById("modalCategory").innerText = proj.categorie;
    document.getElementById("modalAuthor").innerText = `Proposé par ${proj.auteurNom}`;
    document.getElementById("title").innerText = proj.titre;
    document.getElementById("desc").innerText = proj.description;
    document.getElementById("modalExplications").innerText = proj.explications;
    document.getElementById("usageCount").innerText = proj.utilisateursIds.length;

    const defaultImg = "https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop";
    document.getElementById("img-projet-fini").src = proj.imageProjet || defaultImg;
    document.getElementById("img-cablage").src = proj.imageCablage || defaultImg;

    // Gestion dynamique des liens additionnels (PDF / Vidéo) + Bouton Télécharger la fiche
    let mediaExtraContainer = document.getElementById("modalExtraMedia");
    if (!mediaExtraContainer) {
        const explicationsBlock = document.getElementById("modalExplications").closest('.bg-\\[\\#050816\\]');
        if (explicationsBlock) {
            mediaExtraContainer = document.createElement("div");
            mediaExtraContainer.id = "modalExtraMedia";
            mediaExtraContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-3 mb-6";
            explicationsBlock.after(mediaExtraContainer);
        }
    }

    if (mediaExtraContainer) {
        let extraHTML = "";
        if (proj.pdf && proj.pdf.trim() !== "") {
            extraHTML += `<a href="${proj.pdf}" target="_blank" class="bg-[#050816] hover:bg-blue-950/40 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3 transition-all text-blue-400 text-xs font-semibold"><i data-lucide="file-text" class="w-5 h-5 text-red-400"></i><span>Télécharger le PDF</span></a>`;
        }
        if (proj.videoUrl && proj.videoUrl.trim() !== "") {
            extraHTML += `<a href="${proj.videoUrl}" target="_blank" class="bg-[#050816] hover:bg-blue-950/40 border border-blue-500/20 p-3 rounded-xl flex items-center gap-3 transition-all text-blue-400 text-xs font-semibold"><i data-lucide="video" class="w-5 h-5 text-emerald-400"></i><span>Voir la vidéo</span></a>`;
        }
        
        // Bouton pour télécharger la fiche technique
        extraHTML += `
            <button onclick="telechargerFicheProjet()" class="col-span-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 p-3 rounded-xl flex items-center justify-center gap-2 transition-all text-blue-300 text-xs font-bold cursor-pointer">
                <i data-lucide="download" class="w-4 h-4"></i> Télécharger la fiche technique (.txt)
            </button>
        `;

        mediaExtraContainer.innerHTML = extraHTML;
    }

    gererBoutonUtilisation(proj);
    
    // Affichage de la modale
    document.getElementById("modal").classList.remove("hidden");
    lucide.createIcons();
}

// Fermeture de la modale en cliquant en dehors de la boîte
window.addEventListener('click', function(event) {
    const modal = document.getElementById('modal');
    if (event.target === modal) {
        closeModal();
    }
});

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}

// ==========================================
// TÉLÉCHARGEMENT DE LA FICHE PROJET (.TXT)
// ==========================================
function telechargerFicheProjet() {
    if (!currentSelectedProject) return;
    const p = currentSelectedProject;

    const contenuFiche = `
==================================================
NEOLAB-CI - FICHE TECHNIQUE DE PROJET
==================================================
Titre : ${p.titre}
Catégorie : ${p.categorie.toUpperCase()}
Niveau : ${p.niveau.toUpperCase()}
Auteur : ${p.auteurNom}

--------------------------------------------------
1. DESCRIPTION COURTE
--------------------------------------------------
${p.description}

--------------------------------------------------
2. EXPLICATIONS ET DÉTAILS DE RÉALISATION
--------------------------------------------------
${p.explications}

--------------------------------------------------
3. LIENS DES MÉDIAS & SCHÉMAS
--------------------------------------------------
- Image du projet fini : ${p.imageProjet || 'Non renseigné'}
- Schéma de câblage : ${p.imageCablage || 'Non renseigné'}
- Fichier PDF : ${p.pdf || 'Aucun'}
- Vidéo de démonstration : ${p.videoUrl || 'Aucune'}

==================================================
Généré par la plateforme NeoLab-CI (2026)
==================================================
    `.trim();

    const blob = new Blob([contenuFiche], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.titre.toLowerCase().replace(/[^a-z0-9]/g, '_')}_neolab.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================
// GESTION DU BOUTON DE RÉALISATION DU PROJET
// ==========================================
function gererBoutonUtilisation(proj) {
    const actionZone = document.getElementById("project-action-zone");
    if (!currentUserUid) {
        actionZone.innerHTML = `<p class="text-center text-xs text-gray-500 mt-4">Connectez-vous pour marquer ce projet comme réalisé.</p>`;
        return;
    }

    const dejaUtilise = proj.utilisateursIds.includes(currentUserUid);

    if (!dejaUtilise) {
        actionZone.innerHTML = `
            <button onclick="marquerProjetUtilise('${proj.id}', true)" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-4">
                <i data-lucide="check" class="w-4 h-4"></i> J'ai utilisé / réalisé ce projet
            </button>
        `;
    } else {
        actionZone.innerHTML = `
            <button onclick="marquerProjetUtilise('${proj.id}', false)" class="w-full bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-4">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Projet validé par vous (Annuler ?)
            </button>
        `;
    }
}

function marquerProjetUtilise(projectId, ajouter) {
    if (!currentUserUid) return;
    const projRef = db.collection("projets").doc(projectId);

    db.runTransaction((transaction) => {
        return transaction.get(projRef).then((doc) => {
            if (!doc.exists) throw "Projet introuvable !";
            let ids = doc.data().utilisateurs_ids || doc.data().utilisateursIds || [];

            if (ajouter && !ids.includes(currentUserUid)) {
                ids.push(currentUserUid);
            } else if (!ajouter) {
                ids = ids.filter(id => id !== currentUserUid);
            }

            transaction.update(projRef, { utilisateurs_ids: ids });
        });
    }).then(() => {
        const p = localProjectsArray.find(item => item.id === projectId);
        if (p) {
            if (ajouter && !p.utilisateursIds.includes(currentUserUid)) p.utilisateursIds.push(currentUserUid);
            else if (!ajouter) p.utilisateursIds = p.utilisateursIds.filter(id => id !== currentUserUid);
            ouvrirProjet(projectId);
        }
        executerFiltrageGlobal();
    }).catch(err => alert("Erreur de mise à jour : " + err));
}

// ==========================================
// PUBLICATION DE PROJET
// ==========================================
function openAddProjectModal() {
    if (!currentUserUid) {
        alert("Veuillez vous connecter pour partager un projet.");
        window.location.href = "../../assets/login/auth.html";
        return;
    }
    document.getElementById("addProjectModal").classList.remove("hidden");
}

function closeAddProjectModal() {
    document.getElementById("addProjectModal").classList.add("hidden");
}

function publierNouveauProjet(e) {
    e.preventDefault();
    if (!currentUserUid) {
        alert("Session expirée, veuillez vous reconnecter.");
        return;
    }

    const titre = document.getElementById("newTitle").value.trim();
    const categorie = document.getElementById("newCategory").value;
    const niveau = document.getElementById("newLevel").value;
    const descriptions = document.getElementById("newDesc").value.trim();
    const details = document.getElementById("newExpl").value.trim();
    const img = document.getElementById("newImg").value.trim();
    const schemat = document.getElementById("newSchema").value.trim();
    const pdf = document.getElementById("newPdf") ? document.getElementById("newPdf").value.trim() : "";
    const videoUrl = document.getElementById("newVideo") ? document.getElementById("newVideo").value.trim() : "";

    const nouveauProjetData = {
        titre: titre,
        descriptions: descriptions,
        details: details,
        categorie: categorie,
        niveau: niveau,
        filiere_id: "informatique",
        auteur_id: currentUserUid,
        auteur_nom: currentUserName,
        img: img || "https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop",
        schemat: schemat || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=500&auto=format&fit=crop",
        pdf: pdf,
        videoUrl: videoUrl,
        utilisateurs_ids: [currentUserUid]
    };

    db.collection("projets").add(nouveauProjetData)
    .then(() => {
        alert("🎉 Votre projet a été partagé avec succès !");
        document.getElementById("addProjectForm").reset();
        closeAddProjectModal();
    })
    .catch((err) => {
        console.error("Erreur d'écriture Firestore :", err);
        alert("Erreur lors de la publication : " + err.message);
    });
}