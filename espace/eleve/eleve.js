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

// Variables globales pour la gestion des cours
let courses = [];
let completedCourses = [];
let studentViewMode = 'grid'; // Mode par défaut pour l'affichage des cours ('grid' ou 'list')

// ==========================================
// CYCLE DE VIE PRINCIPAL DE L'APPLICATION (DOM)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
    // Initialisation des icônes Lucide globales
    if (typeof lucide !== "undefined") {
        lucide.createIcons();
    }

    // VÉRIFICATION STRICTE DE LA SESSION (AUTH)
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("Session valide trouvée pour l'élève :", user.email);
            // On lance la récupération globale des données
            chargerDonneesProfil(user.uid);
            chargerSuiviProjetsEleve(user.uid);
            chargerCoursEtProgressionEleve(user.uid); // Nouvelle synchro temps réel des cours
            if (typeof activerFluxTempsReel === "function") {
                activerFluxTempsReel(user.uid); 
            }
        } else {
            console.warn("Aucune session active. Redirection vers auth.html...");
            window.location.href = "../../assets/login/auth.html";
        }
    });

    // --- GESTION COMMUTATEUR DE VUE (GRILLE / LISTE) ---
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');

    if (btnGrid && btnList) {
        btnGrid.addEventListener('click', function() {
            changeStudentView('grid');
        });

        btnList.addEventListener('click', function() {
            changeStudentView('list');
        });
    }

    // --- GESTION DU MENU BURGER MOBILE ---
    const mobileBurger = document.getElementById('mobile-burger');
    const appSidebar = document.getElementById('app-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileBurger && appSidebar && sidebarOverlay) {
        mobileBurger.addEventListener('click', function() {
            appSidebar.classList.toggle('open');
        });

        sidebarOverlay.addEventListener('click', function() {
            appSidebar.classList.remove('open');
        });
    }

    // LOGIQUE DE NAVIGATION (ONGLETS)
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

            if (appSidebar) {
                appSidebar.classList.remove('open');
            }
        });
    });

    // GESTION DE LA DÉCONNEXION
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

    // INITIALISATION DU THÈME SOMBRE / CLAIR
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeToggle) themeToggle.checked = true;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-theme');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', 'light');
            }
        });
    }

    // MISE À JOUR DU PROFIL (FIRESTORE)
    const formProfile = document.getElementById('form-update-profile');
    if (formProfile) {
        formProfile.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const user = auth.currentUser;
            if (!user) return;

            const nouveauNom = document.getElementById('settings-nom').value;
            const nouveauSexe = document.getElementById('settings-sexe').value;

            db.collection('eleves').doc(user.uid).update({
                nom: nouveauNom,
                sexe: nouveauSexe
            })
            .then(() => {
                alert("✨ Informations mises à jour avec succès !");
                chargerDonneesProfil(user.uid);
            })
            .catch(error => alert("Erreur lors de la mise à jour : " + error.message));
        });
    }

    // CHANGEMENT DE MOT DE PASSE (AUTH + FIRESTORE)
    const formPassword = document.getElementById('form-update-password');
    if (formPassword) {
        formPassword.addEventListener('submit', function(e) {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) return;

            const newPassword = document.getElementById('settings-new-password').value;

            user.updatePassword(newPassword)
            .then(() => {
                return db.collection('eleves').doc(user.uid).update({
                    password_init: newPassword
                });
            })
            .then(() => {
                alert("🔒 Mot de passe modifié avec succès !");
                document.getElementById('settings-new-password').value = "";
            })
            .catch(error => {
                console.error(error);
                alert("Erreur de sécurité : Si cela fait longtemps que vous êtes connecté, veuillez vous déconnecter et vous reconnecter pour effectuer cette action.");
            });
        });
    }
});

// ==========================================
// RÉCUPÉRATION DU PROFIL DEPUIS FIRESTORE
// ==========================================
function chargerDonneesProfil(uid) {
    db.collection('eleves').doc(uid).get()
    .then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const avatarURL = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(data.nom)}`;

            const txtName = document.getElementById('user-display-name');
            const imgAvatar = document.getElementById('user-display-avatar');
            if (txtName) txtName.innerText = `${data.nom} 👋`;
            if (imgAvatar) {
                imgAvatar.src = avatarURL;
                imgAvatar.style.display = "block";
            }

            initialiserChampsParametres(data);

            if(document.getElementById('profile-card-avatar')) document.getElementById('profile-card-avatar').src = avatarURL;
            if(document.getElementById('profile-card-nom')) document.getElementById('profile-card-nom').innerText = data.nom;
            if(document.getElementById('profile-card-email')) document.getElementById('profile-card-email').innerText = data.email;
            if(document.getElementById('profile-card-sexe')) document.getElementById('profile-card-sexe').innerText = data.sexe || "Non défini";
            if(document.getElementById('profile-card-niveau')) document.getElementById('profile-card-niveau').innerText = data.niveauEtudes || "Non défini";
            if(document.getElementById('profile-card-date')) document.getElementById('profile-card-date').innerText = data.dateInscription || "Inconnue";

        } else {
            console.error("Fiche de profil Firestore introuvable pour cet UID.");
            alert("Profil introuvable dans la base de données.");
            auth.signOut().then(() => { window.location.href = "../../assets/login/auth.html"; });
        }
    })
    .catch(error => console.error("Erreur d'accès à Firestore :", error));
}

function initialiserChampsParametres(eleveData) {
    const inputNom = document.getElementById('settings-nom');
    const selectSexe = document.getElementById('settings-sexe');
    
    if (inputNom) inputNom.value = eleveData.nom || "";
    if (selectSexe) selectSexe.value = eleveData.sexe || "M";
}
 
// ==========================================
// SYNC ET TRAITEMENT DES PROJETS (KANBAN HUB)
// ==========================================
function chargerSuiviProjetsEleve(studentUid) {
    db.collection("projets_eleves")
      .where("studentUid", "==", studentUid)
      .onSnapshot((snapshot) => {
          
          const containerEnCours = document.getElementById("liste-encours");
          const containerRendu = document.getElementById("liste-rendu");
          const containerValide = document.getElementById("liste-valide");

          const dashEnCours = document.getElementById("dash-liste-encours");
          const dashRendu = document.getElementById("dash-liste-rendu");
          const dashValide = document.getElementById("dash-liste-valide");

          if (!containerEnCours || !containerRendu || !containerValide) return;

          let cEnCours = 0, cRendu = 0, cValide = 0;

          containerEnCours.innerHTML = ""; containerRendu.innerHTML = ""; containerValide.innerHTML = "";
          if(dashEnCours) { dashEnCours.innerHTML = ""; dashRendu.innerHTML = ""; dashValide.innerHTML = ""; }

          if (snapshot.empty) {
              const emptyHTML = `<p style="color: #6b7280; font-size: 0.75rem; text-align: center; padding: 15px 0; font-style: italic;">Aucun projet</p>`;
              containerEnCours.innerHTML = emptyHTML; containerRendu.innerHTML = emptyHTML; containerValide.innerHTML = emptyHTML;
              if(dashEnCours) { dashEnCours.innerHTML = emptyHTML; dashRendu.innerHTML = emptyHTML; dashValide.innerHTML = emptyHTML; }
              mettreAJourCompteurs(0, 0, 0);
              return;
          }

          snapshot.forEach((doc) => {
              const suivi = doc.data();
              
              const itemHTML = `
                  <div style="background: #050816; border: 1px solid #1f2937; padding: 15px; border-radius: 12px; margin-bottom: 10px; transition: 0.2s;">
                      <div class="cursor-pointer" style="cursor: pointer;" onclick="ouvrirDetailsProjet('${suivi.projectId}')">
                          <h4 style="color: white; font-weight: bold; font-size: 0.85rem; margin: 0;">${suivi.titreProjet}</h4>
                          <p style="color: #6b7280; font-size: 11px; margin-top: 5px; margin-bottom: 0;">Démarre le : ${suivi.dateDemarrage || 'N/A'}</p>
                      </div>
                      
                      ${suivi.statut === 'en_cours' ? `
                          <div style="margin-top: 10px; display: flex; gap: 8px;">
                              <button onclick="ouvrirDetailsProjet('${suivi.projectId}')" style="background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid #374151; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 8px; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                  Consignes
                              </button>
                              <a href="projet.html?id=${suivi.projectId}" style="text-decoration: none; background: #3b82f6; color: white; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 8px; width: 100%; text-align: center; display: flex; align-items: center; justify-content: center;">
                                  Ouvrir le TP
                              </a>
                          </div>
                      ` : ''}

                      ${suivi.statut === 'rendu' ? `
                          <div style="margin-top: 12px; font-size: 11px; color: #f59e0b; background: rgba(245, 158, 11, 0.05); padding: 6px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.1);">
                              Remis le ${suivi.dateRendu || ''}
                          </div>
                      ` : ''}

                      ${suivi.statut === 'valide' ? `
                          <div style="margin-top: 12px; font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.05); padding: 6px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.15); font-weight: 500;">
                              Validé avec succès !
                          </div>
                      ` : ''}
                  </div>
              `;

              if (suivi.statut === "en_cours") {
                  containerEnCours.innerHTML += itemHTML;
                  if(dashEnCours) dashEnCours.innerHTML += itemHTML;
                  cEnCours++;
              } else if (suivi.statut === "rendu") {
                  containerRendu.innerHTML += itemHTML;
                  if(dashRendu) dashRendu.innerHTML += itemHTML;
                  cRendu++;
              } else if (suivi.statut === "valide") {
                  containerValide.innerHTML += itemHTML;
                  if(dashValide) dashValide.innerHTML += itemHTML;
                  cValide++;
              }
          });

          const fallBackHTML = `<p style="color: #6b7280; font-size: 0.75rem; text-align: center; padding: 15px 0; font-style: italic;">Aucun projet dans cette catégorie</p>`;
          if (cEnCours === 0) { containerEnCours.innerHTML = fallBackHTML; if(dashEnCours) dashEnCours.innerHTML = fallBackHTML; }
          if (cRendu === 0) { containerRendu.innerHTML = fallBackHTML; if(dashRendu) dashRendu.innerHTML = fallBackHTML; }
          if (cValide === 0) { containerValide.innerHTML = fallBackHTML; if(dashValide) dashValide.innerHTML = fallBackHTML; }

          mettreAJourCompteurs(cEnCours, cRendu, cValide);
          if (typeof lucide !== "undefined") { lucide.createIcons(); }
      });
}

// ==========================================
// LOGIQUE DE LA MODAL DE PROJET
// ==========================================
function ouvrirDetailsProjet(projectId) {
    db.collection("projets").doc(projectId).get().then((doc) => {
        if (doc.exists) {
            const proj = doc.data();

            document.getElementById("modal-cat").innerText = proj.categorie || "Électronique";
            document.getElementById("modal-titre").innerText = proj.titre || "Sans nom";
            document.getElementById("modal-desc").innerText = proj.description || "Aucune description.";
            document.getElementById("modal-composants").innerText = proj.composants || "Aucun matériel listé";
            document.getElementById("modal-duree").innerText = proj.duree || "N/A";

            const imgNeutre = "https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop";
            document.getElementById("modal-img-projet").src = proj.imageProjet || imgNeutre;
            document.getElementById("modal-img-cablage").src = proj.imageCablage || imgNeutre;

            const etapesContainer = document.getElementById("modal-etapes");
            if (etapesContainer) {
                etapesContainer.innerHTML = `
                    <li style="display:flex; gap:8px;"><b style="color: #f59e0b;">Étape 1 (Câblage) :</b> ${proj.etape1 || "Monter les composants."}</li>
                    <li style="display:flex; gap:8px;"><b style="color: #f59e0b;">Étape 2 (Programmation) :</b> ${proj.etape2 || "Développer le code."}</li>
                    <li style="display:flex; gap:8px;"><b style="color: #f59e0b;">Étape 3 (Validation) :</b> ${proj.etape3 || "Téléverser et tester le circuit."}</li>
                `;
            }

            const modal = document.getElementById("modal-projet-eleve");
            if (modal) {
                modal.style.display = "flex";
            }
            
            if (typeof lucide !== "undefined") {
                lucide.createIcons();
            }
        } else {
            console.error("Le projet source n'existe pas ou a été supprimé.");
            alert("Impossible d'ouvrir les détails. Le guide technique de ce TP est introuvable.");
        }
    }).catch(err => console.error("Erreur d'ouverture du projet :", err));
}

function fermerModalProjet() {
    const modal = document.getElementById("modal-projet-eleve");
    if (modal) {
        modal.style.display = "none";
    }
}

// ==========================================
// GESTION ET COMPTAGE DES COMPTEURS INTERFACES
// ==========================================
function mettreAJourCompteurs(encours, rendu, valide) {
    if (document.getElementById("count-encours")) document.getElementById("count-encours").innerText = encours;
    if (document.getElementById("count-rendu")) document.getElementById("count-rendu").innerText = rendu;
    if (document.getElementById("count-valide")) document.getElementById("count-valide").innerText = valide;
    
    if (document.getElementById("dash-count-encours")) document.getElementById("dash-count-encours").innerText = encours;
    if (document.getElementById("dash-count-rendu")) document.getElementById("dash-count-rendu").innerText = rendu;
    if (document.getElementById("dash-count-valide")) document.getElementById("dash-count-valide").innerText = valide;
}

// ==========================================
// COUPLAGE DU FLUX DE COURS ET VUES DÉDIÉES
// ==========================================
function chargerCoursEtProgressionEleve(studentUid) {
    // 1. Écouter la table des cours en continu
    db.collection("cours").onSnapshot((snapshotCours) => {
        courses = [];
        snapshotCours.forEach(doc => {
            courses.push({ id: doc.id, ...doc.data() });
        });
        
        // Mettre à jour le compteur global du dashboard
        const dashCoursCompteur = document.getElementById('dash-cours');
        if (dashCoursCompteur) dashCoursCompteur.innerText = courses.length;

        // 2. Écouter simultanément l'état de validation de cet élève
        db.collection("eleves").doc(studentUid).onSnapshot((docEleve) => {
            if (docEleve.exists && docEleve.data().completedCourses) {
                completedCourses = docEleve.data().completedCourses.map(id => String(id));
            } else {
                completedCourses = [];
            }
            // Rafraîchir le rendu de la section cours
            afficherCoursValidesEleve();
        });
    });
}

function changeStudentView(mode) {
    studentViewMode = mode;
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    const coursesGrid = document.getElementById('student-courses-grid');

    if (!coursesGrid) return;

    if (mode === 'grid') {
        coursesGrid.classList.remove('list-mode');
        coursesGrid.classList.add('grid-mode');
        if (btnGrid && btnList) {
            btnGrid.classList.add('active-view');
            btnGrid.style.background = "var(--primary)";
            btnGrid.style.color = "white";
            btnList.classList.remove('active-view');
            btnList.style.background = "transparent";
            btnList.style.color = "var(--text-muted)";
        }
    } else {
        coursesGrid.classList.remove('grid-mode');
        coursesGrid.classList.add('list-mode');
        if (btnGrid && btnList) {
            btnList.classList.add('active-view');
            btnList.style.background = "var(--primary)";
            btnList.style.color = "white";
            btnGrid.classList.remove('active-view');
            btnGrid.style.background = "transparent";
            btnGrid.style.color = "var(--text-muted)";
        }
    }

    afficherCoursValidesEleve();
}

function afficherCoursValidesEleve() {
    const container = document.getElementById('student-courses-grid');
    if (!container) return;

    // Filtrer les cours de la base pour n'afficher que ceux présents dans completedCourses
    const coursValides = courses.filter(c => completedCourses.includes(String(c.id)));

    if (coursValides.length === 0) {
        container.style.display = "block";
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted); width: 100%;">
                <div style="font-size: 2.5rem; margin-bottom: 10px;">🎓</div>
                <p>Vous n'avez pas encore validé de modules.</p>
                <p style="font-size: 12px;">Rendez-vous dans l'Espace Cours pour passer vos premiers quiz !</p>
            </div>
        `;
        return;
    }

    if (studentViewMode === 'grid') {
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
        container.style.gap = "20px";
    } else {
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "12px";
        container.style.width = "100%";
    }

    container.innerHTML = coursValides.map(c => {
        const isVideo = (c.format === "video" || !!c.videoUrl);
        const displayImg = c.img || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500';

        if (studentViewMode === 'grid') {
            return `
              <div class="comp-card" style="position:relative; border: 1px solid #22c55e; border-radius: 8px; overflow: hidden; background: var(--bg-card); padding-bottom:10px;">
                <div class="card-img" style="position:relative; height:120px; background-image: url('${displayImg}'); background-size: cover; background-position: center;">
                  <span style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:3px 6px; border-radius:4px; font-size:10px; color:white;">${isVideo ? '🎥 VIDÉO' : '📄 PDF'}</span>
                  <span style="position:absolute; bottom:10px; left:10px; background:#22c55e; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">✅ VALIDÉ</span>
                  <span class="card-badge" style="position:absolute; top:10px; right:10px; background: var(--bg-body); padding: 3px 6px; border-radius: 4px; font-size: 10px; color: white;">${c.level || 'Débutant'}</span>
                </div>
                <div class="card-body" style="padding:15px;">
                  <div style="font-size:11px; color:#3b82f6; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">${c.category || 'Électronique'}</div>
                  <h3 style="margin:0 0 8px 0; font-size:14px; color:var(--text-main, #f8fafc);">${c.title}</h3>
                  <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">${c.short || 'Module maîtrisé avec succès.'}</p>
                </div>
              </div>
            `;
        } else {
            return `
              <div class="comp-card-list" style="display:flex; align-items:center; background: var(--bg-card); border-radius:8px; padding:12px; gap:15px; border:1px solid var(--border-color); border-left: 4px solid #22c55e; width: 100%;">
                <div style="width:70px; height:50px; background-image: url('${displayImg}'); background-size: cover; background-position: center; border-radius:6px; flex-shrink:0; position:relative;">
                  <span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.8); padding:2px; border-radius:3px; font-size:8px; color:white;">${isVideo ? '🎥' : '📄'}</span>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
                    <span style="font-size:10px; color:#3b82f6; font-weight:bold; text-transform:uppercase;">${c.category || 'Électronique'}</span>
                    <span style="font-size:9px; background: rgba(255,255,255,0.05); color: var(--text-muted); padding:1px 4px; border-radius:3px;">${c.level || 'Débutant'}</span>
                    <span style="font-size:10px; color:#22c55e; font-weight:bold;">• Validé</span>
                  </div>
                  <h3 style="margin:0; font-size:14px; color:var(--text-main, #f8fafc); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${c.title}</h3>
                </div>
              </div>
            `;
        }
    }).join('');
}


document.getElementById('chatForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Empêche le rechargement de la page
    
    const input = document.getElementById('messageInput');
    const messageText = input.value.trim();
    
    if (messageText !== '') {
        const chatMessages = document.getElementById('chatMessages');
        
        // Création du bloc message
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', 'outgoing');
        
        // Heure actuelle
        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        
        messageDiv.innerHTML = `<p>${messageText}</p><span class="time">${timeStr}</span>`;
        
        // Ajout dans la zone de chat
        chatMessages.appendChild(messageDiv);
        
        // Reset du champ de texte et scroll auto vers le bas
        input.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});