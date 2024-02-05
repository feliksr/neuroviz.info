//colorbar.js
class Colorbar {
    constructor(heatmap) {
        this.heatmap = heatmap;
        this.width = 30;
        this.numStops = 30;

        // document.getElementById('pVal').addEventListener('change', (event) => {
        //     this.heatmap.maxPower = event.target.value;
        //     this.heatmap.colorScale = d3.scaleSequential(d3.interpolateViridis).domain([this.heatmap.maxPower,0])
        //     this.heatmap.drawHeatmap();
        //     this.setColorbarScale();
        // });
    }

    init_Colorbar() {
        const rectHeight = this.heatmap.heightSVG / this.numStops;
        
        this.colorbarGroup = this.heatmap.svg.append("g")
            .attr("class", 'colorBar')
            .attr("transform", `translate(${this.heatmap.width + this.heatmap.margin.right / 4 + this.heatmap.margin.left}, 0)`)
    
        this.colorbarGroup.selectAll()
            .data(d3.range(this.numStops))
            .enter().append("rect")
            .attr("class", "colorbar-rect")
            .attr("x", 0)
            .attr("y", (_, i) => (this.numStops - i) * rectHeight - rectHeight)
            .attr("width", this.width)
            .attr("height", rectHeight)
            .attr("fill", d => d3.interpolateViridis(d / (this.numStops)))
            .attr("shape-rendering", "crispEdges")


    }

    set_ColorbarScale(){

        this.colorbarScale = d3.scaleLinear()
            .domain([0, this.heatmap.maxPower])
            .range([this.heatmap.heightSVG, 0]);
        
        if (this.heatmap.ANOVA === true){
            this.colorbarScale.domain([this.heatmap.maxPower, 0])
        }

    }

    draw_Colorbar() {
        this.colorbarGroup.select('.colorbarTicks').remove();

        this.colorbarGroup.append('g')
            .call(d3.axisRight(this.colorbarScale).ticks(5))
            .attr('class', 'colorbarTicks')
            .attr("transform", `translate(${this.width}, 0)`); 
    }  

    set_ColorbarDragging(waveletTrials) {

        const dragged = () => {
            const yPosition = d3.event.y * 0.03; 
            const maxPower = this.colorbarScale.invert(yPosition);

            this.colorbarScale.domain([0, maxPower]);
            this.draw_Colorbar();
            this.heatmap.colorScale.domain([0, maxPower])
            
            const trial = document.getElementById('slider').value
                        
            const waveletTrial = waveletTrials[trial]
            const splitWavelet = this.heatmap.split_Freq(waveletTrial)
            this.heatmap.draw_Heatmap(splitWavelet);            
            }

        const dragHandler = d3.drag()
            .on('drag', dragged);

        dragHandler(this.colorbarGroup);
    }
}