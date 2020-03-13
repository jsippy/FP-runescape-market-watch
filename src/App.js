import React, { Component } from "react";
import "./App.scss";

import * as d3 from "d3";
import PriceVolumeChart from './components/PriceVolumeChart.js';
import PriceTable from './components/PriceTable.js';

const TITLE_HEIGHT = 0;
const SIDEBAR_WIDTH = 400;
const ITEM_HEADER_HEIGHT = 0;

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      items: null,
      activeItemId: null,
      expanded: false,
      priceData: null,
      candleData: null,
      sidebarItems: [],
      filteredItems: [],
    };
    this.chart = React.createRef();
    this.onResize = this.onResize.bind(this);
    this.toggleExpand = this.toggleExpand.bind(this);
    this.filterSidebar = this.filterSidebar.bind(this);
    this.onSidebarSelect = this.onSidebarSelect.bind(this);
    this.processMetadata = this.processMetadata.bind(this);
  }

  componentDidMount() {
    window.addEventListener('resize', this.onResize, false);
    fetch('/market_watch_api/metadata', {})
      .then(response => response.json())
      .then(data => this.processMetadata(data));
    this.onResize();
  }

  toggleExpand() {
    this.setState((prev) => ({expanded: !prev.expanded}))
  }

  onResize() {
    this.setState(
      { chartWidth: window.innerWidth - SIDEBAR_WIDTH,
        chartHeight: window.innerHeight - ITEM_HEADER_HEIGHT - TITLE_HEIGHT});
  }

  processMetadata(metadata) {
    let percentChange = (start, end) => Math.round(1000 * (start - end) / start) / 10;
    let sidebarItems = [];
    let itemMap = {};

    for (let i in metadata) {
      let item = metadata[i];
      sidebarItems.push({
        name: item.name,
        average: item.price, // we could compute sma here instead?
        daily: item.price,
        volume: item.volume,
        id: item.item_id,
        icon: item.icon,
        buy_limit: item.buy_limit,
        oneDayChange: 0.5,
        oneWeekChange: 0.5,
        oneMonthChange: 0.5
      });

    }

    // sort alphabetically on name
    sidebarItems.sort((a,b) => (a.name > b.name) ? 1 : -1);

    fetch(`/market_watch_api/prices?id=${sidebarItems[0].id}`, {})
      .then(response => response.json())
      .then(data => { 

        this.setState({
          loading: false,
          items: itemMap,
          sidebarItems: sidebarItems,
          filteredItems: sidebarItems,
          activeItemId: sidebarItems[0].id,
          priceData: data,
          candleData: null
        });
      })
  }

  onSidebarSelect(id) {
    fetch(`/market_watch_api/prices?id=${id}`, {})
      .then(response => response.json())
      .then(data => {
        this.setState({activeItemId: id, priceData: data })
      })
  }
  
  filterSidebar(e) {
    const text = e.target.value.toLowerCase();
    const newItems = this.state.sidebarItems.filter(
      item => item.name.toLowerCase().includes(text)
    );
    this.setState({
      filteredItems: newItems
    });
  }

  renderLoadingAnimation() {
    return (
        <div className="LoadingContainer">
            <div className="lds-roller" style={{"color": "black"}}>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
                <div></div>
            </div>
        </div>
    );
}

  render() {
    if (this.state.loading) {
      return this.renderLoadingAnimation()
    }

    const { activeItemId, chartWidth, chartHeight } = this.state;
    const metadata = this.state.sidebarItems.find((e => e.id === activeItemId));
    const pricehistory = this.state.priceData;

    const chartData = pricehistory.map((row) => ({
      'ts': new Date(row['ts']),
      'daily': +row['price'],
      'average': +row['price'],         // again, we could compute sma here...
      'volume': +row['volume']
    }))

    const gpFormat = gp => `${d3.format('.3~s')(gp)} gp`;
    const volFormat = d3.format('.3~s');
    const { expanded } = this.state;

    return (
      <div className="Wrapper">
        <div className={expanded ? "Container Expanded" : "Container"}>
          <PriceTable
            items={this.state.filteredItems}
            metadata={this.state.sidebarItems}
            filterSidebar={this.filterSidebar}
            activeItemId={this.state.activeItemId}
            onSelect={this.onSidebarSelect}
            expanded={this.state.expanded}
            toggleExpand={this.toggleExpand}
            formatGp={volFormat}
            height={chartHeight}/>
          <div className={expanded ? "Content Expanded" : "Content"}>
            <div className="ChartContainer" ref={this.chart} style={{margin: 0, position: "relative"}}>
              <PriceVolumeChart metadata={metadata}
                                data={chartData}
                                width={chartWidth}
                                height={chartHeight} />
            </div>
            
          </div>
        </div>
      </div>
    );
  }
}

export default App;
