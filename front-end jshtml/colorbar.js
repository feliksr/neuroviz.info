//colorbar.js
class Colorbar {
    constructor(heatmap) {
        this.heatmap = heatmap;
        this.width = 30;
        this.numStops = 30;
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
            .attr("y", (_,i) => rectHeight*i)
            .attr("width", this.width)
            .attr("height", rectHeight)
            .attr("fill", d => {
                if (buttonANOVA.active) {
                    return d3.interpolateViridis(d / this.numStops);
                } else if (buttonPCA.active) { 
                    return d3.interpolateRdBu(d / this.numStops);
                } else {
                    return d3.interpolateViridis(1 - (d/this.numStops));
                }
            })
            .attr("shape-rendering", "crispEdges")
    }

    set_ColorbarScale(){

        this.colorbarScale = d3.scaleLinear()
            .domain([0, this.heatmap.maxPower])
            .range([this.heatmap.heightSVG, 0])
        
        if (document.getElementById('buttonPCA').active) {
            this.colorbarScale.domain([-this.heatmap.maxPower, this.heatmap.maxPower])
        } else if (document.getElementById('buttonANOVA').active){
            this.colorbarScale.domain([this.heatmap.maxPower, 0])
            this.colorbarScale.range([0, this.heatmap.heightSVG])
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
            
            if (document.getElementById('buttonANOVA').active){
                const maxPower = this.colorbarScale.invert(yPosition);
                this.heatmap.colorScale.domain([maxPower, 0])
                this.colorbarScale.domain([maxPower, 0])
            } else if (document.getElementById('buttonPCA').active){
                const maxPower = this.colorbarScale.invert(yPosition);
                this.heatmap.colorScale.domain([-maxPower, 0, maxPower])
                this.colorbarScale.domain([-maxPower, maxPower])
            
            
            } else {
                const maxPower = this.colorbarScale.invert(yPosition);
                this.heatmap.colorScale.domain([0, maxPower])
                this.colorbarScale.domain([0, maxPower]);
            }
            
            this.draw_Colorbar();

            const slider = document.getElementById('slider')
            
            let trial

            if (slider){
                trial = slider.value
            } else {
                trial = 1
            }
                        
            const waveletTrial = waveletTrials.filter(d => d.trial === parseInt(trial))
            const splitWavelet = this.heatmap.split_Freq(waveletTrial)
            this.heatmap.draw_Heatmap(splitWavelet);            
            }

        const dragHandler = d3.drag()
            .on('drag', dragged);

        dragHandler(this.colorbarGroup);
    }
}