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
        const button = document.getElementById('buttonBaseline')
        let adjustedPower
        
        if(button.classList.contains('active')){
            adjustedPower = true
        } else {
            adjustedPower = false
        }
        
        this.svg.selectAll("rect")
            .data(filteredData)
            .attr("fill", d => this.colorScale(adjustedPower ? (d.power*d.frequency) : d.power))
    }

    set_ColorScale(filteredData){
        this.maxPower = 3 * d3.deviation(this.get_PowerValue(filteredData))

        if (buttonANOVA.classList.contains('active')){
             this.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([this.maxPower,0])
             document.getElementById('colorbarLabel').textContent = 'p-Value'
        } else {
             this.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([0, this.maxPower])
             document.getElementById('colorbarLabel').innerHTML = 'Power  (uV / Hz<sup>2</sup>)'
        }
    }

    get_PowerValue(filteredData) {
        
        let adjustedPower
        const button = document.getElementById('buttonBaseline')
        
        if(button.classList.contains('active')){
            adjustedPower = true
        } else {
            adjustedPower = false
        }

        let powerValues = [];
        filteredData.forEach(array => {
            powerValues.push(
                adjustedPower ? (array.power*array.frequency) : array.power);
        });

        return powerValues;
    }

}