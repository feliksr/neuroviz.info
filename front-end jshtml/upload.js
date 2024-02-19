//upload.js

class Upload{

    get_Heatmap(){
        const ids = [
            'excludeTrialButton', 'loadingText',, 'meanButton', 'fileUpload',
            'xAxisLabel', 'buttonANOVA', 'groupButtonContainer', 
            'heatmapView', 'buttonUploadLFP','buttonUploadWavelet' 
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

        this.groupNumber = 0;
        this.xAxisLabel.textContent = 'Time (sec)'
        
        this.init_ButtonNewGroup()
        this.init_DataForm()
        this.init_ButtonsUpload()

        viewer.init_ButtonMean()
        viewer.init_ButtonANOVA(dataLink)

    }
    
    wrap_Data() {
        let groupNumber

        if (this.groupNumber === 0){
            groupNumber = this.groupButtonContainer.children.length
        } else {
            groupNumber = this.groupNumber
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
        
        let url 

        this.buttonUploadWavelet.addEventListener('click', () => {
            url = 'uploadWavelet'
            this.fileUpload.click();
        })

        this.buttonUploadLFP.addEventListener('click', () => {
            url = 'uploadLFP'
            this.fileUpload.click();
        })
        
        this.fileUpload.addEventListener('change', async (event) => {
            
            this.loadingText.style.display = "block";  
            
            const file  = event.target.files[0];
            
            const args = this.wrap_Data()
            args.file = file
            args.url = url

            const responseData = await dataLink.upload_Data(args);
            const uploadData = dataLink.parse_Data(responseData)
            console.log(uploadData)
            this.set_GroupButton(uploadData);

            event.target.value = '';

            this.loadingText.style.display = "none";  
        });
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
                this.buttonUploadWavelet.disabled = !allFilled;

                if (!this.buttonUploadWavelet.disabled) {
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
                this.buttonUploadLFP.disabled = !allFilled;

                if (!this.buttonUploadLFP.disabled) {
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
 
        this.groupButtonContainer.appendChild(button)
        this.groupButtonContainer.style.display = 'none'
    }

    
    newGroup_Click = () => {

        this.groupNumber = 0;
        this.heatmapView.style.display = 'none'

        
        const buttons = document.querySelectorAll('.groupButton');
        buttons.forEach(btn => btn.classList.remove('active'));                
        this.groupButtonContainer.lastElementChild.classList.add('active');
    }


    set_GroupButton(uploadData){

        let button

        if (this.groupNumber == 0){
            button = this.init_GroupButton()
        }else{
            button = this.groupButtonContainer.children[this.groupNumber-1]
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
        const container       = this.groupButtonContainer
        const containerLength = container.children.length

        const button       = document.createElement('button');
        button.className   = 'groupButton';
        button.groupNumber = container.children.length
        button.textContent = 'Group ' + button.groupNumber
        this.groupNumber   = button.groupNumber

        container.lastElementChild.classList.remove('active');

        button.classList.add('active')

        button.addEventListener('click', () => this.click_GroupButton(button));

        container.insertBefore(button,container.children[containerLength-1])
        container.style.display = 'flex'

        return button
    }


    click_GroupButton = async (button) => {

            this.groupNumber = button.groupNumber
            
            const buttons = this.groupButtonContainer.querySelectorAll('*');
            
            let data
            if (!this.buttonANOVA.classList.contains('active')){
                buttons.forEach(button => {
                    button.classList.remove('active');
                });
                data = button
            } else if (this.buttonANOVA.classList.contains('active')){
                data = await viewer.run_ANOVA(button,dataLink)
            }
           
            button.classList.add('active');
                                                               
            viewer.view_Trials(data)
    }
}

const dataLink = new LinkAPI()
const viewer = new Elements()
const dataUpload = new Upload();
dataUpload.get_Heatmap()