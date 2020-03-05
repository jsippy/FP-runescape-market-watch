import json
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
  req = Request( SUMMARY_URL, headers={ 'User-Agent': USER_AGENT })
  items_to_update = []

  print('Fetching item metadata...')
  try:
    res = urlopen(req)
    blob = json.loads(res.read())
  except:
    print('FAILED!')
    
  
  for id in blob:
    item = blob[id]
    print(item)

    id = item['id']
    name = item['name']
    members = item['members']
    tradeable_on_ge = item['tradeable_on_ge']
    noteable = item['noteable']
    examine = item['examine']
    icon = item['icon']
    buy_limit = item['buy_limit']
    store_price = item['cost']
    high_alch = item['highalch']
    wiki_url = item['wiki_url']

    if wiki_url == None:
      wiki_name = name.replace(' ', '_')
    else:
      wiki_name = wiki_url.split('/')[-1]

    if tradeable_on_ge:
      # if not in db already...
      # ADD TO OUR DB
      # cur = conn.cursor()
      # insert_query = "INSERT INTO metadata VALUES {}".format("(10, 'hello@dataquest.io', 'Some Name', '123 Fake St.')")
      # cur.execute(insert_query)

      items_to_update.append(name)



def main():
  updateItemMetadata()
  # Get all items
  with open(ITEMS, 'r') as items_file:
    data = json.load(items_file)

  # Build dict of price history
  price_history = {}
  failed_items = []
  for i, item_name in enumerate(data):
    item_name = data[item_name]['name']
    #item_name = ITEM_NAME_CORRECTIONS[item_name]
    print('Loading ({:04d}/{:4d}): {:.<30s}'.format(i, len(data), item_name), end='')
    item_url = BASE_URL.format(item_name) + '/Data'
    print(item_url)
    req = Request( item_url, headers={ 'User-Agent': USER_AGENT })
    try:
      res = urlopen(req)
    except:
      print('FAILED!')
      failed_items.append(item_name)
      continue

    if res.status != 200:
      print('FAILED!')
      failed_items.append(item_name)
      continue
      # print('Failed to get item! id: {} name: {}'.format(id, item_name))
      # print(res.__dict__)
      # exit()
    else:
      print('Success!')
  
    soup = BeautifulSoup(res.read(), 'html.parser')
    spans = soup('span', {'class': 's1'})
    prices = []
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
      print('{}: price: {} vol: {}'.format(date, price, vol))
      price_history[id] = prices

  # Write price history to file
  with open(PRICE_FILE_DEST, 'w') as price_file:
    json.dump(price_history, price_file)

if __name__ == '__main__':
  main()
