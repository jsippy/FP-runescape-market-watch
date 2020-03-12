import React, { Component } from "react";
import * as d3 from "d3";

class PriceVolumeChart extends Component {

  constructor(props) {
    super(props);
    this.node = React.createRef();
    this.margin = { top: 20, right: 60, left: 20, bottom: 20, xbuffer: 20 };
    this.period = 7;

    this.chartWidth = this.props.width - this.margin.left - this.margin.right

    this.xScale = d3
      .scaleUtc()
      .domain(d3.extent(this.props.data, d => d.ts))
      .range([0, this.chartWidth]);

    this.currXScale = this.xScale;

    this.legendFormat = d3.format(".3~s");
    this.gpFormat = gp => `${d3.format(".3~s")(gp)} gp`;
    this.volFormat = d3.format(".3~s");

    this.candleData = this.generateCandlestickData(this.props.data, this.period);
    this.rsiData = this.generateRSI(this.props.data, 14);
    this.smaData = this.generateSimpleMovingAverage(this.props.data, 14);

    // Chart ratios 
    this.candleHeight = 0.3 * this.props.height;
    this.priceHeight = 0.3 * this.props.height;
    this.volumeHeight = 0.2 * this.props.height;
    this.rsiHeight = 0.2 * this.props.height;
    
    // Chart colors
    this.green = "#60d68a";
    this.red = "#d66061";
    this.text = "#e7e7e7";
    this.grid = "#777777";
    
    this.state = {
      currentDate: null
    }

    this.zoomed = this.zoomed.bind(this);
    this.drawChart = this.drawChart.bind(this);
    this.renderCandleLegend = this.renderCandleLegend.bind(this);
    this.renderVolumeLegend = this.renderVolumeLegend.bind(this);
    this.renderPriceLegend = this.renderPriceLegend.bind(this);
    this.renderChartTitle = this.renderChartTitle.bind(this);

    this.state = {
      currentDate: null,
      currentScale: this.xScale
    }

  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps !== this.props) {
      if (prevProps.data !== this.props.data) {
        this.candleData = this.generateCandlestickData(this.props.data, this.period);
        this.rsiData = this.generateRSI(this.props.data, 14);
        this.smaData = this.generateSimpleMovingAverage(this.props.data, 14);
      }
      this.chartWidth = this.props.width - this.margin.left - this.margin.right
      this.xScale = d3
        .scaleUtc()
        .domain(d3.extent(this.props.data, d => d.ts))
        .range([0, this.chartWidth]).interpolate(d3.interpolateNumber);

      this.drawChart(this.props.height);
    }
  }

  componentDidMount() {
    this.drawChart(this.props.height);
  }

  render() {
    return <><div ref={this.node} />
      {this.renderRSILegend()}
      {this.renderCandleLegend()}
      {this.renderPriceLegend()}
      {this.renderVolumeLegend()}
      {this.renderTooltip()}
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

  renderVolumeLegend() {
    let { currentDate } = this.state;

    if (currentDate === null) {
      currentDate = this.props.data[this.props.data.length - 1].ts;
    }

    let curr = this.props.data.find(d => d.ts === currentDate);

    let volume = curr ? curr.volume : null;

    return (
      <div className="Legend" style={{"top" : this.candleHeight + this.priceHeight}}>
        <div className="Label Purple">{`Volume: `}<span className="Value">{this.legendFormat(volume)}</span></div>
      </div>
    );
  }

  renderTooltip() {
    let { margin } = this;
    let { height } = this.props;
    let { currentDate } = this.state;

    if (currentDate === null) {
      currentDate = this.props.data[this.props.data.length - 1].ts;
    }

    const options = {  year: 'numeric', month: 'short', day: 'numeric' };
    options.timeZone = 'UTC';
    options.timeZoneName = 'short';

    return (
      <div className="tooltip" style={{"left" : this.currXScale(currentDate) - 50, "top" : height - margin.bottom - margin.xbuffer}}>
        <span style={{"position": "center"}}>{new Date(currentDate).toLocaleDateString("en-US", options)}</span>
      </div>
    )
  }

  renderRSILegend() {
    let { currentDate } = this.state;

    if (currentDate === null) {
      currentDate = this.rsiData[this.rsiData.length - 1].ts;
    }

    let curr = this.rsiData.find(d => d.ts === currentDate);
    let rsi, stoch;

    if (curr) {
      rsi = curr.value;
      stoch = curr.stoch;

    }

    return (
      <div className="Legend" style={{"top" : this.candleHeight + this.volumeHeight + this.priceHeight }}>
        <div className="Label Red">{`RSI: `}<span className="Value">{this.legendFormat(rsi)}</span></div>
        <div className="Label Orange">{`STOCH RSI: `}<span className="Value">{this.legendFormat(stoch)}</span></div>
      </div>
    );
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

  buildRSIChart(chartArea, xScale) {
    const chartHeight = this.rsiHeight- this.margin.xbuffer;
    this.rsiChart = chartArea
      .append("g")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("transform", `translate(${this.margin.left}, 0)`)
    
    this.rsiChart.append("defs").append("svg:clipPath")
      .attr("id", "rsiclip")
      .append("svg:rect")
      .attr("width", this.chartWidth)
      .attr("height", chartHeight)
      .attr("x", 0)
      .attr("y", 0)

    this.rsiChart
      .append("g")
      .attr("id", "xAxis")
      .attr("transform", `translate(0, ${chartHeight})`)

    this.rsiChart
      .append("g")
      .attr("id", "yAxis")
      .attr("transform", `translate(${this.chartWidth}, 0)`);

    this.updateRSIChart(xScale);
  }

  updateCandlestickChart(xScale) {
    const chartHeight = this.candleHeight - this.margin.top - this.margin.xbuffer;
    const xMin = xScale.invert(0);
    const xMax = xScale.invert(this.chartWidth);
    const candleData = this.candleData;
    const visibleData = this.candleData.filter(d => d.end > xMin && d.start < xMax);

    const yMin = d3.min(visibleData, d => d.low) - 5;
    const yMax = d3.max(visibleData, d => d.high) + 5;
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yMin), yMax])
      .range([chartHeight, 0]);

    this.candlestickChart.select("#xAxis")
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .tickPadding(5)
        .ticks(10))

    this.candlestickChart.select("#yAxis")
      .call(d3.axisRight(yScale)
        .tickFormat(this.gpFormat)
        .tickSize(-this.chartWidth)
        .ticks(10));

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
            .attr("width", d => (xScale(d.end) - xScale(d.start)))
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
    const data = this.props.data.filter(d => d.ts > xMin && d.ts < xMax).map(d => {
      let avg = this.smaData.find((e) => e.ts === d.ts);
      d.average = avg.avg;
      return d;
    })
    const yMin = d3.min(data, d => Math.min(d.daily, d.average)) - 5
    const yMax = d3.max(data, d => Math.max(d.daily, d.average)) + 5
    const yScale = d3
      .scaleLinear()
      .domain([Math.max(yMin, 0), yMax])
      .range([chartHeight, 0]);
    
    this.priceChart.select("#xAxis")
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .ticks(10))

    this.priceChart.select("#yAxis")
      .call(d3.axisRight(yScale)
        .tickFormat(this.gpFormat)
        .tickSize(-this.chartWidth)
        .ticks(10));

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

  updateRSIChart(xScale) {
    const chartHeight = this.rsiHeight - this.margin.xbuffer;
    const xMin = xScale.invert(0 - this.margin.left);
    const xMax = xScale.invert(this.chartWidth + this.margin.right);
    const data = this.rsiData.filter(d => d.ts > xMin && d.ts < xMax);

    const yMin = d3.min(data, d => d.value) - 5;
    const yMax = d3.max(data, d => d.value) + 5;

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(yMin, 0), yMax])
      .range([chartHeight, 0]);
    
    this.rsiChart.select("#xAxis")
      .call(d3.axisBottom(xScale)
      .tickSize(-chartHeight)
      .tickPadding(5)
      .ticks(10));

    this.rsiChart.select("#yAxis")
      .call(d3.axisRight(yScale)
      .tickFormat(this.volFormat)
      .tickSize(-this.chartWidth)
      .ticks(10));

    const rsiLine = d3.line()
      .x(d => xScale(d.ts))
      .y(d => yScale(d.value));

    const stochRsiLine = d3.line()
      .x(d => xScale(d.ts))
      .y(d => yScale(d.value));

    this.rsiChart
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
            .attr("d", rsiLine)
          group.append("path")
            .attr("id", "averageline")
            .attr("fill", "none")
            .attr("stroke", "#d66061")
            .attr("stroke-width", 3.0)
            .attr("d", stochRsiLine)
        },
        update => {
          update.select("#dailyline")
            // .transition().duration(0)    // Do we need these, was glitchy earlier but seems fine now
            .attr("d", rsiLine)
          update.select("#averageline")
            // .transition().duration(0)
            .attr("d", stochRsiLine)
        },
        exit => exit.remove()
      )
  }

  updateVolumeChart(xScale) {
    const chartHeight = this.volumeHeight - this.margin.xbuffer - this.margin.bottom;
    const xMin = xScale.invert(0 - this.margin.left);
    const xMax = xScale.invert(this.chartWidth + this.margin.right);
    const data = this.props.data
    const visibleData = data.filter(d => d.ts > xMin && d.ts < xMax);
    
    const yMax = d3.max(visibleData, d=> d.volume);
    const yScale = d3.scaleLinear()
      .domain([0, Math.max(5, yMax)])
      .range([chartHeight, 0]);

    this.volumeChart.select("#xAxis")
      .call(d3.axisBottom(xScale)
        .tickSize(-chartHeight)
        .ticks(10))

    this.volumeChart.select("#yAxis")
      .call(d3.axisRight(yScale)
        .tickFormat(this.volFormat)
        .tickSize(-this.chartWidth) 
        .ticks(6));

    const bandwidth = this.chartWidth / (visibleData.length + 2);
    this.volumeChart
      .selectAll(".volume_bar")
      .data(data, d => d.ts)
      .join(
        enter => enter.append("g")
          .attr("class", "volume_bar")
          .attr("clip-path", "url(#volumeclip)")
          .append("rect")
          .attr("fill", "#ae89d5")
          .attr("x", d => xScale(d.ts) - bandwidth / 2)
          .attr("y", d => yScale(d.volume))
          .attr("width", d => bandwidth)
          .attr("height", d => chartHeight - yScale(d.volume)),
        update => update.select("rect")
          .attr("x", d => xScale(d.ts) - bandwidth / 2)
          .attr("y", d => yScale(d.volume))
          .attr("width", d => bandwidth)
          .attr("height", d => chartHeight - yScale(d.volume)),
        exit => exit.remove()
      )
  }
  
  drawChart(height) {
    const div = d3.select(this.node.current);
    div.selectAll("*").remove();
    const { chartWidth, margin } = this;
    
    const svg = div
      .append("svg")
      .attr("width", "100%")
      .attr("height", height);

    const candlestickArea = svg
      .append("g")
      .attr("width", "100%")
      .attr("height", this.candleHeight);
      
    const priceArea = svg
      .append("g")
      .attr("width", "100%")
      .attr("height", this.priceHeight)
      .attr("transform", `translate(0, ${this.candleHeight})`);
      
    const volumeArea = svg
      .append("g")
      .attr("width", "100%")
      .attr("height", this.volumeHeight)
      .attr("transform", `translate(0, ${this.candleHeight + this.priceHeight})`);

    const rsiArea = svg
      .append("g")
      .attr("width", this.props.width)
      .attr("height", this.volumeHeight)
      .attr("transform", `translate(0, ${this.candleHeight + this.priceHeight + this.volumeHeight})`)

    this.buildCandlestickChart(candlestickArea, this.xScale);
    this.buildPriceChart(priceArea, this.xScale);
    this.buildVolumeChart(volumeArea, this.xScale);
    this.buildRSIChart(rsiArea, this.xScale);

    const crosshair = svg
      .append("line")
      .classed("x", true)
      .style("fill", "none")
      .style("pointer-events", "none")
      .style("stroke", this.text)
      .style("stroke-width", "1.5px");


    // generateCrosshair will have the svg element bound to `this`
    // so we must keep a reference to our node in `that`
    const that = this;
    const bisectDate = d3.bisector(d => d.ts).left;
    const { data } = this.props;
    function generateCrosshair() {
      const mouseX = d3.mouse(this)[0]
      
      if (mouseX < margin.left || mouseX > chartWidth + margin.left) {
        crosshair.style('display', 'none');
        return;
      }
      
      const date = that.currXScale.invert(mouseX - margin.left);
      const i = bisectDate(data, date, 1, data.length - 1);
      const d0 = data[i - 1];
      const d1 = data[i];
      const ts = (date - d0.ts) > (d1.ts - date) ? d1.ts : d0.ts;
      
      that.setState({currentDate : ts})

      const x = margin.left + that.currXScale(ts)
      crosshair
        .attr("x1", 0)
        .attr("x2", 0)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("display", null)
        .attr("transform", `translate(${x}, 0)`)
    }

    crosshair
      .on("mousedown", () => console.log("fuck"))
      .on("mouseup", () => console.log("fuck up"))

    div
      .on("mousemove", generateCrosshair)
      .on("mousedown", () => console.log("fuck"))
      .on("mouseup", () => console.log("fuck up"))
      .on("mouseover", () => crosshair.style("display", null))
      .on("mouseout",  () => {
        this.setState({currentDate : data[data.length - 1].ts})
        crosshair.style("display", "none")
      })

    const domain = this.xScale.domain()
    // const maxScale = (domain[1].getTime() - domain[0].getTime()) / (1000 * 60 * 60 * 24 * 31);
    const maxScale = (domain[1].getTime() - domain[0].getTime()) / (1000 * 60 * 60 * 24 * 31 * 2)
    const zoom = d3.zoom()
      .scaleExtent([1, maxScale])
      .extent([[this.margin.left, this.margin.top], [this.props.width - this.margin.right, this.candleHeight - this.margin.xbuffer]])
      .translateExtent([[this.margin.left, -Infinity], [this.props.width - this.margin.right, Infinity]])
      .on("zoom", this.zoomed);
      
    div.call(zoom);
  }

  generateRSI(data, period) {
    let rsi = [];
    let prices = data.map((d) => d.daily)

    let avgGain = 0;
    let avgLoss = 0;

    // compute rsi
    for (var i = 1; i < period; i++) {
      let change = (prices[i] - prices[i-1]) / prices[i-1] * 100;
      let gain = change >= 0 ? change : 0.0;
      let loss = change < 0 ? (-1) * change : 0.0;
      console.log(change);
      avgGain += gain;
      avgLoss += loss;
    }

    avgGain /= period;
    avgLoss /= period;

    for (var index = period; index < data.length; index++) {
      let change = (prices[index] - prices[index-1]) / prices[index-1] * 100;
      let gain = change >= 0 ? change : 0.0;
      let loss = change < 0 ? (-1) * change : 0.0;
      
      avgGain = ((avgGain) * 13 + gain) / 14;
      avgLoss = ((avgLoss) * 13 + loss) / 14;
      let rs = avgGain / avgLoss;
      let val = 100 - (100 / (1 + rs));
      rsi.push({
        value: isNaN(val) ? 0 : val,
        ts: data[index].ts
      })
    }

    // compute stochastic rsi
    for (var index = period; index < rsi.length; index++) {
      let win = rsi.slice(index - period, index);
      let min =d3.min(win, d => d.value)
      let max =d3.max(win, d => d.value)
      let curr = rsi[index - 1];
      let stoch = (curr.value - min) / (max - min);

      console.log(`min: ${min} max: ${max} curr: ${curr.value} stoch: ${stoch}`)

      if (isNaN(stoch) || Math.abs(stoch) === Infinity) {
        stoch = 0;
      }

      rsi[index - 1].stoch = stoch * 100;
    }

      console.log(rsi)
    return rsi;
  }

  generateSimpleMovingAverage(data, period) {
    let result = [];
    let initAverage = 0;

    data.forEach((d, i) => {
      if (i < period) {
        initAverage += d.daily
        result.push({ts: d.ts, avg: initAverage / (i + 1)})
      } else {
        let win = data.slice(i - period, i);
        let avg = win.reduce((a, b) => a + b.daily, 0) / period;

        result.push({ts: d.ts, avg: avg})
      }
    })

    return result;
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
    const newXScale = transform.rescaleX(this.xScale);
    this.updateCandlestickChart(newXScale);
    this.updatePriceChart(newXScale);
    this.updateVolumeChart(newXScale);
    this.updateRSIChart(newXScale);

    this.setState({currentScale: newXScale})
  }
}

export default PriceVolumeChart;