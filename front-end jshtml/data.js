// data.js

class Data{
    constructor(stimGroup,allGroups) {
        // this.url = 'https://neuroviz.info/api/'
        this.url = 'http://localhost:5000/api/'

        // Initial page parameters
        this.stimGroup = stimGroup
        this.allGroups = allGroups
        this.subject = 'YDX'
        this.channelIdx = 0
        this.run = 1

        this.ANOVA =  false,

        this.frequencyBins = [
            { min: 60, max: 200 },
            { min: 20, max: 60 },
            { min: 0, max: 20 }
        ];

        this.containers= ['#container1', '#container2', '#container3'];

        this.maxRetries = 5;
        this.initialDelay = 5000; // in milliseconds
    }

    async get_ChannelNumbers(){
        const loadingText = document.getElementById('loadingText')
        loadingText.style.display = "block"; 

        const args = {
            stimGroup: this.stimGroup,
            group: this.allGroups[0],
            subject: this.subject,
            run: this.run
        }

        let responseData = await this.fetch_DataWithRetry(this.url + 'chans', args, this.maxRetries, this.initialDelay);

        this.chanNumbers = responseData.chanNumbers
        this.chanLabels = responseData.chanLabels

        loadingText.style.display = "none"; 
    }

    async fetch_DataWithRetry(url, args, retries, delay) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(args)
                });
    
                if (response.ok) {
                    return await response.json();  
                } else {
                    throw new Error(`HTTP error: ${response.status}`);
                }
            } catch (error) {
                console.error(`Fetch error on attempt ${i + 1}:`, error);
            }
    
            // Wait and increase delay for next retry
            delay *= 2;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`delay: ${delay}ms`);

        }
        throw new Error('Request failed after retries');
    }
    
    // async get_ANOVA() {
    //     if (this.allANOVA){

    //         const channelSlider = document.getElementById('channelSlider')
    //         channelSlider.disabled = true

    //         this.numChans = this.chanNumbers.length
    //            // this.numChans = 5
                
    //        }else{
    //            this.numChans = 1
       
    //        for (let chans = 0; chans < (this.numChans); chans++) { 
                
    //         console.log(chans)
    //         if (this.allANOVA){
    //             args.currentChannel = this.chanNumbers[chans]

    //         } else {
    //             args.currentChannel = this.chanNumbers[this.channelIdx]
    //         }
    //         console.log(`channel: ${args.currentChannel}`)

    //         try {
    //             this.responseData = await this.fetch_DataWithRetry(this.url + 'anova', args, this.maxRetries, this.initialDelay);
    //         } catch (error) {
    //             console.error('Failed to fetch data:', error);
    //         }
            
    //         this.allWaveletChannels[chans] = this.responseData.channelsWavelet[0]
    //         this.allLFPChannels[chans] = this.responseData.channelsLFP[0]
    //         this.singleChannelWavelet = this.allWaveletChannels[this.trial]
    //         this.singleChannelLFP = this.allLFPChannels[this.trial]
    //     }    
    // }
    //     channelSlider.max = this.numChans-1
    //     channelSlider.disabled = false
    // }    


    async get_Data() {
        console.log(this.chanNumbers[this.channelIdx])
        
        let channelDisplay = document.getElementById('channelDisplay')
        channelDisplay.textContent = `Channel ${this.chanNumbers[this.channelIdx]} ${this.chanLabels[this.channelIdx]}`;
        
        let trialSlider
        trialSlider = document.getElementById('trialSlider');

        if (trialSlider) {
            trialSlider.disabled = true;
        }

        const loadingText = document.getElementById('loadingText')
        loadingText.style.display = "block"; 

        let excludedTrialsContainer={};

        const args = {
            stimGroup: this.stimGroup,
            group: this.group,
            subject: this.subject,
            currentChannel: this.chanNumbers[this.channelIdx],
            excludedTrialsContainer: excludedTrialsContainer,
            run: this.run
        }       

        let responseData
        // this.numChans = 1
 
        try {
            responseData = await this.fetch_DataWithRetry(this.url, args, this.maxRetries, this.initialDelay)
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
           
        if (!this.splitWavelets){
            this.init_Wavelet(responseData.Wavelet)
            this.init_LFP(responseData.LFP)  
        }
        
        loadingText.style.display = "none";

        return responseData
    }

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
    
    set_Slider(waveletTrials,LFPtrials){

        const trialNumber = document.getElementById('trialNumber')
        const slider = document.getElementById('slider') 

        slider.addEventListener('input', (event) => {
            const trial = event.target.value;
            slider.value = trial
            trialNumber.textContent = trial

            if (waveletTrials){

                this.splitWavelets.forEach(heatmap => {
                    const splitWavelet = heatmap.split_Freq(waveletTrials[trial])
                    heatmap.draw_Heatmap(splitWavelet)
                });
            }

            if (LFPtrials){
                this.LFP.initialize(LFPtrials[trial])
            }
        })
    }

    init_Wavelet(waveletTrials) {

        this.splitWavelets = []

        this.containers.forEach((container,index) => {
            const freqBin = this.frequencyBins[index];
            
            const heatmap = new Heatmap(container,freqBin);
            let splitWavelet = heatmap.initialize(waveletTrials);
            heatmap.set_ColorScale(splitWavelet);
          
            heatmap.colorbar = new Colorbar(heatmap);
            heatmap.colorbar.init_Colorbar();

            this.splitWavelets.push(heatmap);
        })
    }
        
    set_Wavelet(waveletTrials){

        this.splitWavelets.forEach(heatmap => {
            const splitWavelet = heatmap.split_Freq(waveletTrials[0])
            heatmap.set_ColorScale(splitWavelet)
            heatmap.draw_Heatmap(splitWavelet)
            heatmap.colorbar.set_ColorbarScale();
            heatmap.colorbar.draw_Colorbar();
            heatmap.colorbar.set_ColorbarDragging(waveletTrials);          
        });
    }

    init_LFP(){
        this.LFP = new LFP();
    }
    
    set_LFP(LFPtrials){
        this.LFP.initialize(LFPtrials[0])
    }

} 
