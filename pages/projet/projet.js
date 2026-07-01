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

// ==========================================
// 1. INITIALISATION DE FIREBASE & CONFIGURATION
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

// Variables globales pour l'application
let localProjectsArray = [];
let activeCategoryFilter = "all";
let currentSelectedProject = null;

// CORRECTION PERSISTANCE : Écouteur global de session au chargement de la page
document.addEventListener("DOMContentLoaded", function () {
    // Initialisation des icônes Lucide
    lucide.createIcons();

    // Vérification active et en direct de la session de l'élève
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Élève connecté avec succès (Session active) :", user.uid);
        } else {
            console.log("Visiteur anonyme ou déconnecté.");
        }
        // On rafraîchit les cartes et la modal pour adapter les boutons à l'état de connexion
        executerFiltrageGlobal();
    });

    // Écoute en temps réel de la collection Firestore 'projets'
    recupererProjetsDepuisFirestore();

    // Écouteur sur la barre de recherche textuelle
    const inputSearch = document.getElementById("searchInput");
    if (inputSearch) {
        inputSearch.addEventListener("input", executerFiltrageGlobal);
    }
});

// ==========================================
// 2. RÉCUPÉRATION DU FLUX FIRESTORE
// ==========================================
function recupererProjetsDepuisFirestore() {
    db.collection("projets").onSnapshot((snapshot) => {
        localProjectsArray = [];
        
        snapshot.forEach((doc) => {
            const data = doc.data();
            localProjectsArray.push({
                id: doc.id,
                titre: data.titre || "Projet sans nom",
                description: data.description || "",
                categorie: data.categorie || "all",
                niveau: data.niveau || "debutant",
                duree: data.duree || "N/A",
                composants: data.composants || "",
                imageProjet: data.imageProjet || "",
                imageCablage: data.imageCablage || "",
                etape1: data.etape1 || "",
                etape2: data.etape2 || "",
                etape3: data.etape3 || ""
            });
        });

        executerFiltrageGlobal();
    }, (error) => {
        console.error("Erreur d'accès à la collection projets : ", error);
    });
}

// ==========================================
// 3. AFFICHAGE, RECHERCHE ET FILTRES (PAR ID SÉCURISÉ)
// ==========================================
function toggleTechList() {
    const container = document.getElementById("techListContainer");
    const arrow = document.getElementById("arrowIcon");
    if (container) {
        container.classList.toggle("hidden");
        arrow.classList.toggle("rotate-180");
    }
}

function selectCategory(categoryName) {
    activeCategoryFilter = categoryName;

    document.querySelectorAll(".cat-btn").forEach((btn) => {
        btn.classList.remove("bg-blue-600/20", "border-blue-500/30", "text-blue-400");
        btn.classList.add("text-gray-400", "hover:bg-[#131b2e]");
    });

    const eventTarget = event.currentTarget;
    eventTarget.classList.remove("text-gray-400", "hover:bg-[#131b2e]");
    eventTarget.classList.add("bg-blue-600/20", "border-blue-500/30", "text-blue-400");

    toggleTechList();
    document.getElementById("mainTechBtnText").innerText = eventTarget.innerText;

    executerFiltrageGlobal();
}

function executerFiltrageGlobal() {
    const searchString = document.getElementById("searchInput").value.toLowerCase().trim();
    
    const gridDeb = document.getElementById("grid-debutant");
    const gridInt = document.getElementById("grid-intermediaire");
    const gridAva = document.getElementById("grid-avance");
    
    if(!gridDeb || !gridInt || !gridAva) return;

    gridDeb.innerHTML = "";
    gridInt.innerHTML = "";
    gridAva.innerHTML = "";

    let totalProjetsVisibles = 0;

    localProjectsArray.forEach((proj) => {
        const validationCategorie = (activeCategoryFilter === "all" || proj.categorie === activeCategoryFilter);
        const validationTexte = proj.titre.toLowerCase().includes(searchString) || 
                               proj.composants.toLowerCase().includes(searchString) ||
                               proj.description.toLowerCase().includes(searchString);

        if (validationCategorie && validationTexte) {
            totalProjetsVisibles++;
            
            const carteHTML = `
                <div class="project-card p-6 rounded-2xl cursor-pointer smooth-transition flex flex-col justify-between" onclick="ouvrirProjetParId('${proj.id}')">
                    <div>
                        <span class="text-xs font-semibold px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-md uppercase tracking-wider">${proj.categorie}</span>
                        <h3 class="text-xl font-bold mt-3 text-white tracking-tight">${proj.titre}</h3>
                        <p class="text-gray-400 text-sm mt-2 line-clamp-3">${proj.description}</p>
                    </div>
                    <div class="mt-6 pt-4 border-t border-blue-500/5 flex items-center justify-between text-xs text-gray-500">
                        <span class="flex items-center gap-1"><i data-lucide="clock" class="w-3.5 h-3.5 text-emerald-400"></i> ${proj.duree}</span>
                        <span class="truncate max-w-[150px]"><i data-lucide="cpu" class="w-3.5 h-3.5 inline text-blue-400"></i> ${proj.composants}</span>
                    </div>
                </div>
            `;

            if (proj.niveau === "debutant") gridDeb.innerHTML += carteHTML;
            else if (proj.niveau === "intermediaire") gridInt.innerHTML += carteHTML;
            else if (proj.niveau === "avance") gridAva.innerHTML += carteHTML;
        }
    });

    toggleSectionVisibility("section-debutant", gridDeb.innerHTML !== "");
    toggleSectionVisibility("section-intermediaire", gridInt.innerHTML !== "");
    toggleSectionVisibility("section-avance", gridAva.innerHTML !== "");

    const alertNoResult = document.getElementById("noResult");
    if (alertNoResult) {
        if (totalProjetsVisibles === 0) alertNoResult.classList.remove("hidden");
        else alertNoResult.classList.add("hidden");
    }

    lucide.createIcons();
}

function toggleSectionVisibility(sectionId, conditionVisible) {
    const element = document.getElementById(sectionId);
    if (!element) return;
    if (conditionVisible) element.classList.remove("hidden");
    else element.classList.add("hidden");
}

// ==========================================
// 4. INTERCEPTION DU CLIC ET AFFICHAGE MODAL
// ==========================================
function ouvrirProjetParId(projectId) {
    const projetTrouve = localProjectsArray.find(p => p.id === projectId);
    if (projetTrouve) {
        openModal(projetTrouve);
    } else {
        console.error("Projet introuvable pour l'ID :", projectId);
    }
}

function openModal(projectObj) {
    currentSelectedProject = projectObj;

    document.getElementById("modalCategory").innerText = projectObj.categorie;
    document.getElementById("title").innerText = projectObj.titre;
    document.getElementById("desc").innerText = projectObj.description;
    document.getElementById("duration").innerText = projectObj.duree;
    document.getElementById("components").innerText = projectObj.composants || "Aucun matériel requis";

    const defaultImg = "https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop";
    document.getElementById("img-projet-fini").src = projectObj.imageProjet || defaultImg;
    document.getElementById("img-cablage").src = projectObj.imageCablage || defaultImg;

    const stepsList = document.getElementById("steps-list");
    stepsList.innerHTML = `
        <li class="flex gap-2"><b class="text-amber-400">1. Câblage :</b> ${projectObj.etape1 || "Installer et connecter les composants selon le schéma."}</li>
        <li class="flex gap-2"><b class="text-amber-400">2. Code :</b> ${projectObj.etape2 || "Développer le script requis et configurer l'environnement."}</li>
        <li class="flex gap-2"><b class="text-amber-400">3. Test :</b> ${projectObj.etape3 || "Téléverser le programme et valider le comportement attendu."}</li>
    `;

    gererZoneActionProjet(projectObj.id);

    document.getElementById("modal").classList.remove("hidden");
    lucide.createIcons();
}

// ==========================================
// 5. INTERACTIVITÉ & FORMULAIRE DE RENDU
// ==========================================
function gererZoneActionProjet(projectId) {
    const actionZone = document.getElementById("project-action-zone");
    const user = auth.currentUser;

    if (!user) {
        actionZone.innerHTML = `
            <p class="text-center text-xs text-gray-500">Connectez-vous avec votre compte élève NeoLab-CI pour enregistrer votre progression sur ce projet.</p>
        `;
        return;
    }

    db.collection("projets_eleves")
      .where("studentUid", "==", user.uid)
      .where("projectId", "==", projectId)
      .get()
      .then((snapshot) => {
          if (snapshot.empty) {
              actionZone.innerHTML = `
                  <button onclick="demarrerProjet('${projectId}')" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
                      <i data-lucide="play" class="w-4 h-4"></i> Commencer la réalisation de ce projet
                  </button>
              `;
          } else {
              const suiviData = snapshot.docs[0].data();
              const suiviId = snapshot.docs[0].id;

              if (suiviData.statut === "en_cours") {
                  actionZone.innerHTML = `
                      <form onsubmit="soumettreRenduProjet(event, '${suiviId}')" class="bg-[#050816] p-4 rounded-xl border border-blue-500/10 space-y-3">
                          <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-2"><i data-lucide="send"></i> Formulaire de Rendu Technique</h4>
                          <div>
                              <label class="block text-[11px] text-gray-500 uppercase font-bold mb-1">Lien du Code (Simulation Wokwi, Tinkercad ou GitHub)</label>
                              <input type="url" id="rendu-code" required placeholder="https://wokwi.com/projects/..." class="w-full bg-[#0B1120] border border-blue-500/20 rounded-lg p-2 text-xs outline-none focus:border-blue-500 text-white">
                          </div>
                          <div>
                              <label class="block text-[11px] text-gray-500 uppercase font-bold mb-1">Lien vidéo de démonstration (Drive, YouTube... Optionnel)</label>
                              <input type="url" id="rendu-video" placeholder="https://drive.google.com/..." class="w-full bg-[#0B1120] border border-blue-500/20 rounded-lg p-2 text-xs outline-none focus:border-blue-500 text-white">
                          </div>
                          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs transition-all">
                              Soumettre mon travail pour correction
                          </button>
                      </form>
                  `;
              } else if (suiviData.statut === "rendu") {
                  actionZone.innerHTML = `
                      <div class="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2">
                          <i data-lucide="clock" class="w-4 h-4"></i> Code soumis ! En attente de validation par votre enseignant.
                      </div>
                  `;
              } else if (suiviData.statut === "valide") {
                  actionZone.innerHTML = `
                      <div class="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10">
                          <i data-lucide="check-circle" class="w-5 h-5"></i> Projet validé ! Les points ont été attribués à votre profil. 🏆
                      </div>
                  `;
              }
          }
          lucide.createIcons();
      }).catch(err => console.error("Erreur d'analyse de progression :", err));
}

function demarrerProjet(projectId) {
    const user = auth.currentUser;
    if (!user) return;

    db.collection("projets_eleves").add({
        studentUid: user.uid,
        projectId: projectId,
        titreProjet: currentSelectedProject.titre,
        statut: "en_cours",
        dateDemarrage: new Date().toLocaleDateString('fr-FR'),
        lienCode: "",
        lienVideo: ""
    })
    .then(() => {
        alert("🚀 Projet activé ! Suivez pas à pas le guide de TP pour réaliser le montage.");
        gererZoneActionProjet(projectId);
    }).catch(err => alert("Erreur d'initialisation : " + err.message));
}

function soumettreRenduProjet(e, suiviId) {
    e.preventDefault();

    const urlCode = document.getElementById("rendu-code").value;
    const urlVideo = document.getElementById("rendu-video").value;

    db.collection("projets_eleves").doc(suiviId).update({
        statut: "rendu",
        lienCode: urlCode,
        lienVideo: urlVideo,
        dateRendu: new Date().toLocaleDateString('fr-FR')
    })
    .then(() => {
        alert("✉️ Travail envoyé avec succès ! Votre enseignant va l'examiner.");
        if (currentSelectedProject) gererZoneActionProjet(currentSelectedProject.id);
    }).catch(err => alert("Erreur d'envoi : " + err.message));
}

function closeModal() {
    document.getElementById("modal").classList.add("hidden");
}