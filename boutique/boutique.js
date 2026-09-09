// ==========================================
// CONFIGURATION FIREBASE BOUTIQUE
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

// VARIABLES DU PANIER LOCAL
let panier = []; 
let tousLesProduits = []; // Stockage local pour recherche et filtres rapide
const VOTRE_NUMERO_WHATSAPP = "2250700000000"; // Mettez votre vrai numéro d'administration ici (sans le +)

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialiser le menu hamburger mobile
    initMenuHamburger();

    // 2. Lancer la lecture en temps réel de la collection Firebase Boutique
    chargerArticlesBoutique();

    // 3. Configurer l'écouteur du formulaire de validation de commande
    document.getElementById('formFinaliserCommande').addEventListener('submit', executerCommandeFinie);

    // 4. Configurer la barre de recherche en temps réel
    document.getElementById('boutiqueSearchInput').addEventListener('input', filtrerRechercheTexte);
});

// ==========================================
// INTERFACES ET MENUS
// ==========================================
function initMenuHamburger() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-open');
            const icon = menuToggle.querySelector('i');
            icon.className = mainNav.classList.contains('mobile-open') ? "fa-solid fa-xmark" : "fa-solid fa-bars";
        });
    }
}

// ==========================================
// FLUX ET TRAITEMENT DU STOCK DYNAMIQUE
// ==========================================
function chargerArticlesBoutique() {
    const container = document.getElementById('boutique-products-container');

    db.collection("boutique_produits").orderBy("cree_le", "desc").onSnapshot((snapshot) => {
        container.innerHTML = "";
        tousLesProduits = [];

        if (snapshot.empty) {
            container.innerHTML = `
                <p style="color: var(--text-secondary); text-align: center; grid-column: 1/-1; padding: 40px;">
                    <i class="fa-solid fa-store-slash" style="font-size: 2.5rem; margin-bottom: 10px; color: var(--primary-color);"></i><br>
                    La boutique arrive bientôt ! Aucun article n'est en ligne pour le moment.
                </p>`;
            return;
        }

        snapshot.forEach((doc) => {
            const produit = doc.data();
            produit.id = doc.id; // Ajouter l'ID unique Firebase
            tousLesProduits.push(produit);
        });

        afficherCartesProduits(tousLesProduits);
    }, (error) => {
        console.error("Erreur de chargement boutique :", error);
        container.innerHTML = `<p style="color: var(--discount-red); grid-column: 1/-1; text-align:center;">Erreur de liaison avec la base de données.</p>`;
    });
}

function afficherCartesProduits(liste) {
    const container = document.getElementById('boutique-products-container');
    container.innerHTML = "";

    if(liste.length === 0) {
        container.innerHTML = `<p style="color: var(--text-secondary); grid-column: 1/-1; text-align:center; padding: 20px;">Aucun produit ne correspond à ce critère.</p>`;
        return;
    }

    liste.forEach((prod) => {
        const aUnStock = prod.quantite_stock && prod.quantite_stock > 0;
        const stockHTML = aUnStock 
            ? `<span class="stock-status in-stock"><span class="dot-status"></span> En stock (${prod.quantite_stock})</span>` 
            : `<span class="stock-status" style="color: var(--discount-red);"><span class="dot-status"></span> Épuisé</span>`;
        
        const btnHTML = aUnStock 
            ? `<button class="btn-add-cart" onclick="ajouterAuPanier('${prod.id}')"><i class="fa-solid fa-cart-plus"></i> Ajouter au panier</button>` 
            : `<button class="btn-add-cart" style="background:#1e293b; color:#64748b; cursor:not-allowed;" disabled>Rupture de stock</button>`;

        const imageHTML = prod.imageURL 
            ? `<img src="${prod.imageURL}" style="width:100%; height:100%; object-fit:cover;" alt="${prod.nom}">` 
            : `<i class="fa-solid ${prod.type === 'Projet' ? 'fa-robot' : 'fa-microchip'} temp-img-icon"></i>`;

        // Gestion de l'affichage du tag de type de produit
        const typeBadgeColor = prod.type === 'Projet' ? 'background-color: rgba(0, 240, 255, 0.15); color: #00f0ff;' : 'background-color: rgba(29, 97, 230, 0.15); color: var(--primary-color);';

        const card = document.createElement('div');
        card.className = "product-card";
        card.innerHTML = `
            <div class="product-img">${imageHTML}</div>
            <div class="product-body">
                <span class="tag" style="align-self: flex-start; margin-bottom: 8px; font-size:0.7rem; font-weight:700; padding: 2px 8px; border-radius:4px; ${typeBadgeColor}">${prod.type || 'Composant'}</span>
                <h3>${prod.nom}</h3>
                <p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${prod.description || ''}</p>
                <div class="price-container">
                    <span class="price-current">${Number(prod.prix).toLocaleString('fr-FR')} FCFA</span>
                </div>
                ${stockHTML}
                ${btnHTML}
            </div>
        `;
        container.appendChild(card);
    });
}

// ==========================================
// FILTRES DE LA BOUTIQUE
// ==========================================
function filtrerBoutique(categorie) {
    document.getElementById('titre-categorie-boutique').innerText = categorie === 'Tous' ? "Tous les articles disponibles" : `${categorie}s disponibles`;
    
    if (categorie === 'Tous') {
        afficherCartesProduits(tousLesProduits);
    } else {
        const resultats = tousLesProduits.filter(p => p.type === categorie);
        afficherCartesProduits(resultats);
    }
}

function filtrerRechercheTexte() {
    const texte = document.getElementById('boutiqueSearchInput').value.toLowerCase();
    const resultats = tousLesProduits.filter(p => p.nom.toLowerCase().includes(texte) || (p.description && p.description.toLowerCase().includes(texte)));
    afficherCartesProduits(resultats);
}

// ==========================================
// LOGIQUE COMPLÈTE DU PANIER
// ==========================================
function ajouterAuPanier(idProduit) {
    const produitTrouve = tousLesProduits.find(p => p.id === idProduit);
    if (!produitTrouve) return;

    // Vérifier si le produit est déjà présent dans notre panier local
    const itemDansPanier = panier.find(item => item.id === idProduit);

    if (itemDansPanier) {
        if (itemDansPanier.quantite < produitTrouve.quantite_stock) {
            itemDansPanier.quantite++;
        } else {
            alert(`Désolé, la quantité maximum en stock pour cet article est de ${produitTrouve.quantite_stock}.`);
            return;
        }
    } else {
        panier.push({
            id: produitTrouve.id,
            nom: produitTrouve.nom,
            prix: produitTrouve.prix,
            quantite: 1
        });
    }

    misesAJourInterfacePanier();
}

function misesAJourInterfacePanier() {
    // Calcul de la somme totale d'objets dans le panier
    const totalArticles = panier.reduce((acc, item) => acc + item.quantite, 0);
    document.querySelector('.cart-badge').textContent = totalArticles;
}

// ==========================================
// FENÊTRE POPUP DE VALIDATION DE COMMANDE
// ==========================================
function ouvrirModalCommande() {
    if (panier.length === 0) {
        alert("Votre panier est vide. Ajoutez des composants pour passer commande ! 🛒");
        return;
    }

    const totalArticles = panier.reduce((acc, item) => acc + item.quantite, 0);
    const prixTotal = panier.reduce((acc, item) => acc + (item.prix * item.quantite), 0);

    document.getElementById('modal-total-quantite').innerText = totalArticles;
    document.getElementById('modal-total-prix').innerText = `${prixTotal.toLocaleString('fr-FR')} FCFA`;

    document.getElementById('modalCommande').style.display = 'flex';
}

function fermerModalCommande() {
    document.getElementById('modalCommande').style.display = 'none';
    document.getElementById('formFinaliserCommande').reset();
    toggleModePaiementVisibility();
}

function toggleModePaiementVisibility() {
    const canal = document.getElementById('cmd-canal').value;
    const blocPaiement = document.getElementById('bloc-mode-paiement');
    // Si passage via WhatsApp, pas besoin de spécifier un mode de paiement fixe sur le site
    blocPaiement.style.display = canal === 'whatsapp' ? 'none' : 'block';
}

// ==========================================
// TRAITEMENT ET EXPÉDITION DE LA COMMANDE FINIE
// ==========================================
function executerCommandeFinie(e) {
    e.preventDefault();

    const nom = document.getElementById('cmd-nom').value;
    const tel = document.getElementById('cmd-tel').value;
    const email = document.getElementById('cmd-email').value;
    const canal = document.getElementById('cmd-canal').value;
    const modePaiement = document.getElementById('cmd-paiement').value;

    const prixTotal = panier.reduce((acc, item) => acc + (item.prix * item.quantite), 0);

    // Structure de texte commune pour la commande
    let detailArticlesTexte = "";
    panier.forEach(item => {
        detailArticlesTexte += `- ${item.nom} (Qté: ${item.quantite}) : ${item.prix * item.quantite} FCFA\n`;
    });

    if (canal === 'neolab') {
        // OPTION 1 : Stockage propre dans Firebase Firestore pour l'admin
        const nouvelleCommande = {
            client_nom: nom,
            client_telephone: tel,
            client_email: email,
            articles: panier,
            total_facture: prixTotal,
            paiement_choisi: modePaiement,
            statut: "En attente de traitement",
            cree_le: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("boutique_commandes").add(nouvelleCommande)
        .then(() => {
            alert(`🎉 Commande validée sur NeoLab-CI !\nMerci ${nom}, notre équipe va vous contacter pour finaliser la livraison.`);
            panier = [];
            misesAJourInterfacePanier();
            fermerModalCommande();
        })
        .catch(error => {
            console.error("Erreur commande Firestore :", error);
            alert("Une erreur technique s'est produite lors de l'enregistrement.");
        });

    } else if (canal === 'whatsapp') {
        // OPTION 2 : Génération d'un lien d'API WhatsApp pré-rempli
        const texteWhatsApp = `Bonjour NeoLab-CI, je souhaite passer une commande :\n\n*Client :* ${nom}\n*Contact :* ${tel}\n*Email :* ${email}\n\n*Détail du panier :*\n${detailArticlesTexte}\n*TOTAL PROVISOIRE :* ${prixTotal} FCFA`;
        
        const urlWhatsAppEncode = `https://api.whatsapp.com/send?phone=${VOTRE_NUMERO_WHATSAPP}&text=${encodeURIComponent(texteWhatsApp)}`;
        
        // Ouvrir WhatsApp dans un nouvel onglet
        window.open(urlWhatsAppEncode, '_blank');
        
        // Vider le panier après redirection
        panier = [];
        misesAJourInterfacePanier();
        fermerModalCommande();
    }
}