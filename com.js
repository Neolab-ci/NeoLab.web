
document.addEventListener("DOMContentLoaded", function () {
    const navContainer = document.querySelector('.floating-nav-container');
    const navTrigger = document.getElementById('floating-nav-trigger');
    const floatLogout = document.getElementById('floating-btn-logout');

    if (navTrigger && navContainer) {
        // Ouvrir / Fermer le menu au clic
        navTrigger.addEventListener('click', function (e) {
            e.stopPropagation();
            navContainer.classList.toggle('active');
            
            // Change l'icône de menu à croix (X) si ouvert
            const icon = navTrigger.querySelector('i');
            if (navContainer.classList.contains('active')) {
                icon.setAttribute('data-lucide', 'x');
            } else {
                icon.setAttribute('data-lucide', 'menu');
            }
            lucide.createIcons();
        });

        // Fermer le menu si on clique n'importe où ailleurs sur la page
        document.addEventListener('click', function () {
            navContainer.classList.remove('active');
            const icon = navTrigger.querySelector('i');
            if (icon) icon.setAttribute('data-lucide', 'menu');
            lucide.createIcons();
        });
    }

    // Gestion de la déconnexion depuis le menu flottant
    if (floatLogout) {
        floatLogout.addEventListener('click', function () {
            if (confirm("Voulez-vous vous déconnecter de NeoLab-CI ?")) {
                firebase.auth().signOut().then(() => {
                    window.location.href = "../../index.html";
                });
            }
        });
    }
});

