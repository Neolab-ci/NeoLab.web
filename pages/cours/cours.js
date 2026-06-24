let courses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentFormat = 'all';

// Variables de gestion de la pagination
let currentPage = 1;
const itemsPerPage = 10;

// Tableau contenant les IDs des cours terminés (sauvegardé dans le téléphone)
let completedCourses = JSON.parse(localStorage.getItem('neoLabCompletedCourses')) || [];

function loadCoursesFromHTML() {
  const template = document.getElementById('course-data');
  if (!template) return;
  const divs = template.content.querySelectorAll('.json-course');
  courses = Array.from(divs).map(div => JSON.parse(div.textContent.trim()));
  updateCourseUI();
}

function updateCourseUI() {
  // 1. Mise à jour des badges et compteurs statistiques principaux
  if(document.getElementById('statCoursCount')) {
    document.getElementById('statCoursCount').textContent = `+${courses.length}`;
  }
  if(document.getElementById('countAllCours')) {
    document.getElementById('countAllCours').textContent = courses.length;
  }
  
  // 2. Filtrage des compteurs par thématique
  if(document.getElementById('countElectro')) {
    document.getElementById('countElectro').textContent = courses.filter(c => c.category === 'Électronique').length;
  }
  if(document.getElementById('countTechno')) {
    document.getElementById('countTechno').textContent = courses.filter(c => c.category === 'Technologie').length;
  }
  if(document.getElementById('countTP')) {
    document.getElementById('countTP').textContent = courses.filter(c => c.category === 'TP').length;
  }
  
  // 3. Calcul et affichage de la barre de progression globale
  updateProgressBar();

  // 4. Liaison des actions de recherche et de tri
  const searchInput = document.getElementById('searchCourseInput');
  const sortSelect = document.getElementById('sortCourseSelect');

  if(searchInput) searchInput.addEventListener('input', filterCourses);
  if(sortSelect) sortSelect.addEventListener('change', filterCourses);

  filterCourses();
}

function updateProgressBar() {
  const total = courses.length;
  if (total === 0) return;
  const completedCount = completedCourses.filter(id => courses.some(c => c.id === id)).length;
  const percentage = Math.round((completedCount / total) * 100);
  
  const textElem = document.getElementById('globalProgressPercent');
  const barElem = document.getElementById('globalProgressBar');
  
  if(textElem) textElem.textContent = `${percentage}% (${completedCount}/${total} validés)`;
  if(barElem) barElem.style.width = `${percentage}%`;
}

function filterCategory(category, elem) {
  currentCategory = category;
  document.querySelectorAll('#levelTabs .cat-tab').forEach(t => t.classList.remove('active'));
  if(elem) elem.classList.add('active');
  currentPage = 1; 
  filterCourses();
}

function filterFormat(format, elem) {
  currentFormat = format;
  document.querySelectorAll('.format-filters .fmt-btn').forEach(b => b.classList.remove('active'));
  if(elem) elem.classList.add('active');
  currentPage = 1;
  filterCourses();
}

function filterCourses() {
  const searchInput = document.getElementById('searchCourseInput');
  const sortSelect = document.getElementById('sortCourseSelect');
  
  const search = searchInput ? searchInput.value.toLowerCase() : "";
  const sort = sortSelect ? sortSelect.value : "recent";

  filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(search) || c.short.toLowerCase().includes(search);
    const matchesCategory = currentCategory === 'all' || c.category === currentCategory;
    const courseFormat = c.format || 'pdf';
    const matchesFormat = currentFormat === 'all' || courseFormat === currentFormat;
    return matchesSearch && matchesCategory && matchesFormat;
  });

  if (sort === 'diff') {
    const diffOrder = { 'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3 };
    filteredCourses.sort((a, b) => {
      const orderA = diffOrder[a.level] || 99;
      const orderB = diffOrder[b.level] || 99;
      return orderA - orderB;
    });
  } else if (sort === 'recent') {
    filteredCourses.sort((a, b) => b.id - a.id);
  }

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = 1;

  renderCoursePage();
  renderCoursePagination(totalPages);
}

function renderCoursePage() {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredCourses.slice(startIndex, endIndex);

  const container = document.getElementById('coursesGridView');
  if (!container) return;

  if (!pageItems.length) {
    container.innerHTML = '<div class="empty-state" style="text-align:center; padding:40px; color:#64748b;"><div style="font-size:40px;">🔍</div><p>Aucun cours ou vidéo trouvé</p></div>';
    return;
  }
  
  container.innerHTML = pageItems.map(c => {
    const isVideo = (c.format === "video");
    const isCompleted = completedCourses.includes(c.id);
    return `
      <div class="comp-card" onclick="openCourseModal(${c.id})" style="cursor:pointer; position:relative; ${isCompleted ? 'border: 1px solid #22c55e;' : ''}">
        <div class="card-img" style="position:relative; height:120px; background-image: url('${c.img}'); background-size: cover; background-position: center; border-bottom: 1px solid var(--border);">
          <span style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:3px 6px; border-radius:4px; font-size:10px;">${isVideo ? '🎥 VIDÉO' : '📄 PDF'}</span>
          
          ${isCompleted ? '<span style="position:absolute; bottom:10px; left:10px; background:#22c55e; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">✅ VALIDÉ</span>' : ''}
          
          <span class="card-badge ${c.badge || 'passif'}" style="position:absolute; top:10px; right:10px;">${c.level}</span>
        </div>
        <div class="card-body" style="padding:15px;">
          <div style="font-size:11px; color:var(--brand-blue); font-weight:bold; text-transform:uppercase; margin-bottom:4px;">${c.category}</div>
          <h3 class="card-title" style="margin:0 0 8px 0; font-size:15px; color:#f8fafc; line-height:1.3;">${c.title}</h3>
          <p class="card-desc" style="font-size:12px; color:#94a3b8; margin:0; line-height:1.4;">${c.short}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderCoursePagination(totalPages) {
  const paginationContainer = document.querySelector('.pagination');
  if (!paginationContainer) return;

  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    return;
  }

  let html = '';
  const prevDisabled = currentPage === 1 ? 'disabled' : '';
  html += `<button class="pg-btn" ${prevDisabled} onclick="changeCoursePage(${currentPage - 1})">←</button>`;

  for (let i = 1; i <= totalPages; i++) {
    const activeClass = i === currentPage ? 'active' : '';
    html += `<button class="pg-btn ${activeClass}" onclick="changeCoursePage(${i})">${i}</button>`;
  }

  const nextDisabled = currentPage === totalPages ? 'disabled' : '';
  html += `<button class="pg-btn ${nextDisabled} onclick="changeCoursePage(${currentPage + 1})">→</button>`;

  paginationContainer.innerHTML = html;
}

function changeCoursePage(page) {
  currentPage = page;
  renderCoursePage();
  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  renderCoursePagination(totalPages);
  const tabsElem = document.getElementById('levelTabs');
  if(tabsElem) tabsElem.scrollIntoView({ behavior: 'smooth' });
}

function openCourseModal(id) {
  const c = courses.find(course => course.id === id);
  if (!c) return;

  let modalOverlay = document.getElementById('modalOverlay');
  
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'modalOverlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.onclick = closeCourseModal;
    
    const modalContent = document.createElement('div');
    modalContent.id = 'modalContent';
    modalContent.className = 'modal-content';
    modalContent.onclick = function(e) { e.stopPropagation(); };
    
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
  }

  const isVideo = (c.format === "video");
  const isCompleted = completedCourses.includes(c.id);

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-info">
        <div class="modal-category">// DOMAINE : ${c.category.toUpperCase()} (${c.level.toUpperCase()})</div>
        <h2 style="margin: 4px 0 0 0; font-size: 17px; color: #f8fafc; line-height:1.3;">${c.title}</h2>
      </div>
      <button class="modal-close" onclick="closeCourseModal()">✕</button>
    </div>
    <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.4; margin: 0 0 16px 0;">
        ${c.short}
      </p>

      <div id="mediaPlayerContainer" style="display: none; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #000; position: relative;">
        <div id="mediaPlaceholder"></div>
      </div>
      
      <div class="modal-actions" style="display: flex; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border);">
        <button id="btn-action-principal" style="flex: 1; padding: 10px; background-color: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          ${isVideo ? '▶️ Lancer la vidéo' : '📖 Ouvrir le document'}
        </button>
        
        ${!isVideo ? `
        <a id="btn-telecharger-pdf" href="${c.pdf}" download style="flex: 1; padding: 10px; background-color: #0284c7; color: white; border-radius: 6px; text-decoration: none; text-align: center; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          📥 Télécharger (PDF)
        </a>
        ` : '' }
      </div>

      <div id="quizSection" style="margin-top: 20px; padding: 15px; background: #1e293b; border-radius: 8px; border: 1px dashed ${isCompleted ? '#22c55e' : '#f97316'};">
        ${isCompleted ? `
          <div style="color: #22c55e; text-align: center; font-weight: bold; font-size: 14px;">
            🎉 Module validé avec succès ! Tu as parfaitement maîtrisé ce cours.
          </div>
        ` : c.questions && c.questions.length > 0 ? `
          <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #f8fafc;">🧠 Quiz de validation (Seuil : 2/3 bonnes réponses)</h4>
          <form id="courseQuizForm">
            ${c.questions.map((q, qIndex) => `
              <div style="margin-bottom: 14px;">
                <p style="font-size: 12px; color: #e2e8f0; margin: 0 0 6px 0; font-weight: 500;">${qIndex + 1}. ${q.q}</p>
                <div style="display: flex; flex-direction: column; gap: 6px;">
                  ${q.options.map((opt, optIndex) => `
                    <label style="font-size: 12px; color: #94a3b8; display: flex; align-items: center; gap: 8px; cursor: pointer; background: #0f172a; padding: 6px 10px; border-radius: 4px; border: 1px solid #334155;">
                      <input type="radio" name="question_${qIndex}" value="${optIndex}" required style="accent-color: #f97316;">
                      ${opt}
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
            <button type="button" onclick="submitCourseQuiz(${c.id})" style="width: 100%; padding: 8px; background: #22c55e; color: white; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px;">
              ✔️ Soumettre mes réponses pour validation
            </button>
          </form>
        ` : `
          <div style="color: #94a3b8; text-align: center; font-size: 12px;">
            ⚠️ Aucune question de validation disponible pour ce module.
            <button onclick="forceCompleteCourse(${c.id})" style="margin-top: 8px; display: block; width: 100%; padding: 6px; background: #475569; color: white; border: none; border-radius: 4px; cursor: pointer;">Marquer comme terminé</button>
          </div>
        `}
      </div>

    </div>
  `;
  
  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  const btnAction = document.getElementById('btn-action-principal');
  const mediaContainer = document.getElementById('mediaPlayerContainer');
  const mediaPlaceholder = document.getElementById('mediaPlaceholder');

  btnAction.onclick = function() {
    if (mediaContainer.style.display === "none") {
      mediaContainer.style.display = "block";
      if (isVideo) {
        mediaPlaceholder.innerHTML = `<iframe src="${c.videoUrl}?autoplay=1&rel=0&showinfo=0" style="width: 100%; height: 210px; border: none; border-radus: 6px" allow="accelerometer; clipboard-write; encrypte-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        btnAction.innerHTML = "⏹️ Arrêter la vidéo";
        btnAction.style.backgroundColor = "#ef4444";
      } else {
        mediaPlaceholder.innerHTML = `<iframe src="${c.pdf}" style="width: 100%; height: 450px; border: none;"></iframe>`;
        btnAction.innerHTML = "👁️ Masquer le lecteur";
        btnAction.style.backgroundColor = "#475569";
      }
    } else {
      mediaContainer.style.display = "none";
      mediaPlaceholder.innerHTML = "";
      btnAction.innerHTML = isVideo ? "▶️ Lancer la vidéo" : "📖 Ouvrir le document";
      btnAction.style.backgroundColor = "#f97316";
    }
  };
}

// Fonction de traitement du mini-quiz anti-triche
function submitCourseQuiz(courseId) {
  const c = courses.find(course => course.id === courseId);
  if (!c || !c.questions) return;

  let correctCount = 0;
  
  // Analyse des réponses données par l'élève
  for (let i = 0; i < c.questions.length; i++) {
    const selected = document.querySelector(`input[name="question_${i}"]:checked`);
    if (selected) {
      if (parseInt(selected.value) === c.questions[i].correct) {
        correctCount++;
      }
    }
  }

  // Règle de validation anticheat : au moins 2 bonnes réponses sur 3
  if (correctCount >= 2) {
    if (!completedCourses.includes(courseId)) {
      completedCourses.push(courseId);
      localStorage.setItem('neoLabCompletedCourses', JSON.stringify(completedCourses));
    }
    
    // Alerte succès et rechargement des visuels
    alert(`🎉 Félicitations ! Tu as obtenu ${correctCount}/${c.questions.length}. Le cours est validé et comptabilisé !`);
    updateCourseUI();
    openCourseModal(courseId); // Rafraîchit la vue de la boîte modale
  } else {
    alert(`❌ Échec de validation (${correctCount}/${c.questions.length} bonne(s) réponse(s)). Relecture conseillée ! Tu dois obtenir au moins 2 bonnes réponses.`);
  }
}

function forceCompleteCourse(courseId) {
  if (!completedCourses.includes(courseId)) {
    completedCourses.push(courseId);
    localStorage.setItem('neoLabCompletedCourses', JSON.stringify(completedCourses));
    updateCourseUI();
    openCourseModal(courseId);
  }
}

function closeCourseModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  if (modalOverlay) {
    const mediaPlaceholder = document.getElementById('mediaPlaceholder');
    if (mediaPlaceholder) mediaPlaceholder.innerHTML = "";
    modalOverlay.classList.remove('open');
  }
  document.body.style.overflow = '';
}

window.onload = loadCoursesFromHTML;
