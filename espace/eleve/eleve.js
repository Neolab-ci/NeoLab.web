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
        } else {
            console.warn("Aucune session active. Redirection vers auth.html...");
            window.location.href = "../../assets/login/auth.html";
        }
    });

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

            // Activation des flux de données en temps réel pour l'onglet cours
            activerFluxTempsReel(data.niveauEtudes);
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



         // ==========================================
// SYNC ET TRAITEMENT DES PROJETS (HUB DE RÉALISATION)
// ==========================================
function chargerSuiviProjetsEleve(studentUid) {
    db.collection("projets_eleves")
      .where("studentUid", "==", studentUid)
      .onSnapshot((snapshot) => {
          
          const containerEnCours = document.getElementById("liste-encours");
          const containerRendu = document.getElementById("liste-rendu");
          const containerValide = document.getElementById("liste-valide");

          if (!containerEnCours || !containerRendu || !containerValide) return;

          let cEnCours = 0, cRendu = 0, cValide = 0;

          containerEnCours.innerHTML = "";
          containerRendu.innerHTML = "";
          containerValide.innerHTML = "";

          if (snapshot.empty) {
              const emptyHTML = `<p style="color: #6b7280; font-size: 0.75rem; text-align: center; padding: 15px 0; font-style: italic;">Aucun projet</p>`;
              containerEnCours.innerHTML = emptyHTML;
              containerRendu.innerHTML = emptyHTML;
              containerValide.innerHTML = emptyHTML;
              mettreAJourCompteurs(0, 0, 0);
              return;
          }

          snapshot.forEach((doc) => {
              const suivi = doc.data();
              
              // Ici, on sépare le comportement : 
              // - Un clic sur la carte générale ouvre la Modal avec les consignes
              // - Un clic sur le bouton "Ouvrir la page du projet" redirige vers la page autonome projet.html
              const itemHTML = `
                  <div class="bg-[#050816] border border-gray-800 p-4 rounded-xl flex flex-col justify-between hover:border-blue-500/30 transition-all" style="background: #050816; border: 1px solid #1f2937; padding: 15px; border-radius: 12px; margin-bottom: 10px; transition: 0.2s;">
                      <div class="cursor-pointer" onclick="ouvrirDetailsProjet('${suivi.projectId}')">
                          <h4 style="color: white; font-weight: bold; font-size: 0.85rem; margin: 0; transition: color 0.2s;" class="hover:text-blue-400">${suivi.titreProjet}</h4>
                          <p style="color: #6b7280; font-size: 11px; margin-top: 5px; margin-bottom: 0;">Démarre le : ${suivi.dateDemarrage || 'N/A'}</p>
                      </div>
                      
                      ${suivi.statut === 'en_cours' ? `
                          <div style="margin-top: 10px; display: flex; flex-col; gap: 8px;">
                              <button onclick="ouvrirDetailsProjet('${suivi.projectId}')" style="background: rgba(255, 255, 255, 0.05); color: #fff; border: 1px solid #374151; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 8px; width: 100%; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                  <i data-lucide="eye" style="width: 14px; height: 14px;"></i> Consignes
                              </button>
                              
                              <a href="projet.html?id=${suivi.projectId}" style="text-decoration: none; background: #3b82f6; color: white; font-size: 11px; font-weight: bold; padding: 6px; border-radius: 8px; width: 100%; text-align: center; display: flex; align-items: center; justify-content: center; gap: 5px;">
                                  <i data-lucide="external-link" style="width: 14px; height: 14px;"></i> Ouvrir le TP
                              </a>
                          </div>
                      ` : ''}

                      ${suivi.statut === 'rendu' ? `
                          <div style="margin-top: 12px; font-size: 11px; color: #f59e0b; background: rgba(245, 158, 11, 0.05); padding: 6px; border-radius: 8px; border: 1px solid rgba(245, 158, 11, 0.1); display: flex; align-items: center; gap: 5px;">
                              <i data-lucide="history" style="width: 14px; height: 14px;"></i> Remis le ${suivi.dateRendu || ''}
                          </div>
                      ` : ''}

                      ${suivi.statut === 'valide' ? `
                          <div style="margin-top: 12px; font-size: 11px; color: #10b981; background: rgba(16, 185, 129, 0.05); padding: 6px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.1); display: flex; align-items: center; gap: 5px; font-weight: 500;">
                              <i data-lucide="award" style="width: 14px; height: 14px;"></i> Validé avec succès !
                          </div>
                      ` : ''}
                  </div>
              `;

              if (suivi.statut === "en_cours") {
                  containerEnCours.innerHTML += itemHTML;
                  cEnCours++;
              } else if (suivi.statut === "rendu") {
                  containerRendu.innerHTML += itemHTML;
                  cRendu++;
              } else if (suivi.statut === "valide") {
                  containerValide.innerHTML += itemHTML;
                  cValide++;
              }
          });

          const fallBackHTML = `<p style="color: #6b7280; font-size: 0.75rem; text-align: center; padding: 15px 0; font-style: italic;">Aucun projet dans cette catégorie</p>`;
          if (cEnCours === 0) containerEnCours.innerHTML = fallBackHTML;
          if (cRendu === 0) containerRendu.innerHTML = fallBackHTML;
          if (cValide === 0) containerValide.innerHTML = fallBackHTML;

          mettreAJourCompteurs(cEnCours, cRendu, cValide);
          if (typeof lucide !== "undefined") {
              lucide.createIcons();
          }
      });
}

// ==========================================
// LOGIQUE COMPLÈTE DE LA MODAL DE PROJET
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

            // Affiche la modal avec un display flex adapté à la structure
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

function mettreAJourCompteurs(encours, rendu, valide) {
    const badgeEnCours = document.getElementById("count-encours");
    const badgeRendu = document.getElementById("count-rendu");
    const badgeValide = document.getElementById("count-valide");

    if (badgeEnCours) badgeEnCours.innerText = encours;
    if (badgeRendu) badgeRendu.innerText = rendu;
    if (badgeValide) badgeValide.innerText = valide;
}