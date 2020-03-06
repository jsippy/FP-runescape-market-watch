import json
import psycopg2
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

def updateItemMetadata():
    req = Request(SUMMARY_URL, headers={'User-Agent': USER_AGENT})
    print('Fetching item metadata...')

    try:
        res = urlopen(req)
        blob = json.loads(res.read())
    except:
        print('FAILED!')

    conn = psycopg2.connect(
      host="localhost",
      database="market_watch",
      user="osrs",
      password="runescape"
    )

    cur = conn.cursor()
    conn.autocommit = True

    # seen is cheap hack to ignore items with same name (i.e Priest gown)
    seen = []
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

        # row = ( int(id), name, examine, icon, wiki_name, wiki_url, members,
        #         tradeable_on_ge, noteable, int(high_alch), int(store_price),
        #         int(buy_limit)
        # )
        # insert_query = """ INSERT INTO metadata(item_id, name, examine, icon,
        #             wiki_name, wiki_url, members, tradeable_on_ge,
        #             noteable, high_alch, store_price, buy_limit) 
        #             VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)"""
        # print(id, name, examine, icon, wiki_name, wiki_url, members,
        #     tradeable_on_ge, noteable, high_alch, store_price, buy_limit)
        #     cur.execute(insert_query, row)

        # cheap hack to avoid duplicate names...
        if tradeable_on_ge and name not in seen:

            seen.append(name)
            insert_query = """ INSERT INTO metadata(item_id, name, examine, icon,
                                wiki_name, wiki_url, members, tradeable_on_ge,
                                noteable, high_alch, store_price, buy_limit) 
                                VALUES ({}, '{}', '{}', '{}', '{}', '{}', {},
                                {},{}, {}, {}, {})""".format(
                id, name, examine, icon, wiki_name, wiki_url, members, tradeable_on_ge, noteable, high_alch, store_price, buy_limit
            )

            print(insert_query)

            cur.execute(insert_query)

    conn.close()
    cur.close()


def psqlEscapeStr(str):
    if str == None:
        return None

    return str.replace("'", "''")  # double single quotes to escape in psql


def main():
    updateItemMetadata()
    # Get all items
    # with open(ITEMS, 'r') as items_file:
    #   data = json.load(items_file)

    # # Build dict of price history
    # price_history = {}
    # failed_items = []
    # for i, item_name in enumerate(data):
    #   item_name = data[item_name]['name']
    #   #item_name = ITEM_NAME_CORRECTIONS[item_name]
    #   print('Loading ({:04d}/{:4d}): {:.<30s}'.format(i, len(data), item_name), end='')
    #   item_url = BASE_URL.format(item_name) + '/Data'
    #   req = Request( item_url, headers={ 'User-Agent': USER_AGENT })
    #   try:
    #     res = urlopen(req)
    #   except:
    #     print('FAILED!')
    #     failed_items.append(item_name)
    #     continue

    #   if res.status != 200:
    #     print('FAILED!')
    #     failed_items.append(item_name)
    #     continue
    #     # print('Failed to get item! id: {} name: {}'.format(id, item_name))
    #     # print(res.__dict__)
    #     # exit()
    #   else:
    #     print('Success!')

    #   soup = BeautifulSoup(res.read(), 'html.parser')
    #   spans = soup('span', {'class': 's1'})
    #   prices = []
    #   for span in spans:
    #     prices.append(span.text.strip('\''))
    #     split = span.text.strip('\'').split(':')
    #     if len(split) == 2:
    #       time, price = split
    #       vol = None
    #     elif len(split) == 3:
    #       time, price, vol = split
    #     else:
    #       assert False, 'Something is wrong with this line {}'.format(span.text)
    #     date = datetime.utcfromtimestamp(int(time)).strftime('%m-%d-%Y %H:%M:%S')
    #     print('{}: price: {} vol: {}'.format(date, price, vol))
    #     price_history[id] = prices

    # # Write price history to file
    # with open(PRICE_FILE_DEST, 'w') as price_file:
    #   json.dump(price_history, price_file)


if __name__ == '__main__':
    main()
