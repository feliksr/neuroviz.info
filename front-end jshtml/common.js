//common.js

class Elements{

    constructor(){
        this.initialize()
    }

    initialize(){
        const ids = [
            'buttonANOVA', 'buttonMean', 'buttonBaseline', 'buttonPCA', 'buttonBonf',
            'heatmapView', 'containers', 'sliderElements', 'container4',
            'computeButtonsDiv', 'formPCA'
        ]

        ids.forEach(id => {
            this[id] = document.getElementById(id)
        });
    }

    set_Slider(button,splitWavelets){

        if (!buttonMean.classList.contains('active') && !buttonANOVA.classList.contains('active')) {
            let sliderElement = new Slider()
            let slider        = sliderElement.init_Slider()
            
            sliderElement.set_SliderBehavior(button,splitWavelets,slider)
            
            let maxTrials

            if (button.LFPs){
                maxTrials = button.LFPs.trials
            } else if (button.wavelets){
                maxTrials = button.wavelets.trials
            }
            
            slider.max = maxTrials

            sliderElements.style.visibility = 'visible'
       
        } else {
            sliderElements.style.visibility = 'hidden'
        }
    }   

    view_Trials (button){
        heatmapView.style.display = 'block'
        
        if (!button.LFPs && !button.wavelets){
            heatmapView.style.visibility = 'hidden';
        } else{
            heatmapView.style.visibility = 'visible';
        }
        
        containers.style.visibility  = 'hidden'
        container4.style.visibility  = 'hidden'
                                    
        let splitWavelets

        if (button.LFPs){
            let initLFP

            if (!buttonMean.active){
                initLFP = button.LFPs.d3.data.filter(d => d.trial === 1)
            } else {
                initLFP = button.LFPs.d3.mean
            }

            const LFPchart = new LFPplot()
            LFPchart.initialize(initLFP)

            container4.style.visibility = 'visible'
            console.log('LFP displayed')
        }

        if (button.wavelets){
                       
            let initWavelet
            let spectra = new SpectralPlot();

            if (!buttonMean.active){
                initWavelet = button.wavelets.d3.data.filter(d => d.trial === 1)
                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(button.wavelets.d3.data,splitWavelets)

            } else {

                initWavelet = button.wavelets.d3.mean
                
                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(initWavelet,splitWavelets)
            }
            containers.style.visibility = 'visible'
            console.log('wavelet displayed')
        }

        this.set_Slider(button,splitWavelets)
    }


    init_AnalysisButton(button,dataLink){
        button.active = false

        button.addEventListener('click', () => {
            button.classList.toggle('active')
            button.active = button.classList.contains('active')

            buttonBaseline.disabled = buttonANOVA.active
            buttonMean.disabled = buttonANOVA.active
            // buttonPCA.disabled = buttonANOVA.active
            // buttonANOVA.disabled = buttonPCA.active
                
            document.querySelectorAll('.groupButton')
                .forEach(button =>
                    button.classList.remove('active')
            )

            const buttonNew = document.getElementById('buttonNew')

            if (buttonNew){       
                buttonNew.disabled = button.active;
            }

            heatmapView.style.visibility    = 'hidden'
            containers.style.visibility     = 'hidden'
            container4.style.visibility     = 'hidden'
            sliderElements.style.visibility = 'hidden'

            dataLink.delete_GroupNumbers()
        })
    }

    init_buttonBonf(){
        buttonBonf.active = false
        buttonBonf.addEventListener('click', () => {
            buttonBonf.classList.toggle('active')
            buttonBonf.active = buttonBonf.classList.contains('active')
        })
    }

    init_ModifyButton(button){
        button.active = false
        
        button.addEventListener('click', () => {
            button.classList.toggle('active')
            button.active = button.classList.contains('active')

            buttonANOVA.disabled = buttonBaseline.active || buttonMean.active || buttonPCA.active

            document.querySelectorAll('.groupButton').forEach(btn => {
                if (btn.classList.contains('active') && !buttonANOVA.active && !buttonPCA.active){
                    btn.click()
                }
            })
        })
    }
    
    async run_ANOVA(button,dataLink){
        
        const args = {
            "url": 'ANOVA'
        }

        args.formData = {
            "groupNumber" : button.groupNumber,
            "bonfCorrect"  : buttonBonf.active
        }

        const response = await dataLink.upload_Data(args)
        const data = dataLink.parse_Data(response)
        return data
    }

    async run_PCA(button,dataLink){
        const compStart = document.getElementById('compStart')
        const compEnd = document.getElementById('compEnd')

        if (compStart && compEnd && compStart.value>compEnd.value){
            const start  = compStart.value
            const end = compEnd.value
            compEnd.value = start
            compStart.value = end
        }

        const args = {
            "url": 'PCA'
        }

        args.formData = {
            "groupNumber"    : button.groupNumber,
            "baseCorrect"    : buttonBaseline.active,
            "componentStart" : compStart ? parseInt(compStart.value) : null,
            "componentEnd"   : compEnd ? parseInt(compEnd.value) : null
        };
        

        const response = await dataLink.upload_Data(args)
        const data = dataLink.parse_Data(response)
        compEnd.value = response.componentEnd
        compStart.value = response.componentStart
        return data
    }
    
}

