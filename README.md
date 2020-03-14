# OSRS Market Watch Dashboard

An interactive dashboard for visualizing Oldschool RuneScape market data.

Available at: [https://sippy.dev:3000](https://sippy.dev:3000)
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
