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

// ==========================================
// VARIABLES GLOBALES
// ==========================================
let courses = [];
let filteredCourses = [];
let currentCategory = 'all';
let currentFormat = 'all';
let currentPage = 1;
const itemsPerPage = 10;
let currentUserUid = null;
let completedCourses = []; 

// ==========================================
// 1. SESSION & SYNC EN TEMPS RÉEL
// ==========================================
document.addEventListener("DOMContentLoaded", function () {
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            currentUserUid = user.uid;
            ecouterCoursEnTempsReel();
        } else {
            window.location.href = "../../assets/login/auth.html"; 
        }
    });
});

function ecouterCoursEnTempsReel() {
    db.collection("cours").onSnapshot((querySnapshot) => {
        courses = [];
        querySnapshot.forEach((doc) => {
            let data = doc.data();
            // L'ID devient STRICTEMENT l'identifiant de document généré par Firebase
            data.id = String(doc.id); 
            courses.push(data);
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
// 2. INTERFACE & FILTRES
// ==========================================
function updateCourseUI() {
    if(document.getElementById('statCoursCount')) document.getElementById('statCoursCount').textContent = `+${courses.length}`;
    if(document.getElementById('countAllCours')) document.getElementById('countAllCours').textContent = courses.length;
    if(document.getElementById('countElectro')) document.getElementById('countElectro').textContent = courses.filter(c => c.category === 'Électronique').length;
    if(document.getElementById('countInfo')) document.getElementById('countInfo').textContent = courses.filter(c => c.category === 'Informatique').length;
    if(document.getElementById('countBiomed')) document.getElementById('countBiomed').textContent = courses.filter(c => c.category === 'Biomédicale').length;
    if(document.getElementById('countReseaux')) document.getElementById('countReseaux').textContent = courses.filter(c => c.category === 'Réseaux & Sécurité').length;
    if(document.getElementById('countRobot')) document.getElementById('countRobot').textContent = courses.filter(c => c.category === 'Robotique').length;
    if(document.getElementById('countTP')) document.getElementById('countTP').textContent = courses.filter(c => c.category === 'TP').length;
    
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
    if(document.getElementById('globalProgressPercent')) document.getElementById('globalProgressPercent').textContent = `${percentage}% (${completedCount}/${total} validés)`;
    if(document.getElementById('globalProgressBar')) document.getElementById('globalProgressBar').style.width = `${percentage}%`;
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
    const search = document.getElementById('searchCourseInput') ? document.getElementById('searchCourseInput').value.toLowerCase() : "";
    const sort = document.getElementById('sortCourseSelect') ? document.getElementById('sortCourseSelect').value : "recent";

    filteredCourses = courses.filter(c => {
        const matchesSearch = (c.title || "").toLowerCase().includes(search) || (c.short || "").toLowerCase().includes(search);
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

function renderCoursePage() {
    const container = document.getElementById('coursesGridView');
    if (!container) return;

    if (!filteredCourses.length) {
        container.innerHTML = '<p style="text-align:center; color:#64748b; padding:20px;">Aucun cours trouvé</p>';
        return;
    }
    
    container.innerHTML = filteredCourses.map(c => {
        const isVideo = (c.format === "video" || !!c.videoUrl);
        const isCompleted = completedCourses.includes(c.id);

        return `
          <div class="comp-card" onclick="openCourseModal('${c.id}')" style="cursor:pointer; position:relative; ${isCompleted ? 'border: 1px solid #22c55e;' : ''}">
            <div class="card-img" style="position:relative; height:120px; background-image: url('${c.img || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500'}'); background-size: cover; background-position: center;">
              <span style="position:absolute; top:10px; left:10px; background:rgba(0,0,0,0.7); padding:3px 6px; border-radius:4px; font-size:10px; color:white;">${isVideo ? '🎥 VIDÉO' : '📄 PDF'}</span>
              ${isCompleted ? '<span style="position:absolute; bottom:10px; left:10px; background:#22c55e; color:white; padding:3px 6px; border-radius:4px; font-size:10px;">✅ VALIDÉ</span>' : ''}
              <span class="card-badge passif" style="position:absolute; top:10px; right:10px;">${c.level || 'Débutant'}</span>
            </div>
            <div class="card-body" style="padding:15px;">
              <div style="font-size:11px; color:#3b82f6; font-weight:bold; text-transform:uppercase; margin-bottom:4px;">${c.category || 'Électronique'}</div>
              <h3 style="margin:0 0 8px 0; font-size:15px; color:#f8fafc;">${c.title || 'Sans titre'}</h3>
              <p style="font-size:12px; color:#94a3b8; margin:0; line-height:1.4;">${c.short || 'Pas de description'}</p>
            </div>
          </div>
        `;
    }).join('');
}

// ==========================================
// 3. AFFICHAGE DE LA MODAL DU COURS SÉLECTIONNÉ
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

    document.getElementById('modalContent').innerHTML = `
        <div class="modal-header">
          <div>
            <div style="font-size:11px; color:#3b82f6;">// ${c.category?.toUpperCase()}</div>
            <h2 style="font-size: 17px; color: #f8fafc; margin-top:2px;">${c.title}</h2>
          </div>
          <button class="modal-close" onclick="closeCourseModal()">✕</button>
        </div>
        <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
          <p style="color: #94a3b8; font-size: 13px; margin-bottom: 15px;">${c.short || ''}</p>

          <div id="mediaPlayerContainer" style="display: none; margin-bottom: 16px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden; background: #000;">
            <div id="mediaPlaceholder"></div>
          </div>
          
          <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <button id="btn-action-principal" style="flex:1; padding:10px; background:#f97316; color:white; border-radius:6px; font-weight:bold; font-size:13px;">
              ${isVideo ? '▶️ Visionner la vidéo' : '📖 Consulter le cours (PDF)'}
            </button>
          </div>

          <div id="quizSection" style="padding:15px; background:#1e293b; border-radius:8px; border:1px dashed ${isCompleted ? '#22c55e' : '#f97316'};">
            ${isCompleted ? `
              <div style="color:#22c55e; text-align:center; font-weight:bold;">🎉 Module validé avec succès !</div>
            ` : c.questions && c.questions.length > 0 ? `
              <h4 style="color:#f8fafc; font-size:14px; margin-bottom:10px;">🧠 Validation du module</h4>
              <form id="courseQuizForm">
                ${c.questions.map((q, qIndex) => `
                  <div style="margin-bottom: 12px;">
                    <p style="font-size:12px; color:#e2e8f0; margin-bottom:4px;">${qIndex + 1}. ${q.q}</p>
                    ${q.options.map((opt, optIndex) => `
                      <label style="display:flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; background:#0f172a; padding:6px; margin-bottom:4px; border-radius:4px; cursor:pointer;">
                        <input type="radio" name="question_${qIndex}" value="${optIndex}" required> ${opt}
                      </label>
                    `).join('')}
                  </div>
                `).join('')}
                <button type="button" onclick="submitCourseQuiz('${c.id}')" style="width:100%; padding:8px; background:#22c55e; color:white; border-radius:6px; font-weight:bold;">Envoyer les réponses</button>
              </form>
            ` : `
              <button onclick="forceCompleteCourse('${c.id}')" style="width:100%; padding:8px; background:#475569; color:white; border-radius:4px;">Marquer comme terminé</button>
            `}
          </div>
        </div>
    `;
    
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    const btnAction = document.getElementById('btn-action-principal');
    btnAction.onclick = function() {
        if (isVideo) {
            const mediaContainer = document.getElementById('mediaPlayerContainer');
            const mediaPlaceholder = document.getElementById('mediaPlaceholder');
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
            // OUVERTURE DU PDF ASSOCIE UNIQUE
            if (mediaLien && mediaLien !== "#") {
                window.open(mediaLien, '_blank');
            } else {
                alert("Aucun fichier PDF rattaché.");
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