import React, { Component, StrictMode, useEffect, useRef, useState } from "react";
import "./App.scss";

import PriceVolumeChart from './components/PriceVolumeChart.js';
import ItemSidebar from './components/ItemSidebar.js';
import { createTheme, ThemeProvider } from "@mui/system";

// const TITLE_HEIGHT = 0;
const SIDEBAR_WIDTH = 400;
// const ITEM_HEADER_HEIGHT = 0;

const PRIMARY = "#212121";
const GREEN = "#60d68a";
const BG = "#303030";

function LoadingAnimation() {
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
  )
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [sidebarItems, setSidebarItems] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [activeItemId, setActiveItemId] = useState(561); // maybe fix
  const [expanded, setExpanded] = useState(false);

  const windowSize = useWindowSize();
  console.log(windowSize);

  // Add a hook to fetch the item metadata.
  useEffect(() => {
    fetch('/market_watch_api/metadata', {})
      .then(response => response.json())
      .then(metadata => {
        let nat = metadata.find(item => item.item_id == 561)
        let sidebarItems = [];
        for (let key in metadata) {
          const item = metadata[key]
          sidebarItems.push({
            name: item.name,
            average: item.price, // we could compute sma here instead?   
            daily: item.price,
            volume: item.volume,
            id: item.item_id,
            icon: item.icon,
            buy_limit: item.buy_limit,  
            high_alch: item.high_alch,
            high_alch_profit: item.high_alch - item.price - nat.price,
            oneDayChange: 0.5,
            oneWeekChange: 0.5,
            oneMonthChange: 0.5
          });
        }
        setSidebarItems(sidebarItems);
        setLoading(false);
      })
      .catch(error => console.log(error));
  }, []);

  // Add a hook to fetch the selected item's price history.
  useEffect(() => {
    fetch('/market_watch_api/prices?id=' + activeItemId, {})
      .then(response => response.json())
      .then(data => data.map((row) => ({
        'ts': new Date(row['ts']),
        'daily': +row['price'],
        'average': +row['price'],
        'volume': +row['volume']
      })))
      .then(setPriceData)
      .catch(error => console.log(error))
  }, [activeItemId]);

  // If we haven't loaded the item metadata yet, show the loading animation
  if (loading) {
    return (
      <StrictMode>
        <LoadingAnimation />
      </StrictMode>
    )
  }

  // Otherwise render the app
  return (
    <StrictMode>
      <div className="Wrapper">
        <div className={expanded ? "Container Expanded" : "Container"}>
          <ItemSidebar
            data={sidebarItems}
            activeItemId={activeItemId}
            setActiveItemId={setActiveItemId}
            expanded={expanded}
            setExpanded={setExpanded}
            height={windowSize.height} />
          <PriceVolumeChart 
            metadata={sidebarItems.find(item => item.id == activeItemId)}
            data={priceData}
            width={windowSize.width - SIDEBAR_WIDTH}
            height={windowSize.height} 
            expanded={expanded}/>
        </div> 
      </div>
    </StrictMode>
  )
};