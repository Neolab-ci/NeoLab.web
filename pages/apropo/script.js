/**
 * NeoLab-CI - Script de la page À propos
 * Gestion de l'interactivité, du menu mobile et des animations fluides.
 */

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. GESTION DU MENU MOBILE (BURGER)
    // ==========================================
    const menuToggle = document.getElementById('menuToggle');
    const navMenu = document.getElementById('navMenu');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation(); // Empêche la fermeture immédiate
            navMenu.classList.toggle('open');
            
            // Animation et changement de l'icône du menu (Bars <-> Xmark)
            const icon = menuToggle.querySelector('i');
            if (navMenu.classList.contains('open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
                // Optionnel : Bloquer le défilement de la page quand le menu est ouvert
                document.body.style.overflow = 'hidden';
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
                document.body.style.overflow = '';
            }
        });

        // Fermer le menu si on clique sur un lien
        const navLinks = navMenu.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
                const icon = menuToggle.querySelector('i');
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
                document.body.style.overflow = '';
            });
        });

        // Fermer le menu si on clique n'importe où en dehors du menu
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuToggle.contains(e.target)) {
                if (navMenu.classList.contains('open')) {
                    navMenu.classList.remove('open');
                    const icon = menuToggle.querySelector('i');
                    icon.classList.remove('fa-xmark');
                    icon.classList.add('fa-bars');
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // ==========================================
    // 2. BOUTON RETOUR EN HAUT (SCROLL TO TOP)
    // ==========================================
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    
    if (scrollTopBtn) {
        // Masquer initialement le bouton proprement en JS ou CSS
        scrollTopBtn.style.opacity = '0';
        scrollTopBtn.style.pointerEvents = 'none';
        scrollTopBtn.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

        window.addEventListener('scroll', () => {
            // Le bouton apparaît après 400px de défilement
            if (window.scrollY > 400) {
                scrollTopBtn.style.opacity = '1';
                scrollTopBtn.style.pointerEvents = 'auto';
                scrollTopBtn.style.transform = 'translateY(0)';
            } else {
                scrollTopBtn.style.opacity = '0';
                scrollTopBtn.style.pointerEvents = 'none';
                scrollTopBtn.style.transform = 'translateY(10px)';
            }
        });

        scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // ==========================================
    // 3. EFFETS VISUELS ET EFFET GLOW SUR LES CARTES
    // ==========================================
    // Ajoute un effet de surbrillance dynamique qui suit la souris sur les cartes de valeurs (optionnel/esthétique)
    const cards = document.querySelectorAll('.value-card, .tech-card, .team-card');
    
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Variables CSS dynamiques pour créer une lueur interactive si besoin au CSS
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });
});
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