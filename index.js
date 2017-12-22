'use strict';

const express = require('express');
// create Express app
// about Express itself: https://expressjs.com/
const app = express();

const poloniex = require('./poloniex.js');
const bitfinex = require('./bitfinex.js');
const postgres = require('./postgres.js');
poloniex.init();
poloniex.start();
bitfinex.init();
bitfinex.start();

const line = require('./line.js');
line.init(poloniex, bitfinex, postgres, app);
line.start();

const port = process.env.PORT || 8088;
app.listen(port, () => {
  console.log(`listening on ${port}`);
});
