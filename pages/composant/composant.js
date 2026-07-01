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

let components = [];
let filteredComponents = [];
let currentView = 'grid';
let currentCategory = 'all';

// Variables de pagination
let currentPage = 1;
const itemsPerPage = 10;

function loadComponentsFromHTML() {
  const template = document.getElementById('component-data');
  const divs = template.content.querySelectorAll('.json-comp');
  components = Array.from(divs).map(div => JSON.parse(div.textContent.trim()));
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
  const search = document.getElementById('searchInput').value.toLowerCase();
  const sort = document.getElementById('sortSelect').value;

  filteredComponents = components.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search) || c.short.toLowerCase().includes(search);
    const matchesCat = currentCategory === 'all' || c.category === currentCategory;
    return matchesSearch && matchesCat;
  });

  if (sort === 'az') filteredComponents.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'za') filteredComponents.sort((a, b) => b.name.localeCompare(a.name));
  else if (sort === 'cat') filteredComponents.sort((a, b) => a.category.localeCompare(b.category));

  const totalPages = Math.ceil(filteredComponents.length / itemsPerPage);
  if (currentPage > totalPages) {
    currentPage = 1;
  }

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

function renderGrid(data) {
  const container = document.getElementById('gridView');
  if (!data.length) { container.innerHTML = '<div class="empty-state"><div class="icon">🔍</div><p>Aucun composant trouvé</p></div>'; return; }
  
  container.innerHTML = data.map(c => {
    const mediaDisplay = c.img ? `<img src="${c.img}" alt="${c.name}" style="width:100%; height:100%; object-fit:contain;">` : `<div class="img-placeholder">${c.emoji}</div>`;
    
    return `
      <div class="comp-card" onclick="openModal(${c.id})">
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
    <div class="comp-row" onclick="openModal(${c.id})">
      <div class="row-img">${c.emoji}</div>
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
  const c = components.find(comp => comp.id === id);
  if (!c) return;

  const photoImg = c.img ? `<img src="${c.img}" alt="${c.name}" style="max-width:100%; max-height:140px; object-fit:contain;">` : `<div style="font-size:4rem;">${c.emoji}</div>`;
  const schemaImg = c.schematic ? `<img src="${c.schematic}" alt="Schéma ${c.name}" style="max-width:100%; max-height:140px; object-fit:contain; filter: invert(1) hue-rotate(180deg);">` : `<div style="font-size:1.2rem; color:#64748b; font-style:italic;">Aucun schéma disponible</div>`;

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-info">
        <div class="modal-category">// ${c.category}</div>
        <h2>${c.name}</h2>
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 20px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid var(--border);">
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 160px;">
          <span style="font-size: 0.8rem; color: var(--blue-bright); margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">📸 Vue Réelle</span>
          ${photoImg}
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; min-height: 160px; border-left: 1px solid var(--border);">
          <span style="font-size: 0.8rem; color: var(--orange); margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">📐 Symbole Électronique</span>
          ${schemaImg}
        </div>
      </div>

      <div class="modal-grid" style="grid-template-columns: 1fr; margin-bottom: 20px;">
        <div>
          <p>${c.desc}</p>
          <div class="modal-tags" style="margin-top:10px;">${c.tags.map(t => `<span class="modal-tag">${t}</span>`).join('')}</div>
        </div>
      </div>

      <div class="modal-section-title">Caractéristiques techniques</div>
      <div class="modal-specs">
        ${c.specs.map(s => `<div class="spec-card"><div class="spec-label">${s.label}</div><div class="spec-value">${s.value}</div></div>`).join('')}
      </div>

      <div class="modal-section-title">Brochage (Pinout)</div>
      <div class="pin-list">
        ${c.pins.map(p => `<div class="pin-item"><div class="pin-dot" style="background:${p.color}"></div><span class="pin-name">${p.name}</span><span class="pin-role">– ${p.role}</span></div>`).join('')}
      </div>

      <div class="modal-section-title">Exemple de code Arduino</div>
      <pre class="code-block"><code>${c.code}</code></pre>
      
      <div class="modal-actions" style="display: flex; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border, rgba(255,255,255,0.1));">
        <button id="btn-telecharger-texte" style="flex: 1; padding: 12px; background-color: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          📥 Télécharger la fiche (.txt)
        </button>
        <button id="btn-partager-lien" style="padding: 12px 18px; background-color: #1e293b; color: #94a3b8; border: 1px solid #334155; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          🔗 Partager
        </button>
      </div>
    </div>
  `;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Liaison directe des clics aux fonctions texte brut et partage
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

// Méthode 1 réadaptée : Génération d'un fichier .txt propre et sans dépendances
function executerTelechargementTexte(composantData) {
  let contenuFiche = `==================================================\n`;
  contenuFiche += `       NEOLAB-CI : FICHE TECHNIQUE COMPOSANT      \n`;
  contenuFiche += `==================================================\n\n`;
  contenuFiche += `Nom : ${composantData.name} ${composantData.emoji || ''}\n`;
  contenuFiche += `Catégorie : ${composantData.category}\n`;
  contenuFiche += `Description : ${composantData.desc || 'N/A'}\n\n`;

  contenuFiche += `--------------------------------------------------\n`;
  contenuFiche += `CARACTÉRISTIQUES TECHNIQUES :\n`;
  contenuFiche += `--------------------------------------------------\n`;
  if (composantData.specs && composantData.specs.length > 0) {
    composantData.specs.forEach(spec => { contenuFiche += `- ${spec.label} : ${spec.value}\n`; });
  } else {
    contenuFiche += `Aucune spécification renseignée.\n`;
  }

  contenuFiche += `\n--------------------------------------------------\n`;
  contenuFiche += `BROCHAGE (PINOUT) :\n`;
  contenuFiche += `--------------------------------------------------\n`;
  if (composantData.pins && composantData.pins.length > 0) {
    composantData.pins.forEach(pin => { contenuFiche += `- ${pin.name} : ${pin.role}\n`; });
  } else {
    contenuFiche += `Pas de brochage spécifique.\n`;
  }

  contenuFiche += `\n--------------------------------------------------\n`;
  contenuFiche += `EXEMPLE DE CODE ARDUINO :\n`;
  contenuFiche += `--------------------------------------------------\n`;
  if (composantData.code) {
    let codePropre = composantData.code.replace(/<\/?[^>]+(>|$)/g, "");
    codePropre = codePropre.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    contenuFiche += codePropre + `\n`;
  } else {
    contenuFiche += `Aucun code requis pour ce matériel.\n`;
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
  const textePartage = `*NeoLab-CI : Fiche pratique* 🚨\n\n*${composantData.name}* (${composantData.category})\n_${composantData.short}_\n\nRetrouve les caractéristiques et les codes d'exemple ici !`;
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

window.onload = loadComponentsFromHTML;
