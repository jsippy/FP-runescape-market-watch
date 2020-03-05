import json
from datetime import datetime
from bs4 import BeautifulSoup
from urllib.request import Request, urlopen


USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.87 Safari/537.36'
BASE_URL = 'https://oldschool.runescape.wiki/w/Module:Exchange/{}'
SUMMARY_URL = 'https://rsbuddy.com/exchange/summary.json'
ITEMS = './better_items.json'
PRICE_FILE_DEST = './item_prices.json'

# Dictionary of item names to a corrected version
ITEM_NAME_CORRECTIONS = {}

def getMetaData(item_name):
  item_url = BASE_URL.format(item_name)
  req = Request(item_url, headers={ 'User-Agent': USER_AGENT })
  try:
    res = urlopen(req)
  except:
    print('FAILED!')
  
  soup = BeautifulSoup(res.read(), 'html.parser')
  pre = soup.find('pre')
  # remove 'return' keyword from front, split on newlines, remove brackets
  json_text = pre.text[7:].split('\n')[1:-1]
  for line in json_text:
    parts = line.split('=')
    key = parts[0].strip()
    val = parts[1].strip()
    # remove trailing commas....
    if (val[-1] == ','):
      val = val[:-1]
    
    # remove quotes if string...
    if (val[0] == '\''):
      val = val[1:-1]
    
    # booleans...
    if (val == 'true'):
      val = True
    print(val)

  #json_text = pre.text[7:]
  print(json_text)

  #blob = json.loads(pre.text)
  #print(blob)
  return None

    
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
    name = item['name'].replace(' ', '_')
    # if not in db already...
    #   add to list of items to be fetched
    items_to_update.append(name)

  for item_name in items_to_update:
    metadata = getMetaData(item_name)


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
