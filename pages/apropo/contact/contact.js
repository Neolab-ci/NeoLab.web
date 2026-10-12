// ==========================================
// CONFIGURATION ET INITIALISATION FIREBASE (COMPAT)
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

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. GESTION DU THÈME (CLAIR PAR DÉFAUT)
    // ==========================================
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

    // ==========================================
    // 2. ÉTAT DE CONNEXION & AUTO-REMPLISSAGE DU NOM
    // ==========================================
    auth.onAuthStateChanged((user) => {
        const authActionContainer = document.getElementById('dynamic-auth-action');
        const inputFullName = document.getElementById('fullName');
        const inputEmail = document.getElementById('email');

        if (user) {
            console.log("Utilisateur connecté :", user.email);

            // Remplacer le bouton de connexion par "Espace Élève"
            if (authActionContainer) {
                authActionContainer.innerHTML = `<a href="../../../espace/eleve/eleve.html" class="btn-connect" style="background: var(--primary-color); color: white;">Mon Espace Élève</a>`;
            }

            // Récupérer le nom dans Firestore (collection 'eleves') pour pré-remplir le formulaire
            db.collection('eleves').doc(user.uid).get().then((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    if (inputFullName && data.nom) {
                        inputFullName.value = data.nom;
                    }
                }
            }).catch(err => console.log("Erreur lecture profil:", err));

            if (inputEmail && user.email) {
                inputEmail.value = user.email;
            }

        } else {
            console.log("Visiteur non connecté.");
            if (authActionContainer) {
                authActionContainer.innerHTML = `<a href="../../login/auth.html" class="btn-connect">Se connecter</a>`;
            }
        }
    });

    // ==========================================
    // 3. MENU HAMBURGER (MOBILE TOGGLE)
    // ==========================================
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-open');
            const icon = menuToggle.querySelector('i');
            if (mainNav.classList.contains('mobile-open')) {
                icon.className = "fa-solid fa-xmark";
            } else {
                icon.className = "fa-solid fa-bars";
            }
        });
    }

    // ==========================================
    // 4. ENVOI DU FORMULAIRE DE CONTACT VERS FIREBASE
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    const formFeedback = document.getElementById('formFeedback');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();

            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement en cours...';
            submitBtn.disabled = true;

            try {
                await db.collection("messages_contact").add({
                    nom_complet: fullName,
                    email: email,
                    telephone: phone ? phone : "Non renseigné",
                    sujet: subject,
                    message: message,
                    envoye_le: firebase.firestore.FieldValue.serverTimestamp()
                });

                formFeedback.textContent = `Merci ${fullName}, votre demande a bien été envoyée à l'équipe !`;
                formFeedback.className = "form-feedback success";
                formFeedback.classList.remove('hidden');
                contactForm.reset();

            } catch (error) {
                console.error("Erreur Firebase: ", error);
                formFeedback.textContent = "Une erreur est survenue lors de l'envoi. Veuillez réessayer.";
                formFeedback.className = "form-feedback error";
                formFeedback.classList.remove('hidden');
            } finally {
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                formFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // ==========================================
    // 5. ACCORDÉON FAQ INTERACTIF
    // ==========================================
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;

            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            item.classList.toggle('active');
            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });
});

// ==========================================
// CONFIGURATION DES CONTENUS DE LA MODALE
// ==========================================
const infosDemandes = {
    'etudiant': {
        titre: "Espace Étudiant NeoLab-CI",
        description: "Obtenez un accompagnement personnalisé, des conseils sur vos cours et sur la préparation de vos certificats.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'laboratoire': {
        titre: "Équipements Hospitalier & Laboratoire",
        description: "Besoin de composants spécifiques, de conseils d'ingénierie ou d'un partenariat de recherche ?",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'etablissement': {
        titre: "Établissement de Formation & Écoles",
        description: "Nous construisons des programmes pédagogiques sur mesure et fournissons des kits d'apprentissage.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'partenaire': {
        titre: "Devenir Partenaire Officiel",
        description: "Propulsez l'innovation technologique en Côte d'Ivoire grâce à nos programmes de sponsoring.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'technique': {
        titre: "Support & Assistance Technique",
        description: "Une panne sur un kit ? Un bug sur la plateforme ? Regardez cette rapide vidéo de diagnostic.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
};

window.ouvrirModaleContact = function(type) {
    const infos = infosDemandes[type];
    if (!infos) return;

    const modal = document.getElementById('modalContact');
    const titre = document.getElementById('modal-titre');
    const desc = document.getElementById('modal-description');
    const inputType = document.getElementById('form-type-demande');
    const iframe = document.getElementById('modal-video-iframe');

    if (modal && titre && desc && inputType && iframe) {
        titre.innerText = infos.titre;
        desc.innerText = infos.description;
        inputType.value = type;
        iframe.src = infos.videoUrl;
        modal.style.display = 'flex';
    }
};

window.fermerModaleContact = function() {
    const modal = document.getElementById('modalContact');
    const iframe = document.getElementById('modal-video-iframe');
    const form = document.getElementById('form-contact-modal');

    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = "";
    if (form) form.reset();
};

// Envoi modale vers Firestore
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-contact-modal');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const typeDemande = document.getElementById('form-type-demande').value;
            const nom = document.getElementById('contact-nom').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;

            db.collection("messages_contact").add({
                type_client: typeDemande,
                nom_complet: nom,
                email_client: email,
                message_contents: message,
                envoye_le: firebase.firestore.FieldValue.serverTimestamp(),
                statut: "Non lu"
            })
            .then(() => {
                alert(`Merci ${nom} ! Votre demande a été transmise avec succès.`);
                fermerModaleContact();
            })
            .catch((error) => {
                console.error("Erreur d'envoi : ", error);
                alert("Une erreur technique est survenue.");
            });
        });
    }
});