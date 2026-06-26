const menus = document.querySelectorAll('.sidebar li');
const sections = document.querySelectorAll('section');


function afficherSection(id){


    // cacher toutes les sections
    sections.forEach(section =>{

        section.style.display = 'none';

    });


    // afficher la section choisie
    document.getElementById(id).style.display = 'block';



    // retirer active
    menus.forEach(menu=>{

        menu.classList.remove('active');

    });



    // ajouter active
    document.querySelector(`[data-page="${id}"]`)
        .classList.add('active');

}



// clics menu
menus.forEach(menu=>{


    menu.addEventListener('click',()=>{


        let page = menu.dataset.page;


        afficherSection(page);


    });


});



// affichage initial
afficherSection('dashboard');