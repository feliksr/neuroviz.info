//upload.js

class Upload{

    constructor(){

        this.data = new Data    

    }

    get_heatmap(){
        const ids = [
            'trialSlider', 'channelDisplay', 'excludeTrialButton', 'loadingText',
            'nextChan', 'trialNumber', 'trialScroll', 'prevChan', 'groupButtonContainer', 'channelScroll', 'channelNumber', 'channelButtonContainer',
            'heatmapView', 'uploadWaveletButton','uploadLFPbutton','waveletFile','LFPfile'
        ];

        fetch('heatmap.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('heatmapView').innerHTML = html;

            ids.forEach(id => {
                this[id] = document.getElementById(id);
                console.log(this[id])
            });

            this.initialize()
        })
        .catch(error => console.error('Error:', error));
    }

    initialize(){
        this.dataForm()
        this.set_uploadLFP()
        this.set_uploadWavelet()
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

    dataForm() {
            const inputs = document.querySelectorAll('.inputValues');

            const timeInputs = document.querySelectorAll('.timeInput');
        
            inputs.forEach(input => {
                input.addEventListener('input', () => {
                    const allFilled = this.update_inputValues(inputs);
                    this.uploadWaveletButton.disabled = !allFilled;

                    if (!this.uploadWaveletButton.disabled) {
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
                    this.uploadLFPbutton.disabled = !allFilled;

                    if (!this.uploadLFPbutton.disabled) {
                        this.timeStart = parseFloat(document.getElementById("timeStart").value);
                        this.timeStop = parseFloat(document.getElementById("timeStop").value);
                    }    
                });
            });
    }



    set_uploadWavelet(){

        this.uploadWaveletButton.addEventListener('click', () => {
            this.waveletFile.click();
        });
    
        this.waveletFile.addEventListener('change', async (event) => {
        this.loadingText.style.display = "block";  
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

        await fetch(this.data.url + 'uploadWavelet', {
            method: 'POST',
            body: formData
        })

        .then(response => response.json())
        .then(data => {this.responseData = data.trialsWavelet})
        
        .catch(error => {console.error('Error:', error)});

        this.data.allWaveletTrials = this.responseData
        this.data.singleTrialWavelet = this.data.allWaveletTrials[this.data.trial];

        this.trialSlider.max = Object.keys(this.data.allWaveletTrials).length-1;
        this.trialSlider.disabled = false;
                    
        this.data.set_Wavelet()
        this.groupButtonContainer.style.display = 'none'
        this.loadingText.style.display = "none"; 

        this.heatmapView.style.display = 'block';

    });
}

    set_uploadLFP(){
        
        this.uploadLFPbutton.addEventListener('click', () => {
            this.LFPfile.click();
        });

        this.LFPfile.addEventListener('change', async (event) => {
            this.loadingText.style.display = "block";
            let file = event.target.files[0];
            console.log("File selected:", file.name);
            let formData = new FormData();
            formData.append('file', file);

            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
            }));

            await fetch(this.data.url + 'uploadLFP', {
                method: 'POST',
                body: formData
            })

            .then(response => response.json())
            .then(data => {this.responseData = data.trialsLFP;

            })
            
            .catch(error => {
                console.error('Error:', error);
            });
            this.data.allLFPTrials = this.responseData

            this.trialSlider.max = Object.keys(this.data.allLFPTrials).length-1;
            this.data.singleTrialWavelet = this.data.allLFPTrials[this.data.trial];
            
            this.groupButtonContainer.style.display = 'none'
            this.data.set_LFP()
            this.loadingText.style.display = "none"; 


            this.heatmapView.style.display = 'block';
    
        });
    }
}

const dataUpload = new Upload();
dataUpload.get_heatmap();



