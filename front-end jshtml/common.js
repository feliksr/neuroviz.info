//common.js

class Elements{
    
    set_Slider(button,splitWavelets){
        const buttonMean  = document.getElementById('meanButton')
        const buttonANOVA = document.getElementById('buttonANOVA')
        const sliderElements = document.getElementById('sliderElements')
        
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

        const containers  = document.getElementById('containers')
        const container4  = document.getElementById('container4')
        const heatmapView = document.getElementById('heatmapView')
        const buttonMean  = document.getElementById('meanButton')

        containers.style.display  = 'none'
        container4.style.display  = 'none'
        
        if (!button.LFPs && !button.wavelets){
            heatmapView.style.display = 'none';
        } else{
            heatmapView.style.display = 'block';
        }
            
        let splitWavelets

        if (button.LFPs){
            let initLFP

            if (!buttonMean.classList.contains('active')){
                initLFP = button.LFPs.d3.filter(d => d.trial === 1);
            } else {
                initLFP = button.LFPs.d3.mean
            }

            const LFPchart = new LFPplot()
            LFPchart.initialize(initLFP)

            container4.style.display = 'flex'
            console.log('LFP displayed')
        }

        if (button.wavelets){
            let initWavelet
            
            let spectra = new SpectralPlot();

            if (!buttonMean.classList.contains('active')){
                initWavelet = button.wavelets.d3.filter(d => d.trial === 1);
                splitWavelets = spectra.init_Wavelet(initWavelet);
                spectra.set_Wavelet(button.wavelets.d3,splitWavelets);

            } else {

                initWavelet = button.wavelets.d3.mean;
                splitWavelets = spectra.init_Wavelet(initWavelet);
                spectra.set_Wavelet(initWavelet,splitWavelets);
            }
            containers.style.display = 'flex'
            console.log('wavelet displayed');
        }

        this.set_Slider(button,splitWavelets)
    }


    init_ButtonMean(){
        const meanButton = document.getElementById('meanButton')    
        
        meanButton.addEventListener('click', () => {
            meanButton.classList.toggle('active')

            document.querySelectorAll('.groupButton').forEach(button => {
                if (button.classList.contains('active')){
                    this.view_Trials(button)
                }
            })
        })
    }
    
    async run_ANOVA(button,dataLink){
        const args = {
            "url": 'ANOVA'
        }

        args.formData = {
            "groupNumber" : button.groupNumber
        }

        const response = await dataLink.upload_Data(args)
        const data = dataLink.parse_Data(response)
        return data
    }

    init_ButtonANOVA(dataLink){
        const buttonANOVA = document.getElementById('buttonANOVA')

        buttonANOVA.addEventListener('click', ()  => {
            buttonANOVA.classList.toggle('active')

            document.getElementById('heatmapView').style.display = 'none'
            const buttonMean = document.getElementById('meanButton')
            const buttonNew = document.getElementById('buttonNew')
            const buttons   = document.querySelectorAll('.groupButton');

            buttonMean.classList.remove('active')
            buttonMean.visibility = !buttonANOVA.classList.contains('active')

            buttons.forEach(button =>
                button.classList.remove('active')
            )

            if (buttonNew){
                buttonNew.disabled = buttonANOVA.classList.contains('active')
            }

            dataLink.delete_GroupNumbers()
        })
    }
}

