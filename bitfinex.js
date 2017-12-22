const crypto = require('crypto');
const request = require('request');

function rest (key, secret, opts= {}) {
  this.url = 'https://api.bitfinex.com';
  this.version = 'v1';
  this.key = key;
  this.secret = secret;
  this.nonce = Date.now();
  this.generateNonce = (typeof opts.nonceGenerator === 'function')
    ? opts.nonceGenerator
    : function () {
      // noinspection JSPotentiallyInvalidUsageOfThis
      return ++this.nonce;
    };
}

rest.prototype.make_request = function(path, params, cb) {
  var headers, key, nonce, path, payload, signature, url, value;
  if (!this.key || !this.secret) {
    return cb(new Error('API key and secret is invalid'));
  }
  url = `${this.url}/${this.version}/${path}`;
  nonce = JSON.stringify(this.generateNonce());
  payload = {
    request: `/${this.version}/${path}`,
    nonce
  };
  for (key in params) {
    value = params[key];
    payload[key] = value;
  }
  payload = new Buffer(JSON.stringify(payload)).toString('base64');
  signature = crypto.createHmac('sha384', this.secret).update(payload).digest('hex');
  headers = {
    'X-BFX-APIKEY' : this.key,
    'X-BFX-PAYLOAD' : payload,
    'X-BFX-SIGNATURE' : signature,
  };
  return request({
    url,
    method: 'POST',
    headers,
    timeout: 15000
  }, (err, response, body) => {
    let result;
    if (err || (response.statusCode !== 200 && response.statusCode !== 400)) {
      return cb(new Error(err != null ? err : response.statusCode))
    }
    try {
      result = JSON.parse(body);
    } catch (e) {
      return cb(e, { text: body.toString() });
    }
    if (result.message != null) {
      if (/Nonce is too small/.test(result.message)) {
        result.message += ' refer to API document';
      }
      return cb(new Error(result.message));
    }
    // result.message is empty if request successfully
    return cb(null, result);
  });
}

rest.prototype.make_public_request = function(path, cb) {
  const url = `${this.url}/${this.version}/${path}`;
  return request({
    url,
    method: 'GET',
    timeout: 15000
  }, (err, response, body) => {
    let result;
    if (err || (response.statusCode !== 200 && response.statusCode !== 400)) {
      return cb(new Error(err != null ? err : response.statusCode));
    }
    try {
      result = JSON.parse(body);
    } catch (e) {
      return cb(e, { text: body.toString() });
    }
    if (result.message != null) {
      return cb(new Error(result.message));
    } else {
      return cb(null, result);
    }
  });
}

// ticker values
rest.prototype.ticker = function(symbol, cb) {
  if (arguments.length == 0) {
    symbol = 'BTCUSD';
    cb = function(error, data) {
      console.log(data);
    }
  }
  return this.make_public_request('pubticker/' + symbol, cb);
}

// high and low prices
rest.prototype.today = function (symbol, cb) {
  return this.make_public_request('today/' + symbol, cb);
}

// trade volumes by day period
rest.prototype.stats = function (symbol, cb) {
  return this.make_public_request('stats/' + symbol, cb);
}

// do implement this self, no needs to export class
//module.exports = rest;
// public API no needs to register token and secret
const pubicApi = null;
const tickers = {};

function tickerCallback(pair, data) {
  if (pair == undefined || data == undefined) {
    return;
  }
  // fill data to tickers struct
  if (tickers[pair] == undefined) {
    tickers[pair] = {};
    console.log('Ticker initialized:' + pair);
  }
  try {
    tickers[pair].pair = pair;
    tickers[pair].last = data.last_price;
    tickers[pair].ask = data.ask;
    tickers[pair].bid = data.bid;
    tickers[pair].volume = data.volume;
    tickers[pair].highest = data.high;
    tickers[pair].lowest = data.low;
    tickers[pair].updatetime = new Date(data.timestamp * 1000); // seconds number to milliseconds
    console.log('Ticker updated:' + pair);
  } catch (e) {
    console.log(e);
  }
}

function httpsGetTickers() {
  publicApi.ticker('iotusd', (error, data) => {
    if (error == null) {
      tickerCallback('iotusd', data);
    } else {
      console.log(error);
    }
  });
  publicApi.ticker('iotbtc', (error, data) => {
    if (error == null) {
      tickerCallback('iotbtc', data);
    } else {
      console.log(error);
    }
  });
}

function routineUpdateFunction() {
  httpsGetTickers();
  routineUpdatetime = new Date();
}

function initModule() {
  // Public API does not needs key and secret
  publicApi = new rest('','');
}

var routineUpdatetime = null;
var routineInterval = null;

function startRoutineInterval() {
  console.log('Start trace bitfinex price');
  // Update current tickers data
  httpsGetTickers();
  routineUpdatetime = new Date();

  if (routineInterval == undefined || routineInterval == null) {
    // Use public API get tickers data for each 5 minutes
    routineInterval = setInterval(routineUpdateFunction, 5 * 60 * 1000);
  } else {
    console.log('Routine interval has been exist, should be stopped before start again');
  }
}

function stopRoutineInterval() {
  if (routineInterval == undefined || routineInterval == null) {
    console.log('Routine interval is not exists, should be started to stop');
  } else {
    // Clear interval timer
    clearInterval(routineInterval);
    routineInterval = null;
  }
}

module.exports = {
  init: initModule,
  start: startRoutineInterval,
  stop: stopRoutineInterval,
  getTicker: (pair) => {
    // bitfinex pair format: btcusd
    pair = pair.toLowerCase();
    var ticker = tickers[pair];
    return ticker;
  },
  getCurrencyInfo: (currency, withTimestamp = true) => {
    currency = currency.toLowerCase();
    var response;
    // for-in loop will looping within key(in this case, key is pair)
    for (pair in tickers) {
      if (pair.indexOf(currency) !== 0) {
        continue;
      }
      var price = currency.toUpperCase() + '->' + pair.replace(currency, '').toUpperCase() + ': ' + tickers[pair].last;
      if (response == undefined) {
        if (withTimestamp == true) {
          response = tickers[pair].updatetime.toISOString() + '\n' + price;
        } else {
          response = price;
        }
      } else {
        response += '\n' + price;
      }
    }
    // if tickers does not have given currency, return empty
    if (response == undefined)
      response = '';
    return response;
  }
};