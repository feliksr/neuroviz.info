//datapage.js

class DBpage{
    constructor(){

        this.groupTypes = {
            'Target Stimulus' : ['Soccerball','Trophy','Vase'],
            'Stimulus Type' : ['Target','Distractor','Irrelevant'],
            'Stimulus Identity' :  ['Soccerball', 'Trophy', 'Vase']
        }        

        this.channelIdx = 0
    }

    intialize(){

        const ids = [
            'excludeTrialButton', 'loadingText', 'nextChan', 'sliderLabel', 'chanSelect',
            'trialNumber', 'prevChan', 'groupButtonContainer', 'channelButtonContainer', 'heatmapView'
        ];

        fetch('heatmap.html')

        .then(response => response.text())

        .then(html => {
            document.getElementById('heatmapView').innerHTML = html;

            ids.forEach(id => {
                this[id] = document.getElementById(id);
            });

            this.init_GroupButtons()
            this.set_ChannelButtons()
            // this.set_ANOVA()
            // this.set_excludeTrialButton()
        })

        .catch(error => console.error('Error:', error));
    }


    async init_GroupButtons() {

        let container = document.getElementById('groupButtonContainer')
        
        while (container.firstChild){
            container.removeChild(container.firstChild)
        }

        let params = new URLSearchParams(window.location.search);

        let stimGroup = params.get('params');

        let allGroups  = this.groupTypes[stimGroup];

        allGroups.forEach(str => {
            
            let groupButton = document.createElement('button');
            groupButton.textContent = str;
            groupButton.className = 'groupButton';
            groupButton.stimGroup = stimGroup
            
            container.appendChild(groupButton)
            this.set_GroupButton(groupButton)
        });
    }

    
    set_GroupButton(groupButton){

        groupButton.addEventListener('click', async (event) => {
                
                let buttons = document.querySelectorAll('.groupButton');
                
                buttons.forEach(btn => btn.classList.remove('active'));                
                
                groupButton.classList.add('active'); 
                groupButton.group = event.target.textContent;
                this.group = event.target.textContent

                // this.excludedContainers.forEach(container => container.style.display = 'none');
                // this.excludedTrialsContainer[this.page.group].style.display = 'block'
                this.set_Data(groupButton)                            
        })
    }
    

    async set_Data(groupButton){
        
        let database = new DBLink()
                
        if (!this.chanNumbers){
            let chans = await database.get_Chans(groupButton)
            
            this.chanNumbers =  chans.chanNumbers;
            this.chanLabels = chans.chanLabels;
            this.set_ChannelSelect()
        } 
        
        groupButton.chanNumbers =  this.chanNumbers;
        groupButton.chanLabels = this.chanLabels;
        
        
        if (!groupButton.Wavelet){
            
            let responseData = await database.get_Data(groupButton,this.channelIdx);
            
            Object.keys(responseData).forEach(key => {
                groupButton[key] = responseData[key];
            })
        }

        
       
        groupButton.meanButton = this.init_MeanButton()
        
        groupButton.meanButton.addEventListener('click', () => {
            groupButton.meanButton.classList.toggle('active');
            this.view_Trials(groupButton)
        })
        
        this.view_Trials(groupButton)
    }


    init_MeanButton(){

        let container = document.getElementById('meanButtonContainer')
        
        document.getElementById('meanButton').remove()

        let meanButton = document.createElement('button')
        
        meanButton.id = 'meanButton'
        meanButton.textContent = 'Average Trials'
        
        container.appendChild(meanButton)
        return meanButton
    }


    view_Trials(groupButton){

        // this.channelDisplay.textContent = `Channel ${this.chanNumbers[this.channelIdx]} ${this.chanLabels[this.channelIdx]}`;
        let initSpectra = groupButton.Wavelet[0]
        let spectra = new SpectralPlot()
        let splitWavelets = spectra.init_Wavelet(initSpectra)
        
        let LFP = new LFPplot()
       
        if (groupButton.meanButton.classList.contains('active')) {

            spectra.set_Wavelet(groupButton.WaveletMean, splitWavelets)
            LFP.initialize(groupButton.LFPMean[0])

            document.getElementById('slider').remove()
            this.trialNumber.style.display = 'none'
            this.sliderLabel.style.display = 'none'


        } else {

            spectra.set_Wavelet(groupButton.Wavelet, splitWavelets)
            LFP.initialize(groupButton.LFP[0])
            
            let slider = new Slider()
            let sliderBar = slider.init_Slider()
            slider.set_Slider(groupButton,splitWavelets)
            sliderBar.value = 0
            sliderBar.max = Object.keys(groupButton.Wavelet).length-1;

            this.trialNumber.textContent = 0
            this.trialNumber.style.display = 'block'
            this.sliderLabel.style.display = 'block'
        }
                
        this.heatmapView.style.display = 'block'
    }


    set_ChannelButtons(){
       
        this.prevChan.addEventListener('click', () => {
            if (chanSelect.selectedIndex > 0) {
                chanSelect.selectedIndex--;  
            }

            chanSelect.dispatchEvent(new Event('change'));
        })
        
        this.nextChan.addEventListener('click', () => {
            if (chanSelect.selectedIndex < chanSelect.options.length - 1) {
                chanSelect.selectedIndex++;  
            }

            chanSelect.dispatchEvent(new Event('change'));
        })
    }

    set_ChannelSelect(){
   
        const chanSelect = document.getElementById('chanSelect');

        this.chanNumbers.forEach((number, index) => {
            const channel = document.createElement('option');
            channel.innerHTML = 'Channel #' + number + '&nbsp;&nbsp;&nbsp;&nbsp;' + this.chanLabels[index];

            chanSelect.appendChild(channel);
        });
        

        chanSelect.addEventListener('change', () => {
            this.channelIdx = chanSelect.selectedIndex
            this.init_GroupButtons();
        });
        
    }
    

    set_ANOVA(){
        document.getElementById('ANOVAbutton')
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

}

const page = new DBpage();
page.intialize();