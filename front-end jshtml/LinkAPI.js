// LinkAPI.js

class LinkAPI{
    constructor() {

        this.url = 'https://neuroviz.info/api/'
        // this.url = 'http://localhost:5000/api/'

    }

    async call(urlSuffix, args) {
        
        const response = await fetch(this.url + urlSuffix, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(args)
        });

        return response.json()
    } 


    async upload_File(urlSuffix,args,file) {
        const formData = new FormData()

        formData.append('file', file)
        formData.append('jsonData', JSON.stringify(args))
        
        await fetch(this.url + urlSuffix, {
            method: 'POST',
            body: formData
        });

    }

    
    convert_LFPs2Objs(LFPs,mean){
        let d3LFPs = [];
        let data 
        
        if (mean===true) {
            data = LFPs.mean
        }else{
            data = LFPs.data
        }

        data.forEach((trial, trialIndex) => {
             trial.forEach((voltage, timeIndex) => {
                d3LFPs.push({ 
                    'trial'   : trialIndex+1, 
                    'time'    : LFPs.time[timeIndex],
                    'voltage' : voltage 
                });
            });  
        });
    
        return d3LFPs
    }


    convert_Wavelets2Objs(wavelets,mean){
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
            wavelets.d3.data = this.convert_Wavelets2Objs(
                wavelets,mean=false) 

            if (wavelets.mean !== null){
                wavelets.d3.mean = this.convert_Wavelets2Objs(
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
            LFPs.d3.data = this.convert_LFPs2Objs(LFPs, mean=false)
            
            if (LFPs.mean !== null){
                LFPs.d3.mean = this.convert_LFPs2Objs(
                    LFPs, mean=true)
            }
                       
            data.LFPs = LFPs
        }

        return data
    }
}