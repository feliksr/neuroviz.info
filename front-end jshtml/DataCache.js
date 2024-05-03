//DataCache.js

class DataCache{
    static groups          = []
    static currentCategory = ""
    static currentChannel  = ""
    static currentGroup    = ""
    static wavelets        = {}
    static LFPs            = {}
    static files           = {}
    static freqLow         = null
    static freqHigh        = null
    static timeStart       = null 
    static timeStop        = null
    static urlSuffix       = null


    async get_Data(group){
        const channel   = DataCache.currentChannel
        const category  = DataCache.currentCategory
        
        let response
    
        if (DataCache.files == {}){
            const args = {
                category : category,
                group    : group,
                subject  : 'YDX',
                channel  : channel,
                run      : 1
            }     
            const urlSuffix = 'stored'

            response = await dataLink.fetch_Data(urlSuffix,args)
        
        } else {
            const args = {
                'file' : DataCache.files[group][channel],
                'url'  : DataCache.urlSuffix
            }

            args.params = {
                'freqLow'   : DataCache.freqLow,  
                'freqHigh'  : DataCache.freqHigh, 
                'timeStart' : DataCache.timeStart,
                'timeStop'  : DataCache.timeStop,
                'channel'   : DataCache.currentChannel,
                'group'     : group
            }

            response = await dataLink.upload_Data(args)
        }

        data = dataLink.parse_Data(response)
    
        DataCache.wavelets[group] = data.wavelets
        DataCache.LFPs[group] = data.LFPs
    }
}
