# OSRS Market Watch Dashboard

An interactive dashboard for visualizing Oldschool RuneScape market data.

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
- [ ] Fix crosshair values on zoom
- [ ] Compute rolling average in PriceDataChart
- [ ] RSI / STOCH RSI chart
- [ ] Re-implement % change or include Hi alch, store price
- [ ] Homepage view
- [x] Resolve price history for all ge tradable items
