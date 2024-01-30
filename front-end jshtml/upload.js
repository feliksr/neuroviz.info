//upload.js

class Upload{

    constructor(){

        this.data = new Data
        this.groupNumber = 0
        
    }

    get_heatmap(){
        const ids = [
            'trialSlider', 'excludeTrialButton', 'loadingText',  'trialNumber', 'trialScroll', 'xAxisLabel',
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

            (this.initialize())
        })
                
        .catch(error => console.error('Error:', error));

    }

    nextButtonClick = () => {

        this.groupNumber = 0;

        this.heatmapView.style.display = 'none'
        document.getElementById('heatmapWrapper').style.display = 'none'
        document.getElementById('container4').style.display = 'none'
        
        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));                
        this.groupButtonContainer.lastElementChild.classList.add('active');
    }

    initialize(){
                
        // not used currently
        this.channelButtonContainer.style.display = 'none'
        this.xAxisLabel.style.display = 'none'
       
        // initially hidden
        document.getElementById('heatmapWrapper').style.display = 'none'
        document.getElementById('container4').style.display = 'none'

        this.init_nextButton()
        this.set_dataForm()
        this.set_WaveletButton()
        this.set_LFPbutton()
    }

    set_Text (button){

        if (button.LFPtrials){
            this.data.set_LFP(button.LFPtrials)

            document.getElementById('container4').style.display = 'flex'
            console.log('LFP displayed')
        }

        if (button.waveletTrials){
            this.data.set_Wavelet(button.waveletTrials)

            document.getElementById('yAxisLabel').style.display = 'block'
            document.getElementById('colorbarLabel').style.display = 'block'
            document.getElementById('heatmapWrapper').style.display = 'block'
            console.log('wavelet displayed')
        }

        if (button.LFPtrials && !button.waveletTrials){
            document.getElementById('yAxisLabel').style.display = 'none'
            document.getElementById('colorbarLabel').style.display = 'none'
        }

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
            this.heatmapView.style.display = 'block'
            const buttons = document.querySelectorAll('.groupButton');
            buttons.forEach(btn => btn.classList.remove('active'));   

            button.classList.add('active');

            const wavelet = document.getElementById('heatmapWrapper')
            wavelet.style.display = 'none'
            const LFP = document.getElementById('container4')
            LFP.style.display = 'none'
            
            this.set_Text(button)
            
        });

        container.insertBefore(button,container.children[containerLength-1])
        container.style.display = 'flex'

        return button
    }
    
    init_nextButton(){
        const nextButton = document.createElement('button');
    
        nextButton.className = 'groupButton';
        nextButton.textContent = 'New Group';
        nextButton.addEventListener('click', this.nextButtonClick);
 
        this.groupButtonContainer.appendChild(nextButton)
        this.groupButtonContainer.style.display = 'none'
        
    }

    set_GroupButton(waveletTrials,LFPtrials){


        this.heatmapView.style.display = 'block';

        let button

        if (this.groupNumber == 0){
            button = this.init_GroupButton()
        
        }else{
            button = this.groupButtonContainer.children[this.groupNumber-1]
        }

        if (waveletTrials){
            console.log('added wavelet')
            button.waveletTrials = waveletTrials;
        }

        if (LFPtrials){
            console.log('added LFP')
            button.LFPtrials = LFPtrials;
            
        }

        this.set_Text(button);

        this.loadingText.style.display = "none"; 
 
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
            // this.data.set_Wavelet(waveletTrials)
            this.set_GroupButton(waveletTrials,undefined)
        })
        
        .catch(error => {console.error('Error:', error)});

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
                return data.trialsLFP

            })
            
            .then(LFPtrials => {
                this.trialSlider.max = Object.keys(LFPtrials).length-1;
                
                this.set_GroupButton(undefined,LFPtrials)
            })

            .catch(error => {
                console.error('Error:', error);
            });

            
            event.target.value = ''

        });
    }
}

const dataUpload = new Upload();
dataUpload.get_heatmap()