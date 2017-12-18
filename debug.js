const poloniex = require('./poloniex');
//const Promise = require('promise');

var date = new Date();
//console.log(date);
//console.log(date.getTime());
//console.log(date.toString());
//console.log(date.toUTCString());
//console.log(date.toISOString());


var ps = new Promise((resolve, reject) => {
  setTimeout(() => {
    throw new Error('error in resolve');
    resolve(123);
  }, 1000)
  //throw new Error('error in resolve');
})
.then(val => {
  console.log(val);
  //throw new Error('error from resolve=' + val);
})
.catch(err => {
  console.error('reject because error:', err);
  return Promise.reject(err);
})
.catch(err => {
  console.error('uncatch or returned reject:', err);
});

//poloniex.open();

setTimeout(function() {
  var output;
  output = poloniex.getCurrencyInfo('btc');
  console.log(output);
  output = poloniex.getCurrencyInfo('zec');
  console.log(output);

}, 40000);
