class Heatmap {
    
    constructor(container,freqBin) {
        
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

    }
    
    split_Freq(wavelet){
        const filtWavelet = wavelet.filter(d => d.frequency >= this.freqBin.min && d.frequency <= this.freqBin.max);
        return filtWavelet
    }

    initialize(initSpectra) {
            d3.select(this.container)
                .select("svg")
                .remove(); 

            let filtWavelet = this.split_Freq(initSpectra);

            let allFreqBins = new Set(initSpectra.map(d => d.frequency)).size
            let numFreqBins = new Set(filtWavelet.map(d => d.frequency)).size
            let numTimeBins = new Set(filtWavelet.map(d => d.time)).size
            
            this.heightSVG = this.height * (numFreqBins/allFreqBins)
            
            this.xScale = d3.scaleLinear()
                .range([0, this.width])
                .domain([d3.min(filtWavelet, d => d.time), d3.max(filtWavelet, d => d.time)]);
            
            this.yScale = d3.scaleLog()
                .range([0, this.heightSVG])
                .domain([d3.max(filtWavelet, d => d.frequency),d3.min(filtWavelet, d => d.frequency)]);
                      
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
                .data(filtWavelet)
                .enter().append("rect")
                .attr("x", d => this.xScale(d.time))
                .attr("y", d => this.yScale(d.frequency) -  this.heightSVG/(numFreqBins -1))
                .attr("width", this.width /  (numTimeBins - 1))
                .attr("height", this.heightSVG / (numFreqBins - 1))
                .attr("shape-rendering", "crispEdges");

            return filtWavelet
    }
        
    draw_Heatmap(filteredData) {
        this.svg.selectAll("rect")
            .data(filteredData)
            .attr("fill", d => this.colorScale(d.power));
    }

    set_ColorScale(filteredData){
        // if (this.ANOVA ){
        //      heatmap.ANOVA = true
        //      heatmap.maxPower = this.allButtons.pVal.value
        //      heatmap.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([heatmap.maxPower,0])
        //      document.getElementById('colorbarLabel').textContent = 'p-Value'
        //  }
        //  else {
            //  heatmap.ANOVA = false
             this.maxPower = 3 * d3.deviation(this.get_PowerValue(filteredData))
             this.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, this.maxPower])
             document.getElementById('colorbarLabel').innerHTML = 'Power  (uV / Hz<sup>2</sup>)'
    }

    get_PowerValue(filteredData) {
        let powerValues = [];
        filteredData.forEach(array => {
            // const trialButtonId = `trialButton-${this.group}-${trialNum}`;
            // const isExcluded = document.getElementById(trialButtonId) !== null;
    
            // if (!isExcluded) {
                     powerValues.push(array.power);
                
                });
            // 

        return powerValues;
    }
   
}