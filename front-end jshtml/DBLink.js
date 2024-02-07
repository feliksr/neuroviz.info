// DBLink.js

class DBLink{
    constructor() {

        this.url = 'https://neuroviz.info/api/'
        // this.url = 'http://localhost:5000/api/'

        this.loadingText  = document.getElementById('loadingText')

        this.maxRetries = 5;
        this.initialDelay = 5000; // in milliseconds
    }

    async get_Chans(groupButton){

        this.loadingText.style.display = "block"; 

        const args = {
            stimGroup: groupButton.stimGroup,
            group: groupButton.group,
            subject: 'YDX',
            run: 1
        }

        let chans = await this.fetch_DataWithRetry(this.url + 'chans', args, this.maxRetries, this.initialDelay);

        return chans
    }


    async get_Data(groupButton,channelIdx) {
        this.loadingText.style.display = "block"; 
     
        const args = {
            stimGroup: groupButton.stimGroup,
            group: groupButton.group,
            subject: 'YDX',
            currentChannel: groupButton.chanNumbers[channelIdx],
            run: 1
        }       

        let responseData
 
        try {
            responseData = await this.fetch_DataWithRetry(this.url, args, this.maxRetries, this.initialDelay)
        } catch (error) {
            console.error('Failed to fetch data:', error);
        }
           
        this.loadingText.style.display = "none";

        return responseData
    }

    async fetch_DataWithRetry(url, args, retries, delay) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(args)
                });
    
                if (response.ok) {
                    return await response.json();  
                } else {
                    throw new Error(`HTTP error: ${response.status}`);
                }
            } catch (error) {
                console.error(`Fetch error on attempt ${i + 1}:`, error);
            }
    
            // Wait and increase delay for next retry
            delay *= 2;
            await new Promise(resolve => setTimeout(resolve, delay));
            console.log(`delay: ${delay}ms`);

        }
        throw new Error('Request failed after retries');
    }
} 
