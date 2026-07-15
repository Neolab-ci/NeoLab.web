document.addEventListener('DOMContentLoaded', () => {

    // 1. GESTION DE L'ACCORDÉON (FAQ)
    const accordionHeaders = document.querySelectorAll('.accordion-header');

    accordionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const item = header.parentElement;
            const content = header.nextElementSibling;

            // Fermer les autres éléments ouverts
            document.querySelectorAll('.accordion-item').forEach(otherItem => {
                if (otherItem !== item && otherItem.classList.contains('active')) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.accordion-content').style.maxHeight = null;
                }
            });

            // Toggle l'état de l'élément cliqué
            item.classList.toggle('active');

            if (item.classList.contains('active')) {
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                content.style.maxHeight = null;
            }
        });
    });

    // 2. SOUMISSION DU FORMULAIRE DE CONTACT
    const contactForm = document.getElementById('contactForm');

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Éviter le rechargement de page

        // Récupération des données du formulaire
        const formData = {
            fullName: document.getElementById('fullName').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subject: document.getElementById('subject').value,
            message: document.getElementById('message').value
        };

        // Bouton de chargement (Feedback visuel)
        const submitBtn = contactForm.querySelector('.btn-submit');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Envoi en cours...';
        submitBtn.disabled = true;

        // Simulation d'envoi d'API (par ex. EmailJS, backend personnalisé, etc.)
        setTimeout(() => {
            alert(`Merci ${formData.fullName} ! Votre message concernant "${formData.subject}" a été envoyé avec succès.`);
            
            // Reset formulaire
            contactForm.reset();
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }, 2000);
    });

});