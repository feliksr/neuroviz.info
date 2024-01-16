class Heatmap {
    constructor(page,container,freqBin) {
        this.page = page
        this.container = container
        this.freqBin = freqBin
        this.width = 1000;
        this.height = 400;
        
        this.margin = {
            top: 0,
            right: 100,
            bottom: 30,
            left: 50
        };

        const trialNumber = document.getElementById('trialNumber')
        const trialSlider = document.getElementById('trialSlider') 

        trialSlider.addEventListener('input', (event) => {
            this.page.trial = event.target.value;
            trialSlider.value = this.page.trial
            trialNumber.textContent = this.page.trial
            
            this.singleTrialData = this.page.allWaveletTrials[this.page.trial];
            this.filteredData = this.singleTrialData.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
            this.drawHeatmap(); 

        })

        const channelSlider = document.getElementById('channelSlider')
        const channelNumber = document.getElementById('channelNumber')

        channelSlider.addEventListener('input', (event) => {
            this.page.channelIdx = event.target.value;
            channelSlider.value = this.page.channelIdx
            channelNumber.textContent = `${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`

            this.page.LFPplot.initialize(); 
            
            this.singleChannelData = this.page.allWaveletChannels[this.page.channelIdx];
            this.filteredData = this.singleChannelData.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
            this.drawHeatmap(); 
            })            

    }

    initialize() {
            d3.select(this.container)
                .select("svg")
                .remove(); 

            if (this.page.ANOVA){
                this.filteredData = this.page.singleChannelWavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);

            }else{
                this.filteredData = this.page.singleTrialWavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
            }

            const allFreqBins = new Set(this.page.singleTrialWavelet.map(d => d.frequency)).size
            const numFreqBins = new Set(this.filteredData.map(d => d.frequency)).size
            const numTimeBins = new Set(this.filteredData.map(d => d.time)).size
            this.heightSVG = this.height * (numFreqBins/allFreqBins)
            
            this.xScale = d3.scaleLinear()
                .range([0, this.width])
                .domain([d3.min(this.filteredData, d => d.time), d3.max(this.filteredData, d => d.time)]);
            
            this.yScale = d3.scaleLog()
                .range([0, this.heightSVG])
                .domain([d3.max(this.filteredData, d => d.frequency),d3.min(this.filteredData, d => d.frequency)]);
                      
            this.svg = d3.select(this.container).append("svg")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.heightSVG + this.margin.bottom)

            this.heatMap = this.svg.append('g')
                .attr("transform", `translate(${this.margin.left}, 0)`)
                .append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(this.yScale)
                .tickFormat(d => {return parseFloat(d.toPrecision(2))}))
            
            this.heatMap.append("g")
                .attr("class", "x-axis")
                .call(d3.axisBottom(this.xScale)
                    .ticks(5)
                    .tickFormat(''))  
                .attr("transform", `translate(0, ${this.heightSVG})`)
                .append("text")
                .attr("class", "dragColorbarLabel")
                .attr("x", this.width - 10)  
                .attr("y", this.margin.bottom / 1.25)
                .text("*Drag colorbar for scaling")
                
            
            this.heatMap.selectAll()
                .data(this.filteredData)
                .enter().append("rect")
                .attr("x", d => this.xScale(d.time))
                .attr("y", d => this.yScale(d.frequency) -  this.heightSVG/(numFreqBins -1))
                .attr("width", this.width /  (numTimeBins - 1))
                .attr("height", this.heightSVG / (numFreqBins - 1))
                .attr("shape-rendering", "crispEdges");

            
            this.page.setColorScale(this)           
            this.drawHeatmap();
    }
        
    drawHeatmap() {
        this.svg.selectAll("rect")
            .data(this.filteredData)
            .attr("fill", d => this.colorScale(d.power));
    }

}

window.Heatmap = Heatmap;
