// ==========================================
// CONFIGURATION FIREBASE INITIALISATION
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBRGYbiSp26ba_cxj7REHKkOqSylQf1DfQ",
    authDomain: "neolab-ci.firebaseapp.com",
    projectId: "neolab-ci",
    storageBucket: "neolab-ci.firebasestorage.app",
    messagingSenderId: "121581894561",
    appId: "1:121581894561:web:c2056aa29364fce97a69e0"
};

// Initialisation sécurisée de Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// ==========================================
// VARIABLES GLOBALES DE GESTION DES COURS
// ==========================================
let courses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentFormat = 'all';
let currentPage = 1;
const itemsPerPage = 10;

// Variables Session Firebase & Progression
let currentUserUid = null;
let completedCourses = []; 

// ==========================================
// 1. INITIALISATION ET GESTION DE LA SESSION
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUserUid = user.uid;
            console.log("Élève connecté, UID :", currentUserUid);
            
            // Étape 1 : Écouter les cours en TEMPS RÉEL (onSnapshot)
            ecouterCoursEnTempsReel();
        } else {
            console.log("Aucun élève connecté. Redirection...");
            window.location.href = "../../assets/login/auth.html"; 
        }
    });
});

// ==========================================
// 2. CHARGEMENT DES DONNÉES EN TEMPS RÉEL (FIRESTORE)
// ==========================================
function ecouterCoursEnTempsReel() {
    // Changement ici : on passe en onSnapshot pour que l'apparition soit instantanée sans rafraîchir
    db.collection("cours").onSnapshot((querySnapshot) => {
        courses = [];
        querySnapshot.forEach((doc) => {
            courses.push(doc.data());
        });
        
        console.log(`${courses.length} cours synchronisés depuis Firestore.`);
        
        // Étape 2 : Écouter la progression de l'élève connecté
        ecouterProgressionEleve();
    }, (error) => {
        console.error("Erreur lors de l'écoute des cours :", error);
    });
}

function ecouterProgressionEleve() {
    if (!currentUserUid) return;

    db.collection("progression_eleves").doc(currentUserUid)
    .onSnapshot((doc) => {
        if (doc.exists && doc.data().completedCourses) {
            completedCourses = doc.data().completedCourses;
        } else {
            completedCourses = []; 
        }
        
        // Étape 3 : Mettre à jour l'affichage de l'interface utilisateur
        updateCourseUI();
    }, (error) => {
        console.error("Erreur d'écoute de la progression :", error);
    });
}

// ==========================================
// 3. LOGIQUE D'AFFICHAGE & FILTRES
// ==========================================
function updateCourseUI() {
  if(document.getElementById('statCoursCount')) {
    document.getElementById('statCoursCount').textContent = `+${courses.length}`;
  }
  if(document.getElementById('countAllCours')) {
    document.getElementById('countAllCours').textContent = courses.length;
  }
  if(document.getElementById('countElectro')) {
    document.getElementById('countElectro').textContent = courses.filter(c => c.category === 'Électronique').length;
  }
  if(document.getElementById('countTechno')) {
    document.getElementById('countTechno').textContent = courses.filter(c => c.category === 'Technologie').length;
  }
  if(document.getElementById('countTP')) {
    document.getElementById('countTP').textContent = courses.filter(c => c.category === 'TP').length;
  }
  
  updateProgressBar();

  const searchInput = document.getElementById('searchCourseInput');
  const sortSelect = document.getElementById('sortCourseSelect');

  if(searchInput && !searchInput.dataset.listener) {
    searchInput.addEventListener('input', filterCourses);
    searchInput.dataset.listener = "true";
  }
  if(sortSelect && !sortSelect.dataset.listener) {
    sortSelect.addEventListener('change', filterCourses);
    sortSelect.dataset.listener = "true";
  }

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
    // Ajout de replis sécurisés (|| "") au cas où certains vieux documents n'ont pas les champs
    const titleText = c.title || c.titre || "";
    const shortText = c.short || c.description || "";
    
    const matchesSearch = titleText.toLowerCase().includes(search) || shortText.toLowerCase().includes(search);
    const matchesCategory = currentCategory === 'all' || (c.category || "Électronique") === currentCategory;
    const courseFormat = c.format || (c.videoUrl ? 'video' : 'pdf');
    const matchesFormat = currentFormat === 'all' || courseFormat === currentFormat;
    
    return matchesSearch && matchesCategory && matchesFormat;
  });

  if (sort === 'diff') {
    const diffOrder = { 'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3 };
    filteredCourses.sort((a, b) => (diffOrder[a.level || a.niveau] || 99) - (diffOrder[b.level || b.niveau] || 99));
  } else if (sort === 'recent') {
    filteredCourses.sort((a, b) => (b.id || 0) - (a.id || 0));
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
    const courseId = c.id || 0;
    const isVideo = (c.format === "video" || !!c.videoUrl);
    const isCompleted = completedCourses.includes(courseId);
    const displayImg = c.img || c.imageURL || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500";
    const displayTitle = c.title || c.titre || "Cours sans titre";
    const displayShort = c.short || c.description || "Aucune description fournie.";
    const displayCategory = c.category || "Électronique";
    const displayLevel = c.level || c.niveau || "Débutant";

    return `
      <div class="comp-card" onclick="openCourseModal(${courseId})" style="cursor:pointer; position:relative; ${isCompleted ? 'border: 1px solid #22c55e;' : ''}">
        <div class="card-img" style="position:relative; height:120px; background-image: url('${displayImg}'); background-size: cover; background-position: center; border-bottom: 1px solid var(--border);">
          <span style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:3px 6px; border-radius:4px; font-size:10px; color:white;">${isVideo ? '🎥 VIDÉO' : '📄 PDF'}</span>
          ${isCompleted ? '<span style="position:absolute; bottom:10px; left:10px; background:#22c55e; color:white; padding:3px 6px; border-radius:4px; font-size:10px; font-weight:bold;">✅ VALIDÉ</span>' : ''}
          <span class="card-badge ${c.badge || 'passif'}" style="position:absolute; top:10px; right:10px;">${displayLevel}</span>
        </div>
        <div class="card-body" style="padding:15px;">
          <div style="font-size:11px; color:#3b82f6; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">${displayCategory}</div>
          <h3 class="card-title" style="margin:0 0 8px 0; font-size:15px; color:#f8fafc; line-height:1.3;">${displayTitle}</h3>
          <p class="card-desc" style="font-size:12px; color:#94a3b8; margin:0; line-height:1.4;">${displayShort}</p>
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

// ==========================================
// 4. GESTION DE LA MODAL ET DU QUIZ
// ==========================================
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

  const isVideo = (c.format === "video" || !!c.videoUrl);
  const isCompleted = completedCourses.includes(c.id);
  const mediaLien = c.pdf || c.videoUrl || c.mediaURL || "#";
  const displayTitle = c.title || c.titre || "Cours sans titre";
  const displayShort = c.short || c.description || "";
  const displayCategory = c.category || "Électronique";
  const displayLevel = c.level || c.niveau || "Débutant";

  document.getElementById('modalContent').innerHTML = `
    <div class="modal-header">
      <div class="modal-info">
        <div class="modal-category">// DOMAINE : ${displayCategory.toUpperCase()} (${displayLevel.toUpperCase()})</div>
        <h2 style="margin: 4px 0 0 0; font-size: 17px; color: #f8fafc; line-height:1.3;">${displayTitle}</h2>
      </div>
      <button class="modal-close" onclick="closeCourseModal()">✕</button>
    </div>
    <div class="modal-body" style="max-height: 80vh; overflow-y: auto;">
      
      <p style="color: #94a3b8; font-size: 13px; line-height: 1.4; margin: 0 0 16px 0;">
        ${displayShort}
      </p>

      <div id="mediaPlayerContainer" style="display: none; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #000; position: relative;">
        <div id="mediaPlaceholder"></div>
      </div>
      
      <div class="modal-actions" style="display: flex; gap: 10px; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border);">
        <button id="btn-action-principal" style="flex: 1; padding: 10px; background-color: #f97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          ${isVideo ? '▶️ Lancer la vidéo' : '📖 Ouvrir le document'}
        </button>
        
        ${!isVideo ? `
        <a id="btn-telecharger-pdf" href="${mediaLien}" download style="flex: 1; padding: 10px; background-color: #0284c7; color: white; border-radius: 6px; text-decoration: none; text-align: center; font-weight: bold; font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 6px;">
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
        // Support des URLs youtube embed directes ou classiques
        let videoSrc = c.videoUrl || c.mediaURL;
        if(videoSrc.includes("watch?v=")) {
            videoSrc = videoSrc.replace("watch?v=", "embed/");
        }
        mediaPlaceholder.innerHTML = `<iframe src="${videoSrc}?autoplay=1&rel=0&showinfo=0" style="width: 100%; height: 210px; border: none; border-radius: 6px" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
        btnAction.innerHTML = "⏹️ Arrêter la vidéo";
        btnAction.style.backgroundColor = "#ef4444";
      } else {
        mediaPlaceholder.innerHTML = `<iframe src="${mediaLien}" style="width: 100%; height: 450px; border: none;"></iframe>`;
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

// Enregistrement de la validation sur Firebase Firestore
function submitCourseQuiz(courseId) {
  const c = courses.find(course => course.id === courseId);
  if (!c || !c.questions || !currentUserUid) return;

  let correctCount = 0;
  
  for (let i = 0; i < c.questions.length; i++) {
    const selected = document.querySelector(`input[name="question_${i}"]:checked`);
    if (selected && parseInt(selected.value) === c.questions[i].correct) {
      correctCount++;
    }
  }

  const scoreRequis = Math.ceil(c.questions.length * 0.66);

  if (correctCount >= scoreRequis) {
    if (!completedCourses.includes(courseId)) {
      const nouvelleListe = [...completedCourses, courseId];
      
      db.collection("progression_eleves").doc(currentUserUid).set({
          completedCourses: nouvelleListe
      }, { merge: true })
      .then(() => {
          alert(`🎉 Félicitations ! Score : ${correctCount}/${c.questions.length}. Le cours est officiellement validé sur ton profil NeoLab-CI !`);
          openCourseModal(courseId); 
      })
      .catch((err) => {
          console.error("Erreur de sauvegarde de progression :", err);
      });
    } else {
       openCourseModal(courseId);
    }
  } else {
    alert(`❌ Échec de validation (${correctCount}/${c.questions.length} correct). Révise encore un peu !`);
  }
}

function forceCompleteCourse(courseId) {
  if (!completedCourses.includes(courseId) && currentUserUid) {
    const nouvelleListe = [...completedCourses, courseId];
    db.collection("progression_eleves").doc(currentUserUid).set({
        completedCourses: nouvelleListe
    }, { merge: true })
    .then(() => {
        openCourseModal(courseId);
    });
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