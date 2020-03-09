import json
import time
import tqdm
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.request import Request, urlopen
from urllib.error import URLError
from multiprocessing import Pool

USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
PRICES_URL = 'https://oldschool.runescape.wiki/w/Module:Exchange/{}/Data'
SUMMARY_URL = 'https://www.osrsbox.com/osrsbox-db/items-complete.json'
ITEMS = './better_items.json'
PRICE_FILE_DEST = './item_prices.json'
PG_USER = 'jsippy'
PG_PASS = ''

# Dictionary of ids to corrected version of name
ITEM_NAME_CORRECTIONS = {
  426: 'Priest gown (top)',
  428: 'Priest gown (bottom)',
  4529: 'Candle lantern (white)',
  4532: 'Candle lantern (black)',
}

def updateItemPriceData(conn):
    failed_items = []
    price_history = {}
    cur = conn.cursor()
    cur.execute("SELECT name, item_id FROM metadata")
    name_id_pairs = cur.fetchall()

    pool = Pool(8)
    list(tqdm.tqdm(pool.imap_unordered(scrapeURL, name_id_pairs), total=len(name_id_pairs)))
    pool.close()
    cur.close()
    

def scrapeURL(args):
    name, item_id = args
    if item_id in ITEM_NAME_CORRECTIONS:
      name = ITEM_NAME_CORRECTIONS[item_id]
    name = name.replace(' ', '_')
    url = PRICES_URL.format(name)

    # print('{: 6d} | {: <30} |'.format(item_id, name), end=' ')
    request = Request(url, headers={ 'User-Agent': USER_AGENT })
    try: response = urlopen(request)
    except URLError as e:
        if hasattr(e, 'reason'):
            print('Failed to reach a server: {}'.format(e.reason))
        elif hasattr(e, 'code'):
            print('The server couldn\'t fulfill the request: {}'.format(e.code))
        return []
    
    # print('Success!')

    soup = BeautifulSoup(response.read(), 'html.parser')
    spans = soup('span', {'class': 's1'})
    prices = []
    result = []
    for span in spans:
        prices.append(span.text.strip('\''))
        split = span.text.strip('\'').split(':')
        if len(split) == 2:
            time, price = split
            vol = None
        elif len(split) == 3:
            time, price, vol = split
        else:
            print('Something is wrong with this line {}'.format(span.text))
            assert False
            rows_to_insert = []
            break
        
        date = datetime.utcfromtimestamp(int(time)).strftime('%m-%d-%Y %H:%M:%S')
        result.append((item_id, date, price, vol))
    return result


def updateItemMetadata(conn):
    req = Request(SUMMARY_URL, headers={'User-Agent': USER_AGENT})
    print('Fetching item metadata...')

    try:
        res = urlopen(req)
        blob = json.loads(res.read())
    except:
        print('FAILED!')

    cur = conn.cursor()

    for id in blob:
        item = blob[id]
        id = item['id']
        name = psqlEscapeStr(item['name'])
        members = item['members']
        tradeable_on_ge = item['tradeable_on_ge']
        noteable = item['noteable']
        examine = psqlEscapeStr(item['examine'])
        icon = item['icon']
        buy_limit = item['buy_limit']
        store_price = item['cost']
        high_alch = item['highalch']
        wiki_url = psqlEscapeStr(item['wiki_url'])

        if buy_limit == None:
            buy_limit = -1          # -1 to signify no buy limit

        # if tradeable_on_ge:
        #   if id == None:
        #     print('id is none')
        #   if name == None:
        #     print('id is none')
        #   if wiki_name == None:
        #     print('id is none')
        #   print('{: 5} | {: <20} | {: <20}'.format(id, name, wiki_name))

        if wiki_url is None:
            wiki_url = "https://oldschool.runescape.wiki/w/" + name.replace(' ', '_')

        if tradeable_on_ge and not metadata_exists(cur, id):
            print("Adding {} to metadata table".format(name))
            insert_query = """ INSERT INTO metadata(item_id, name, examine, icon,
                                wiki_url, members, tradeable_on_ge, noteable, 
                                high_alch, store_price, buy_limit) VALUES 
                                ({}, '{}', '{}', '{}', '{}', {}, {}, {}, 
                                {}, {}, {})""".format(
                id, name, examine, icon, wiki_url, members, tradeable_on_ge, noteable, high_alch, store_price, buy_limit
            )
            cur.execute(insert_query)
    cur.close()

def metadata_exists(cursor, item_id):  
    sql = "select * from metadata where item_id = {}".format(item_id)
    cursor.execute(sql)
    result = cursor.fetchone()
    return result != None

def psqlEscapeStr(str):
    if str == None:
        return None
    return str.replace("'", "''")  # double single quotes to escape in psql

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
