// LFPchart.js
class LFPchart {
    constructor(LFPtrials) {
        this.LFPtrials = LFPtrials
        this.container = '#container4'
        this.width = 1000;
        this.height = 200;
        this.margin = {
            top: 0,
            right: 100,
            bottom: 40,
            left: 50
        };
    }


    initialize(singleLFP){
        const data = singleLFP

        d3.select(this.container)
                .select("svg")
                .remove(); 

        const svg = d3.select(this.container).append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.bottom)

   
        const xScale = d3.scaleLinear()
            .rangeRound([0, this.width])
            .domain(d3.extent(data, d => d.x));

        const yScale = d3.scaleLinear()
            .rangeRound([this.height, 0])
            .domain(d3.extent(data, d => d.y));
        
        svg.append("g")
            .attr("transform", `translate(${this.width + this.margin.left}, 0)`)
            .attr("class", "y-axis")
            .call(d3.axisRight(yScale).ticks(5))
            .append("text")
            .attr("class", "LFP-label")
            .attr("x",  - this.margin.right / 1.25 )  
            .attr("y",  - this.height / 2 ) 
            .text("LFP (uV)")


        svg.append("g")
            .attr("transform", `translate(${this.margin.left}, ${this.height})`)    
            .attr("class", "x-axis")
            .call(d3.axisBottom(xScale).ticks(5))


        svg.append("rect")
            .attr("x", this.margin.left)
            .attr("y", 0)
            .attr("width", this.width)
            .attr("height", this.height)
            .attr("fill", "#D3D3D3");
        
        const line = d3.line()
            .x(d => xScale(d.x)) 
            .y(d => yScale(d.y)); 
        
        svg.append('path')
            .attr("transform", `translate(${this.margin.left}, 0)`)
            .attr("d", line(data))
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-linejoin", "round")
            .attr("stroke-linecap", "round")
            .attr("stroke-width", 2);
    }
}            
