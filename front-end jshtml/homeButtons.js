// homeButtons.js

class homeButtons{
    constructor(){

        document.getElementById('uploadButton').addEventListener('click', () => {
                window.location.href = 'upload.html'
        })

        this.set_categoryButtons();
    }
    
    set_categoryButtons(){
        let categoryButton = document.querySelectorAll('.categoryButton')

        categoryButton.forEach(button => {
            button.addEventListener('click', (event) => {
                let buttonText = event.target.textContent; 
                window.location.href = 'DBpage.html?params=' + encodeURIComponent(buttonText);
            });
        })
    }
}

const home = new homeButtons()

