import flask
from flask import request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

# NEEDED THESE FOR SSL, UNNECESSARY IF LOCALHOST
CERT_PATH = 'fullchain.pem'
PRIV_PATH = 'privkey.pem'

API_BASE  = '/market_watch_api/'

# POSTGRES VARIABLES
HOST        = "127.0.0.1"
PG_DATABASE = 'postgres'
PG_USER     = 'postgres'
PG_PASS     = 'postgres'

app = flask.Flask(__name__)
app.config["DEBUG"] = True

conn = psycopg2.connect(
    host=HOST,
    database=PG_DATABASE,
    user=PG_USER,
    password=PG_PASS,
)
conn.autocommit = True

@app.route(API_BASE, methods=['GET'])
def home():
    return '''<h1>OSRS MARKET WATCH API</h1>'''


@app.route(API_BASE + 'metadata', methods=['GET'])
def api_metadata():
    cur = conn.cursor(cursor_factory=RealDictCursor)
    # selects all columns from the metadata table and joins the last price for each item
    query = """
    SELECT *
    FROM metadata
    INNER JOIN (
        SELECT item_id, MAX(ts) AS ts
        FROM price_history
        GROUP BY item_id
    ) max_price ON metadata.item_id = max_price.item_id
    INNER JOIN price_history ON metadata.item_id = price_history.item_id AND max_price.ts = price_history.ts
    """
    cur.execute(query)
    result = cur.fetchall()
    cur.close()
    json = jsonify(result)
    return json


@app.route(API_BASE + 'prices', methods=['GET'])
def api_pricedata():
    query_parameters = request.args
    item_id = query_parameters.get('id')

    if not item_id:
        return page_not_found(404)
    else:
        try:
            item_id = int(item_id)
        except:
            return page_not_found(404)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('SELECT * FROM price_history WHERE item_id=%d' % item_id)
    result = cur.fetchall()
    cur.close()
    return jsonify(result)


@app.route(API_BASE + 'full_price', methods=['GET'])
def api_fullpricedata():
    query_parameters = request.args
    item_id = query_parameters.get('id')

    if not item_id:
        return page_not_found(404)
    else:
        try:
            item_id = int(item_id)
        except:
            return page_not_found(404)

    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute('''
    SELECT prices.item_id, dates.ts, prices.price, prices.volume
    FROM (
        SELECT generate_series(min(ts), max(ts), '1d')::date as ts
        FROM price_history WHERE item_id={0:d}
    ) dates
    LEFT JOIN (
        SELECT *
        FROM price_history WHERE item_id={0:d}
    ) prices 
    USING (ts)
    ORDER BY dates.ts
    '''.format(item_id))
    result = cur.fetchall()
    cur.close()
    return jsonify(result)


# @app.errorhandler(404)
# def page_not_found(e):
#     return "<h1>404</h1><p>The resource could not be found.</p>", 404

# LOCALHOST
app.run('0.0.0.0', 5000) #

# SSL OPEN PORT
# app.run(host='0.0.0.0', ssl_context=(CERT_PATH, PRIV_PATH))
