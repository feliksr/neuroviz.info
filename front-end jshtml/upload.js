//upload.js

class Upload{

    constructor(){

        this.data = new Data
        this.groupNumber = 0
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

    nextButtonClick = () => {
        this.groupNumber = 0;
        
        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));                
        this.groupButtonContainer.lastElementChild.classList.add('active');
    }

    initialize(){
        
        this.init_nextButton()
        this.set_dataForm()
        this.set_WaveletButton()
        this.set_LFPbutton()
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

    init_GroupButton(){
        const container = this.groupButtonContainer
        const containerLength = container.children.length

        const button = document.createElement('button');
        button.className = 'groupButton';
        button.groupNumber = container.children.length
        this.groupNumber = button.groupNumber
        button.textContent = 'Group ' + button.groupNumber

        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));  

        button.classList.add('active')
        
        button.addEventListener('click', (event) => { 
            this.groupNumber = event.target.groupNumber

            const buttons = document.querySelectorAll('.groupButton');
            buttons.forEach(btn => btn.classList.remove('active'));   

            button.classList.add('active')

            if (button.waveletTrials){
                this.data.set_Wavelet(button.waveletTrials)
            }

            if (button.LFPtrials){
                this.data.set_LFP(button.LFPtrials)
            }
        });

        container.insertBefore(button,container.children[containerLength-1])

        return button
    }
    
    init_nextButton(){
        const nextButton = document.createElement('button');
        nextButton.className = 'groupButton';
        nextButton.textContent = 'New Group';
        nextButton.addEventListener('click', this.nextButtonClick);
 
        this.groupButtonContainer.appendChild(nextButton)
    }

    set_GroupButton(waveletTrials,LFPtrials){
        
        let button
        console.log(this.groupNumber)

        if (this.groupNumber == 0){
            button = this.init_GroupButton()
        
        }else{
            button = this.groupButtonContainer.children[this.groupNumber]
        }

        if (waveletTrials){
            button.waveletTrials = waveletTrials;
        }

        if (LFPtrials){
            button.LFPtrials = LFPtrials;
        }
    }

    set_WaveletButton(){

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
            this.set_GroupButton(waveletTrials,undefined)
        })
        
        .catch(error => {console.error('Error:', error)});


        this.channelButtonContainer.style.display = 'none'

        this.loadingText.style.display = "none"; 
        this.heatmapView.style.display = 'block';

        // reveal yAxisLabel if previously hidden by set_LFPbutton()
        document.getElementById('yAxisLabel').style.display = 'block'
        event.target.value = ''

    });
}


    set_LFPbutton(){
        
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
                this.set_GroupButton(undefined,LFPtrials)
            })

            .catch(error => {
                console.error('Error:', error);
            });
            
            this.channelButtonContainer.style.display = 'none'

            this.loadingText.style.display = "none"; 
            this.heatmapView.style.display = 'block';
            document.getElementById('xAxisLabel').style.display = 'none'
            document.getElementById('yAxisLabel').style.display = 'none'
            event.target.value = ''

        });
    }
}

const dataUpload = new Upload();
dataUpload.get_heatmap()