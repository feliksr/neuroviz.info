// data.js

class Data{
    constructor(stimGroup,allGroups) {
        // this.url = 'https://neuroviz.info/api/'
        this.url = 'http://localhost:5000/api/'

        // Initial page parameters
        this.stimGroup = stimGroup
        this.allGroups = allGroups
        this.subject = 'YDX'
        this.trial = 0
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

        let responseData = await this.fetchDataWithRetry(this.url + 'chans', args, this.maxRetries, this.initialDelay);

        this.chanNumbers = responseData.chanNumbers
        this.chanLabels = responseData.chanLabels

        loadingText.style.display = "none"; 
    }

    async fetchDataWithRetry(url, args, retries, delay) {
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
    
    async getANOVA() {
        pass
    }


    async getData() {
        console.log(this.chanNumbers[this.channelIdx])
        document.getElementById('channelDisplay').textContent = `Channel ${this.chanNumbers[this.channelIdx]} ${this.chanLabels[this.channelIdx]}`;

        document.getElementById('trialSlider').disabled = true 

        const channelSlider = document.getElementById('channelSlider')
        channelSlider.disabled = true

        const loadingText = document.getElementById('loadingText')
        loadingText.style.display = "block"; 

        let excludedTrialsContainer={};
        const args = {
            stimGroup: this.stimGroup,
            group: this.group,
            allGroups: this.allGroups,
            subject: this.subject,
            excludedTrialsContainer: excludedTrialsContainer,
            ANOVA: this.ANOVA,
            allANOVA: this.allANOVA,
            run: this.run
        }       
       
        if (!this.ANOVA){
            
            this.numChans = 1
            args.currentChannel = this.chanNumbers[this.channelIdx]

            try {
                this.responseData = await this.fetchDataWithRetry(this.url, args, this.maxRetries, this.initialDelay);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
                          
            this.waveletTrials = this.responseData.trialsWavelet
            this.LFPtrials = this.responseData.trialsLFP
            this.meanWavelet = this.responseData.trialsWaveletMean
            this.meanLFP = this.responseData.trialsLFPMean
                
        } else {
        
            if (this.allANOVA){
             this.numChans = this.chanNumbers.length
                // this.numChans = 5
                 
            }else{
                this.numChans = 1
            }
            
            for (let chans = 0; chans < (this.numChans); chans++) { 
                
                console.log(chans)
                if (this.allANOVA){
                    args.currentChannel = this.chanNumbers[chans]

                } else {
                    args.currentChannel = this.chanNumbers[this.channelIdx]
                }
                console.log(`channel: ${args.currentChannel}`)

                try {
                    this.responseData = await this.fetchDataWithRetry(this.url + 'anova', args, this.maxRetries, this.initialDelay);
                } catch (error) {
                    console.error('Failed to fetch data:', error);
                }
                
                this.allWaveletChannels[chans] = this.responseData.channelsWavelet[0]
                this.allLFPChannels[chans] = this.responseData.channelsLFP[0]
                this.singleChannelWavelet = this.allWaveletChannels[this.trial]
                this.singleChannelLFP = this.allLFPChannels[this.trial]
            }    

            channelSlider.max = this.numChans-1
            channelSlider.disabled = false

        }            
           
        if (!this.splitWavelets){
            this.init_Wavelet(this.waveletTrials)
            this.init_LFP(this.LFPtrials)  
            this.set_Slider()
        }
        
        const trialSlider = document.getElementById('trialSlider')
        trialSlider.value = 0
        trialSlider.max = Object.keys(this.waveletTrials).length-1;
        trialSlider.disabled = false;

        document.getElementById('trialNumber').textContent = 0

        loadingText.style.display = "none"; 

        return [this.waveletTrials,this.LFPtrials,this.meanWavelet, this.meanLFP]
    }


    init_Wavelet(waveletTrials) {
        this.splitWavelets = []

        this.containers.forEach((container,index) => {
            const freqBin = this.frequencyBins[index];
            
            const heatmap = new Heatmap(container,freqBin);
            const filtWavelet = heatmap.initialize(waveletTrials);
            heatmap.set_ColorScale(filtWavelet)
            heatmap.draw_Heatmap(filtWavelet)
            
            const colorbar = new Colorbar(heatmap);
            colorbar.initColorbar();
            colorbar.set_ColorbarDragging(waveletTrials)
            this.splitWavelets.push(heatmap)

        })

    }
    

    init_LFP(LFPtrials){
        this.LFP = new LFPchart(LFPtrials)
        this.LFP.initialize(LFPtrials[0])
    }
    
    set_LFP(LFPtrials){
        this.LFP.initialize(LFPtrials[0])
    }

    set_Wavelet(waveletTrials){
        this.splitWavelets.forEach(heatmap => {
            const splitWavelet = heatmap.split_Freq(waveletTrials)
            heatmap.set_ColorScale(splitWavelet)
            heatmap.draw_Heatmap(splitWavelet)
        });
    }

    set_Slider(){
        const trialNumber = document.getElementById('trialNumber')
        const trialSlider = document.getElementById('trialSlider') 

        trialSlider.addEventListener('input', (event) => {
            const trial = event.target.value;
            trialSlider.value = trial
            trialNumber.textContent = trial

            this.splitWavelets.forEach(heatmap => {
                const splitWavelet = heatmap.split_Freq(this.waveletTrials[trial])
                heatmap.draw_Heatmap(splitWavelet)

            });

            this.LFP.initialize(this.LFPtrials[trial])
        })
    }
} 
