//upload.js

class Upload{

    get_Heatmap(){
        const ids = [
            'loadingText',, 'fileUpload', 'xAxisLabel', 'buttonANOVA',
            'groupButtonContainer', 'heatmapView', 'buttonUploadLFP',
            'buttonUploadWavelet', 'dataForm', 'uploadButtonsDiv','buttonPCA',
            'buttonMean','buttonBaseline'
        ];

        fetch('heatmap.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('heatmapView').innerHTML = html;

            ids.forEach(id => {
                this[id] = document.getElementById(id);
            });

            this.initialize()
        })
                
        .catch(error => console.error('Error:', error));
    }


    initialize(){

        dataLink.clear_Cache()

        xAxisLabel.textContent = 'Time (sec)'
        
        this.init_ButtonNewGroup()
        this.init_DataForm()
        this.init_ButtonsUpload()

        viewer.init_ModifyButton(buttonMean)
        viewer.init_ModifyButton(buttonBaseline)

        viewer.init_AnalysisButton(buttonANOVA,dataLink)
        viewer.init_AnalysisButton(buttonPCA,dataLink)

        viewer.init_buttonBonf()
    }
    
    wrap_Data() {
        let groupNumber

        if (viewer.groupNumber === 0){
            groupNumber = groupButtonContainer.children.length
        } else {
            groupNumber = viewer.groupNumber
        }

        const args = {}
        args.formData = {
            timeStart   : this.timeStart,
            timeStop    : this.timeStop,
            freqLow     : this.freqLow,
            freqHigh    : this.freqHigh,
            groupNumber : groupNumber 
        }
        return args 
    }
    

    init_ButtonsUpload() {
        
        uploadButtonsDiv.addEventListener('mouseleave', () => {
            let buttons = document.querySelectorAll('.groupButton')
            buttons.forEach(button  => {
                if (button.classList.contains('active')){
                    setTimeout(() => {uploadButtonsDiv.style.display = 'none';}, 300);
                }
            })
        });

        let url 

        buttonUploadWavelet.addEventListener('click', () => {
            url = 'uploadWavelet'
            this.fileUpload.click();
        })

        buttonUploadLFP.addEventListener('click', () => {
            url = 'uploadLFP'
            this.fileUpload.click();
        })
        
        this.fileUpload.addEventListener('change', async (event) => {
            loadingText.style.display = "block";  
            dataForm.style.display = 'none'    
            
            const file  = event.target.files[0];
            
            const MAX_SIZE = 2 * 1024 * 1024 //  2MB limit

            if (file.size > MAX_SIZE) {
                alert('File is too large (>2MB). Reduce trials or frequency/time bins. ');
            
            } else {
                const args = this.wrap_Data()
                args.file = file
                args.url = url

                const responseData = await dataLink.upload_Data(args);
                const uploadData = dataLink.parse_Data(responseData);
                this.set_GroupButton(uploadData);
            }
            
            loadingText.style.display = "none";  
            
            event.target.value = ''; // reset the file
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
                    this.freqLow   = parseFloat(document.getElementById("freqLow").value);
                    this.freqHigh  = parseFloat(document.getElementById("freqHigh").value);
                    this.timeStart = parseFloat(document.getElementById("timeStart").value);
                    this.timeStop  = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });

        timeInputs.forEach(input => {
            input.addEventListener('input', () => {
                const allFilled = update_inputValues(timeInputs);
                buttonUploadLFP.disabled = !allFilled;

                if (!buttonUploadLFP.disabled) {
                    this.timeStart = parseFloat(document.getElementById("timeStart").value);
                    this.timeStop = parseFloat(document.getElementById("timeStop").value);
                }    
            });
        });
    }


    init_ButtonNewGroup () {
        const button = document.createElement('button');
    
        button.id = 'buttonNew';
        button.textContent = 'New Group';
        button.addEventListener('click', this.newGroup_Click);
 
        groupButtonContainer.appendChild(button)
        groupButtonContainer.style.display = 'none'
        button.click()
    }

    
    newGroup_Click = () => {

        viewer.groupNumber = 0;
        heatmapView.style.display = 'none'

        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));                
        groupButtonContainer.lastElementChild.classList.add('active');
        uploadButtonsDiv.style.display = 'flex'
    }


    set_GroupButton(uploadData){

        let button

        if (viewer.groupNumber == 0){
            button = this.init_GroupButton()
        }else{
            button = groupButtonContainer.children[viewer.groupNumber-1]
        }

        if (uploadData.wavelets){            
            button.wavelets = uploadData.wavelets
        }

        if (uploadData.LFPs){
            button.LFPs = uploadData.LFPs
        }
        
        viewer.view_Trials(button);
    }    
    

    init_GroupButton(){
        const container       = groupButtonContainer
        const containerLength = container.children.length

        const button       = document.createElement('button');
        button.className   = 'groupButton';
        button.groupNumber = container.children.length
        button.textContent = 'Group ' + button.groupNumber
        viewer.groupNumber = button.groupNumber

        container.lastElementChild.classList.remove('active');

        button.classList.add('active')

        button.addEventListener('click', () => this.click_GroupButton(button));

        button.addEventListener('mouseover', () => {
            if(button.classList.contains('active') && !buttonANOVA.active && !buttonPCA.active){
                setTimeout(() => {uploadButtonsDiv.style.display = 'flex';}, 0);
            }
        })
     
        container.insertBefore(button,container.children[containerLength-1])
        container.style.display = 'flex'
        uploadButtonsDiv.style.display = 'none';
        return button
    }


    click_GroupButton = async (button) => {
      
        const buttons = groupButtonContainer.querySelectorAll('*');
        
        let data
        if (!buttonANOVA.active && !buttonPCA.active ){
            buttons.forEach(button => {
                button.classList.remove('active');
            });
            data = button
        } else if (buttonANOVA.active) {
            data = await viewer.run_ANOVA(button,dataLink)
        } else if (buttonPCA.active) {
            data = await viewer.run_PCA(button,dataLink)
        }
        
        button.classList.add('active');
        
        viewer.groupNumber = button.groupNumber
        viewer.view_Trials(data)

    }
}

const dataLink = new LinkAPI()
const viewer = new Elements()
const dataUpload = new Upload();
dataUpload.get_Heatmap()