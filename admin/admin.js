// ==========================================
// 1. INITIALISATION ET AUTHENTIFICATION
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

document.addEventListener("DOMContentLoaded", function () {
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Gestion de l'état de connexion Admin
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Connecté en tant qu'admin :", user.email);
            chargerDonneesAdmin();
        } else {
            console.log("Aucun utilisateur connecté, redirection login...");
            window.location.href = "login_admin.html";
        }
    });

    // Formulaire d'ajout de produit boutique
    const formProduit = document.getElementById('form-ajouter-produit');
    if (formProduit) formProduit.addEventListener('submit', ajouterNouveauProduitBoutique);

    // Formulaire d'ajout de filière
    const formFiliere = document.getElementById('creationFiliereForm');
    if (formFiliere) formFiliere.addEventListener('submit', ajouterFiliere);
});

// Navigation entre Onglets
function switchTab(event, sectionId) {
    if (event) event.preventDefault();
    document.querySelectorAll('.menu-link').forEach(link => link.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    
    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }
    const sec = document.getElementById(sectionId);
    if (sec) sec.classList.add('active');
}

// ==========================================
// 2. MODALES (OUVERTURE & FERMETURE CORRIGÉES)
// ==========================================
function ouvrirModalCreation() { 
    const el = document.getElementById('creationModal');
    if(el) el.style.display = 'flex'; 
}
function fermerModalCreation() { 
    const el = document.getElementById('creationModal');
    if(el) el.style.display = 'none'; 
    document.getElementById('creationUserForm')?.reset(); 
}

function ouvrirModalComposant() { 
    const el = document.getElementById('composantModal');
    if(el) el.style.display = 'flex'; 
}
function fermerModalComposant() { 
    const el = document.getElementById('composantModal');
    if(el) el.style.display = 'none'; 
    document.getElementById('creationComposantForm')?.reset(); 
}

function ouvrirModalCours() { 
    const el = document.getElementById('coursModal');
    if(el) el.style.display = 'flex'; 
}
function fermerModalCours() { 
    const el = document.getElementById('coursModal');
    if(el) el.style.display = 'none'; 
    document.getElementById('creationCoursForm')?.reset(); 
}

function ouvrirModalFiliere() {
    const el = document.getElementById('filiereModal');
    if(el) el.style.display = 'flex';
}
function fermerModalFiliere() {
    const el = document.getElementById('filiereModal');
    if(el) el.style.display = 'none';
    document.getElementById('creationFiliereForm')?.reset();
}

function toggleChampsRole() {
    const role = document.getElementById('new-role').value;
    document.getElementById('group-niveau').style.display = role === 'eleve' ? 'block' : 'none';
    document.getElementById('group-specialite').style.display = role === 'professeur' ? 'block' : 'none';
}

// ==========================================
// 3. CHARGEMENT DE TOUTES LES DONNÉES FIRESTORE
// ==========================================
function chargerDonneesAdmin() {
    
    // Charger les Filières
    db.collection('filieres').onSnapshot((snapshot) => {
        const tbody = document.getElementById('filieres-table-body');
        const selectCours = document.getElementById('cours-categorie');
        if (tbody) tbody.innerHTML = "";
        if (selectCours) selectCours.innerHTML = "";

        snapshot.forEach((doc) => {
            const fil = doc.data();
            const id = doc.id;
            
            if (tbody) {
                tbody.innerHTML += `
                    <tr>
                        <td><strong>${fil.nom || id}</strong></td>
                        <td>${fil.description || ''}</td>
                        <td><span class="badge badge-success">Active</span></td>
                        <td>
                            <button class="btn btn-danger" onclick="supprimerFiliere('${id}')">Supprimer</button>
                        </td>
                    </tr>`;
            }

            if (selectCours) {
                selectCours.innerHTML += `<option value="${id}">${fil.nom || id}</option>`;
            }
        });
    });

    // Charger les Cours
    db.collection('cours').onSnapshot((snapshot) => {
        const tbody = document.getElementById('cours-table-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        snapshot.forEach((doc) => {
            const cours = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>📄</td>
                    <td><strong>${cours.titre || cours.title}</strong></td>
                    <td>${cours.niveau || cours.level || 'BTS 1'}</td>
                    <td>${cours.filiere_id || cours.category || 'Général'}</td>
                    <td>
                        <button class="btn btn-danger" onclick="supprimerCours('${doc.id}')">Supprimer</button>
                    </td>
                </tr>`;
        });
    });

    // Charger les Produits Boutique
    db.collection('boutique_produits').onSnapshot((snapshot) => {
        const container = document.getElementById('admin-liste-produits');
        if (!container) return;
        container.innerHTML = "";
        snapshot.forEach((doc) => {
            const p = doc.data();
            container.innerHTML += `
                <div style="background:#fff; border:1px solid #ccc; padding:15px; border-radius:8px;">
                    <h4>${p.nom}</h4>
                    <p>Prix : ${p.prix} FCFA | Stock : ${p.quantite_stock}</p>
                    <button class="btn btn-danger" onclick="supprimerProduit('${doc.id}')">Retirer</button>
                </div>`;
        });
    });

    // Charger les Composants Stock
    db.collection('composants').onSnapshot((snapshot) => {
        const tbody = document.getElementById('stock-table-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        snapshot.forEach((doc) => {
            const c = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>🔧</td>
                    <td><strong>${c.nom}</strong></td>
                    <td>${c.role || ''}</td>
                    <td>${c.quantite || c.quantite_stock}</td>
                    <td><button class="btn btn-danger" onclick="supprimerComposant('${doc.id}')">Supprimer</button></td>
                </tr>`;
        });
    });

    // Charger les Élèves
    db.collection('eleves').onSnapshot((snapshot) => {
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = "";
        snapshot.forEach((doc) => {
            const e = doc.data();
            tbody.innerHTML += `
                <tr>
                    <td>${e.nom}</td>
                    <td>${e.niveauEtudes || 'N/A'}</td>
                    <td>Actif</td>
                </tr>`;
        });
    });
}

// ==========================================
// 4. SOUMISSION ET ACTIONS D'AJOUT
// ==========================================

// Ajouter Filière
function ajouterFiliere(e) {
    e.preventDefault();
    const id = document.getElementById('fil-id').value.toLowerCase().trim();
    const nom = document.getElementById('fil-nom').value;
    const desc = document.getElementById('fil-desc').value;

    db.collection('filieres').doc(id).set({
        nom: nom,
        description: desc,
        actif: true
    }).then(() => {
        alert("Filière ajoutée !");
        fermerModalFiliere();
    }).catch(err => console.error("Erreur ajout filière:", err));
}

// Ajouter Produit
function ajouterNouveauProduitBoutique(e) {
    e.preventDefault();
    db.collection("boutique_produits").add({
        nom: document.getElementById('prod-nom').value,
        type: document.getElementById('prod-type').value,
        prix: parseFloat(document.getElementById('prod-prix').value),
        quantite_stock: parseInt(document.getElementById('prod-stock').value, 10),
        imageURL: document.getElementById('prod-image').value || "",
        description: document.getElementById('prod-description').value,
        cree_le: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Article mis en vente !");
        document.getElementById('form-ajouter-produit').reset();
    }).catch(err => alert("Erreur d'ajout : " + err.message));
}

// Publier Cours
function publierCours(e) {
    e.preventDefault();
    db.collection("cours").add({
        titre: document.getElementById('cours-titre').value,
        filiere_id: document.getElementById('cours-categorie').value,
        niveau: document.getElementById('cours-niveau').value,
        media_url: document.getElementById('cours-media').value,
        description: document.getElementById('cours-desc').value,
        date_creation: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        alert("Cours publié !");
        fermerModalCours();
    }).catch(err => alert("Erreur publication cours : " + err.message));
}

// Suppressions
function supprimerFiliere(id) {
    if(confirm("Supprimer cette filière ?")) db.collection('filieres').doc(id).delete();
}
function supprimerProduit(id) {
    if(confirm("Supprimer ce produit ?")) db.collection('boutique_produits').doc(id).delete();
}
function supprimerCours(id) {
    if(confirm("Supprimer ce cours ?")) db.collection('cours').doc(id).delete();
}
function supprimerComposant(id) {
    if(confirm("Supprimer ce composant ?")) db.collection('composants').doc(id).delete();
}