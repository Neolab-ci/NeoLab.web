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
            activerFluxTempsReel(user.uid); // Active le flux filtré des cours vus
        } else {
            console.warn("Aucune session active. Redirection vers auth.html...");
            window.location.href = "../../assets/login/auth.html";
        }
    });

    // --- GESTION COMMUTATEUR DE VUE (GRILLE / LISTE) ---
    const btnGrid = document.getElementById('btn-view-grid');
    const btnList = document.getElementById('btn-view-list');
    const coursesGrid = document.getElementById('student-courses-grid');

    if (btnGrid && btnList && coursesGrid) {
        btnGrid.addEventListener('click', function() {
            coursesGrid.classList.remove('list-mode');
            coursesGrid.classList.add('grid-mode');
            btnGrid.classList.add('active-view');
            btnGrid.style.background = "var(--primary)";
            btnGrid.style.color = "white";
            
            btnList.classList.remove('active-view');
            btnList.style.background = "transparent";
            btnList.style.color = "var(--text-muted)";
        });

        btnList.addEventListener('click', function() {
            coursesGrid.classList.remove('grid-mode');
            coursesGrid.classList.add('list-mode');
            btnList.classList.add('active-view');
            btnList.style.background = "var(--primary)";
            btnList.style.color = "white";
            
            btnGrid.classList.remove('active-view');
            btnGrid.style.background = "transparent";
            btnGrid.style.color = "var(--text-muted)";
        });
    }

    // --- GESTION DU MENU BURGER MOBILE ---
    const mobileBurger = document.getElementById('mobile-burger');
    const appSidebar = document.getElementById('app-sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (mobileBurger && appSidebar && sidebarOverlay) {
        // Ouvrir / Fermer au clic sur le bouton 3 traits
        mobileBurger.addEventListener('click', function() {
            appSidebar.classList.toggle('open');
        });

        // Fermer le menu si on clique sur la zone floutée à côté
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

            // Fermeture automatique de la sidebar sur mobile après un clic sur un lien
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

            // Alimentation des champs des paramètres
            initialiserChampsParametres(data);

            // Injection Onglet Profil
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
// SYNC EN TEMPS RÉEL DES COURS CONSULTÉS
// ==========================================
function activerFluxTempsReel(studentUid) {
    const gridCours = document.getElementById('student-courses-grid');
    const dashCount = document.getElementById('dash-cours');
    if (!gridCours) return;

    // Écoute en temps réel de la fiche de l'élève pour choper son tableau d'historique
    db.collection('eleves').doc(studentUid).onSnapshot((docEleve) => {
        if (!docEleve.exists) return;

        const eleveData = docEleve.data();
        const coursVusIds = eleveData.coursVus || [];

        if (dashCount) dashCount.innerText = coursVusIds.length;

        if (coursVusIds.length === 0) {
            gridCours.innerHTML = `<p style="color: var(--text-muted); padding: 10px; font-style: italic;">Vous n'avez consulté aucun cours pour le moment.</p>`;
            return;
        }

        // Récupération uniquement des cours dont l'ID est référencé dans 'coursVusIds'
        db.collection('cours')
          .where(firebase.firestore.FieldPath.documentId(), 'in', coursVusIds)
          .get()
          .then((snapshot) => {
              gridCours.innerHTML = "";
              
              snapshot.forEach((doc) => {
                  const cours = doc.data();
                  const defaultThumb = 'https://images.unsplash.com/photo-1608564697171-2f6118823993?q=80&w=500&auto=format&fit=crop';
                  const imageSrc = cours.imageURL || defaultThumb;

                  gridCours.innerHTML += `
                      <div class="card">
                          <img src="${imageSrc}" alt="${cours.titre}" style="width:100%; height:130px; object-fit:cover; border-radius:10px; border: 1px solid var(--border-color);">
                          <div class="card-body">
                              <span style="font-size: 0.75rem; background: var(--primary-glow); color: var(--accent); padding: 3px 8px; border-radius: 20px; font-weight: bold; width: fit-content; display: inline-block;">${cours.niveau || 'Tous'}</span>
                              <h3 style="margin: 8px 0 5px 0; font-size: 1.1rem; color: var(--text-main);">${cours.titre}</h3>
                              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${cours.description || 'Aucune description disponible.'}</p>
                          </div>
                          <a href="${cours.mediaURL}" target="_blank" style="display: inline-block; text-align:center; background: var(--primary); color: white; text-decoration: none; padding: 10px; border-radius: 8px; font-weight: bold; font-size: 0.9rem;">
                              Ouvrir
                          </a>
                      </div>`;
              });
          })
          .catch((error) => {
              console.error("Erreur lors de la récupération des cours consultés :", error);
          });
    });

    const gridExercices = document.getElementById('student-exercises-grid');
    if (gridExercices) {
        gridExercices.innerHTML = `<p style="color: var(--text-muted); padding: 10px; font-style: italic;">Aucun exercice disponible pour le moment.</p>`;
    }
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