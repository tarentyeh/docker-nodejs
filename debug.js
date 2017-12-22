'use strict';

var date = new Date();
console.log(date);
console.log(date.getTime());
console.log(date.toString());
console.log(date.toUTCString());
console.log(date.toISOString());
console.log(Date.now());

var bitfinex;

var interval = setInterval(() => {
  if (bitfinex == undefined) {
    return;
  }
  var result = bitfinex.getCurrencyInfo('iot');
  console.log('from debug:' + result);
}, 20 * 1000);

function setBitfinexObject(obj) {
  bitfinex = obj;
}

module.exports = {
  bitfinex: setBitfinexObject,
}