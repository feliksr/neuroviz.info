//common.js

class Elements{

    get_Heatmap(){

        const ids = [
            'buttonANOVA', 'buttonMean', 'buttonBaseline', 'channelButtonContainer',
            'buttonPCA', 'buttonBonf', 'heatmapView', 'groupButtonContainer',
            'containers', 'sliderElements', 'container4',
            'compEnd', 'compStart', 'accuracy', 'chanSelect'
        ]

        fetch('heatmap.html')

        .then(response => response.text())
         
        .then(html => {
            document.getElementById('heatmapView').innerHTML = html
            
            ids.forEach(id => {
                this[id] = document.getElementById(id)
                })
            this.initialize()
        })        
    }


    initialize(){
        this.init_ModifyButton(buttonMean)
        this.init_ModifyButton(buttonBaseline)

        this.init_AnalysisButton(buttonANOVA)
        this.init_AnalysisButton(buttonPCA)

        this.init_buttonBonf()
    }


    init_AnalysisButton(button){
        button.active = false

        button.addEventListener('click', () => {
            button.classList.toggle('active')
            button.active = button.classList.contains('active')

            buttonBaseline.disabled = buttonANOVA.active && !buttonPCA.active
            buttonMean.disabled = buttonANOVA.active
            
            if (button === buttonANOVA && buttonPCA.active || button===buttonPCA && buttonANOVA.active){
                document.querySelectorAll('.groupButton').forEach(btn => {
                    if (btn.textContent === DataCache.currentGroup){
                        btn.click()
                    }
                })
            } else {
                document.querySelectorAll('.groupButton')
                    .forEach(button =>
                        button.classList.remove('active')
                )

                dataLink.call('deleteGroupNumbers')
            }

            const buttonNew = document.getElementById('buttonNew')
            if (buttonNew){       
                buttonNew.disabled = buttonPCA.active || buttonANOVA.active;
            }

            heatmapView.style.visibility    = 'hidden'
            containers.style.visibility     = 'hidden'
            container4.style.visibility     = 'hidden'
            sliderElements.style.visibility = 'hidden'
        })
    }


    init_buttonBonf(){
        buttonBonf.active = false
        buttonBonf.addEventListener('click', () => {
            buttonBonf.classList.toggle('active')
            buttonBonf.active = buttonBonf.classList.contains('active')

            document.querySelectorAll('.groupButton').forEach(btn => {
                if (btn.textContent === DataCache.currentGroup){
                    btn.click()
                }
            })
        })
    }


    init_ModifyButton(button){
        button.active = false
        
        button.addEventListener('click', () => {
            button.classList.toggle('active')
            button.active = button.classList.contains('active')

            buttonANOVA.disabled = buttonMean.active || (buttonBaseline.active && !buttonPCA.active)

            document.querySelectorAll('.groupButton').forEach(btn => {
                if (btn.textContent === DataCache.currentGroup){
                    btn.click()
                }
            })
        })
    }


    set_Slider(button,splitWavelets){

        if (!buttonMean.classList.contains('active') && !buttonANOVA.classList.contains('active')) {
            let sliderElement = new Slider()
            let slider        = sliderElement.init_Slider()
            
            sliderElement.set_SliderBehavior(button,splitWavelets,slider)
            
            let maxTrials

            if (button.LFPs){
                maxTrials = button.LFPs.trials
            } else if (button.wavelets){
                maxTrials = button.wavelets.trials
            }
            
            slider.max = maxTrials

            sliderElements.style.visibility = 'visible'
       
        } else {
            sliderElements.style.visibility = 'hidden'
        }
    }   


    async await_Promise(promise){
        await Promise.all(promise)
    }

    async set_GroupButtons(){
        let greyButtons = []

        const buttons = document.querySelectorAll('.groupButton')
        
        buttons.forEach(button => {
            button.disabled = true
            button.group = button.textContent
            button.textContent = ('Loading')
        })

        for (const button of buttons)  {
            
            if (button.group === DataCache.currentGroup && (!buttonANOVA.active && !buttonPCA.active)) {
                await DataCache.set(button.group)
                button.textContent = button.group
                button.disabled = false
                button.click()
                console.log('one')
            } else {
                greyButtons.push(button)
                console.log('two')
            }    
        }
        
        for (const button of greyButtons){
            await DataCache.set(button.group)
            button.textContent = button.group
            if (!buttonANOVA.active && !buttonPCA.active) {
                button.disabled = false 
                console.log('three')
            }
        }

        for (const button of buttons){
            button.disabled = false
            if (button.textContent === DataCache.currentGroup && (buttonANOVA.active || buttonPCA.active)) {
                button.click()
                console.log('four')
            }
        }
    }


    init_ChannelSelect(chanNumbers,chanLabels){
        chanSelect.selectedIndex = 0
        DataCache.currentChannel = chanNumbers[0]

        chanNumbers.forEach((number, index) => {
            const channel = document.createElement('option');
            channel.innerHTML = 'Channel #' + number + '&nbsp;&nbsp;&nbsp;&nbsp;' +
                (chanLabels ? chanLabels[index] : '');
            chanSelect.appendChild(channel);
        });
        
        chanSelect.addEventListener('change', () => {
            DataCache.currentChannel = chanNumbers[chanSelect.selectedIndex]
            this.set_GroupButtons();
        })

        this.set_ChannelButtons()
        channelButtonContainer.style.display = 'flex';

    }
    
    async init_GroupButton(group) {
            
        const groupButton = document.createElement('button'); 
        groupButton.className = 'groupButton';

        groupButtonContainer.appendChild(groupButton);
        groupButtonContainer.style.display = 'flex';

        await DataCache.set(group);
        groupButton.textContent = group;
        groupButton.addEventListener('click', () => {
            this.click_GroupButton(groupButton)
        })
            
        return groupButton
    }

    async click_GroupButton(groupButton){
        const group = groupButton.textContent
        DataCache.currentGroup = group
        
        const buttons = groupButtonContainer.querySelectorAll('*');

        let data = {}

        if (!buttonANOVA.active && !buttonPCA.active ){
            buttons.forEach(button => 
                button.classList.remove('active')
            );
            data.wavelets = DataCache.wavelets[group]
            data.LFPs = DataCache.LFPs[group]
        
        } else if (buttonANOVA.active) {
            data = await functions.run_ANOVA()
        
        } else if (buttonPCA.active && 
            DataCache.wavelets[DataCache.currentGroup]) {
                
                data = await functions.run_PCA()
        }
        
        groupButton.classList.add('active');
        
        functions.view_Trials(data)
    }
    
    set_ChannelButtons(){
       
        document.getElementById('prevChan')
        .addEventListener('click', () => {
            if (chanSelect.selectedIndex > 0) {
                chanSelect.selectedIndex--;  
                chanSelect.dispatchEvent(new Event('change'));

            }
        })

        document.getElementById('nextChan')
        .addEventListener('click', () => {
            if (chanSelect.selectedIndex < chanSelect.options.length - 1) {
                chanSelect.selectedIndex++; 
                chanSelect.dispatchEvent(new Event('change'));
            }            
        })
    }

}


class Functions{

    async run_ANOVA(){
        
        if (element.buttonPCA.active && 
            DataCache.wavelets[DataCache.currentGroup]){
            
                await this.run_PCA()
            }   

        const args = {
            "group"       : DataCache.currentGroup,
            "channel"     : DataCache.currentChannel,
            "bonfCorrect" : element.buttonBonf.active,
            'PCAreduce'   : DataCache.wavelets[DataCache.currentGroup] ? element.buttonPCA.active : false
        }

        const response = await dataLink.call('ANOVA',args)
        
        const data = dataLink.parse_Data(response)
        return data
    }


    async run_PCA(){

        if (element.compStart.value>compEnd.value){
            
            const start  = element.compStart.value
            const end    = element.compEnd.value
            
            element.compEnd.value   = start
            element.compStart.value = end
        }

        const args = {
            "group"          : DataCache.currentGroup,
            "channel"        : DataCache.currentChannel,
            "baseCorrect"    : element.buttonBaseline.active,
            "componentStart" : element.compStart ? parseInt(element.compStart.value) : null,
            "componentEnd"   : element.compEnd ? parseInt(element.compEnd.value) : null
        };
        
        const response = await dataLink.call('PCA',args)
    
        element.compEnd.value        = response.componentEnd
        element.compStart.value      = response.componentStart
        element.accuracy.textContent = 
            `Decoding Accuracy (SVM): ${response.accuracy}%`
        
        const data = dataLink.parse_Data(response)
        
        return data
        
    }

    
    view_Trials(data) {
        element.heatmapView.style.display = 'block'
        
        if (!data.LFPs && !data.wavelets){
            element.heatmapView.style.visibility = 'hidden';
        } else{
            element.heatmapView.style.visibility = 'visible';
        }
        
        element.containers.style.visibility  = 'hidden'
        element.container4.style.visibility  = 'hidden'
        
        if (data.LFPs){
            let initLFP

            if (!buttonMean.active){
                initLFP = data.LFPs.d3.data.filter(d => d.trial === 1)
            } else {
                initLFP = data.LFPs.d3.mean
            }

            const LFPchart = new LFPplot()
            LFPchart.initialize(initLFP)

            element.container4.style.visibility = 'visible'
            console.log('LFP displayed')
        }
        
        let splitWavelets

        if (data.wavelets){
                       
            let initWavelet
            let spectra = new SpectralPlot();

            if (!element.buttonMean.active){
                initWavelet = data.wavelets.d3.data.filter(d => d.trial === 1)

                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(data.wavelets.d3.data,splitWavelets)

            } else {
                initWavelet = data.wavelets.d3.mean
                
                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(initWavelet,splitWavelets)
            }
            element.containers.style.visibility = 'visible'
            console.log('wavelet displayed')
        }

        element.set_Slider(data,splitWavelets)
    }

}

const dataLink   = new LinkAPI();
const functions  = new Functions();
const dataCache  = new DataCache();
const element    = new Elements();

element.get_Heatmap()
