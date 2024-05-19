//upload.js

class Upload{

    get_Elements(){
        const ids = [
            'fileUpload', 'groupButtonContainer',
            'buttonUploadLFP', 'buttonUploadWavelet', 
            'dataForm', 'uploadButtonsDiv', 
            'channelButtonContainer'
        ];

        ids.forEach(id => {
                this[id] = document.getElementById(id);
            });

        this.initialize()           
    }


    initialize(){
        dataLink.call('clearAllCache')
        
        this.init_ButtonNew()
        this.init_DataForm()
        this.init_ButtonsUpload()
    }
    
  
    init_ButtonsUpload() {
        
        uploadButtonsDiv.addEventListener('mouseover', () => {
            uploadButtonsDiv.active = true
        })

        uploadButtonsDiv.addEventListener('mouseleave', () => {
            uploadButtonsDiv.active = false

            const buttons = document.querySelectorAll('.groupButton')
            buttons.forEach(button => {
                if (button.classList.contains('active')){
                    uploadButtonsDiv.style.display = 'none';
                }   
            })
        })
                
        buttonUploadWavelet.addEventListener('click', () => {
            fileUpload.urlSuffix = 'uploadWavelet';
            fileUpload.click();
        });


        buttonUploadLFP.addEventListener('click', () => {
            fileUpload.urlSuffix = 'uploadLFP';
            fileUpload.click();
        })
        
        
        fileUpload.addEventListener('change', async (event) => {
            dataForm.style.display = 'none';
            const files = event.target.files;
            const url = fileUpload.urlSuffix;
            
            if (!this.chanNumbers){
                this.chanNumbers = []
                for (let i = 1; i <= files.length; i++) {
                    this.chanNumbers.push(String(i));
                }
                element.init_ChannelSelect(this.chanNumbers)
            }
            let group = DataCache.currentGroup;

            if (group === 0){
                group = 'Group ' + groupButtonContainer.children.length;
                
                DataCache.waveletFiles[group] = {}
                DataCache.LFPfiles[group] = {}
                    
                this.chanNumbers.forEach(num => {
                    if (url === 'uploadWavelet'){
                        DataCache.waveletFiles[group][num] = files[num-1]
                    } else if (url === 'uploadLFP') {
                        DataCache.LFPfiles[group][num] = files[num-1]
                    }
                })
                    
                this.init_GroupButton(group);
            
            }else{

                if (url === 'uploadWavelet'){
                    dataLink.call('deleteGroupWavelets',{'group':group})
                    this.chanNumbers.forEach(num => 
                        DataCache.waveletFiles[group][num] = files[num-1]
                    )
                
                }else if (url ==='uploadLFP'){
                    dataLink.call('deleteGroupLFPs', {'group':group})
                    this.chanNumbers.forEach(num => 
                        DataCache.LFPfiles[group][num] = files[num-1]
                    )
                }

                await DataCache.set(group)
                groupButtonContainer.querySelectorAll('.groupButton')
                    .forEach(button => {
                        if (button.textContent === group){
                            button.click()
                        }
                    })
            }                           

            event.target.value = ''; // reset the file
            
            // const file  = files[0];
            
            // const MAX_SIZE = 2 * 1024 * 1024 //  2MB limit

            // if (file.size > MAX_SIZE) {
            //     alert('Files are too large (>2MB). Reduce trials or frequency/time bins. ');
        })
    }
    

    init_DataForm() {

        const update_inputValues = (inputs) => {
            let allFilled = true;
            
            inputs.forEach(input => {
                if (input.value === '') {
                    allFilled = false;
                }
            });
            return allFilled;    
        }
        
        const inputs = document.querySelectorAll('.inputValues');
        const timeInputs = document.querySelectorAll('.timeInput');
        
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = update_inputValues(inputs);
                buttonUploadWavelet.disabled = !allFilled;

                if (!buttonUploadWavelet.disabled) {
                    DataCache.freqLow   = parseFloat(document.getElementById("freqLow").value);
                    DataCache.freqHigh  = parseFloat(document.getElementById("freqHigh").value);
                    DataCache.timeStart = parseFloat(document.getElementById("timeStart").value);
                    DataCache.timeStop  = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });

        timeInputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = update_inputValues(timeInputs);
                buttonUploadLFP.disabled = !allFilled;

                if (!buttonUploadLFP.disabled) {
                    DataCache.timeStart = parseFloat(document.getElementById("timeStart").value);
                    DataCache.timeStop = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });
    }


    init_ButtonNew () {
        const button = document.createElement('button');
    
        button.id = 'buttonNew';
        button.textContent = 'New Group';
        button.addEventListener('click', () => this.newGroup_Click(button));
 
        groupButtonContainer.appendChild(button)
        groupButtonContainer.style.display = 'none'
        button.click()
    }

    
    newGroup_Click (buttonNew) {

        DataCache.currentGroup = 0; 
        heatmapView.style.display = 'none'

        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(button => button.classList.remove('active'));         
        
        buttonNew.classList.add('active');
        channelButtonContainer.style.display='none'
        uploadButtonsDiv.style.display = 'flex'
    }


    async init_GroupButton(group){

        const groupButton = await element.init_GroupButton(group);
        
        const buttonNew = document.getElementById('buttonNew')

        groupButtonContainer.insertBefore(
            groupButton,buttonNew
        ) // swaps last and second to last elements
      
        groupButton.addEventListener('mouseover', () => {
            if(groupButton.classList.contains('active') && !buttonANOVA.active && !buttonPCA.active){
                setTimeout(() => {uploadButtonsDiv.style.display = 'flex';}, 300);
            }
        })

        groupButton.addEventListener('mouseout', () => {
            if(groupButton.classList.contains('active')){
                setTimeout(() =>{if (!uploadButtonsDiv.active){
                        uploadButtonsDiv.style.display = 'none';
                    }}
                ,300)
            }
            
        })
 
        groupButton.click();
        uploadButtonsDiv.style.display = 'none';
    }
    
}

const dataUpload = new Upload();
dataUpload.get_Elements()

