import json
import time
from tqdm import tqdm
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.request import Request, urlopen
from urllib.error import URLError
from multiprocessing import Pool

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ' \
             '(KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
PRICES_URL = 'https://oldschool.runescape.wiki/w/Module:Exchange/{}/Data'
SUMMARY_URL = 'https://www.osrsbox.com/osrsbox-db/items-complete.json'
WIKI_URL = 'https://oldschool.runescape.wiki/w/'
PG_USER = 'osrs'
PG_PASS = 'runescape'
POOL_SIZE = 1

HEAD = {'User-Agent': USER_AGENT }

# Dictionary of ids to corrected version of name
ITEM_NAME_CORRECTIONS = {
    4529: 'Candle lantern (white)',
    4532: 'Candle lantern (black)',

    6215: 'Broodoo_shield_(10)_(green)',
    6235: 'Broodoo_shield_(green)',

    6237: 'Broodoo_shield_(10)_(orange)',
    6257: 'Broodoo_shield_(orange)',

    6259: 'Broodoo_shield_(10)_(blue)',
    6279: 'Broodoo_shield_(blue)',
}

def updateItemPriceData(conn):
    cur = conn.cursor()
    cur.execute("SELECT name, wiki_name, item_id FROM metadata")
    name_id_pairs = cur.fetchall()

    print('Fetching price history...')
    pool = Pool(POOL_SIZE)
    imap = pool.imap_unordered(scrapeURL, name_id_pairs)
    for rows in tqdm(imap, total=len(name_id_pairs)):
        if len(rows) == 0: continue
        b_rows = [cur.mogrify("(%s,%s,%s,%s)", row) for row in rows]
        args_str = b",".join(b_rows)
        cur.execute(b"INSERT INTO price_history VALUES " +
                args_str + b" ON CONFLICT (item_id, ts) DO NOTHING") 
    pool.close()
    cur.close()
    

def scrapeURL(args):
    name, wiki_name, item_id = args

    if item_id in ITEM_NAME_CORRECTIONS:
      name = ITEM_NAME_CORRECTIONS[item_id]

    name = name.replace(' ', '_')
    wiki_name = wiki_name.replace(' ', '_')

    try: 
        request = Request(PRICES_URL.format(name), headers=HEAD)
        response = urlopen(request)
        loaded = True
    except:
        loaded = False 
    
    if not loaded:
        request = Request(PRICES_URL.format(wiki_name), headers=HEAD)
        try: response = urlopen(request)
        except: return []

    soup = BeautifulSoup(response.read(), 'html.parser')
    spans = soup('span', {'class': 's1'})
    result = []
    for span in spans:
        split = span.text.strip('\'').split(':')
        if len(split) == 2:
            time = int(split[0])
            price = int(split[1])
            vol = None
        elif len(split) == 3:
            time = int(split[0])
            price = int(split[1])
            vol = int(split[2])
        else:
            print('Something is wrong with this line {}'.format(span.text))
            assert False

        date = datetime.utcfromtimestamp(time).strftime('%m-%d-%Y %H:%M:%S')
        result.append((item_id, date, price, vol))
    return result


def updateItemMetadata(conn):
    print('Fetching item metadata...')

    try:
        request = Request(SUMMARY_URL, headers={'User-Agent': USER_AGENT})
        response = urlopen(request)
        blob = json.loads(response.read())
        response.close()
    except:
        assert False, 'Failed to recieve metadata file'

    cur = conn.cursor()

    for key in tqdm(blob, total=len(blob)):
        item = blob[key]
        if item['tradeable_on_ge']:
            if item['buy_limit'] == None:
                buy_limit = -1          # -1 to signify no buy limit

            if item['wiki_name'] is None:
                item['wiki_name'] = item['name'].replace(' ', '_')
                item['wiki_url'] = WIKI_URL + item['wiki_name']

            if not metadata_exists(cur, item['id']):
                insert_query = """INSERT INTO metadata
                                  (
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
                                  ) 
                                  VALUES 
                                  (%s, %s, %s, %s, %s, %s,
                                   %s, %s, %s, %s, %s, %s)"""
                
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

def metadata_exists(cursor, item_id):  
    sql = "SELECT * FROM metadata WHERE item_id = {}".format(item_id)
    cursor.execute(sql)
    result = cursor.fetchone()
    return result != None

def price_history_exists(cursor, item_id, ts):  
    sql = "select * from price_history where item_id = {}".format(item_id)
    cursor.execute(sql)
    result = cursor.fetchone()
    return result != None

def main():
    conn = psycopg2.connect(
      host="localhost",
      database="market_watch",
      user=PG_USER,
      password=PG_PASS,
    )
    conn.autocommit = True
    updateItemMetadata(conn)
    updateItemPriceData(conn)
    conn.close()

if __name__ == '__main__':
    main()
