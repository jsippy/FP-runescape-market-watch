import React, { Component } from "react";
import * as d3 from "d3";

class PriceVolumeChart extends Component {

  constructor(props) {
    super(props);
    this.node = React.createRef();
    this.margin = { top: 20, right: 60, left: 20, bottom: 20, xbuffer: 20 };
    this.candlePeriod = 7;

    this.chartWidth = this.props.width - this.margin.left - this.margin.right

    this.xScale = d3
      .scaleTime()
      .domain(d3.extent(this.props.data, d => d.ts))
      .range([0, this.chartWidth]);

    this.currXScale = this.xScale;

    this.legendFormat = d3.format(".3~s");
    this.gpFormat = gp => `${d3.format(".3~s")(gp)} gp`;
    this.volFormat = d3.format(".3~s");

    this.candleData = this.generateCandlestickData(this.props.data, this.candlePeriod);

    // Chart heights
    this.candleHeight = 0.4 * this.props.height;
    this.priceHeight = 0.4 * this.props.height;
    this.volumeHeight = 0.2 * this.props.height;
    
    // Chart colors
    this.green = "#60d68a";
    this.red = "#d66061";
    this.text = "#e7e7e7";

    this.zoomed = this.zoomed.bind(this);
    this.drawChart = this.drawChart.bind(this);
    this.renderCandleLegend = this.renderCandleLegend.bind(this);
    this.renderVolumeLegend = this.renderVolumeLegend.bind(this);
    this.renderPriceLegend = this.renderPriceLegend.bind(this);
    this.renderChartTitle = this.renderChartTitle.bind(this);

    this.state = {
      currentDate: null
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps !== this.props) {
      if (prevProps.data !== this.props.data)
        this.candleData = this.generateCandlestickData(this.props.data, this.candlePeriod);
        
      this.chartWidth = this.props.width - this.margin.left - this.margin.right
      this.xScale = d3
        .scaleTime()
        .domain(d3.extent(this.props.data, d => d.ts))
        .range([0, this.chartWidth]);
      this.drawChart();
    }
  }

  componentDidMount() {
    this.drawChart();
  }

  render() {
    return <>
      <div ref={this.node} />
      {/* {this.renderChartTitle()} */}
      {this.renderCandleLegend()}
      {this.renderPriceLegend()}
      {this.renderVolumeLegend()}
    </>;
  }

  renderChartTitle() {
    const { metadata } = this.props;
    return (
      <div className="ChartTitle">
        <img className="LegendIcon" src={metadata.icon} alt={metadata.name}></img>
        <div className="ItemName">{metadata.name}</div>
      </div>
    );

  }

  renderCandleLegend() {
    let { currentDate } = this.state;
    const { metadata } = this.props;

    if (currentDate === null) {
      currentDate = this.props.data[this.props.data.length - 1].ts;
    }

    let currCandle = this.candleData.find(d => d.start <= currentDate && d.end >= currentDate);

    let hi, low, open, close;
    if (currCandle) {
      hi = currCandle.high;
      low = currCandle.low;
      open = currCandle.open;
      close = currCandle.close;
    } else {
      return <div className="Legend" style={{"display" : "none"}}></div>
    }

    return (
      <div className="Legend" style={{"top" : 0}}>
        <div className="LegendHeader">
          <img className="LegendIcon" src={`data:image/png;base64,${metadata.icon}`} alt={metadata.name}/>
          <div className="ItemName">{metadata.name.replace(/_/g, ' ')}</div>
        </div>
        {/* <div className="Label">{`Date: ${currentDate}`}</div> */}
        <div className="Label">{`Open: `}<span className="Value">{this.gpFormat(open)}</span></div>
        <div className="Label">{`Close: `}<span className="Value">{this.gpFormat(close)}</span></div>
        <div className="Label">{`High: `}<span className="Value">{this.gpFormat(hi)}</span></div>
        <div className="Label">{`Low: `}<span className="Value">{this.gpFormat(low)}</span></div>
      </div>
    );
  }

  renderVolumeLegend() {
    let { currentDate } = this.state;

    if (currentDate === null) {
      return (
        <div className="Legend" style={{"display" : "none"}}> </div>
      )
    }

    let curr = this.props.data.find(d => d.ts === currentDate);

    let volume = curr ? curr.volume : null;

    return (
      <div className="Legend" style={{"top" : this.candleHeight + this.priceHeight}}>
        <div className="Label">{`Volume: `}<span className="Value">{this.legendFormat(volume)}</span></div>
      </div>
    );
  }

  renderPriceLegend() {
    let { currentDate } = this.state;

    if (currentDate === null) {
      currentDate = this.props.data[this.props.data.length - 1].ts;
    }

    let curr = this.props.data.find(d => d.ts === currentDate);
    let daily, average;

    if (curr) {
      daily = curr.daily;
      average = curr.average;
    }

    return (
      <div className="Legend" style={{"top" : this.candleHeight }}>
        <div className="Label Blue">{`Daily: `}<span className="Value">{this.legendFormat(daily)}</span></div>
        <div className="Label Orange">{`Average: `}<span className="Value">{this.legendFormat(average)}</span></div>
      </div>
    );
  }

  renderTooltip() {
    let { currentDate } = this.state;
    return
  }

  buildCandlestickChart(chartArea, xScale) {
    const chartHeight = this.candleHeight - this.margin.top - this.margin.xbuffer;
    this.candlestickChart = chartArea
      .append("g")
      .attr("class", "candlestick-chart")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${this.margin.left}, ${this.margin.top})`)

    this.candlestickChart.append("defs").append("svg:clipPath")
      .attr("id", "candleclip")
      .append("svg:rect")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("x", 0)
      .attr("y", 0)

    this.candlestickChart
      .append("g")
      .attr("id", "xAxis")
      .attr("transform", `translate(0, ${chartHeight})`)

    this.candlestickChart
      .append("g")
      .attr("id", "yAxis")
      .attr("transform", `translate(${this.chartWidth}, 0)`)



    this.updateCandlestickChart(xScale);
  }

  buildPriceChart(chartArea, xScale) {
    const chartHeight = this.priceHeight - this.margin.xbuffer;
    this.priceChart = chartArea
      .append("g")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${this.margin.left}, 0)`)

    this.priceChart.append("defs").append("svg:clipPath")
      .attr("id", "priceclip")
      .append("svg:rect")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("x", 0)
      .attr("y", 0)

    this.priceChart
      .append("g")
      .attr("id", "xAxis")
      .attr("transform", `translate(0, ${chartHeight})`)

    this.priceChart
      .append("g")
      .attr("id", "yAxis")
      .attr("transform", `translate(${this.chartWidth}, 0)`)

    this.updatePriceChart(xScale);
  }
  
  buildVolumeChart(chartArea, xScale) {
    const chartHeight = this.volumeHeight- this.margin.xbuffer - this.margin.bottom;
    this.volumeChart = chartArea
      .append("g")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${this.margin.left}, 0)`)
    
    this.volumeChart.append("defs").append("svg:clipPath")
      .attr("id", "volumeclip")
      .append("svg:rect")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("x", 0)
      .attr("y", 0)

    this.volumeChart
      .append("g")
      .attr("id", "xAxis")
      .attr("transform", `translate(0, ${chartHeight})`)

    this.volumeChart
      .append("g")
      .attr("id", "yAxis")
      .attr("transform", `translate(${this.chartWidth}, 0)`);

    this.updateVolumeChart(xScale);
  }

  updateCandlestickChart(xScale) {
    const chartHeight = this.candleHeight - this.margin.top - this.margin.xbuffer;
    const xMin = xScale.invert(0);
    const xMax = xScale.invert(this.chartWidth);
    const candleData = this.candleData.filter(d => d.end > xMin && d.start < xMax);

    const yMin = d3.min(candleData, d => d.low) - 5;
    const yMax = d3.max(candleData, d => d.high) + 5;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin), yMax])
      .range([chartHeight, 0]);

    this.candlestickChart.select("#xAxis")
      .call( d3.axisBottom(xScale) )

    this.candlestickChart.select("#yAxis")
      .call(d3.axisRight(yScale).tickFormat(this.gpFormat));

    this.candlestickChart
      .selectAll(".candlestick")
      .data(candleData, d => d.id)
      .join(
        enter => {
          const group = enter.append("g")
            .attr("class", "candlestick")
            .attr("clip-path", "url(#candleclip)");
          group.append("rect")
            .attr("fill", d => d.close >= d.open ? this.green : this.red)
            .attr("x", d => xScale(d.start))
            .attr("y", d => yScale(Math.max(d.open, d.close)))
            .attr("width", d => xScale(d.end) - xScale(d.start))
            .attr("height", d => Math.max(2, Math.abs(yScale(d.open) - yScale(d.close))));
          group.append("line")
            .attr("x1", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
            .attr("x2", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
            .attr("y1", d => yScale(d.high))
            .attr("y2", d => yScale(d.low))
            .attr("stroke-width", d => (xScale(d.end) - xScale(d.start)) / 10)
            .attr("stroke", d => d.close >= d.open ? this.green : this.red);
        },
        update => {
          update.select("rect")
            .attr("x", d => xScale(d.start))
            .attr("y", d => yScale(Math.max(d.open, d.close)))
            .attr("width", d => xScale(d.end) - xScale(d.start))
            .attr("height", d => Math.max(2, Math.abs(yScale(d.open) - yScale(d.close))));
          update.select("line")
            .attr("x1", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
            .attr("x2", d => xScale(d.start) + (xScale(d.end) - xScale(d.start)) / 2)
            .attr("y1", d => yScale(d.high))
            .attr("y2", d => yScale(d.low))
            .attr("stroke-width", d => (xScale(d.end) - xScale(d.start)) / 10);
        },
        exit => exit.remove()
      )
  }

  updatePriceChart(xScale) {
    const chartHeight = this.priceHeight - this.margin.xbuffer;
    const xMin = xScale.invert(0 - this.margin.left);
    const xMax = xScale.invert(this.chartWidth + this.margin.right);
    const data = this.props.data.filter(d => d.ts > xMin && d.ts < xMax);

    const yMin = Math.min(d3.min(data, d => d.daily), d3.min(data, d => d.average)) - 5
    const yMax = Math.max(d3.max(data, d => d.daily), d3.max(data, d => d.average)) + 5
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(yMin, 0), yMax])
      .range([chartHeight, 0]);
    
    this.priceChart.select("#xAxis")
      .call( d3.axisBottom(xScale) )

    this.priceChart.select("#yAxis")
      .call(d3.axisRight(yScale).tickFormat(this.gpFormat));

    const dailyLine = d3.line()
      .x(d => xScale(d.ts))
      .y(d => yScale(d.daily));

    const averageLine = d3.line()
      .x(d => xScale(d.ts))
      .y(d => yScale(d.average));

    this.priceChart
      .selectAll(".priceLines")
      .data([data])
      .join(
        enter => {
          const group = enter.append("g")
            .attr("class", "priceLines")
            .attr("clip-path", "url(#priceclip)");
          group.append("path")
            .attr("id", "dailyline")
            .attr("fill", "none")
            .attr("stroke", "steelblue")
            .attr("stroke-width", 3.0)
            .attr("d", dailyLine)
          group.append("path")
            .attr("id", "averageline")
            .attr("fill", "none")
            .attr("stroke", "goldenrod")
            .attr("stroke-width", 3.0)
            .attr("d", averageLine)
        },
        update => {
          update.select("#dailyline")
            // .transition().duration(0)    // Do we need these, was glitchy earlier but seems fine now
            .attr("d", dailyLine)
          update.select("#averageline")
            // .transition().duration(0)
            .attr("d", averageLine)
        },
        exit => exit.remove()
      )
  }

  updateVolumeChart(xScale) {
    const chartHeight = this.volumeHeight - this.margin.xbuffer - this.margin.bottom;
    const xMin = xScale.invert(0 - this.margin.left);
    const xMax = xScale.invert(this.chartWidth + this.margin.right);
    const data = this.props.data.filter(d => d.ts > xMin && d.ts < xMax);
    
    const yMax = d3.max(data, d=> d.volume);
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(5, yMax)])
      .range([chartHeight, 0]);

    this.volumeChart.select("#xAxis")
      .call( d3.axisBottom(xScale) )

    this.volumeChart.select("#yAxis")
      .call(d3.axisRight(yScale).tickFormat(this.volFormat).ticks(6));

    const bandwidth = this.chartWidth / (data.length + 2);
    this.volumeChart
      .selectAll(".volume_bar")
      .data(data, d => d.ts)
      .join(
        enter => enter.append("g")
          .attr("class", "volume_bar")
          .attr("clip-path", "url(#volumeclip)")
          .append("rect")
          .attr("fill", "gray")
          .attr("x", d => xScale(d.ts))
          .attr("y", d => yScale(d.volume))
          .attr("width", d => bandwidth)
          .attr("height", d => chartHeight - yScale(d.volume)),
        update => update.select("rect")
          .attr("x", d => xScale(d.ts))
          .attr("y", d => yScale(d.volume))
          .attr("width", d => bandwidth)
          .attr("height", d => chartHeight - yScale(d.volume)),
        exit => exit.remove()
      )
  }
  
  drawChart() {
    const div = d3.select(this.node.current);
    div.selectAll("*").remove();
    
    const svg = div
      .append("svg")
      .attr("width", this.props.width)
      .attr("height", this.props.height);

    const candlestickArea = svg
      .append("g")
      .attr("width", this.props.width)
      .attr("height", this.candleHeight);
      
    const priceArea = svg
      .append("g")
      .attr("width", this.props.width)
      .attr("height", this.priceHeight)
      .attr("transform", `translate(0, ${this.candleHeight})`);
      
    const volumeArea = svg
      .append("g")
      .attr("width", this.props.width)
      .attr("height", this.volumeHeight)
      .attr("transform", `translate(0, ${this.candleHeight + this.priceHeight})`);

    this.buildCandlestickChart(candlestickArea, this.xScale);
    this.buildPriceChart(priceArea, this.xScale);
    this.buildVolumeChart(volumeArea, this.xScale);

    svg
      .append("line")
      .classed("x", true)
      .style("fill", "none")
      .style("pointer-events", "all")
      .style("stroke", this.text)
      .style("stroke-width", "1.5px");


    // generateCrosshair will have the svg element bound to `this`
    // so we must keep a reference to our node in `that`
    const that = this;
    const bisectDate = d3.bisector(d => d.ts).left;
    const { margin } = this;
    const { data, height } = this.props;
    function generateCrosshair() {
      const mouseX = d3.mouse(this)[0]
      if (mouseX < margin.left) {
        svg.select('line.x').style('display', 'none');
        return;
      }
      
      const date = that.currXScale.invert(mouseX - margin.left);
      const i = bisectDate(data, date, 1, data.length - 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const ts = (date - d0.ts) > (d1.ts - date) ? d1.ts : d0.ts;
      const currX = that.currXScale(ts)
      that.setState({currentDate : ts})
      svg
        .select("line.x")
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("transform", `translate(${margin.left + currX}, 0)`)
        .style("display", null);
    }

    svg
      .on("mousemove", generateCrosshair)
      .on("mouseover", () => {
        d3.selectAll(".Legend").style("display", null);
        svg.select("line.x").style("display", null);
      })
      .on("mouseout", () => {
        d3.selectAll(".Legend").style("display", "none");
        svg.select("line.x").style("display", "none");
      });


    const domain = this.xScale.domain()
    const maxScale = (domain[1].getTime() - domain[0].getTime()) / (1000 * 60 * 60 * 24 * 31);
    const zoom = d3.zoom()
      .scaleExtent([1, maxScale])
      .extent([[this.margin.left, this.margin.top], [this.props.width - this.margin.right, this.candleHeight - this.margin.xbuffer]])
      .translateExtent([[this.margin.left, -Infinity], [this.props.width - this.margin.right, Infinity]])
      .on("zoom", this.zoomed);
      
    svg.call(zoom);
  }

  generateCandlestickData(data, period) {
    const condensed = [];
    for (var i = 0; i < data.length - 1; i += period - 1) {
      const frame = data.slice(i, i + period);
      const candle = {
        "id"     : i,
        "high"   : d3.max(frame, d => d.daily),
        "low"    : d3.min(frame, d => d.daily),
        "open"   : frame[0].daily,
        "close"  : frame[frame.length - 1].daily,
        "volume" : frame.reduce((total, d) => total + d.volume),
        "start"  : frame[0].ts,
        "end"    : frame[frame.length - 1].ts
      }
      condensed.push(candle)
    }
    return condensed;
  }

  zoomed() {
    const transform = d3.event.transform;
    this.currXScale = transform.rescaleX(this.xScale);
    this.updateCandlestickChart(this.currXScale);
    this.updatePriceChart(this.currXScale);
    this.updateVolumeChart(this.currXScale);
  }
}

export default PriceVolumeChart;
