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

    get_Heatmap(){
        const ids = [
            'channelDisplay', 'excludeTrialButton', 'loadingText', 'nextChan', 
            'trialNumber', 'prevChan', 'groupButtonContainer', 'channelButtonContainer', 'heatmapView'
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
        this.init_GroupButtons()
        this.set_ChannelButtons()
         
        // this.set_ANOVA()
        // this.set_excludeTrialButton()
    }

    view_Trials(responseData,slider,meanButton){
            
        if (meanButton.classList.contains('active')) {

            this.data.set_Wavelet(responseData.WaveletMean)
            this.data.set_LFP(responseData.LFPMean)
            slider.disabled = true
        
        } else {

            this.data.set_Wavelet(responseData.Wavelet)
            this.data.set_LFP(responseData.LFP)
            slider.disabled = false

        }
                    
        slider.value = 0
        slider.max = Object.keys(responseData.Wavelet).length-1;

        this.trialNumber.textContent = 0

    }

    init_MeanButton(responseData,slider){

        let container = document.getElementById('meanButtonContainer')
        
        let button = document.getElementById('meanButton')

        if (button) {
            button.remove()
        }

        let meanButton = document.createElement('button')
        
        meanButton.id = 'meanButton'
        meanButton.textContent = 'Average Trials'

        meanButton.responseData = responseData
        meanButton.slider = slider
        
        meanButton.addEventListener('click', () => {
            meanButton.classList.toggle('active');
            this.view_Trials(meanButton.responseData,meanButton.slider,meanButton)
        })

        container.appendChild(meanButton)
        
        return meanButton
    }


    set_GroupButton(groupButton){

        groupButton.addEventListener('click', async (event) => {
                const buttons = document.querySelectorAll('.groupButton');
                buttons.forEach(btn => btn.classList.remove('active'));                
                event.target.classList.add('active'); 
                this.data.group = event.target.textContent;
                // this.excludedContainers.forEach(container => container.style.display = 'none');
                // this.excludedTrialsContainer[this.page.group].style.display = 'block'
                this.set_Data()                            
        })
    }
 
    async set_Data(){
        let responseData = await this.data.get_Data();
                
        let slider = this.data.init_Slider()
        this.data.set_Slider(responseData.Wavelet, responseData.LFP)

        let button = this.init_MeanButton(responseData,slider)
        
        this.view_Trials(responseData, slider, button)
     
        this.heatmapView.style.display = 'block'
    }


    async init_GroupButtons() {

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
            this.set_GroupButton(groupButton)
        });
    }
  

    // set_ExcludeTrialButton(){

    //     this.excludeTrialButton.addEventListener('click', () => {
    //         const trialButtonId = `trialButton-${this.page.group}-${this.page.trial}`;
    //         const trialButton = document.getElementById(trialButtonId);

        
    //         if (trialButton) {
    //             this.excludeTrialButton.classList.add('active');
    //         } else {
    //             this.excludeTrialButton.classList.remove('active');
    //         }
        

    //         if (trialButton) {
    //             this.excludedTrialsContainer[this.page.group].removeChild(trialButton);
    //         } else {

    //             const button = document.createElement('button');
    //             button.textContent = `Trial ${this.page.trial}`;
    //             button.id = trialButtonId;
    //             this.excludedTrialsContainer[this.page.group].appendChild(button);
        
    //             button.addEventListener('click', () => {

    //                 this.trialSlider.value = parseInt(trialButtonId.split('-')[2]);
    //                 this.trialSlider.dispatchEvent(new Event('input'));

    //             });
    //         }
            
    //         this.excludeTrialButton.classList.toggle('active');
    //         this.page.get_Data();
    //     }); 
    // }

    set_ChannelButtons(){

        this.prevChan.addEventListener('click', () => {

            if (this.data.channelIdx > 0) {
                this.data.channelIdx--;
                this.set_Data();
            }
        })
        
        this.nextChan.addEventListener('click', () => {

            this.data.channelIdx++;
            this.set_Data();
        })
    }

    set_ANOVA(){
        document.getElementById('ANOVAbutton')
    }

}

const buttons = new Buttons;
buttons.get_Heatmap();


