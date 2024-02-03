//buttons.js

class Buttons{
    constructor(){

        this.groupTypes = {
            'Target Stimulus' : ['Soccerball','Trophy','Vase'],
            'Stimulus Type' : ['Target','Distractor','Irrelevant'],
            'Stimulus Identity' :  ['Soccerball', 'Trophy', 'Vase']
        }
              
        this.excludedContainers =  document.querySelectorAll('.excluded-trials-container');
        this.excludedContainers.forEach(container => container.style.display = 'none');
        
    }

    get_heatmap(){
        const ids = [
            'trialSlider', 'channelDisplay', 'excludeTrialButton', 'loadingText',
            'nextChan', 'trialNumber', 'trialScroll', 'prevChan', 'groupButtonContainer',
            'channelScroll', 'channelNumber', 'channelButtonContainer', 'heatmapView', 'meanTrialsButton'
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

    initialize() {
        this.init_groupButtons()
        this.set_channelButtons()
        
        this.meanTrialsButton.addEventListener('click', () => {
            this.meanTrialsButton.classList.toggle('active');
            this.view_Trials(this.wavelet,this.LFP,this.meanWavelet,this.meanLFP)
        })
        
        // this.set_ANOVA()
        // this.set_excludeTrialButton()
    }

    view_Trials(wavelet,LFP, meanWavelet, meanLFP){
            
            if (this.meanTrialsButton.classList.contains('active')) {
                this.data.set_Wavelet(meanWavelet[0])
                this.data.set_LFP(meanLFP)
                this.trialSlider.disabled = true
            } else {
                this.data.set_Wavelet(wavelet[0])
                this.data.set_LFP(LFP)
                this.trialSlider.disabled = false

            }
                      
            this.trialSlider.value = 0
            this.trialNumber.textContent = 0
    
    }



    set_groupButton(groupButton){


        groupButton.addEventListener('click', async (event) => {
                const buttons = document.querySelectorAll('.groupButton');
                buttons.forEach(btn => btn.classList.remove('active'));                
                event.target.classList.add('active'); 
                this.data.group = event.target.textContent;
                // this.excludedContainers.forEach(container => container.style.display = 'none');
                // this.excludedTrialsContainer[this.page.group].style.display = 'block'
                
                
                
                [this.wavelet, this.LFP, this.meanWavelet, this.meanLFP] = await this.data.getData();
                this.view_Trials(this.wavelet,this.LFP, this.meanWavelet, this.meanLFP)
                this.heatmapView.style.display = 'block'
        })
    }
 
    async init_groupButtons() {

        const params = new URLSearchParams(window.location.search);
        const stimGroup = params.get('params');

        let allGroups  = this.groupTypes[stimGroup];
        
        this.data = new Data(stimGroup,allGroups);
        await this.data.get_ChannelNumbers();
        
        allGroups.forEach(str => {
            let groupButton = document.createElement('button');
            groupButton.textContent = str;
            groupButton.className = 'groupButton';
            this.groupButtonContainer.appendChild(groupButton)
            this.set_groupButton(groupButton)
        });
    }
  

    set_excludeTrialButton(){

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

            if (this.data.channelIdx > 0) {
                this.data.channelIdx--;
                this.data.getData();
            }
        })
        
        this.nextChan.addEventListener('click', () => {

            this.data.channelIdx++;
            this.data.getData();
        })
    }

    set_ANOVA(){
        document.getElementById('ANOVAbutton')
    }

}

const buttons = new Buttons;
buttons.get_heatmap();


