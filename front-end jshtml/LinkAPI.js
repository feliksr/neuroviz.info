// LinkAPI.js

class LinkAPI{
    constructor() {

        this.url = 'https://neuroviz.info/api/'
        // this.url = 'http://localhost:5000/api/'

        this.loadingText  = document.getElementById('loadingText')

        this.maxRetries   = 5;
        this.initialDelay = 5000; // in milliseconds
    }

    async get_Chans(groupButton){

        this.loadingText.style.display = "block"; 

        const args = {
            stimGroup: groupButton.stimGroup,
            group    : groupButton.group,
            subject  : 'YDX',
            run      : 1  
        }

        let chans = await this.fetch_DataWithRetry(
            
            this.url + 'chans', args, this.maxRetries, this.initialDelay);

        return chans
    }


    async get_Data(groupButton,channelIdx) {
        this.loadingText.style.display = "block"; 
     
        const args = {
            stimGroup   : groupButton.stimGroup,
            group       : groupButton.group,
            subject     : 'YDX',
            channel     : groupButton.chanNumbers[channelIdx],
            run         : 1,
            groupNumber : groupButton.groupNumber
        }       

        let responseData
 
        try {
            responseData = await this.fetch_DataWithRetry(
                this.url + 'stored', args, this.maxRetries, this.initialDelay)
                this.loadingText.style.display = "none";
                return responseData
        
        } catch (error) {
                console.error('Failed to fetch data:', error);
        }
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

    async upload_Data(args) {
        const formData = new FormData();
        const params = args.formData

        if (args.file){
            formData.append('file', args.file);
        }
        
        formData.append('jsonData', JSON.stringify(params))
        
        try {
            const response = await fetch(this.url + args.url, {
                method: 'POST',
                body: formData
            });
    
            return response.json();

        } catch (error) {
            console.error('Error:', error);
            throw error; 
        }
    }

    convert_LFPsToObjs(LFPs,mean){
        let d3LFPs = [];
        let data 
        
        if (mean===true) {
            data = LFPs.mean
        }else{
            data = LFPs.data
        }

        data.forEach((trial, indexTrial) => {
             trial.forEach((voltage, timeIndex) =>{
                d3LFPs.push({ 
                    'trial'   : indexTrial+1, 
                    'time'    : LFPs.time[timeIndex],
                    'voltage' : voltage 
                });
            });  
        });
    
        return d3LFPs
    }

    convert_WaveletsToObjects(wavelets,mean){
        let d3Wavelets = [];
        let data
        
        if (mean===true){
            data = wavelets.mean
        } else {
            data = wavelets.data
        }
        
        data.forEach((trial, trialIndex) => {
            trial.forEach((freqBin, freqIdx) => {
                freqBin.forEach((power, timeIdx) => {
                    d3Wavelets.push({
                        'trial': trialIndex + 1,
                        'time': wavelets.time[timeIdx], 
                        'frequency': wavelets.freq[freqIdx],
                        'power': power
                    });
                });
            });
        });

        return d3Wavelets;
    }

    parse_Data(responseData){

        let mean
        const data = {}
        
        if (responseData.wavelets_data){
            
            const wavelets = {
                "data"  : JSON.parse(responseData.wavelets_data),
                "mean"  : JSON.parse(responseData.wavelets_mean ?? "null"),
                "time"  : responseData.wavelets_time,
                "freq"  : responseData.wavelets_freq,
            }
            wavelets.trials = wavelets.data.length
            
            wavelets.d3 = {}
            wavelets.d3.data = this.convert_WaveletsToObjects(
                wavelets,mean=false) 

            if (wavelets.mean !== null){
                wavelets.d3.mean = this.convert_WaveletsToObjects(
                    wavelets,mean=true)
            }

            data.wavelets = wavelets    
        }

        if (responseData.LFPs_data){
            
            const LFPs = {
                "data"   :  JSON.parse(responseData.LFPs_data),
                "mean"   :  JSON.parse(responseData.LFPs_mean ?? "null"),
                "time"   :  responseData.LFPs_time,
            }
            LFPs.trials = LFPs.data.length
            
            LFPs.d3 = {}
            LFPs.d3.data = this.convert_LFPsToObjs(LFPs, mean=false)
            
            if (LFPs.mean !== null){
                LFPs.d3.mean = this.convert_LFPsToObjs(
                    LFPs, mean=true)
            }
                       
            data.LFPs = LFPs
        }

        return data
    }

    clear_Cache(){
        fetch(this.url + 'clear', {
            method: 'POST'
        })          
    }

    delete_GroupNumbers(){
        fetch(this.url + 'delete', {
            method: 'POST'
        })
    }

}