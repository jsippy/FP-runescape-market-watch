-- metadata should have a REFERENCE to the MOST RECENT price_history item associated with it
-- (or a fast way to get to it, because we need current price/volume to display in table)


create table metadata (
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

create table price_history (
  item_id int,
  ts timestamp NOT NULL,
  price integer NOT NULL,
  volume BIGINT,
  FOREIGN KEY (item_id) REFERENCES metadata (item_id),
  PRIMARY KEY (item_id,ts)
);
