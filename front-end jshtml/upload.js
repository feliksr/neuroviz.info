//upload.js

class Upload{

    constructor(){

        this.data = new Data
        this.get_heatmap()    
    }

    get_heatmap(){
        const ids = [
            'trialSlider', 'excludeTrialButton', 'loadingText',  'trialNumber', 'trialScroll', 
            'channelDisplay', 'channelScroll', 'channelNumber', 'channelButtonContainer', 'nextChan', 'prevChan',
            'groupButtonContainer', 'heatmapView', 'uploadWaveletButton','uploadLFPbutton','waveletFile','LFPfile'
        ];

        fetch('heatmap.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('heatmapView').innerHTML = html;

            ids.forEach(id => {
                this[id] = document.getElementById(id);
            });

            this.initialize()
        })
        .catch(error => console.error('Error:', error));
    }

    initialize(){
        this.set_dataForm()
        this.set_uploadWavelet()
        this.set_uploadLFP()
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
            let formData = new FormData();
            formData.append('file', file);
            
            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
                freqLow: this.freqLow,
                freqHigh: this.freqHigh
            })
        );

        await fetch(this.data.url + 'uploadWavelet', {
            method: 'POST',
            body: formData
        })

        .then(response => response.json())
        .then(data => {
            return data.trialsWavelet})
        .then(waveletTrials => {
            this.trialSlider.max = Object.keys(waveletTrials).length-1;
            this.data.set_Wavelet(waveletTrials)
        })
        
        .catch(error => {console.error('Error:', error)});

        
        // const groupButton = document.createElement('button');
        // groupButton.textContent = 'Group ';
        // groupButton.className = 'groupButton';
        // groupButton.wavelets = this.waveletTrials;
        // this.groupButtonContainer.appendChild(groupButton)
        // groupButton.addEventListener('click', () => { 
        //     this.data.allWaveletTrials = groupButton.data

        // });

        // const nextGroupButton = document.createElement('button');
        // groupButton.textContent = 'New Group';


        // const initWavelet = waveletTrials[0];

        this.channelButtonContainer.style.display = 'none'

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
            .then(data => {
                return data.trialsLFP})
            .then(LFPtrials => {
                this.trialSlider.max = Object.keys(LFPtrials).length-1;
                this.data.set_LFP(LFPtrials)
            })
            .catch(error => {
                console.error('Error:', error);
            });
            
            this.channelButtonContainer.style.display = 'none'

            this.loadingText.style.display = "none"; 
            this.heatmapView.style.display = 'block';
    
        });
    }
}


const dataUpload = new Upload();



