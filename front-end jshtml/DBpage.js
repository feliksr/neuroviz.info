//DBpage.js

class DBpage{

    constructor(){

        this.categories = {
            'Target Stimulus' : ['Soccerball','Trophy','Vase'],
            'Stimulus Type' : ['Target','Distractor','Irrelevant'],
            'Stimulus Identity' :  ['Soccerball', 'Trophy', 'Vase']
        }
        
        const params = new URLSearchParams(window.location.search);
        DataCache.currentCategory = params.get('params');
        DataCache.groups  = this.categories[DataCache.currentCategory];
    }


    async intialize(){
        
        dataLink.call('clearAllCache');
        await this.get_Chans();
        for (const group of DataCache.groups) {
            element.init_GroupButton(group)
        }
    }

   
    async get_Chans(){
        const args = {
            category : DataCache.currentCategory,
            group    : DataCache.groups[0],
            subject  : 'YDX',
            run      : 1            
        }

        const response    = await dataLink.call('chans',args)
        const chanNumbers = response.chanNumbers.map(number => String(number));
        const chanLabels  = response.chanLabels;

        element.init_ChannelSelect(chanNumbers,chanLabels);
    }

}

const page = new DBpage();
page.intialize();
