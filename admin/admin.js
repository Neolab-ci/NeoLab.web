// GESTION DU CHANGEMENT D'ONGLET (NAVIGATION)
function switchTab(event, sectionId) {
    event.preventDefault();

    // Désactiver tous les liens de la barre latérale
    const links = document.querySelectorAll('.menu-link');
    links.forEach(link => link.classList.remove('active'));

    // Masquer toutes les sections de contenu
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));

    // Activer le lien actuel et afficher la bonne section
    event.currentTarget.classList.add('active');
    document.getElementById(sectionId).classList.add('active');
}

// SIMULATION ACTIONS DE VALIDATION DES PROFESSEURS
function approveProf(button) {
    const row = button.closest('tr');
    const profName = row.cells[0].innerText;
    alert(`Le professeur ${profName} a été approuvé avec succès ! Il recevra ses accès.`);
    row.remove(); // Supprime la ligne après validation
}

function rejectProf(button) {
    const row = button.closest('tr');
    const profName = row.cells[0].innerText;
    if(confirm(`Voulez-vous vraiment rejeter la demande de ${profName} ?`)) {
        row.remove();
    }
}

// SIMULATION ENREGISTREMENT DES PARAMÈTRES
function saveSettings() {
    alert("Configuration système et préférences de NeoLab-CI enregistrées !");
}
