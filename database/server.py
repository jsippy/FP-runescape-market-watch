import flask
from flask import request, jsonify
import psycopg2
from psycopg2.extras import RealDictCursor

# NEEDED THESE FOR SSL, UNNECESSARY IF LOCALHOST
CERT_PATH = 'fullchain.pem'
PRIV_PATH = 'privkey.pem'

API_BASE = '/market_watch_api/'
PG_USER = 'osrs'
PG_PASS = 'runescape'

app = flask.Flask(__name__)
app.config["DEBUG"] = True

@app.route(API_BASE, methods=['GET'])
def home():
    return '''<h1>OSRS MARKET WATCH API</h1>'''


@app.route(API_BASE + 'metadata', methods=['GET'])
def api_metadata():
    conn = psycopg2.connect(
      host="localhost",
      database="market_watch",
      user=PG_USER,
      password=PG_PASS,
    )

    cur = conn.cursor(cursor_factory=RealDictCursor)
    query = '''SELECT  m.*, p.*
               FROM metadata m 
               INNER JOIN price_history p
               ON m.item_id = p.item_id
               INNER JOIN
               (
                   SELECT item_id, MAX(ts) max_ts
                   FROM price_history
		   WHERE price IS NOT NULL AND volume IS NOT NULL
                   GROUP BY item_id
               ) c ON p.item_id = c.item_id AND p.ts = c.max_ts
	       '''

    cur.execute(query)
    result = cur.fetchall()

    return jsonify(result)


@app.route(API_BASE + 'prices', methods=['GET'])
def api_pricedata():
    conn = psycopg2.connect(
      host="localhost",
      database="market_watch",
      user=PG_USER,
      password=PG_PASS,
    )

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

    return jsonify(result)


@app.route(API_BASE + 'full_price', methods=['GET'])
def api_fullpricedata():
    conn = psycopg2.connect(
      host="localhost",
      database="market_watch",
      user=PG_USER,
      password=PG_PASS,
    )

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

    return jsonify(result)


@app.errorhandler(404)
def page_not_found(e):
    return "<h1>404</h1><p>The resource could not be found.</p>", 404

# LOCALHOST
app.run()

# SSL OPEN PORT
# app.run(host='0.0.0.0', ssl_context=(CERT_PATH, PRIV_PATH))
