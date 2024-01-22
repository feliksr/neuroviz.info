// data.js

class Data{
    constructor(stimGroup,category,allGroups) {
        this.url = 'https://neuroviz.info/api/'

        // Initial page parameters
        this.stimGroup = stimGroup
        this.allGroups = allGroups
        this.group = category
        this.subject = 'YDX'
        this.trial = 0
        this.channelIdx = 0
        this.run = 1

        this.meanTrials = false,
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
            group: this.group,
            subject: this.subject,
            run: this.run

        }

        let responseData = await this.fetchDataWithRetry(this.url + 'chans', args, this.maxRetries, this.initialDelay);
   
        this.chanNumbers = responseData.chanNumbers
        this.chanLabels = responseData.chanLabels
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
                // Handle network errors
                console.error(`Fetch error on attempt ${i + 1}:`, error);
            }
    
            // Wait and increase delay for next retry
            delay *= 2;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`delay: ${delay}ms`);

        }
        throw new Error('Request failed after retries');
    }
    

    async getData(excludedTrialsContainer) {
        console.log(this.chanNumbers[this.channelIdx])
        
        const trialSlider  = document.getElementById('trialSlider')
        trialSlider.disabled = true 

        const channelSlider = document.getElementById('channelSlider')
        channelSlider.disabled = true

        const loadingText = document.getElementById('loadingText')
        loadingText.style.display = "block"; 

        const args = {

            stimGroup: this.stimGroup,
            group: this.group,
            allGroups: this.allGroups,
            subject: this.subject,
            excludedTrialsContainer: excludedTrialsContainer,
            meanTrials: this.meanTrials,
            ANOVA: this.ANOVA,
            allANOVA: this.allANOVA,
            run: this.run
        }       
       
        if (!this.ANOVA){
            
            this.allWaveletTrials = {}
            this.allWaveletChannels = {}
            this.allLFPChannels = {}
            this.allLFPTrials = {}
            this.numChans = 1
            
            args.currentChannel = this.chanNumbers[this.channelIdx]

            try {
                this.responseData = await this.fetchDataWithRetry(this.url, args, this.maxRetries, this.initialDelay);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
            
              
            this.allWaveletTrials = this.responseData.trialsWavelet
            this.allLFPTrials = this.responseData.trialsLFP

            trialSlider.max = Object.keys(this.allWaveletTrials).length-1;
            trialSlider.disabled = false;
            this.singleTrialWavelet = this.allWaveletTrials[this.trial];
            this.singleTrialLFP = this.allLFPTrials[this.trial];
                
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
           
        loadingText.style.display = "none"; 
       
        this.set_Wavelet()
        this.set_LFP()
    }

    
    
    set_Wavelet() {

        if (this.allWaveletTrials){
            console.log(this.allWaveletTrials)
            this.containers.forEach((container,index) => {
                const freqBin = this.frequencyBins[index];
                const heatmap = new window.Heatmap(this,container,freqBin);
                heatmap.initialize();
                const colorbar = new window.Colorbar(heatmap);
                colorbar.initColorbar();
            })
        }
    }
    

    set_LFP(){

        this.LFPplot = new window.LFPchart(this)
        this.LFPplot.initialize()
    }
    

    getPowerValues(freqBin) {
        let powerValues = [];

        Object.entries(this.allWaveletTrials).forEach(([trialNum, array]) => {
            const trialButtonId = `trialButton-${this.group}-${trialNum}`;
            const isExcluded = document.getElementById(trialButtonId) !== null;
    
            if (!isExcluded) {
                array.forEach(d => {
                    if (d.frequency >= freqBin.min && d.frequency <= freqBin.max) {
                        powerValues.push(d.power);
                    };
                });
            }
        });
        return powerValues;
    }

    setColorScale(heatmap){
       const freqBin = heatmap.freqBin

       if (this.ANOVA ){
            heatmap.ANOVA = true
            heatmap.maxPower = this.allButtons.pVal.value
            heatmap.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([heatmap.maxPower,0])
            document.getElementById('colorbarLabel').textContent = 'p-Value'
        }
        else {
            heatmap.ANOVA = false
            heatmap.maxPower = 3 * d3.deviation(this.getPowerValues(freqBin))
            heatmap.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, heatmap.maxPower])
            document.getElementById('colorbarLabel').innerHTML = 'Power  (uV / Hz<sup>2</sup>)'
        }
    }
} 

window.data = Data;
