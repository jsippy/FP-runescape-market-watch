import json
import time
import psycopg2
from datetime import datetime
from urllib.request import Request, urlopen

# Setup request headers
HEADERS = {
    'User-Agent': 'Dashboard project: https://github.com/jsippy/FP-runescape-market-watch/'
}

# API URLs
SUMMARY_URL = "https://raw.githubusercontent.com/0xNeffarion/osrsreboxed-db/master/docs/items-complete.json"
PRICES_URL  = "https://prices.runescape.wiki/api/v1/osrs/timeseries?timestep=24h&id={}"
WIKI_URL    = 'https://oldschool.runescape.wiki/w/'

# Postgres variables
PG_HOST     = "database"
PG_DATABASE = "postgres"
PG_USER     = 'postgres'
PG_PASS     = 'postgres'

# DEPRECATED URLS
# SUMMARY_URL = 'https://www.osrsbox.com/osrsbox-db/items-summary.json'
# PRICES_URL = 'https://oldschool.runescape.wiki/w/Module:Exchange/{}/Data'


def createTables(conn):
    print('Creating tables if they dont exist...')
    cur = conn.cursor()
    create_metadata_sql = """
    CREATE TABLE IF NOT EXISTS metadata (
        item_id int primary key,
        name text not null,
        examine text,
        icon text,
        wiki_name text,
        wiki_url text,
        members boolean,
        tradeable_on_ge boolean,
        noteable boolean,
        high_alch int,
        store_price int,
        buy_limit int
    );
    """
    cur.execute(create_metadata_sql)
    create_price_history_sql = """
    CREATE TABLE IF NOT EXISTS price_history (
        item_id int,
        ts timestamp NOT NULL,
        price integer,
        volume BIGINT,
        FOREIGN KEY (item_id) REFERENCES metadata (item_id),
        PRIMARY KEY (item_id,ts)
    );
    """
    cur.execute(create_price_history_sql)
    cur.close()


def updateItemMetadata(conn):
    """
    Downloads the summary and detail JSON files from the OSRS Wiki and updates
    the metadata table in the database accordingly.

    :param conn: A psycopg2 connection to the database
    """
    print('Fetching item metadata...')

    try:
        request = Request(SUMMARY_URL, headers=HEADERS)
        response = urlopen(request)
        blob = json.loads(response.read())
        response.close()
    except:
        assert False, 'Failed to recieve summary JSON file'

    cur = conn.cursor()

    for item in blob.values():
        if metadata_exists(cur, item['id']) or not item['tradeable_on_ge']:
            continue

        # Set default values if they don't exist
        if 'buy_limit' not in item or not item['buy_limit']: 
            item['buy_limit'] = -1
        if 'wiki_name' not in item or not item['wiki_name']:
            item['wiki_name'] = item['name'].replace(' ', '_')
            item['wiki_url'] = WIKI_URL + item['wiki_name']
        if 'icon' not in item or not item['icon']:
            item['icon'] = ''

        insert_query = """INSERT INTO metadata (
            item_id, 
            name, 
            examine, 
            icon, 
            wiki_name, 
            wiki_url, 
            members, 
            tradeable_on_ge, 
            noteable, 
            high_alch,
            store_price, 
            buy_limit
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);"""
        
        cur.execute(insert_query, (
                item['id'],
                item['name'],
                item['examine'],
                item['icon'],
                item['wiki_name'],
                item['wiki_url'],
                item['members'],
                item['tradeable_on_ge'],
                item['noteable'],
                item['highalch'],
                item['cost'],
                item['buy_limit']))
    cur.close()


def updateItemPriceData(conn):
    cur = conn.cursor()
    cur.execute("SELECT item_id FROM metadata")
    ids = cur.fetchall()
    print('Fetching price history...')
    for row in ids:
        id = row[0]
        print(f"  Fetching prices for item #{id}")
        try:
            request = Request(PRICES_URL.format(id), headers=HEADERS)
            response = urlopen(request)
            prices = json.loads(response.read())
            response.close()
        except:
            assert False, 'Failed to recieve price JSON file'

        if len(prices['data']) == 0:
            continue

        rows = []
        for price in prices['data']:
            rows.append((id, datetime.fromtimestamp(price['timestamp']), price['avgLowPrice'], price['lowPriceVolume']))
        b_rows = [cur.mogrify("(%s,%s,%s,%s)", row) for row in rows]
        args_str = b",".join(b_rows)
        cur.execute(b"INSERT INTO price_history VALUES " +
                args_str + b" ON CONFLICT (item_id, ts) DO NOTHING") 
    cur.close()


def metadata_exists(cursor, item_id):  
    """
    Returns True if the metadata exists for the given item_id in the database
    that the cursor is connected to, False otherwise.

    :param cursor: A psycopg2 cursor for database interaction
    :param item_id: The ID of the item to check in the metadata
    :return: True if the metadata exists for the given item_id, False otherwise
    """
    sql = "SELECT * FROM metadata WHERE item_id = {}".format(item_id)
    cursor.execute(sql)
    result = cursor.fetchone()
    return result != None


def main():
    print('Loading database with initial data...')
    conn = None
    while not conn:
        try: 
            conn = psycopg2.connect(
              host=PG_HOST,
              database=PG_DATABASE,
              user=PG_USER,
              password=PG_PASS,
            )
            conn.autocommit = True
        except:
            print('Failed to connect to database.')
            time.sleep(5)
            conn = None

    createTables(conn)
    updateItemMetadata(conn)
    updateItemPriceData(conn)
    print('Database has been loaded with initial data')
    conn.close()


if __name__ == '__main__':
    main()
