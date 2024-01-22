// homeButtons.js

class homeButtons{
 
    constructor(){
        const ids = [
            'uploadWavelet', 'LFPfile', 'uploadLFP', 'waveletFile'
        ];
        
        ids.forEach(id => {
            this[id] = document.getElementById(id);
            console.log(this[id])
        });

        this.stimGroupButton = document.querySelectorAll('.stimGroupButton')

    }
    
    initialize(){
        this.set_stimGroups()
        // this.set_uploadLFP()
        // this.set_uploadWavelet()
        // this.set_dataForm()
    }

    set_stimGroups(){

        this.stimGroupButton.forEach(button => {
            button.addEventListener('click', (event) => {
                let buttonText = event.target.textContent; 
                window.location.href = 'database.html?params=' + encodeURIComponent(buttonText);
            });
        })
    }


    set_uploadWavelet(){

        this.uploadWavelet.addEventListener('click', () => {
            this.waveletFile.click();
        });
        
       
        this.waveletFile.addEventListener('change', async (event) => {
            let file = event.target.files[0];
            console.log("File selected:", file.name);
            let formData = new FormData();
            formData.append('file', file);
            console.log(this.timeStart)
            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
                freqLow: this.freqLow,
                freqHigh: this.freqHigh
            }));

            await fetch(this.page.url + 'uploadWavelet', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {this.responseData = data.trialsWavelet;

            })
            
            .catch(error => {
                console.error('Error:', error);
            });

            this.page.allWaveletTrials = this.responseData
            this.trialSlider.max = Object.keys(this.page.allWaveletTrials).length-1;
            this.trialSlider.disabled = false;
            this.page.singleTrialWavelet = this.page.allWaveletTrials[this.page.trial];
            this.indexView.style.display = 'none';
            
            this.loadingText.style.display = "block";            
            this.page.set_Wavelet()
            this.groupButtonContainer.style.display = 'none'
            this.channelButtonContainer.style.display= 'none'
            this.loadingText.style.display = "none"; 

            this.heatmapView.style.display = 'block';

        });
    }

    set_uploadLFP(){
        
        this.uploadLFP.addEventListener('click', () => {
            this.LFPfile.click();
        });

        this.LFPfile.addEventListener('change', async (event) => {
            let file = event.target.files[0];
            console.log("File selected:", file.name);
            let formData = new FormData();
            formData.append('file', file);

            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
            }));

            await fetch(this.page.url + 'uploadLFP', {
                method: 'POST',
                body: formData
            })

            .then(response => response.json())
            .then(data => {this.responseData = data.trialsLFP;

            })
            
            .catch(error => {
                console.error('Error:', error);
            });
            this.page.allLFPTrials = this.responseData

            this.trialSlider.max = Object.keys(this.page.allLFPTrials).length-1;
            this.page.singleTrialWavelet = this.page.allLFPTrials[this.page.trial];
            this.indexView.style.display = 'none';
            
            this.loadingText.style.display = "block"; 
            this.groupButtonContainer.style.display = 'none'
            this.channelButtonContainer.style.display= 'none'
            this.page.set_LFP()
            this.loadingText.style.display = "none"; 


            this.heatmapView.style.display = 'block';
       
        });
    }

    update_inputValues(inputs) {
        let allFilled = true;
            
        inputs.forEach(input => {
            if (input.value === '') {
                allFilled = false;
            }
        });

        return allFilled;    
    }

    set_dataForm() {
        const inputs = document.querySelectorAll('.inputValues');
        const waveletButton = this.uploadWavelet;

        const timeInputs = document.querySelectorAll('.timeInput');
        const LFPbutton = this.uploadLFP;
    
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = this.update_inputValues(inputs);
                waveletButton.disabled = !allFilled;

                if (!waveletButton.disabled) {
                    this.freqLow = parseFloat(document.getElementById("freqLow").value);
                    this.freqHigh = parseFloat(document.getElementById("freqHigh").value);
                    this.timeStart = parseFloat(document.getElementById("timeStart").value);
                    this.timeStop = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });

        timeInputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = this.update_inputValues(timeInputs);
                LFPbutton.disabled = !allFilled;

                if (!LFPbutton.disabled) {
                    this.timeStart = parseFloat(document.getElementById("timeStart").value);
                    this.timeStop = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });
    }

}

const home = new homeButtons()
home.initialize()
