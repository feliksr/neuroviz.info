//common.js

class Elements{

    constructor(){
        this.initialize()
    }

    initialize(){
        const ids = [
            'buttonANOVA', 'sliderElements', 'buttonMean' , 
            'buttonNew', 'buttonBaseline', 'heatmapView',
            'containers', 'container4'
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

            if (!buttonMean.classList.contains('active')){
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

            if (!buttonMean.classList.contains('active')){
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

            // if(!button.LFPs){
            //     const container = d3.select('#container3 svg')
            //     console.log(d3.select('#container3'))
            //     container.call(d3.axisBottom(this.xScale).ticks(5))
            // }
        }

        this.set_Slider(button,splitWavelets)
    }


    init_ButtonMean(){
        
        buttonMean.addEventListener('click', () => {
            buttonMean.classList.toggle('active')

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
            
            heatmapView.style.visibility = 'hidden'
            containers.style.visibility  = 'hidden'
            container4.style.visibility  = 'hidden'
            sliderElements.style.visibility = 'hidden'
            
            buttonMean.classList.remove('active')
            buttonMean.disabled = buttonANOVA.classList.contains('active')
            buttonBaseline.disabled = buttonANOVA.classList.contains('active')
            
            document.querySelectorAll('.groupButton')
                .forEach(button =>
                    button.classList.remove('active')
            )

            if (typeof buttonNew !== 'undefined' && buttonNew) {
                buttonNew.disabled = buttonANOVA.classList.contains('active');
            }

            dataLink.delete_GroupNumbers()
        })
    }

    set_ButtonBaseline(){

        buttonBaseline.addEventListener('click', () =>{
            buttonBaseline.classList.toggle('active')
            buttonANOVA.disabled = buttonBaseline.classList.contains('active')
            document.querySelectorAll('.groupButton').forEach(button => {
                if(button.classList.contains('active')){
                    button.click()
                }
            })
        })
    }
}

