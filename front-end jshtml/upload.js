//upload.js

class Upload{

    constructor(){
        this.url = 'https://neuroviz.info/api/'
        // this.url = 'http://localhost:5000/api/'

        this.groupNumber = 0
    }
  

    get_Heatmap(){
        const ids = [
            'excludeTrialButton', 'loadingText',  'trialNumber', 'xAxisLabel', 'channelButtonContainer', 'sliderLabel',
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
                
        // not used currently
        this.channelButtonContainer.style.display = 'none'
        this.xAxisLabel.style.display = 'none'
       
        // initially hidden
        document.getElementById('heatmapWrapper').style.display = 'none'
        document.getElementById('container4').style.display = 'none'
        
        
        this.init_NewGroupButton()
        this.init_DataForm()
        this.set_WaveletButton()
        this.set_LFPbutton()
    }


    init_DataForm() {

        function update_inputValues(inputs) {
            let allFilled = true;
                
            inputs.forEach(input => {
                if (input.value === '') {
                    allFilled = false;
                }
            });
    
            return allFilled;    
        }

        const inputs = document.querySelectorAll('.inputValues');
        const timeInputs = document.querySelectorAll('.timeInput');
    
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = update_inputValues(inputs);
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
                const allFilled = update_inputValues(timeInputs);
                this.uploadLFPbutton.disabled = !allFilled;

                if (!this.uploadLFPbutton.disabled) {
                    this.timeStart = parseFloat(document.getElementById("timeStart").value);
                    this.timeStop = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });
    }


    init_NewGroupButton () {
        const button = document.createElement('button');
    
        button.className = 'groupButton';
        button.textContent = 'New Group';
        button.addEventListener('click', this.newGroup_Click);
 
        this.groupButtonContainer.appendChild(button)
        this.groupButtonContainer.style.display = 'none'
    }

    
    newGroup_Click = () => {

        this.groupNumber = 0;

        this.heatmapView.style.display = 'none'
        document.getElementById('heatmapWrapper').style.display = 'none'
        document.getElementById('container4').style.display = 'none'
        
        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));                
        this.groupButtonContainer.lastElementChild.classList.add('active');
    }


    set_WaveletButton(){

        this.uploadWaveletButton.addEventListener('click', () => {
            this.waveletFile.click();
        });
    
        this.waveletFile.addEventListener('change', async (event) => {
            
            let file = event.target.files[0];
            let formData = new FormData();
            formData.append('file', file);
            
            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
                freqLow: this.freqLow,
                freqHigh: this.freqHigh
            }));

            this.loadingText.style.display = "block";  

            await fetch(this.url + 'uploadWavelet', {
                method: 'POST',
                body: formData
            })

            .then(response => response.json())
            
            .then(data => {
                this.set_GroupButton(data)
            })
            
            .catch(error => {console.error('Error:', error)});

            this.loadingText.style.display = "none";  

            event.target.value = ''
        });
    }


    set_LFPbutton(){
        
        this.uploadLFPbutton.addEventListener('click', () => {
            this.LFPfile.click();
        });

        this.LFPfile.addEventListener('change', async (event) => {
            
            let file = event.target.files[0];
 
            let formData = new FormData();
            formData.append('file', file);

            formData.append('json_data', JSON.stringify({
                timeStart: this.timeStart,
                timeStop: this.timeStop,
            }));

            this.loadingText.style.display = "block";

            await fetch(this.url + 'uploadLFP', {
                method: 'POST',
                body: formData
            })

            .then(response => response.json())

            .then(data => {
                this.set_GroupButton(data)
            })
            
             .catch(error => {
                console.error('Error:', error);
            });

            this.loadingText.style.display = "none";

            event.target.value = ''
        });
    }
    
    
    set_GroupButton(data){

        this.heatmapView.style.display = 'block';

        let button

        if (this.groupNumber == 0){
            button = this.init_GroupButton()
        }else{
            button = this.groupButtonContainer.children[this.groupNumber-1]
        }

        if (data.Wavelet){
            console.log('added wavelet')
            button.Wavelet = data.Wavelet;
            button.WaveletMean = data.WaveletMean
        }

        if (data.LFP){
            console.log('added LFP')
            button.LFP = data.LFP;   
            button.LFPMean = data.LFPMean
        }
        
        button.meanButton = this.init_MeanButton()
        
        button.meanButton.addEventListener('click', () => {
            button.meanButton.classList.toggle('active');
            this.view_Trials(button)
        })
        
        this.view_Trials(button);
    }    
    

    click_GroupButton = (button) => {

            this.groupNumber = button.groupNumber
            this.heatmapView.style.display = 'block'

            const buttons = document.querySelectorAll('.groupButton');
            buttons.forEach(btn => btn.classList.remove('active'));   

            button.classList.add('active');
                        
            button.meanButton = this.init_MeanButton()
        
            button.meanButton.addEventListener('click', () => {
                button.meanButton.classList.toggle('active');
                this.view_Trials(button)
            })

            document.getElementById('heatmapWrapper').style.display = 'none'
            document.getElementById('container4').style.display = 'none'
                                        
            this.view_Trials(button)
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

        button.addEventListener('click', () => this.click_GroupButton(button));

        container.insertBefore(button,container.children[containerLength-1])
        container.style.display = 'flex'

        return button
    }
    

    init_MeanButton(){
        let container = document.getElementById('meanButtonContainer')

        let meanButton 

        meanButton = document.getElementById('meanButton')

        if (meanButton){
            meanButton.remove()
        }
        
        meanButton = document.createElement('button')
        meanButton.id = 'meanButton'
        meanButton.textContent = 'Average Trials'
        
        container.appendChild(meanButton)
        return meanButton
    }
    

    view_Trials (button){
        let maxTrials
        let splitWavelets

        let sliderElement = new Slider()
        let slider = sliderElement.init_Slider()
        
        if (button.LFP){

            let initLFP

            if (button.meanButton.classList.contains('active')) {
                initLFP = button.LFPMean[0]
            } else{
                initLFP = button.LFP[0]
            }

            let LFPchart = new LFPplot()
            LFPchart.initialize(initLFP)

            document.getElementById('container4').style.display = 'flex'
            console.log('LFP displayed')

            maxTrials = Object.keys(button.LFP).length-1;
        }

        if (button.Wavelet){
            let wavelets

            if (button.meanButton.classList.contains('active')) {
                wavelets = button.WaveletMean
            } else {
                wavelets = button.Wavelet;
            }

            let spectra = new SpectralPlot();
            
            splitWavelets = spectra.init_Wavelet(wavelets[0]);

            spectra.set_Wavelet(wavelets,splitWavelets);

            document.getElementById('yAxisLabel').style.display = 'block';
            document.getElementById('colorbarLabel').style.display = 'block';
            document.getElementById('heatmapWrapper').style.display = 'block';
            console.log('wavelet displayed');

            maxTrials = Object.keys(wavelets).length-1;
        }

        if (button.LFP && !button.Wavelet){

            document.getElementById('yAxisLabel').style.display = 'none'
            document.getElementById('colorbarLabel').style.display = 'none'
            document.getElementById('heatmapWrapper').style.display = 'none'
        }

        if (!button.meanButton.classList.contains('active')) {
            sliderElement.set_Slider(button,splitWavelets)
            slider.max = maxTrials;
            slider.value = 0;

            this.trialNumber.style.display = 'block'

        } else {

            let sliderExist
            sliderExist = document.getElementById('slider')

            if (sliderExist) {
                sliderExist.remove()
            }

            this.trialNumber.style.display = 'none'
            this.sliderLabel.style.display = 'none'
        }

        this.trialNumber.textContent = 1
    }
}

const dataUpload = new Upload();
dataUpload.get_Heatmap()