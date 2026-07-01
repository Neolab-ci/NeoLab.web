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

// ==========================================
// CHARGEMENT EN TEMPS RÉEL (READ)
// ==========================================

// MODIFICATION : Charger aussi les paramètres depuis la collection statistiques
db.collection('statistiques').doc('globale').onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        document.getElementById('stat-visiteurs').innerText = data.visiteursJour || 0;
        document.getElementById('stat-eleves').innerText = data.totalEleves || 0;
        document.getElementById('stat-composants').innerText = data.totalComposants || 0;
        document.getElementById('stat-professeurs').innerText = data.totalProfs || 0;
        
        // Nouvelle ligne pour le sélecteur des paramètres :
        if(data.modeInscription) {
            document.getElementById('setting-signup-mode').value = data.modeInscription;
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

// Composants (avec affichage d'image)
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
// NOUVEAU : Chargement en temps réel des Professeurs Actifs
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
// Cours (avec Miniature Image)
db.collection('cours').onSnapshot((snapshot) => {
    const tableBody = document.getElementById('cours-table-body');
    tableBody.innerHTML = "";
    snapshot.forEach((doc) => {
        const cours = doc.data();
        const imgTag = cours.imageURL ? `<img src="${cours.imageURL}" class="table-img" alt="miniature">` : `<div class="table-img"></div>`;
        tableBody.innerHTML += `
            <tr>
                <td>${imgTag}</td>
                <td><a href="${cours.mediaURL}" target="_blank" style="color:var(--accent-color);font-weight:bold;text-decoration:none;">${cours.titre}</a></td>
                <td>${cours.niveau}</td>
                <td>${cours.auteurEmail}</td>
                <td><button class="btn btn-secondary">Modifier</button></td>
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

function ouvrirModalCreation() { document.getElementById('creationModal').style.display = 'flex'; }
function fermerModalCreation() { document.getElementById('creationModal').style.display = 'none'; document.getElementById('creationUserForm').reset(); toggleChampsRole(); }

function abrirModalComposant() { document.getElementById('composantModal').style.display = 'flex'; } // Ancien alias au cas où
function ouvrirModalComposant() { document.getElementById('composantModal').style.display = 'flex'; }
function fermerModalComposant() { document.getElementById('composantModal').style.display = 'none'; document.getElementById('creationComposantForm').reset(); }

function ouvrirModalCours() { document.getElementById('coursModal').style.display = 'flex'; }
function fermerModalCours() { document.getElementById('coursModal').style.display = 'none'; document.getElementById('creationCoursForm').reset(); }

function toggleChampsRole() {
    const role = document.getElementById('new-role').value;
    document.getElementById('group-niveau').style.display = role === 'eleve' ? 'block' : 'none';
    document.getElementById('group-specialite').style.display = role === 'professeur' ? 'block' : 'none';
}

// ==========================================
// TRAITEMENT DES FORMULAIRES (SOUUMISSIONS INTERFACES)
// ==========================================

// 1. Ajouter Utilisateur (avec Sexe & Mot de Passe)
document.getElementById('creationUserForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.getElementById('new-role').value;
    const nom = document.getElementById('new-nom').value;
    const sexe = document.getElementById('new-sexe').value;
    const email = document.getElementById('new-email').value;
    const password = document.getElementById('new-password').value; // Prêt pour l'Auth plus tard
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

// 2. Ajouter Composant (Formulaire propre avec Image)
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

// 3. Ajouter un Cours (Formulaire complet)
document.getElementById('creationCoursForm').addEventListener('submit', function(e) {
    e.preventDefault();
    db.collection('cours').add({
        titre: document.getElementById('cours-titre').value,
        niveau: document.getElementById('cours-niveau').value,
        description: document.getElementById('cours-desc').value,
        mediaURL: document.getElementById('cours-media').value,
        imageURL: document.getElementById('cours-image').value || "",
        auteurEmail: "Admin NeoLab", // Défini par défaut pour l'admin
        datePublication: new Date().toLocaleDateString('fr-FR')
    }).then(() => {
        alert("Le cours a été publié avec succès !");
        fermerModalCours();
    });
});

// Fonctions d'approbations existantes...
function approveProf(docId, name, email, specialite) {
    db.collection('professeurs').add({ nom: name, email: email, specialite: specialite, dateApprobation: new Date().toLocaleDateString('fr-FR'), statut: 'actif' })
    .then(() => { return db.collection('profs_en_attente').doc(docId).delete(); })
    .then(() => { alert(`Professeur ${name} validé.`); });
}
function rejectProf(docId, name) { if (confirm(`Supprimer la demande de ${name} ?`)) { db.collection('profs_en_attente').doc(docId).delete(); } }

// RECODAGE : Enregistrement réel des paramètres dans Firebase
function saveSettings() {
    const modeSelectionne = document.getElementById('setting-signup-mode').value;

    db.collection('statistiques').doc('globale').update({
        modeInscription: modeSelectionne
    })
    .then(() => {
        alert("Configuration système mise à jour avec succès dans Firebase !");
    })
    .catch((error) => {
        console.error("Erreur mise à jour paramètres: ", error);
        alert("Une erreur est survenue lors de la sauvegarde.");
    });
}

// Fonctions pour ouvrir/fermer le formulaire de modification
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


// Traitement de la modification dans Firebase
document.getElementById('modifComposantForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const id = document.getElementById('edit-comp-id').value;
    
    db.collection('composants').doc(id).update({
        nom: document.getElementById('edit-comp-nom').value,
        role: document.getElementById('edit-comp-role').value,
        quantite: parseInt(document.getElementById('edit-comp-quantite').value, 10),
        imageURL: document.getElementById('edit-comp-image').value
    })
    .then(() => {
        alert("Composant mis à jour avec succès !");
        fermerModalModifComposant();
    })
    .catch(error => console.error("Erreur lors de la modification :", error));
});

