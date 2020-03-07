import json
import psycopg2
from psycopg2.extras import execute_values
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.request import Request, urlopen


USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
BASE_URL = 'https://oldschool.runescape.wiki/w/Module:Exchange/{}'
SUMMARY_URL = 'https://www.osrsbox.com/osrsbox-db/items-complete.json'
ITEMS = './better_items.json'
PRICE_FILE_DEST = './item_prices.json'

# Dictionary of item names to a corrected version
ITEM_NAME_CORRECTIONS = {}

def updateItemPriceData(conn):
    failed_items = []
    price_history = {}
    cur = conn.cursor()
    cur.execute("SELECT wiki_name, item_id FROM metadata")
    results = cur.fetchall()
    for res in results:
        name, id = res
        print(name, id)
        #item_name = ITEM_NAME_CORRECTIONS[item_name]
        #print('Loading ({:04d}/{:4d}): {:.<30s}'.format(i, len(data), item_name), end='')
        item_url = BASE_URL.format(name) + '/Data'
        req = Request( item_url, headers={ 'User-Agent': USER_AGENT })
        try:
            res = urlopen(req)
        except:
            print('FAILED!')
            failed_items.append(name)
            continue

        if res.status != 200:
            print('FAILED!')
            failed_items.append(name)
            continue
        # print('Failed to get item! id: {} name: {}'.format(id, item_name))
        # print(res.__dict__)
        # exit()
        else:
            print('Success!')

        soup = BeautifulSoup(res.read(), 'html.parser')
        spans = soup('span', {'class': 's1'})
        prices = []

        rows_to_insert = []
        for span in spans:
            prices.append(span.text.strip('\''))
            split = span.text.strip('\'').split(':')
            if len(split) == 2:
                time, price = split
                vol = None
            elif len(split) == 3:
                time, price, vol = split
            else:
                assert False, 'Something is wrong with this line {}'.format(span.text)
            date = datetime.utcfromtimestamp(int(time)).strftime('%m-%d-%Y %H:%M:%S')
            row = (id, date, price, vol)
            rows_to_insert.append(row)
            price_history[id] = prices

        execute_values(cur, "INSERT INTO price_history (item_id, ts, price, volume) VALUES %s  ON CONFLICT DO NOTHING", rows_to_insert)
    
    cur.close()
    

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
        if wiki_url == None:
            wiki_name = psqlEscapeStr(name.replace(' ', '_'))
            wiki_url = "https://oldschool.runescape.wiki/w/" + \
                name.replace(' ', '_')
        else:
            wiki_name = psqlEscapeStr(wiki_url.split('/')[-1])

        if tradeable_on_ge and not metadata_exists(cur, name):
            print("Adding {} to metadata table".format(name))
            insert_query = """ INSERT INTO metadata(item_id, name, examine, icon,
                                wiki_name, wiki_url, members, tradeable_on_ge,
                                noteable, high_alch, store_price, buy_limit) 
                                VALUES ({}, '{}', '{}', '{}', '{}', '{}', {},
                                {},{}, {}, {}, {})""".format(
                id, name, examine, icon, wiki_name, wiki_url, members, tradeable_on_ge, noteable, high_alch, store_price, buy_limit
            )

            cur.execute(insert_query)

    cur.close()

def metadata_exists(cursor, name):  
    sql = "select * from metadata where name = '{}'".format(name)
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
      user="osrs",
      password="runescape"
    )
    conn.autocommit = True
    updateItemMetadata(conn)
    updateItemPriceData(conn)
    conn.close()

if __name__ == '__main__':
    main()
