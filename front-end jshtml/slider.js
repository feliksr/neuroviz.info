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

        container.appendChild(slider);
        return slider
        
    }

    set_Slider(button,splitWavelets) {
        const trialNumber = document.getElementById('trialNumber')
        const slider = document.getElementById('slider') 

        slider.addEventListener('input', (event) => {
            const trial = event.target.value;
            slider.value = trial
            trialNumber.textContent = parseInt(trial) + 1

            if (button.Wavelet){

                splitWavelets.forEach(heatmap => {
                    const splitWavelet = heatmap.split_Freq(button.Wavelet[trial])
                    heatmap.draw_Heatmap(splitWavelet)
                });
            }

            if (button.LFP){
                let LFP = new LFPplot();
                LFP.initialize(button.LFP[trial])
            }
        })
    }
}