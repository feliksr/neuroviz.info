// homeButtons.js

class homeButtons{
    constructor(){

        document.getElementById('uploadButton').addEventListener('click', () => {
            window.location.href = 'upload.html'
        });

        this.set_stimGroupButtons();

    }

    set_stimGroupButtons(){
        let stimGroupButton = document.querySelectorAll('.stimGroupButton')

        stimGroupButton.forEach(button => {
            button.addEventListener('click', (event) => {
                let buttonText = event.target.textContent; 
                window.location.href = 'datapage.html?params=' + encodeURIComponent(buttonText);
            });
        })
    }
}

const home = new homeButtons()

