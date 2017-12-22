'use strict';

const poloniex = require('./poloniex.js');
const bitfinex = require('./bitfinex.js');
const postgres = require('./postgres.js');
poloniex.init();
poloniex.start();
bitfinex.init();
bitfinex.start();

const line = require('./line.js');
line.init(poloniex, bitfinex, postgres);
line.start();

const debug = require('./debug.js');

console.log('set object to debug');
debug.bitfinex(bitfinex);

var interval = setInterval(() => {
  var result = bitfinex.getCurrencyInfo('iot');
  console.log('from index:' + result);
}, 25 * 1000);
