// anova.js

class ANOVA{
    set_ANOVA(){

    document.querySelectorAll('.ANOVAbutton').forEach(button => {

        button.addEventListener('click', () => {
            document.querySelectorAll('.ANOVAbutton').forEach(button => {
                button.classList.toggle('active');
            })

            this.page.ANOVA = !this.page.ANOVA; 
            
            if (this.page.ANOVA) {

                this.pValDiv.style.display = 'inline-block'
                this.trialScroll.style.display = 'none'
                this.channelScroll.style.display = 'none'
                this.ANOVAscroll.style.display = 'none'

                this.excludedContainers.forEach(container => container.style.display = 'flex');

            } else {

                this.pValDiv.style.display = 'none'
                this.channelScroll.style.display = 'none'
                this.ANOVAscroll.style.display = 'none'
                this.trialScroll.style.display = 'inline'

                   
                this.excludedContainers.forEach(container => container.style.display = 'none');
                this.excludedTrialsContainer[this.page.group].style.display= 'flex'  
            }

            // disables and greys out trial groups buttons when ANOVA button pressed 
            document.querySelectorAll('.groupButton').forEach(button => {

                if (button.textContent !== this.page.group) {
                    button.classList.toggle('active');
                }

                button.disabled = !button.disabled;

            });

            this.page.trial = 0;
            this.page.getData();

        });
    });
}
    set_channelButtons(){

        this.prevChan.addEventListener('click', () => {

            if (this.page.channelIdx > 0) {
                this.page.channelIdx--;
                this.channelDisplay.textContent = `Channel ${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`;

                this.page.getData();
            }
        })
        
        this.nextChan.addEventListener('click', () => {

            this.page.channelIdx++;
            this.channelDisplay.textContent = `Channel ${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`;

            this.page.getData();
        })
    }
    

    set_allANOVA(){

        this.allANOVA.addEventListener('click', async () =>{

            document.querySelectorAll('.ANOVAbutton').forEach(button => {
                button.disabled = !button.disabled 
            })

            this.allANOVA.classList.toggle('active');
            this.page.allANOVA = !this.page.allANOVA; 
            
            await this.page.getData();
            
            if (this.page.allANOVA){
                this.channelButtonContainer.style.display = 'none' ;
                this.ANOVAscroll.style.display = 'flex'

            }else{

                this.ANOVAscroll.style.display = 'none'
                this.channelButtonContainer.style.display = 'flex' ;
    
            }
        })
    }

    // if (this.allANOVA){

    //     const channelSlider = document.getElementById('channelSlider')
    //     channelSlider.disabled = true

    //     this.numChans = this.chanNumbers.length
    //        // this.numChans = 5
            
    //    }else{
    //        this.numChans = 1
   
    //    for (let chans = 0; chans < (this.numChans); chans++) { 
            
    //     console.log(chans)
    //     if (this.allANOVA){
    //         args.currentChannel = this.chanNumbers[chans]

    //     } else {
    //         args.currentChannel = this.chanNumbers[this.channelIdx]
    //     }
    //     console.log(`channel: ${args.currentChannel}`)

    //     try {
    //         this.responseData = await this.fetch_DataWithRetry(this.url + 'anova', args, this.maxRetries, this.initialDelay);
    //     } catch (error) {
    //         console.error('Failed to fetch data:', error);
    //     }
        

  
}




