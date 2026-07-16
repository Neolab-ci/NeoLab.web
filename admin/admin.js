// ==========================================
// 1. VÉRIFICATION DE LA SESSION SUR CETTE PAGE
// ==========================================
// ==========================================
// 1. VÉRIFICATION DE LA SESSION SUR CETTE PAGE
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // CORRECTION : On lance le chargement des messages immédiatement au chargement de la page
    activerFluxMessagesContact();

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Session active pour l'admin :", user.uid);
        } else {
            console.log("Aucune session trouvée.");
        }
    });
});

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
let questionCounter = 0; // Compteur pour le quiz dynamique

// ==========================================
// INITIALISATION DE LA GESTION DES MESSAGES
// ==========================================

// Appel de cette fonction lors du chargement de la session Admin
function activerFluxMessagesContact() {
    const container = document.getElementById("liste-messages-admin");
    const counter = document.getElementById("total-messages");

    if (!container) return;

    // Écoute en temps réel de la collection "messages_contact" triée par date décroissante
    db.collection("messages_contact")
      .orderBy("envoye_le", "desc")
      .onSnapshot((snapshot) => {
          container.innerHTML = "";
          
          if (snapshot.empty) {
              container.innerHTML = `
                  <div style="text-align: center; padding: 40px; background: #05112e; border: 1.5px solid #0d2352; border-radius: 12px; color: #8c9cb8;">
                      <i class="fa-regular fa-envelope-open" style="font-size: 2.5rem; margin-bottom: 15px; color: #1d61e6;"></i>
                      <p style="font-weight: 600;">Aucun message reçu pour le moment !</p>
                      <p style="font-size: 0.85rem; margin-top: 5px;">Les messages envoyés via la page de contact apparaîtront ici.</p>
                  </div>
              `;
              if (counter) counter.innerText = "0";
              return;
          }

          if (counter) counter.innerText = snapshot.size;

          snapshot.forEach((doc) => {
              const msg = doc.data();
              const msgId = doc.id;
              
              // Formater la date Firestore
              let dateAffichage = "Date inconnue";
              if (msg.envoye_le) {
                  const dateObj = msg.envoye_le.toDate();
                  dateAffichage = dateObj.toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                  });
              }

              const cardHTML = `
                  <div id="msg-card-${msgId}" style="background: #05112e; border: 1.5px solid #0d2352; border-radius: 12px; padding: 20px; transition: 0.3s; position: relative;">
                      
                      <!-- En-tête du message -->
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; border-bottom: 1px solid rgba(13, 35, 82, 0.5); padding-bottom: 12px;">
                          <div>
                              <span style="font-size: 0.75rem; background: rgba(29, 97, 230, 0.15); color: #00f0ff; padding: 3px 8px; border-radius: 4px; font-weight: bold; text-transform: uppercase; margin-right: 8px;">
                                  ${msg.sujet || 'Général'}
                              </span>
                              <h3 style="color: white; margin: 5px 0 0 0; font-size: 1.1rem; font-weight: 700;">${msg.nom_complet}</h3>
                          </div>
                          <span style="color: #8c9cb8; font-size: 0.8rem;">
                              <i class="fa-regular fa-clock"></i> ${dateAffichage}
                          </span>
                      </div>

                      <!-- Corps du message -->
                      <div style="margin-bottom: 20px;">
                          <p style="color: #e2e8f0; font-size: 0.95rem; white-space: pre-wrap; line-height: 1.6;">${msg.message}</p>
                      </div>

                      <!-- Méta-données & Actions -->
                      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; background: rgba(2, 9, 29, 0.4); padding: 12px 15px; border-radius: 8px; border: 1px solid rgba(13, 35, 82, 0.3);">
                          <div style="display: flex; gap: 15px; color: #8c9cb8; font-size: 0.85rem;">
                              <span><i class="fa-regular fa-envelope"></i> ${msg.email}</span>
                              ${msg.telephone && msg.telephone !== "Non renseigné" ? `<span><i class="fa-solid fa-phone"></i> ${msg.telephone}</span>` : ''}
                          </div>
                          
                          <div style="display: flex; gap: 10px;">
                              <!-- Action : Répondre par Email -->
                              <a href="mailto:${msg.email}?subject=R%C3%A9ponse%20NeoLab-CI%20-%20${encodeURIComponent(msg.sujet || '')}&body=Bonjour%20${encodeURIComponent(msg.nom_complet || '')},%0A%0A" 
                                 style="background: #1d61e6; color: white; padding: 6px 14px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; text-decoration: none; transition: 0.2s;">
                                  <i class="fa-solid fa-reply"></i> Répondre par email
                              </a>
                              
                              <!-- Action : Archiver/Supprimer -->
                              <button onclick="supprimerMessageContact('${msgId}')" 
                                      style="background: rgba(255, 77, 77, 0.1); color: #ff4d4d; border: 1px solid rgba(255, 77, 77, 0.2); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: 0.2s;">
                                  <i class="fa-regular fa-trash-can"></i>
                              </button>
                          </div>
                      </div>
                  </div>
              `;
              container.innerHTML += cardHTML;
          });
      }, (error) => {
          console.error("Erreur de récupération des messages :", error);
          container.innerHTML = `<p style="color: #ff4d4d; text-align: center;">Une erreur de droits d'accès est survenue.</p>`;
      });
}

// Fonction de suppression de message
function supprimerMessageContact(msgId) {
    if (confirm("Voulez-vous vraiment supprimer ce message de votre boîte de réception ?")) {
        db.collection("messages_contact").doc(msgId).delete()
        .then(() => {
            alert("Message supprimé avec succès.");
        })
        .catch((error) => {
            console.error("Erreur de suppression :", error);
            alert("Impossible de supprimer le message.");
        });
    }
}
// ==========================================
// CHARGEMENT EN TEMPS RÉEL (READ)
// ==========================================

// Charger statistiques globales de manière sécurisée
db.collection('statistiques').doc('globale').onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        
        const elVisiteurs = document.getElementById('stat-visiteurs');
        const elEleves = document.getElementById('stat-eleves');
        const elComposants = document.getElementById('stat-composants');
        const elProfs = document.getElementById('stat-professeurs');
        const elMessages = document.getElementById('stat-messages_contact');
        const elSignupMode = document.getElementById('setting-signup-mode');

        if (elVisiteurs) elVisiteurs.innerText = data.visiteursJour || 0;
        if (elEleves) elEleves.innerText = data.totalEleves || 0;
        if (elComposants) elComposants.innerText = data.totalComposants || 0;
        if (elProfs) elProfs.innerText = data.totalProfs || 0;
        if (elMessages) elMessages.innerText = data.totalMessages || 0;
        
        if (elSignupMode && data.modeInscription) {
            elSignupMode.value = data.modeInscription;
        }
    }
});

// Demandes Profs
db.collection('profs_en_attente').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('prof-validation-table');
    tableBody.innerHTML = "";
    document.getElementById('stat-profs-details').innerText = `6 Actifs / ${snapshot.size} En attente ⚠️`;

    snapshot.forEach((doc) => {
        const prof = doc.data();
        tableBody.innerHTML += `
            <tr>
                <td>${prof.nom}</td>
                <td>${prof.email}</td>
                <td>${prof.specialite}</td>
                <td>${prof.dateDemande}</td>
                <td>
                    <button class="btn btn-success" onclick="approveProf('${doc.id}', '${prof.nom}', '${prof.email}', '${prof.specialite}')">Accepter</button>
                    <button class="btn btn-danger" onclick="rejectProf('${doc.id}', '${prof.nom}')">Refuser</button>
                </td>
            </tr>`;
    });
});

// Composants
db.collection('composants').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('stock-table-body');
    tableBody.innerHTML = "";
    snapshot.forEach((doc) => {
        const comp = doc.data();
        const imgTag = comp.imageURL ? `<img src="${comp.imageURL}" class="table-img" alt="composant">` : `<div class="table-img" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:#718096">Pas d'img</div>`;
        tableBody.innerHTML += `
            <tr>
                <td>${imgTag}</td>
                <td><strong>${comp.nom}</strong></td>
                <td>${comp.role}</td>
                <td>${comp.quantite}</td>
                <td><button class="btn btn-secondary" onclick="ouvrirModalModifComposant('${doc.id}', '${comp.nom}', '${comp.role}', ${comp.quantite}, '${comp.imageURL || ''}')">Modifier</button></td>
            </tr>`;
    });
});

// Utilisateurs (Élèves)
db.collection('eleves').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = "";
    snapshot.forEach((doc) => {
        const user = doc.data();
        tableBody.innerHTML += `
            <tr>
                <td>${user.nom} (${user.sexe || 'N/A'})</td>
                <td>Filière: ${user.niveauEtudes || 'Non définie'}</td>
                <td><span class="badge badge-success">Élève Actif</span></td>
            </tr>`;
    });
});

// Professeurs Actifs
db.collection('professeurs').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('profs-actifs-table-body');
    tableBody.innerHTML = "";
    snapshot.forEach((doc) => {
        const prof = doc.data();
        tableBody.innerHTML += `
            <tr>
                <td><strong>${prof.nom}</strong> (${prof.sexe || 'N/A'})</td>
                <td>${prof.email}</td>
                <td>${prof.specialite || 'Général'}</td>
                <td><span class="badge badge-success" style="background-color: var(--success-color); color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">Prof Actif</span></td>
            </tr>`;
    });
});

// CORRECTION ANOMALIE 2 : Lecture des cours avec passage des paramètres au bouton Modifier
db.collection('cours').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('cours-table-body');
    tableBody.innerHTML = "";
    snapshot.forEach((doc) => {
        const cours = doc.data();
        const docId = doc.id; 
        const titreCours = cours.title || cours.titre || "Sans titre";
        const imageCours = cours.img || cours.imageURL || "";
        const niveauCours = cours.level || cours.niveau || "Non défini";
        const mediaLien = cours.pdf || cours.videoUrl || cours.mediaURL || "#";
        const formatCours = cours.format || (cours.videoUrl ? "video" : "pdf");
        const badgeCours = cours.badge || "passif";
        const categoryCours = cours.category || "Électronique";
        const descCours = cours.short || cours.description || "";

        const imgTag = imageCours ? `<img src="${imageCours}" class="table-img" alt="miniature">` : `<div class="table-img"></div>`;
        
        // Sécurisation des guillemets pour éviter de casser l'attribut HTML onclick
        const escapedTitle = titreCours.replace(/'/g, "\\'");
        const escapedDesc = descCours.replace(/'/g, "\\'");

        tableBody.innerHTML += `
            <tr>
                <td>${imgTag}</td>
                <td><a href="${mediaLien}" target="_blank" style="color:var(--accent-color);font-weight:bold;text-decoration:none;">${titreCours}</a></td>
                <td>${niveauCours}</td>
                <td>${categoryCours}</td>
                <td>
                    <button class="btn btn-secondary" onclick="ouvrirModalModifCours('${docId}', '${escapedTitle}', ${cours.id || 0}, '${categoryCours}', '${niveauCours}', '${formatCours}', '${badgeCours}', '${imageCours}', '${mediaLien}', '${escapedDesc}')">
                        Modifier
                    </button>
                </td>
            </tr>`;
    });
});

// ==========================================
// NAVIGATION ET OUVERTURE/FERMETURE MODALS
// ==========================================
function switchTab(event, sectionId) {
    event.preventDefault();
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

function abrirModalCreation() { document.getElementById('creationModal').style.display = 'flex'; }
function fermerModalCreation() { document.getElementById('creationModal').style.display = 'none'; document.getElementById('creationUserForm').reset(); toggleChampsRole(); }

function ouvrirModalComposant() { document.getElementById('composantModal').style.display = 'flex'; }
function fermerModalComposant() { document.getElementById('composantModal').style.display = 'none'; document.getElementById('creationComposantForm').reset(); }

function ouvrirModalCours() { document.getElementById('coursModal').style.display = 'flex'; }
function fermerModalCours() { 
    document.getElementById('coursModal').style.display = 'none'; 
    document.getElementById('creationCoursForm').reset(); 
    document.getElementById('dynamic-quiz-questions-container').innerHTML = "";
}

// Fonctions de contrôle pour la modification des cours (Anomalie 2)
function ouvrirModalModifCours(docId, title, idNum, category, level, format, badge, img, media, desc) {
    document.getElementById('edit-cours-doc-id').value = docId;
    document.getElementById('edit-cours-titre').value = title;
    document.getElementById('edit-cours-id').value = idNum;
    document.getElementById('edit-cours-categorie').value = category;
    document.getElementById('edit-cours-niveau').value = level;
    document.getElementById('edit-cours-format').value = format;
    document.getElementById('edit-cours-badge').value = badge;
    document.getElementById('edit-cours-image').value = img;
    document.getElementById('edit-cours-media').value = media;
    document.getElementById('edit-cours-desc').value = desc;

    document.getElementById('modifCoursModal').style.display = 'flex';
}

function fermerModalModifCours() {
    document.getElementById('modifCoursModal').style.display = 'none';
    document.getElementById('modifCoursForm').reset();
}

function toggleChampsRole() {
    const role = document.getElementById('new-role').value;
    document.getElementById('group-niveau').style.display = role === 'eleve' ? 'block' : 'none';
    document.getElementById('group-specialite').style.display = role === 'professeur' ? 'block' : 'none';
}

// ==========================================
// GESTION DU QUIZ DYNAMIQUE DANS LA MODAL
// ==========================================
function toggleFormatFields() {
    const format = document.getElementById('cours-format').value;
    const container = document.getElementById('container-field-media');
    
    if (format === 'video') {
        container.innerHTML = `
            <label for="cours-media">Lien Embed de la Vidéo (YouTube) *</label>
            <input type="text" id="cours-media" placeholder="https://www.youtube.com/embed/..." required style="background: #0f172a; border: 1px solid #334155; color: white;">
        `;
    } else {
        container.innerHTML = `
            <label for="cours-media">Chemin du fichier PDF *</label>
            <input type="text" id="cours-media" placeholder="cours/diodes.pdf" required style="background: #0f172a; border: 1px solid #334155; color: white;">
        `;
    }
}

function ajouterQuestionInterface() {
    const container = document.getElementById('dynamic-quiz-questions-container');
    const questionId = questionCounter++;

    const questionBlock = document.createElement('div');
    questionBlock.id = `question-block-${questionId}`;
    questionBlock.className = "question-entry-block";
    questionBlock.style = "background: #0f172a; border: 1px solid #334155; padding: 12px; border-radius: 6px; margin-bottom: 12px; position: relative; color: white;";
    
    questionBlock.innerHTML = `
        <button type="button" onclick="supprimerQuestionInterface(${questionId})" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px;">✕ Supprimer</button>
        
        <div style="margin-bottom: 8px; padding-right: 70px;">
            <label style="display: block; font-size: 11px; color: #94a3b8; margin-bottom: 2px;">Intitulé de la question</label>
            <input type="text" class="quiz-q-text" required placeholder="Ex: Rôle d'une diode ?" style="width: 100%; padding: 6px; background: #070a1e; border: 1px solid #1f2937; border-radius: 4px; color: white; font-size: 12px;">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px;">
            <div>
                <label style="display: block; font-size: 10px; color: #64748b; margin-bottom: 2px;">Option 0</label>
                <input type="text" class="quiz-opt-0" required style="width: 100%; padding: 5px; background: #070a1e; border: 1px solid #1f2937; border-radius: 4px; color: white; font-size: 11px;">
            </div>
            <div>
                <label style="display: block; font-size: 10px; color: #64748b; margin-bottom: 2px;">Option 1</label>
                <input type="text" class="quiz-opt-1" required style="width: 100%; padding: 5px; background: #070a1e; border: 1px solid #1f2937; border-radius: 4px; color: white; font-size: 11px;">
            </div>
            <div>
                <label style="display: block; font-size: 10px; color: #64748b; margin-bottom: 2px;">Option 2</label>
                <input type="text" class="quiz-opt-2" required style="width: 100%; padding: 5px; background: #070a1e; border: 1px solid #1f2937; border-radius: 4px; color: white; font-size: 11px;">
            </div>
        </div>

        <div>
            <label style="font-size: 11px; color: #94a3b8; margin-right: 10px;">Réponse exacte :</label>
            <select class="quiz-correct-index" style="padding: 3px 6px; background: #070a1e; border: 1px solid #1f2937; border-radius: 4px; color: white; font-size: 11px;">
                <option value="0">Option 0</option>
                <option value="1">Option 1</option>
                <option value="2">Option 2</option>
            </select>
        </div>
    `;
    container.appendChild(questionBlock);
}

function supprimerQuestionInterface(id) {
    const el = document.getElementById(`question-block-${id}`);
    if (el) el.remove();
}

// ==========================================
// TRAITEMENT DES FORMULAIRES (SOUMISSIONS)
// ==========================================

// 1. Ajouter Utilisateur (Élève / Prof)
document.getElementById('creationUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.getElementById('new-role').value;
    const nom = document.getElementById('new-nom').value;
    const sexe = document.getElementById('new-sexe').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value;
    const dateActuelle = new Date().toLocaleDateString('fr-FR');

    if (role === 'eleve') {
        db.collection('eleves').add({
            nom: nom, email: email, sexe: sexe, password_init: password,
            niveauEtudes: document.getElementById('new-niveau').value, dateInscription: dateActuelle
        }).then(() => { alert(`Élève ${nom} créé !`); fermerModalCreation(); });
    } else {
        db.collection('professeurs').add({
            nom: nom, email: email, sexe: sexe, password_init: password,
            specialite: document.getElementById('new-specialite').value, dateApprobation: dateActuelle, statut: 'actif'
        }).then(() => { alert(`Professeur ${nom} créé !`); fermerModalCreation(); });
    }
});

// 2. Ajouter Composant Stock
document.getElementById('creationComposantForm').addEventListener('submit', function(e) {
    e.preventDefault();
    db.collection('composants').add({
        nom: document.getElementById('comp-nom').value,
        role: document.getElementById('comp-role').value,
        quantite: parseInt(document.getElementById('comp-quantite').value, 10),
        imageURL: document.getElementById('comp-image').value || ""
    }).then(() => {
        alert("Composant ajouté au stock !");
        fermerModalComposant();
    });
});

// CORRECTION ANOMALIE 1 : Ajout de cours via .add() pour ID auto-généré sans écrasement
function publierCours(e) {
    e.preventDefault();

    const courseId = parseInt(document.getElementById('cours-id').value);
    const format = document.getElementById('cours-format').value;
    const mediaUrl = document.getElementById('cours-media').value;

    const questionsPayload = [];
    const blocks = document.querySelectorAll('.question-entry-block');
    
    blocks.forEach(b => {
        questionsPayload.push({
            q: b.querySelector('.quiz-q-text').value,
            options: [
                b.querySelector('.quiz-opt-0').value,
                b.querySelector('.quiz-opt-1').value,
                b.querySelector('.quiz-opt-2').value
            ],
            correct: parseInt(b.querySelector('.quiz-correct-index').value)
        });
    });

    const nouveauCours = {
        id: courseId, 
        title: document.getElementById('cours-titre').value,
        category: document.getElementById('cours-categorie').value,
        level: document.getElementById('cours-niveau').value,
        badge: document.getElementById('cours-badge').value,
        format: format,
        img: document.getElementById('cours-image').value,
        short: document.getElementById('cours-desc').value,
        questions: questionsPayload,
        auteurEmail: "Admin NeoLab",
        datePublication: new Date().toLocaleDateString('fr-FR')
    };

    if (format === 'video') {
        nouveauCours.videoUrl = mediaUrl;
    } else {
        nouveauCours.pdf = mediaUrl;
    }

    db.collection("cours").add(nouveauCours)
    .then(() => {
        alert("🎉 Le cours et son quiz ont été publiés sur NeoLab-CI (ID Unique Firebase) !");
        fermerModalCours();
    })
    .catch(error => {
        console.error("Erreur d'écriture du cours :", error);
        alert("❌ Erreur de publication.");
    });
}

// CORRECTION ANOMALIE 2 : Application des modifications du cours sur Firebase
function mettreAJourCours(e) {
    e.preventDefault();
    
    const docId = document.getElementById('edit-cours-doc-id').value;
    const format = document.getElementById('edit-cours-format').value;
    const mediaUrl = document.getElementById('edit-cours-media').value;

    const coursMisAJour = {
        id: parseInt(document.getElementById('edit-cours-id').value, 10),
        title: document.getElementById('edit-cours-titre').value,
        category: document.getElementById('edit-cours-categorie').value,
        level: document.getElementById('edit-cours-niveau').value,
        badge: document.getElementById('edit-cours-badge').value,
        format: format,
        img: document.getElementById('edit-cours-image').value,
        short: document.getElementById('edit-cours-desc').value
    };

    if (format === 'video') {
        coursMisAJour.videoUrl = mediaUrl;
        coursMisAJour.pdf = firebase.firestore.FieldValue.delete(); 
    } else {
        coursMisAJour.pdf = mediaUrl;
        coursMisAJour.videoUrl = firebase.firestore.FieldValue.delete(); 
    }

    db.collection('cours').doc(docId).update(coursMisAJour)
    .then(() => {
        alert("✨ Le cours a été mis à jour avec succès !");
        fermerModalModifCours();
    })
    .catch(error => {
        console.error("Erreur lors de la modification du cours :", error);
        alert("❌ Impossible de modifier le cours.");
    });
}

// 4. Envoi du projet de TP assigné à l'élève (Kanban)
function publierProjet(e) {
    e.preventDefault();

    const studentUid = document.getElementById('project-student-uid').value.trim();
    const projectId = document.getElementById('project-id').value.trim();
    const title = document.getElementById('project-title').value;
    const startDate = document.getElementById('project-start-date').value;

    const nouveauSuiviProjet = {
        projectId: projectId,
        titreProjet: title,
        studentUid: studentUid,
        statut: "en_cours", 
        dateDemarrage: startDate,
        dateRendu: "",
        livrableLien: "",
        noteEtudiant: ""
    };

    db.collection("projets_eleves").doc(`${studentUid}_${projectId}`).set(nouveauSuiviProjet)
    .then(() => {
        alert("🎯 Projet assigné avec succès ! Envoyé dans le Kanban de l'élève.");
        document.getElementById('form-ajouter-projet').reset();
    })
    .catch(error => {
        console.error("Erreur d'assignation du projet :", error);
        alert("❌ Impossible d'assigner le projet.");
    });
}

// Validation Profs et modifications existantes
function approveProf(docId, name, email, specialite) {
    db.collection('professeurs').add({ nom: name, email: email, specialite: specialite, dateApprobation: new Date().toLocaleDateString('fr-FR'), statut: 'actif' })
    .then(() => { return db.collection('profs_en_attente').doc(docId).delete(); })
    .then(() => { alert(`Professeur ${name} validé.`); });
}
function rejectProf(docId, name) { if (confirm(`Supprimer la demande de ${name} ?`)) { db.collection('profs_en_attente').doc(docId).delete(); } }

function saveSettings() {
    const modeSelectionne = document.getElementById('setting-signup-mode').value;
    db.collection('statistiques').doc('globale').update({ modeInscription: modeSelectionne })
    .then(() => { alert("Configuration système mise à jour dans Firebase !"); })
    .catch(() => { alert("Une erreur est survenue."); });
}

function ouvrirModalModifComposant(id, nom, role, quantite, imageURL) {
    document.getElementById('edit-comp-id').value = id;
    document.getElementById('edit-comp-nom').value = nom;
    document.getElementById('edit-comp-role').value = role;
    document.getElementById('edit-comp-quantite').value = quantite;
    document.getElementById('edit-comp-image').value = imageURL;
    document.getElementById('modifComposantModal').style.display = 'flex';
}

function fermerModalModifComposant() {
    document.getElementById('modifComposantModal').style.display = 'none';
    document.getElementById('modifComposantForm').reset();
}

document.getElementById('modifComposantForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-comp-id').value;
    db.collection('composants').doc(id).update({
        nom: document.getElementById('edit-comp-nom').value,
        role: document.getElementById('edit-comp-role').value,
        quantite: parseInt(document.getElementById('edit-comp-quantite').value, 10),
        imageURL: document.getElementById('edit-comp-image').value
    })
    .then(() => { alert("Composant mis à jour !"); fermerModalModifComposant(); });
});