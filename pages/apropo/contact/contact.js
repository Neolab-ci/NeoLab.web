// IMPORTATION DES SERVICES FIREBASE DEPUIS LE CDN OFFICIEL
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ==========================================
// 1. CONFIGURATION DE VOTRE PROJET FIREBASE
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBRGYbiSp26ba_cxj7REHKkOqSylQf1DfQ",
    authDomain: "neolab-ci.firebaseapp.com",
    projectId: "neolab-ci",
    storageBucket: "neolab-ci.firebasestorage.app",
    messagingSenderId: "121581894561",
    appId: "1:121581894561:web:c2056aa29364fce97a69e0"
};

// Initialisation unique et moderne de Firebase et Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 2. LOGIQUE DU MENU HAMBURGER (MOBILE TOGGLE)
    // ==========================================
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-open');
            
            // Changement d'icône fluide (bars <=> xmark)
            const icon = menuToggle.querySelector('i');
            if (mainNav.classList.contains('mobile-open')) {
                icon.className = "fa-solid fa-xmark";
            } else {
                icon.className = "fa-solid fa-bars";
            }
        });
    }

    // ==========================================
    // 3. ENVOI DU FORMULAIRE DE CONTACT VERS FIREBASE
    // ==========================================
    const contactForm = document.getElementById('contactForm');
    const formFeedback = document.getElementById('formFeedback');
    const submitBtn = document.getElementById('submitBtn');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Stoppe le rechargement de la page

            // Récupération dynamique des valeurs saisies
            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();

            // Modification visuelle du bouton pendant l'envoi (Loading state)
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Traitement en cours...';
            submitBtn.disabled = true;

            try {
                // Envoi des données dans une collection Firestore nommée "messages_contact"
                await addDoc(collection(db, "messages_contact"), {
                    nom_complet: fullName,
                    email: email,
                    telephone: phone ? phone : "Non renseigné",
                    sujet: subject,
                    message: message,
                    envoye_le: serverTimestamp() // Ajoute l'heure du serveur automatiquement
                });

                // Retour visuel positif de succès
                formFeedback.textContent = `Merci ${fullName}, votre demande a bien été envoyée à l'équipe !`;
                formFeedback.className = "form-feedback success";
                formFeedback.classList.remove('hidden');
                
                // Reset complet du formulaire
                contactForm.reset();

            } catch (error) {
                console.error("Erreur Firebase: ", error);
                // Retour visuel négatif en cas de coupure ou problème technique
                formFeedback.textContent = "Une erreur est survenue lors de l'envoi. Veuillez réessayer.";
                formFeedback.className = "form-feedback error";
                formFeedback.classList.remove('hidden');
            } finally {
                // Rétablissement du bouton
                submitBtn.innerHTML = originalBtnText;
                submitBtn.disabled = false;
                
                // Défilement fluide vers le haut du formulaire pour voir le message
                formFeedback.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }

    // ==========================================
    // 4. AUTOMATISATION DES CARTES "TYPE DE DEMANDE"
    // ==========================================
    const requestCards = document.querySelectorAll('.request-card');
    const subjectSelect = document.getElementById('subject');

    requestCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetSubject = card.getAttribute('data-subject');
            if (subjectSelect) {
                subjectSelect.value = targetSubject;
                
                // Scroll fluide vers le formulaire de contact
                contactForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    });

    // ==========================================
    // 5. BONUS : ACCORDÉON FAQ INTERACTIF
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

// ========================================================
// BASE DE DONNÉES ET CONFIGURATION DES CONTENUS DYNAMIQUES
// ========================================================

const infosDemandes = {
    'etudiant': {
        titre: "Espace Étudiant NeoLab-CI",
        description: "Obtenez un accompagnement personnalisé, des conseils sur vos cours de robotique, d'électronique et sur la préparation de vos certificats de compétences.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'laboratoire': {
        titre: "Équipements Hospitalier & Laboratoire",
        description: "Besoin de composants spécifiques, de conseils d'ingénierie ou d'un partenariat de recherche ? Découvrez comment NeoLab-CI accompagne la technologie médicale.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'etablissement': {
        titre: "Établissement de Formation & Écoles",
        description: "Nous construisons des programmes pédagogiques sur mesure et fournissons des kits d'apprentissage pour équiper vos salles de TP d'électronique.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'partenaire': {
        titre: "Devenir Partenaire Officiel",
        description: "Propulsez l'innovation technologique en Côte d'Ivoire. Découvrez nos programmes de sponsoring, d'incubation et de projets en co-conception.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    },
    'technique': {
        titre: "Support & Assistance Technique",
        description: "Une panne sur un kit ? Un bug sur la plateforme ou un composant défectueux ? Regardez cette rapide vidéo de diagnostic avant de nous écrire.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
};

// ========================================================
// FONCTIONS DE CONTRÔLE DE LA MODALE (Globales pour le HTML)
// ========================================================
window.ouvrirModaleContact = function(type) {
    console.log("Clic détecté pour le type :", type); // Pour débugger dans ta console
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
    } else {
        console.error("Erreur : Un des éléments HTML de la modale est introuvable.");
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

// ========================================================
// ENREGISTREMENT DU MESSAGE DANS FIREBASE
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-contact-modal');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const typeDemande = document.getElementById('form-type-demande').value;
            const nom = document.getElementById('contact-nom').value;
            const email = document.getElementById('contact-email').value;
            const message = document.getElementById('contact-message').value;

            const nouveauMessage = {
                type_client: typeDemande,
                nom_complet: nom,
                email_client: email,
                message_contents: message,
                envoye_le: firebase.firestore.FieldValue.serverTimestamp(),
                statut: "Non lu"
            };

            // Vérifier si Firestore (db) est disponible
            if (typeof db !== "undefined") {
                db.collection("messages_contact").add(nouveauMessage)
                .then(() => {
                    alert(`Merci ${nom} ! Votre demande a été transmise avec succès à l'équipe NeoLab-CI. 🚀`);
                    fermerModaleContact();
                })
                .catch((error) => {
                    console.error("Erreur d'envoi Firestore : ", error);
                    alert("Une erreur technique est survenue.");
                });
            } else {
                console.error("Firebase 'db' n'est pas initialisé sur cette page.");
                alert(`[Mode Test] Message de ${nom} simulé avec succès ! (Activez Firebase pour l'enregistrement réel)`);
                fermerModaleContact();
            }
        });
    }
});