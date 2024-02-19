//slider.js

class Slider {

    init_Slider(){

        const container = document.getElementById('sliderContainer');

        let slider = document.getElementById('slider');
        
        if (slider) {
            slider.remove();
        }

        slider = document.createElement('input');
        slider.type = 'range';
        slider.id = 'slider';
        slider.min   = 1; 
        slider.value = 1;

        container.appendChild(slider);
        return slider
        
    }

    set_SliderBehavior(button,splitWavelets,slider) {
        const sliderNumber = document.getElementById('sliderNumber')
        sliderNumber.textContent = 1  

        slider.addEventListener('input', (event) => {
            const trial  = event.target.value;
            slider.value = trial
            sliderNumber.textContent = parseInt(trial)

            if (button.wavelets){

                splitWavelets.forEach(heatmap => {
                    const splitWavelet = heatmap.split_Freq(button.wavelets.d3.filter(d => d.trial === parseInt(trial)))
                    heatmap.draw_Heatmap(splitWavelet)
                });
            }

            if (button.LFPs){
                let LFP = new LFPplot();
                LFP.initialize(button.LFPs.d3.filter(d => d.trial === parseInt(trial)))
            }
        })


    }
}