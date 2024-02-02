class Heatmap {
    constructor(waveletTrials,container,freqBin) {
        
        this.waveletTrials = waveletTrials
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
            const trial = event.target.value;
            trialSlider.value = trial
            trialNumber.textContent = trial
            
            const singleWavelet = this.waveletTrials[trial];
            const freqFiltWavelet = singleWavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
            this.drawHeatmap(freqFiltWavelet); 

        })

        // const channelSlider = document.getElementById('channelSlider')
        // const channelNumber = document.getElementById('channelNumber')

        // channelSlider.addEventListener('input', (event) => {
        //     this.page.channelIdx = event.target.value;
        //     channelSlider.value = this.page.channelIdx
        //     channelNumber.textContent = `${this.page.chanNumbers[this.page.channelIdx]} ${this.page.chanLabels[this.page.channelIdx]}`

        //     this.page.LFPplot.initialize(); 
            
        //     this.singleChannelData = this.page.allWaveletChannels[this.page.channelIdx];
        //     this.filteredData = this.singleChannelData.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
        //     this.drawHeatmap(); 
        // })            

    }

    initialize() {
            d3.select(this.container)
                .select("svg")
                .remove(); 

            // if (this.page.ANOVA){
            //     this.filteredData = this.page.singleChannelWavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);

            // }else{
                const initWavelet = this.waveletTrials[0]
                const initFreqFiltWavelet = initWavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);

            // }

            const allFreqBins = new Set(initWavelet.map(d => d.frequency)).size
            const numFreqBins = new Set(initFreqFiltWavelet.map(d => d.frequency)).size
            const numTimeBins = new Set(initFreqFiltWavelet.map(d => d.time)).size
            
            this.heightSVG = this.height * (numFreqBins/allFreqBins)
            
            this.xScale = d3.scaleLinear()
                .range([0, this.width])
                .domain([d3.min(initFreqFiltWavelet, d => d.time), d3.max(initFreqFiltWavelet, d => d.time)]);
            
            this.yScale = d3.scaleLog()
                .range([0, this.heightSVG])
                .domain([d3.max(initFreqFiltWavelet, d => d.frequency),d3.min(initFreqFiltWavelet, d => d.frequency)]);
                      
            this.svg = d3.select(this.container).append("svg")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.heightSVG + this.margin.bottom)

            const heatMap = this.svg.append('g')
                .attr("transform", `translate(${this.margin.left}, 0)`)
                .append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(this.yScale)
                .tickFormat(d => {return parseFloat(d.toPrecision(2))}))
            
            let xAxis = heatMap.append("g")
                .attr("class", "x-axis")
                .call(d3.axisBottom(this.xScale)
                    .ticks(5)
                    .tickFormat(''))  
                .attr("transform", `translate(0, ${this.heightSVG})`)
                
            xAxis.append("text")
                .attr("class", "dragColorbarLabel")
                .attr("x", this.width - 10)  
                .attr("y", this.margin.bottom / 1.25)
                .text('')
            
            if (this.container == '#container3'){
                xAxis.select('.dragColorbarLabel')
                    .text('*Drag colorbar for scaling')
            }    
            
            heatMap.selectAll()
                .data(initFreqFiltWavelet)
                .enter().append("rect")
                .attr("x", d => this.xScale(d.time))
                .attr("y", d => this.yScale(d.frequency) -  this.heightSVG/(numFreqBins -1))
                .attr("width", this.width /  (numTimeBins - 1))
                .attr("height", this.heightSVG / (numFreqBins - 1))
                .attr("shape-rendering", "crispEdges");

            
            this.set_ColorScale()
            this.drawHeatmap(initFreqFiltWavelet);
    }
        
    drawHeatmap(filteredData) {
        this.svg.selectAll("rect")
            .data(filteredData)
            .attr("fill", d => this.colorScale(d.power));
    }

    set_ColorScale(){
        // if (this.ANOVA ){
        //      heatmap.ANOVA = true
        //      heatmap.maxPower = this.allButtons.pVal.value
        //      heatmap.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([heatmap.maxPower,0])
        //      document.getElementById('colorbarLabel').textContent = 'p-Value'
        //  }
        //  else {
            //  heatmap.ANOVA = false
             this.maxPower = 3 * d3.deviation(this.get_PowerValue())
             this.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, this.maxPower])
             document.getElementById('colorbarLabel').innerHTML = 'Power  (uV / Hz<sup>2</sup>)'
    }

    get_PowerValue() {
        let powerValues = [];

        Object.entries(this.waveletTrials).forEach(([trialNum, array]) => {
            // const trialButtonId = `trialButton-${this.group}-${trialNum}`;
            // const isExcluded = document.getElementById(trialButtonId) !== null;
    
            // if (!isExcluded) {
                array.forEach(d => {
                    if (d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max) {
                        powerValues.push(d.power);
                    };
                });
            // }
        });
        return powerValues;
    }
}



// window.Heatmap = Heatmap;
