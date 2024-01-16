//buttons.js

class Buttons{
    constructor(page){
        this.page = page

        const ids = [
            'trialSlider', 'channelDisplay', 'excludeTrialButton', 'prevChan', 
            'nextChan', 'trialNumber', 'ANOVAscroll', 'uploadWavelet', 'loadingText',
            'indexView', 'heatmapView', 'allANOVA', 'pVal', 'pValDiv', 'trialScroll', 
            'channelScroll', 'channelNumber', 'channelButtonContainer', 'LFPfile', 
            'uploadLFP', 'waveletFile', 'groupButtonContainer', 'containerWrapper'
        ];
        
        ids.forEach(id => {
            this[id] = document.getElementById(id);
            console.log(this[id])
        });

        this.excludedContainers =  document.querySelectorAll('.excluded-trials-container');
        this.excludedContainers.forEach(container => container.style.display = 'none');

        this.stimGroups = document.querySelectorAll('.stimGroup')
        this.groupButtons = document.querySelectorAll('.groupButton')
    }

    initialize(){

        this.set_channelButtons()
        this.set_stimGroups()
        this.set_groupButtons()
        this.set_ANOVA()
        this.set_allANOVA()
        this.set_excludeTrialsButton()
        this.set_homeButton()
        this.set_uploadLFP()
        this.set_uploadWavelet()
        this.set_dataForm()
        // this.set_meanTrials()
    }


    set_homeButton(){

        document.getElementById('homeButton').addEventListener('click', () => {
            
            document.querySelectorAll('.groupButton').forEach(button => {
               
                    button.classList.remove('active');
                    button.disabled = false;
            });
    
            document.querySelectorAll('.uploadButton').forEach(button => {

               button.disabled = false;

            });

            delete this.page.allWaveletTrials
            delete this.page.allLFPTrials
            console.log(this.page.allWaveletTrials)

        })
    }

    set_groupButtons(){

        this.excludedTrialsContainer = {}

        this.groupButtons.forEach((button) => {
            button.addEventListener('click', async (event) => {
                this.groupButtons.forEach(btn => btn.classList.remove('active'));

                event.target.classList.add('active'); 

                this.page.group = event.target.textContent;
                this.page.trial = 0;
            
                this.excludedContainers.forEach(container => container.style.display = 'none');
                this.excludedTrialsContainer[this.page.group].style.display = 'block'

                await this.page.get_ChannelNumbers()
                this.channelDisplay.textContent = `Channel ${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`;

                await this.page.getData();
        
                this.trialSlider.previousElementSibling.textContent = 'Trial:'
                this.containerWrapper.style.display = 'block'
            })
        });
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

    

    set_stimGroups(){

        this.stimGroups.forEach(button => {
            button.addEventListener('click', (event) => {
                this.excludedContainers.forEach(container => container.style.display = 'none');
                this.loadingText.style.display = "none";  
                this.indexView.style.display = 'none';
                this.heatmapView.style.display = 'block';
                this.containerWrapper.style.display = 'none'
                this.trialSlider.previousElementSibling.textContent = ''

                this.page.stimGroup = event.target.textContent
                this.allGroups = this.page.groupTypes[this.page.stimGroup]
                
                this.groupButtons.forEach((button,index) => {
                    button.textContent = this.allGroups[index];
                    button.classList.remove('active')
                    this.excludedTrialsContainer[button.textContent] = this.excludedContainers[index];

                })
            })
        })
    }

    set_excludeTrialsButton(){

        this.excludeTrialButton.addEventListener('click', () => {
            const trialButtonId = `trialButton-${this.page.group}-${this.page.trial}`;
            const trialButton = document.getElementById(trialButtonId);

        
            if (trialButton) {
                this.excludeTrialButton.classList.add('active');
            } else {
                this.excludeTrialButton.classList.remove('active');
            }
        

            if (trialButton) {
                this.excludedTrialsContainer[this.page.group].removeChild(trialButton);
            } else {

                const button = document.createElement('button');
                button.textContent = `Trial ${this.page.trial}`;
                button.id = trialButtonId;
                this.excludedTrialsContainer[this.page.group].appendChild(button);
        
                button.addEventListener('click', () => {

                    this.trialSlider.value = parseInt(trialButtonId.split('-')[2]);
                    this.trialSlider.dispatchEvent(new Event('input'));

                });
            }
            
            this.excludeTrialButton.classList.toggle('active');
            this.page.getData();
        }); 
    }

    set_channelButtons(){

        this.prevChan.addEventListener('click', () => {

            if (this.page.channelIdx > 0) {
                this.page.channelIdx--;
                this.channelDisplay.textContent = `Channel ${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`;

                this.page.getData();
            }
        })
        
        this.nextChan.addEventListener('click', () => {

            this.page.channelIdx++;
            this.channelDisplay.textContent = `Channel ${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`;

            this.page.getData();
        })
    }


    set_ANOVA(){

        document.querySelectorAll('.ANOVAbutton').forEach(button => {

            button.addEventListener('click', () => {
                document.querySelectorAll('.ANOVAbutton').forEach(button => {
                    button.classList.toggle('active');
                })

                this.page.ANOVA = !this.page.ANOVA; 
                
                if (this.page.ANOVA) {

                    this.pValDiv.style.display = 'inline-block'
                    this.trialScroll.style.display = 'none'
                    this.channelScroll.style.display = 'none'
                    this.ANOVAscroll.style.display = 'none'

                    this.excludedContainers.forEach(container => container.style.display = 'flex');
    
                } else {
    
                    this.pValDiv.style.display = 'none'
                    this.channelScroll.style.display = 'none'
                    this.ANOVAscroll.style.display = 'none'
                    this.trialScroll.style.display = 'inline'

                       
                    this.excludedContainers.forEach(container => container.style.display = 'none');
                    this.excludedTrialsContainer[this.page.group].style.display= 'flex'  
                }
    
                // disables and greys out trial groups buttons when ANOVA button pressed 
                document.querySelectorAll('.groupButton').forEach(button => {

                    if (button.textContent !== this.page.group) {
                        button.classList.toggle('active');
                    }

                    button.disabled = !button.disabled;

                });
    
                this.page.trial = 0;
                this.page.getData();

            });
        });
    }


    set_allANOVA(){

        this.allANOVA.addEventListener('click', async () =>{

            document.querySelectorAll('.ANOVAbutton').forEach(button => {
                button.disabled = !button.disabled 
            })

            this.allANOVA.classList.toggle('active');
            this.page.allANOVA = !this.page.allANOVA; 
            
            await this.page.getData();
            
            if (this.page.allANOVA){
                this.channelButtonContainer.style.display = 'none' ;
                this.ANOVAscroll.style.display = 'flex'

            }else{

                this.ANOVAscroll.style.display = 'none'
                this.channelButtonContainer.style.display = 'flex' ;
    
            }
        })
    }
}
    
window.Buttons = Buttons;