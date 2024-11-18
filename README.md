# OSRS Market Watch Dashboard

An interactive dashboard for visualizing Oldschool RuneScape market data.

Hosted at [osrs-market.sippy.dev](osrs-market.sippy.dev)
Watch the demo: [https://vimeo.com/397559046](https://vimeo.com/397559046)

## Populating PostgreSQL Database and Serving API Endpoints (requires conda)
    createdb DATABASE_NAME
    psql -f database/schema.sql -d DATABASE_NAME
    conda env create -f database/environment.yml
    conda activate osrs
    python database/load_db.py
    python database/server.py

## Building and Serving React App
    npm install
    npm start

## TODO
- [x] Fix crosshair values on zoom
- [x] Fix volume bar bug on zomm / pan
- [x] No NaN, undefined, or weird units in legends
- [x] Compute rolling average in PriceDataChart
- [x] RSI / STOCH RSI chart
- [X] Re-implement % change or include Hi alch, store price
- [x] Resolve price history for all ge tradable items
- [ ] Move to production flask API
- [ ] Allow configuration with environment variables
