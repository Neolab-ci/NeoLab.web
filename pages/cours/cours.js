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

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let courses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentFormat = 'all';
let currentViewMode = 'grid';
let currentUserUid = null;
let currentEleveFiliere = null;
let completedCourses = []; 

// ==========================================
// 1. SESSION, FILIÈRE & GESTION DU THÈME
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    // Gestion du thème clair par défaut / mode sombre
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('theme') || 'light';

    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
        }
    } else {
        document.body.classList.remove('dark-theme');
        if (themeIcon) {
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            if (isDark) {
                localStorage.setItem('theme', 'dark');
                themeIcon.classList.remove('fa-sun');
                themeIcon.classList.add('fa-moon');
            } else {
                localStorage.setItem('theme', 'light');
                themeIcon.classList.remove('fa-moon');
                themeIcon.classList.add('fa-sun');
            }
        });
    }

    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUserUid = user.uid;
            // Récupérer d'abord la filière de l'élève connecté
            db.collection("eleves").doc(currentUserUid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    currentEleveFiliere = (data.filiere_id || "").toLowerCase().trim();
                    console.log("Filière de l'élève détectée :", currentEleveFiliere);
                }
                ecouterCoursParFiliere();
            }).catch(() => {
                ecouterCoursParFiliere();
            });
        } else {
            window.location.href = "../../assets/login/auth.html"; 
        }
    });
});

function ecouterCoursParFiliere() {
    db.collection("cours").onSnapshot((querySnapshot) => {
        courses = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            data.id = String(doc.id); 
            
            // Vérification de correspondance avec la filière de l'élève
            const fId = (data.filiere_id || "").toLowerCase().trim();
            const fIds = Array.isArray(data.filieres_ids) ? data.filieres_ids.map(f => f.toLowerCase().trim()) : [];
            
            // Si l'élève a une filière, on ne garde que les cours de sa filière (ou globaux)
            if (!currentEleveFiliere || fId === currentEleveFiliere || fIds.includes(currentEleveFiliere) || !fId && fIds.length === 0) {
                courses.push(data);
            }
        });
        ecouterProgressionEleve();
    });
}

function ecouterProgressionEleve() {
    if (!currentUserUid) return;
    db.collection("progression_eleves").doc(currentUserUid).onSnapshot((doc) => {
        if (doc.exists && doc.data().completedCourses) {
            completedCourses = doc.data().completedCourses.map(id => String(id));
        } else {
            completedCourses = []; 
        }
        updateCourseUI();
    });
}

// ==========================================
// 2. INTERFACE, CATÉGORIES DYNAMIQUES & FILTRES
// ==========================================
function updateCourseUI() {
    if(document.getElementById('statCoursCount')) document.getElementById('statCoursCount').textContent = `+${courses.length}`;
    
    // Génération dynamique des onglets de catégories basés sur les cours de la filière
    construireOngletsCategoriesDynamiques();
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

function construireOngletsCategoriesDynamiques() {
    const tabsContainer = document.getElementById('levelTabs');
    if (!tabsContainer) return;

    // Extraire toutes les catégories uniques présentes dans les cours de cette filière
    const categoriesMap = {};
    courses.forEach(c => {
        const cat = c.category || "Général";
        categoriesMap[cat] = (categoriesMap[cat] || 0) + 1;
    });

    let html = `
      <button class="cat-tab ${currentCategory === 'all' ? 'active' : ''}" onclick="filterCategory('all', this)">
        🌐 Tous (${courses.length})
      </button>
    `;

    for (const [catName, count] of Object.entries(categoriesMap)) {
        html += `
          <button class="cat-tab ${currentCategory === catName ? 'active' : ''}" onclick="filterCategory('${catName}', this)">
            📚 ${catName} (${count})
          </button>
        `;
    }

    tabsContainer.innerHTML = html;
}

function updateProgressBar() {
    const total = courses.length;
    if (total === 0) return;
    const completedCount = completedCourses.filter(id => courses.some(c => c.id === id)).length;
    const percentage = Math.round((completedCount / total) * 100);
    if(document.getElementById('globalProgressPercent')) document.getElementById('globalProgressPercent').textContent = `${percentage}% (${completedCount}/${total} validés)`;
    if(document.getElementById('globalProgressBar')) document.getElementById('globalProgressBar').style.width = `${percentage}%`;
}

function filterCategory(category, elem) {
    currentCategory = category;
    document.querySelectorAll('#levelTabs .cat-tab').forEach(t => t.classList.remove('active'));
    if(elem) elem.classList.add('active');
    filterCourses();
}

function filterFormat(format, elem) {
    currentFormat = format;
    document.querySelectorAll('.format-filters .fmt-btn').forEach(b => b.classList.remove('active'));
    if(elem) elem.classList.add('active');
    filterCourses();
}

function filterCourses() {
    const search = document.getElementById('searchCourseInput') ? document.getElementById('searchCourseInput').value.toLowerCase() : "";
    const sort = document.getElementById('sortCourseSelect') ? document.getElementById('sortCourseSelect').value : "recent";

    filteredCourses = courses.filter(c => {
        const matchesSearch = (c.title || c.titre || "").toLowerCase().includes(search) || (c.short || c.description || "").toLowerCase().includes(search);
        const matchesCategory = currentCategory === 'all' || c.category === currentCategory;
        const matchesFormat = currentFormat === 'all' || (c.format || (c.videoUrl ? 'video' : 'pdf')) === currentFormat;
        return matchesSearch && matchesCategory && matchesFormat;
    });

    if (sort === 'diff') {
        const diffOrder = { 'Débutant': 1, 'Intermédiaire': 2, 'Avancé': 3 };
        filteredCourses.sort((a, b) => (diffOrder[a.level || 'Débutant'] || 99) - (diffOrder[b.level || 'Débutant'] || 99));
    } else {
        filteredCourses.sort((a, b) => b.id.localeCompare(a.id));
    }

    renderCoursePage();
}

function changeViewMode(mode) {
    currentViewMode = mode;
    const btnGrid = document.getElementById('btnViewGrid');
    const btnList = document.getElementById('btnViewList');
    
    if (btnGrid && btnList) {
        if (mode === 'grid') {
            btnGrid.style.background = "#334155";
            btnGrid.style.color = "white";
            btnList.style.background = "#1e293b";
            btnList.style.color = "#94a3b8";
        } else {
            btnList.style.background = "#334155";
            btnList.style.color = "white";
            btnGrid.style.background = "#1e293b";
            btnGrid.style.color = "#94a3b8";
        }
    }
    renderCoursePage();
}

function renderCoursePage() {
    const container = document.getElementById('coursesGridView');
    if (!container) return;

    if (!filteredCourses.length) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Aucun cours trouvé pour votre filière.</p>';
        return;
    }
    
    if (currentViewMode === 'grid') {
        container.style.display = "grid";
        container.style.gridTemplateColumns = "repeat(auto-fill, minmax(220px, 1fr))";
        container.style.gap = "20px";
    } else {
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.gap = "12px";
    }
    
    container.innerHTML = filteredCourses.map(c => {
        const isVideo = (c.format === "video" || !!c.videoUrl);
        const isCompleted = completedCourses.includes(c.id);
        const displayImg = c.img || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500';
        const titreCours = c.title || c.titre || 'Sans titre';
        const descCours = c.short || c.description || 'Pas de description';

        if (currentViewMode === 'grid') {
            return `
              <div class="comp-card" onclick="openCourseModal('${c.id}')" style="cursor:pointer; position:relative; ${isCompleted ? 'border: 1px solid #22c55e;' : ''}">
                <div class="card-img" style="position:relative; height:120px; background-image: url('${displayImg}'); background-size: cover; background-position: center;">
                  <span style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:3px 6px; border-radius:4px; font-size:10px; color:white;">${isVideo ? '🎥 VIDÉO' : '📄 PDF'}</span>
                  ${isCompleted ? '<span style="position:absolute; bottom:10px; left:10px; background:#22c55e; color:white; padding:3px 6px; border-radius:4px; font-size:10px;">✅ VALIDÉ</span>' : ''}
                  <span class="card-badge passif" style="position:absolute; top:10px; right:10px;">${c.level || 'Débutant'}</span>
                </div>
                <div class="card-body" style="padding:15px;">
                  <div style="font-size:11px; color:#38bdf8; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">${c.category || 'Général'}</div>
                  <h3 style="margin:0 0 8px 0; font-size:15px; color:var(--text-main);">${titreCours}</h3>
                  <p style="font-size:12px; color:var(--text-muted); margin:0; line-height:1.4;">${descCours}</p>
                </div>
              </div>
            `;
        } else {
            return `
              <div class="comp-card-list" onclick="openCourseModal('${c.id}')" style="cursor:pointer; display:flex; align-items:center; background:var(--bg-card); border-radius:8px; padding:10px; gap:15px; border:1px solid var(--border); ${isCompleted ? 'border-left: 4px solid #22c55e;' : ''}">
                <div style="width:80px; height:60px; background-image: url('${displayImg}'); background-size: cover; background-position: center; border-radius:6px; flex-shrink:0; position:relative;">
                  <span style="position:absolute; bottom:2px; right:2px; background:rgba(0,0,0,0.8); padding:2px 4px; border-radius:3px; font-size:8px; color:white;">${isVideo ? '🎥' : '📄'}</span>
                </div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:2px;">
                    <span style="font-size:10px; color:#38bdf8; font-weight:bold; text-transform:uppercase;">${c.category || 'Général'}</span>
                    <span style="font-size:9px; background:var(--border); color:var(--text-main); padding:1px 4px; border-radius:3px;">${c.level || 'Débutant'}</span>
                    ${isCompleted ? '<span style="font-size:9px; color:#22c55e; font-weight:bold;">✅ Validé</span>' : ''}
                  </div>
                  <h3 style="margin:0 0 2px 0; font-size:14px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${titreCours}</h3>
                  <p style="font-size:11px; color:var(--text-muted); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${descCours}</p>
                </div>
                <div style="color:var(--text-muted); padding-right:5px;">➔</div>
              </div>
            `;
        }
    }).join('');
}

// ==========================================
// 3. AFFICHAGE DE LA MODAL DU COURS
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
        modalContent.onclick = (e) => e.stopPropagation();
        
        modalOverlay.appendChild(modalContent);
        document.body.appendChild(modalOverlay);
    }

    const isVideo = (c.format === "video" || !!c.videoUrl);
    const isCompleted = completedCourses.includes(c.id);
    const mediaLien = isVideo ? c.videoUrl : (c.pdf || "#");
    const titreCours = c.title || c.titre || 'Sans titre';
    const descCours = c.short || c.description || '';

    document.getElementById('modalContent').innerHTML = `
        <div class="modal-header">
          <div>
            <div style="font-size:11px; color:#38bdf8;">// ${c.category?.toUpperCase() || 'GÉNÉRAL'}</div>
            <h2 style="font-size: 17px; color: var(--text-main); margin-top:2px;">${titreCours}</h2>
          </div>
          <button class="modal-close" onclick="closeCourseModal()">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 15px;">${descCours}</p>

          <div id="mediaPlayerContainer" style="display: none; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #000;">
            <div id="mediaPlaceholder"></div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button id="btn-action-principal" style="flex:1; padding:10px; background:#f97316; color:white; border-radius:6px; font-weight:bold; font-size:13px; cursor:pointer;">
              ${isVideo ? '▶️ Visionner la vidéo' : '📖 Consulter le cours (PDF)'}
            </button>
          </div>

          <div id="quizSection" style="padding:15px; background:var(--bg-main); border-radius:8px; border:1px dashed ${isCompleted ? '#22c55e' : '#f97316'};">
            ${isCompleted ? `
              <div style="color:#22c55e; text-align:center; font-weight:bold;">🎉 Module validé avec succès !</div>
            ` : c.questions && c.questions.length > 0 ? `
              <h4 style="color:var(--text-main); font-size:14px; margin-bottom:10px;">🧠 Validation du module</h4>
              <form id="courseQuizForm">
                ${c.questions.map((q, qIndex) => `
                  <div style="margin-bottom: 12px;">
                    <p style="font-size:12px; color:var(--text-main); margin-bottom:4px;">${qIndex + 1}. ${q.q}</p>
                    ${q.options.map((opt, optIndex) => `
                      <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-muted); background:var(--bg-card); padding:6px; margin-bottom:4px; border-radius:4px; cursor:pointer; border:1px solid var(--border);">
                        <input type="radio" name="question_${qIndex}" value="${optIndex}" required> ${opt}
                      </label>
                    `).join('')}
                  </div>
                `).join('')}
                <button type="button" onclick="submitCourseQuiz('${c.id}')" style="width:100%; padding:8px; background:#22c55e; color:white; border-radius:6px; font-weight:bold; cursor:pointer;">Envoyer les réponses</button>
              </form>
            ` : `
              <button onclick="forceCompleteCourse('${c.id}')" style="width:100%; padding:8px; background:#475569; color:white; border-radius:4px; cursor:pointer;">Marquer comme terminé</button>
            `}
          </div>
        </div>
    `;
    
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const btnAction = document.getElementById('btn-action-principal');
    btnAction.onclick = function() {
        const mediaContainer = document.getElementById('mediaPlayerContainer');
        const mediaPlaceholder = document.getElementById('mediaPlaceholder');

        if (isVideo) {
            if (mediaContainer.style.display === "none") {
                mediaContainer.style.display = "block";
                let embed = mediaLien.includes("watch?v=") ? mediaLien.replace("watch?v=", "embed/") : mediaLien;
                mediaPlaceholder.innerHTML = `<iframe src="${embed}?autoplay=1" style="width:100%; height:220px; border:none;"></iframe>`;
                btnAction.innerHTML = "⏹️ Arrêter la vidéo";
                btnAction.style.backgroundColor = "#ef4444";
            } else {
                mediaContainer.style.display = "none";
                mediaPlaceholder.innerHTML = "";
                btnAction.innerHTML = "▶️ Visionner la vidéo";
                btnAction.style.backgroundColor = "#f97316";
            }
        } else {
            if (!mediaLien || mediaLien === "#") {
                alert("Aucun fichier PDF rattaché.");
                return;
            }

            if (mediaContainer.style.display === "none") {
                mediaContainer.style.display = "block";
                mediaPlaceholder.innerHTML = `
                    <object data="${mediaLien}" type="application/pdf" style="width:100%; height:500px; border-radius:6px;">
                        <embed src="${mediaLien}" type="application/pdf" style="width:100%; height:500px; border-radius:6px;" />
                    </object>
                `;
                btnAction.innerHTML = "👁️ Masquer le cours";
                btnAction.style.backgroundColor = "#475569";
            } else {
                mediaContainer.style.display = "none";
                mediaPlaceholder.innerHTML = "";
                btnAction.innerHTML = "📖 Consulter le cours (PDF)";
                btnAction.style.backgroundColor = "#f97316";
            }
        }
    };
}

function submitCourseQuiz(courseId) {
    const c = courses.find(course => course.id === courseId);
    if (!c || !currentUserUid) return;

    let correctCount = 0;
    for (let i = 0; i < c.questions.length; i++) {
        const selected = document.querySelector(`input[name="question_${i}"]:checked`);
        if (selected && parseInt(selected.value) === c.questions[i].correct) correctCount++;
    }

    if (correctCount >= Math.ceil(c.questions.length * 0.66)) {
        if (!completedCourses.includes(courseId)) {
            const nouvelleListe = [...completedCourses, courseId];
            db.collection("progression_eleves").doc(currentUserUid).set({ completedCourses: nouvelleListe }, { merge: true })
            .then(() => {
                alert("🎉 Module validé !");
                openCourseModal(courseId); 
            });
        }
    } else {
        alert("❌ Score insuffisant. Révise encore !");
    }
}

function forceCompleteCourse(courseId) {
    if (!completedCourses.includes(courseId) && currentUserUid) {
        const nouvelleListe = [...completedCourses, courseId];
        db.collection("progression_eleves").doc(currentUserUid).set({ completedCourses: nouvelleListe }, { merge: true })
        .then(() => openCourseModal(courseId));
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