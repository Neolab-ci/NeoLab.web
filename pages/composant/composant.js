// ==========================================
// 1. INITIALISATION & FIRESTORE
// ==========================================
let db;

document.addEventListener("DOMContentLoaded", function () {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        db = firebase.firestore();
        ecouterComposantsFirestore();
    } else {
        console.error("Firebase Firestore n'est pas disponible.");
    }

    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            console.log("Session active pour l'utilisateur :", user.uid);
        }
    });
});

let components = [];
let filteredComponents = [];
let currentView = 'grid';
let currentCategory = 'all';
let currentPage = 1;
const itemsPerPage = 10;

// ==========================================
// 2. RÉCUPÉRATION DES COMPOSANTS
// ==========================================
function ecouterComposantsFirestore() {
    db.collection("composants").onSnapshot((snapshot) => {
        components = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            components.push({
                id: doc.id,
                name: data.nom || data.name || "Composant sans nom",
                category: data.categorie || data.category || "Autre",
                filiere: (data.filiere_id || data.filiere || "informatique").toLowerCase().trim(),
                badge: data.badge || getBadgeClass(data.categorie || data.category),
                emoji: data.emoji || "🔌",
                img: data.image || data.img || "",
                schematic: data.schema || data.schematic || "",
                short: data.description_courte || data.short || "Aucune description rapide.",
                desc: data.description || data.desc || "Aucune description détaillée.",
                tags: data.tags || [],
                specs: data.specs || [],
                pins: data.pins || [],
                code: data.code || "// Aucun code d'exemple disponible."
            });
        });

        if (components.length === 0) {
            loadComponentsFromHTML();
        } else {
            updateUI();
        }
    }, (error) => {
        console.error("Erreur Firestore composants :", error);
        loadComponentsFromHTML();
    });
}

function getBadgeClass(category) {
    switch (category) {
        case 'Passif': return 'badge-passif';
        case 'Actif': return 'badge-actif';
        case 'Capteur': return 'badge-capteur';
        case 'Module': return 'badge-module';
        default: return 'badge-actif';
    }
}

function loadComponentsFromHTML() {
    const template = document.getElementById('component-data');
    if (!template) return;
    const divs = template.content.querySelectorAll('.json-comp');
    components = Array.from(divs).map(div => {
        const obj = JSON.parse(div.textContent.trim());
        return {
            ...obj,
            filiere: obj.filiere || "informatique"
        };
    });
    updateUI();
}

function updateUI() {
    document.getElementById('statCompCount').textContent = `+${components.length}`;
    document.getElementById('countAll').textContent = components.length;
    document.getElementById('countPassif').textContent = components.filter(c => c.category === 'Passif').length;
    document.getElementById('countActif').textContent = components.filter(c => c.category === 'Actif').length;
    document.getElementById('countCapteur').textContent = components.filter(c => c.category === 'Capteur').length;
    document.getElementById('countModule').textContent = components.filter(c => c.category === 'Module').length;
    
    filterComponents();
}

// ==========================================
// 3. FILTRES (RECHERCHE, CATÉGORIE, FILIÈRE) & TRI
// ==========================================
function setView(view) {
    currentView = view;
    document.getElementById('gridBtn').classList.toggle('active', view === 'grid');
    document.getElementById('listBtn').classList.toggle('active', view === 'list');
    document.getElementById('gridView').style.display = view === 'grid' ? 'grid' : 'none';
    document.getElementById('listView').style.display = view === 'list' ? 'flex' : 'none';
}

function filterCat(cat, elem) {
    currentCategory = cat;
    document.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    elem.classList.add('active');
    currentPage = 1;
    filterComponents();
}

function filterComponents() {
    const search = document.getElementById('searchInput').value.toLowerCase().trim();
    const filiereFilter = document.getElementById('filiereSelect').value;
    const sort = document.getElementById('sortSelect').value;

    filteredComponents = components.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(search) || c.short.toLowerCase().includes(search);
        const matchesCat = (currentCategory === 'all' || c.category === currentCategory);
        const matchesFiliere = (filiereFilter === 'all' || c.filiere === filiereFilter);
        return matchesSearch && matchesCat && matchesFiliere;
    });

    if (sort === 'az') filteredComponents.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'za') filteredComponents.sort((a, b) => b.name.localeCompare(a.name));
    else if (sort === 'cat') filteredComponents.sort((a, b) => a.category.localeCompare(b.category));

    const totalPages = Math.ceil(filteredComponents.length / itemsPerPage);
    if (currentPage > totalPages) currentPage = 1;

    renderCurrentPage();
    renderPagination(totalPages);
}

function renderCurrentPage() {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = filteredComponents.slice(startIndex, endIndex);

    renderGrid(pageItems);
    renderList(pageItems);
}

function renderPagination(totalPages) {
    const paginationContainer = document.querySelector('.pagination');
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = '';
    const prevDisabled = currentPage === 1 ? 'disabled' : '';
    html += `<button class="pg-btn" ${prevDisabled} onclick="changePage(${currentPage - 1})">←</button>`;

    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'active' : '';
        html += `<button class="pg-btn ${activeClass}" onclick="changePage(${i})">${i}</button>`;
    }

    const nextDisabled = currentPage === totalPages ? 'disabled' : '';
    html += `<button class="pg-btn" ${nextDisabled} onclick="changePage(${currentPage + 1})">→</button>`;

    paginationContainer.innerHTML = html;
}

function changePage(page) {
    currentPage = page;
    renderCurrentPage();
    const totalPages = Math.ceil(filteredComponents.length / itemsPerPage);
    renderPagination(totalPages);
    document.getElementById('catTabs').scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// 4. AFFICHAGE DES CARTES & MODALE + BOUTON PROJET
// ==========================================
function renderGrid(data) {
    const container = document.getElementById('gridView');
    if (!data.length) { 
        container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Aucun composant trouvé</p></div>'; 
        return; 
    }
    
    container.innerHTML = data.map(c => {
        const mediaDisplay = c.img ? `<img src="${c.img}" alt="${c.name}" style="width:100%; height:100%; object-fit:contain;">` : `<div class="img-placeholder">${c.emoji}</div>`;
        
        return `
            <div class="comp-card" onclick="openModal('${c.id}')">
                <div class="card-img">
                    ${mediaDisplay}
                    <span class="card-badge ${c.badge}">${c.category}</span>
                </div>
                <div class="card-body">
                    <h3 class="card-title">${c.name}</h3>
                    <p class="card-desc">${c.short}</p>
                    <div class="card-footer">
                        <button class="btn-savoir">En savoir plus</button>
                        <div class="card-pin" title="Brochage">⚙️</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderList(data) {
    const container = document.getElementById('listView');
    if (!data.length) { container.innerHTML = ''; return; }

    container.innerHTML = data.map(c => `
        <div class="comp-row" onclick="openModal('${c.id}')">
            <div class="row-img">${c.img ? `<img src="${c.img}" style="width:100%;height:100%;object-fit:cover;border-radius:6px;">` : c.emoji}</div>
            <div class="row-info">
                <h3>${c.name}</h3>
                <p>${c.short}</p>
            </div>
            <div class="row-badge"><span class="card-badge ${c.badge}">${c.category}</span></div>
            <button class="btn-outline" style="padding:4px 12px;">Voir</button>
        </div>
    `).join('');
}

function openModal(id) {
    const c = components.find(comp => String(comp.id) === String(id));
    if (!c) return;

    const photoImg = c.img ? `<img src="${c.img}" alt="${c.name}" style="max-width:100%; max-height:140px; object-fit:contain;">` : `<div style="font-size:4rem;">${c.emoji}</div>`;
    const schemaImg = c.schematic ? `<img src="${c.schematic}" alt="Schéma ${c.name}" style="max-width:100%; max-height:140px; object-fit:contain; filter: invert(1) hue-rotate(180deg);">` : `<div style="font-size:1.2rem; color:#64748b; font-style:italic;">Aucun schéma disponible</div>`;

    document.getElementById('modalContent').innerHTML = `
        <div class="modal-header">
            <div class="modal-info">
                <div class="modal-category">// ${c.category} • Filière : ${c.filiere}</div>
                <h2>${c.name}</h2>
            </div>
            <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body">
            
            <div class="modal-img-container">
                <div class="modal-img-box-single">
                    <span class="img-label blue">📸 Vue Réelle</span>
                    ${photoImg}
                </div>
                <div class="modal-img-box-single schema">
                    <span class="img-label orange">📐 Symbole Électronique</span>
                    ${schemaImg}
                </div>
            </div>

            <div class="modal-grid" style="grid-template-columns: 1fr; margin-bottom: 20px;">
                <div>
                    <p>${c.desc}</p>
                    <div class="modal-tags" style="margin-top:10px;">
                        ${(c.tags || []).map(t => `<span class="modal-tag">${t}</span>`).join('')}
                    </div>
                </div>
            </div>

            <div class="modal-section-title">Caractéristiques techniques</div>
            <div class="modal-specs">
                ${(c.specs || []).map(s => `<div class="spec-card"><div class="spec-label">${s.label}</div><div class="spec-value">${s.value}</div></div>`).join('')}
            </div>

            <div class="modal-section-title">Brochage (Pinout)</div>
            <div class="pin-list">
                ${(c.pins || []).map(p => `<div class="pin-item"><div class="pin-dot" style="background:${p.color || '#0ea5e9'}"></div><span class="pin-name">${p.name}</span><span class="pin-role">– ${p.role}</span></div>`).join('')}
            </div>

            <div class="modal-section-title">Exemple de code Arduino</div>
            <pre class="code-block"><code>${c.code}</code></pre>
            
            <!-- BOUTON MAGIQUE : VOIR LES PROJETS ASSOCIÉS À CE COMPOSANT -->
            <div style="margin-bottom: 16px;">
                <a href="../projet/projet.html?search=${encodeURIComponent(c.name)}" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 text-xs uppercase tracking-wider" style="text-decoration:none;">
                    <i data-lucide="folder-git-2" class="w-4 h-4"></i> Voir les projets réalisés avec ce composant
                </a>
            </div>

            <div class="modal-actions">
                <button id="btn-telecharger-texte" class="btn-action-primary">
                    📥 Télécharger la fiche (.txt)
                </button>
                <button id="btn-partager-lien" class="btn-action-secondary">
                    🔗 Partager
                </button>
            </div>
        </div>
    `;
    document.getElementById('modalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();

    document.getElementById('btn-telecharger-texte').onclick = function() {
        executerTelechargementTexte(c);
    };

    document.getElementById('btn-partager-lien').onclick = function() {
        executerPartageLien(c);
    };
}

function closeModal(e) {
    if (e && e.target !== document.getElementById('modalOverlay')) return;
    document.getElementById('modalOverlay').classList.remove('open');
    document.body.style.overflow = '';
}

// ==========================================
// TÉLÉCHARGEMENT & PARTAGE
// ==========================================
function executerTelechargementTexte(composantData) {
    let contenuFiche = `==================================================\n`;
    contenuFiche += `       NEOLAB-CI : FICHE TECHNIQUE COMPOSANT      \n`;
    contenuFiche += `==================================================\n\n`;
    contenuFiche += `Nom : ${composantData.name}\n`;
    contenuFiche += `Catégorie : ${composantData.category}\n`;
    contenuFiche += `Filière : ${composantData.filiere}\n`;
    contenuFiche += `Description : ${composantData.desc || 'N/A'}\n\n`;

    contenuFiche += `--------------------------------------------------\n`;
    contenuFiche += `CARACTÉRISTIQUES TECHNIQUES :\n`;
    contenuFiche += `--------------------------------------------------\n`;
    if (composantData.specs && composantData.specs.length > 0) {
        composantData.specs.forEach(spec => { contenuFiche += `- ${spec.label} : ${spec.value}\n`; });
    } else {
        contenuFiche += `Aucune spécification renseignée.\n`;
    }

    contenuFiche += `\n==================================================\n`;
    contenuFiche += `Généré par NeoLab-CI - Éducation et Technologie\n`;

    const blob = new Blob([contenuFiche], { type: "text/plain;charset=utf-8" });
    const lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = `Fiche_${composantData.name.replace(/[^a-zA-Z0-9]/g, "_")}.txt`;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
}

function executerPartageLien(composantData) {
    const textePartage = `*NeoLab-CI : Fiche pratique*\n\n*${composantData.name}* (${composantData.category})\n_${composantData.short}_`;
    if (navigator.share) {
        navigator.share({
            title: `NeoLab-CI - ${composantData.name}`,
            text: textePartage,
            url: window.location.href
        }).catch((error) => console.log('Erreur de partage :', error));
    } else {
        navigator.clipboard.writeText(`${textePartage}\nLien : ${window.location.href}`);
        alert(`Lien et résumé de la fiche "${composantData.name}" copiés !`);
    }
}