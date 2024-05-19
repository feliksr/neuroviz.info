//common.js

class Elements{

    get_Heatmap(){

        const ids = [
            'buttonANOVA', 'buttonMean', 'buttonBaseline', 
            'channelButtonContainer', 'groupButtonContainer',
            'buttonPCA', 'buttonBonf', 'heatmapView', 'xAxisLabel',
            'containers', 'sliderElements', 'container4', 'pcaDiv',
            'accuracy', 'chanSelect', 'pcaHeader', 'pcaList'
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

        xAxisLabel.textContent = 'Time (sec)'
        this.init_ModifyButton(buttonMean)
        this.init_ModifyButton(buttonBaseline)

        this.init_AnalysisButton(buttonANOVA)
        this.init_AnalysisButton(buttonPCA)

        this.init_buttonBonf()
    }


    init_AnalysisButton(button){
        button.active = false

        button.addEventListener('click', async () => {
            heatmapView.style.visibility    = 'hidden'
            containers.style.visibility     = 'hidden'
            container4.style.visibility     = 'hidden'
            sliderElements.style.visibility = 'hidden'

            button.classList.toggle('active')
            button.active = button.classList.contains('active')

            buttonBaseline.disabled = buttonANOVA.active && !buttonPCA.active
            buttonMean.disabled = buttonANOVA.active
            
            if (buttonPCA.active){
                pcaDiv.style.display = 'flex'
            }else{
                pcaDiv.style.display = 'none'
            }
           
            const buttons = document.querySelectorAll('.groupButton')

            if ((button === buttonANOVA && !buttonPCA.active) || (button === buttonPCA && !buttonANOVA.active)){
                await dataLink.call('deleteGroupNumbers')
                // buttons.forEach(btn => {
                //     btn.classList.remove('active')
                //     // if (btn.group === DataCache.currentGroup){
                //     //     btn.click()
                //     //     console.log('clicked1')
                //     // }
                // })
            }
           
            buttons.forEach(btn => {
                if (btn.group === DataCache.currentGroup){
                    btn.click()
                    console.log('clicked2')
                }
            })
            
                        
            const buttonNew = document.getElementById('buttonNew')
            if (buttonNew){       
                buttonNew.disabled = buttonPCA.active || buttonANOVA.active;
            } // prevents new upload during ANOVA or PCA


        // })
        })
    }


    init_buttonBonf(){
        buttonBonf.active = false
        buttonBonf.addEventListener('click', () => {
            buttonBonf.classList.toggle('active')
            buttonBonf.active = buttonBonf.classList.contains('active')

            document.querySelectorAll('.groupButton').forEach(btn => {
                if (btn.group === DataCache.currentGroup){
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
                if (btn.group === DataCache.currentGroup){
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

    async set_GroupButtons(){
        let greyButtons = []

        const buttons = document.querySelectorAll('.groupButton')
        
        buttons.forEach(button => {
            button.disabled = true
            button.textContent = ('Loading')
        })

        for (const button of buttons)  {
            
            if (button.group === DataCache.currentGroup && (!buttonANOVA.active && !buttonPCA.active)) {
                await DataCache.set(button.group)
                button.textContent = button.group
                button.disabled = false
                button.click()
            } else {
                greyButtons.push(button)
            }    
        }
        
        for (const button of greyButtons){
            await DataCache.set(button.group)
            button.textContent = button.group
            if (!buttonANOVA.active && !buttonPCA.active) {
                button.disabled = false 
            }
        }

        for (const button of buttons){
            button.disabled = false
            if (button.group === DataCache.currentGroup && (buttonANOVA.active || buttonPCA.active)) {
                button.click()
            }
        }
    }


    init_ChannelSelect(chanNumbers,chanLabels){
        chanSelect.selectedIndex = 0
        DataCache.currentChannel = chanNumbers[0]

        chanNumbers.forEach((number, index) => {
            const channel = document.createElement('option');
            channel.textContent = `Channel # ${number} ${chanLabels ? chanLabels[index]: ''}` 
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
        groupButton.group = group

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
        const group = groupButton.group
        DataCache.currentGroup = group
        channelButtonContainer.style.display = 'flex'
        
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

    init_List(variance,maxComps){

        for (let index = 0; index < maxComps; index++) {
            const component = document.createElement('li');
            component.idx = index;
            
            const compNum = document.createElement('span');
            compNum.textContent = `${index + 1}`;
            component.appendChild(compNum); 
        
            const compVar = document.createElement('span');
            compVar.textContent = `${variance[index]} %`;
            component.appendChild(compVar);

            pcaList.appendChild(component)
        }

        let startSelected = false;
        let compNums = [];

        pcaList.addEventListener('mousedown', (event) => {
            event.preventDefault(); // To avoid text selection
            
            const compSelected = event.target.closest('li')
            
            if (compSelected){
                
                if ((compNums.length)>0){
                    compNums.forEach(number => {
                        const component = pcaList.children[number] 
                        if (component) {
                            component.classList.remove('selected')
                            component.selected = false
                        }
                    })

                    compNums = []
                }

                startSelected = true;
                compSelected.classList.add('selected')
                compSelected.selected = true
                compNums.push(compSelected.idx)
                
                DataCache.compStart = null
                DataCache.compEnd = null;
            }
        })
        
        pcaList.addEventListener('mouseover', (event) =>  {
            event.preventDefault(); // To avoid text selection
            
            const compSelected = event.target.closest('li');
            if (startSelected && compSelected && (compSelected.selected !== true)){
                compSelected.classList.add('selected')
                compSelected.selected = true
                compNums.push(compSelected.idx)
            }    
        })

        document.addEventListener('mouseup', () => {
            if (startSelected === true){
                console.log(compNums)
                DataCache.compStart = Math.min(...compNums)
                DataCache.compEnd = Math.max(...compNums)
                document.querySelectorAll('.groupButton').forEach(button => {
                    if (button.group === DataCache.currentGroup) {
                        button.click()
                    }
                })  
                startSelected = false;
            }
            
        });

    }

}


class Functions{

    async run_ANOVA(){
        
        if (buttonPCA.active && 
            DataCache.wavelets[DataCache.currentGroup]){
            
                await this.run_PCA()
            }   

        const args = {
            "group"       : DataCache.currentGroup,
            "channel"     : DataCache.currentChannel,
            "bonfCorrect" : buttonBonf.active,
            'PCAreduce'   : DataCache.wavelets[DataCache.currentGroup] ? buttonPCA.active : false
        }

        const response = await dataLink.call('ANOVA',args)
        
        const data = dataLink.parse_Data(response)
        return data
    }


    async run_PCA(){
        const args = {
            "group"          : DataCache.currentGroup,
            "channel"        : DataCache.currentChannel,
            "baseCorrect"    : buttonBaseline.active,
            "componentStart" : DataCache.compStart,
            "componentEnd"   : DataCache.compEnd
        };
        
        const response = await dataLink.call('PCA',args)
        const maxComps = response.maxComponents
        const variance = response.variance

        if (pcaList.children.length === 0){
            element.init_List(variance,maxComps)            
        }

        while (pcaList.children.length > maxComps) {
            pcaList.removeChild(pcaList.lastChild);
        }
        
        accuracy.textContent = 
            `Decoding Accuracy (SVM): ${response.accuracy}%`
        
        const data = dataLink.parse_Data(response)
        
        return data
        
    }

    
    view_Trials(data) {
        heatmapView.style.display = 'block'
        
        if (!data.LFPs && !data.wavelets){
            heatmapView.style.visibility = 'hidden';
        } else{
            heatmapView.style.visibility = 'visible';
        }
        
        containers.style.visibility  = 'hidden'
        container4.style.visibility  = 'hidden'
        
        if (data.LFPs){
            let initLFP

            if (!buttonMean.active){
                initLFP = data.LFPs.d3.data.filter(d => d.trial === 1)
            } else {
                initLFP = data.LFPs.d3.mean
            }

            const LFPchart = new LFPplot()
            LFPchart.initialize(initLFP)

            container4.style.visibility = 'visible'
            console.log('LFP displayed')
        }
        
        let splitWavelets

        if (data.wavelets){
                       
            let initWavelet
            let spectra = new SpectralPlot();

            if (!buttonMean.active){
                initWavelet = data.wavelets.d3.data.filter(d => d.trial === 1)

                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(data.wavelets.d3.data,splitWavelets)

            } else {
                initWavelet = data.wavelets.d3.mean
                
                splitWavelets = spectra.init_Wavelet(initWavelet)
                spectra.set_Wavelet(initWavelet,splitWavelets)
            }
            containers.style.visibility = 'visible'
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
