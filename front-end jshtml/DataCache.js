//DataCache.js

class DataCache{
    static groups = []
    
    static currentCategory = ""
    static currentChannel  = ""
    static currentGroup    = ""
    
    static wavelets     = {}
    static LFPs         = {}
    static LFPfiles     = {}
    static waveletFiles = {}

    static freqLow   = null
    static freqHigh  = null
    static timeStart = null 
    static timeStop  = null

    static async set(group){
        const channel   = DataCache.currentChannel
        const category  = DataCache.currentCategory
        
        let response

        const LFPfiles = DataCache.LFPfiles[group]
        const waveletFiles = DataCache.waveletFiles[group]
    
        if (!LFPfiles || !waveletFiles){
            const args = {
                'category' : category,
                'group'    : group,
                'subject'  : 'YDX',
                'channel'  : channel,
                'run'      : 1
            }     
            
            response = await dataLink.call('cacheCheck',args)
            if (!response.wavelets_data){
                await dataLink.call('dbData',args)
                response = await dataLink.call('cacheCheck',args)
            }
        
        } else {

            const LFPfile = LFPfiles[channel] || null
            const waveletFile = waveletFiles[channel] || null

            const args = {
                'freqLow'   : DataCache.freqLow,  
                'freqHigh'  : DataCache.freqHigh, 
                'timeStart' : DataCache.timeStart,
                'timeStop'  : DataCache.timeStop,
                'channel'   : channel,
                'group'     : group
            }

            response = await dataLink.call('cacheCheck',args)

            if (!response.LFPs_data && LFPfile){
                await dataLink.upload_File('uploadLFP',args,LFPfile)
            }

            if (!response.wavelets_data && waveletFile){
                await dataLink.upload_File('uploadWavelet',args,waveletFile)
            }
            
            response = await dataLink.call('cacheCheck',args)
        }

        const data = dataLink.parse_Data(response)
    
        DataCache.wavelets[group] = data.wavelets
        DataCache.LFPs[group] = data.LFPs
    }
}
