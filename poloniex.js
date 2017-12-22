const https = require('https');
const autobahn = require('autobahn');
const wsuri = 'wss://api.poloniex.com';
const connection = new autobahn.Connection({
  url: wsuri,
  realm: "realm1"
});

const tickers = {};

function httpsGetTickers() {
  var pubApiUrl = 'https://poloniex.com/public?command=returnTicker';
  https.get(pubApiUrl, function(res) {                                            
    const { statusCode } = res;                                                   
    const contentType = res.headers['content-type'];                              
 
    let error;                                                                    
    if (statusCode !== 200) {                                                     
      error = new Error('Request failed:' + `Status Code ${statusCode}`);         
    } else if (!/^application\/json/.test(contentType)) {                         
      error = new Error('Invalid content type:' + `Content Type ${contentType}`); 
    }                                                                             

    if (error) {
      console.error(error.message);                                               
      // Consume response data to free up memory
      res.resume();
    } else {                                                                      
      res.setEncoding('utf8');                                                    
      let rawText = '';                                                           
      res.on('data', function(chunk) { rawText += chunk; });                      
      res.on('end', function() {                                                  
        try {                                                                     
          const data = JSON.parse(rawText);                                 
          //console.log(data);
          for (var pair in data) {                                          
            //console.log(pair);
            if (pair === 'USDT_BTC' || pair === 'USDT_ETH' ||
                pair === 'USDT_ZEC' || pair === 'USDT_BCH' || 
                pair === 'BTC_ETH' || pair === 'BTC_ZEC' ||                          
                pair === 'ETH_ZEC') {                                                
              if (tickers[pair] == undefined) {                                  
                tickers[pair] = {};                                              
                console.log('Ticker initialized:' + pair);                         
              }                                                                      
              tickers[pair].pair = pair;                                         
              tickers[pair].last = data[pair].last;
              tickers[pair].ask = data[pair].lowestAsk;                 
              tickers[pair].bid = data[pair].highestBid;                
              tickers[pair].change = data[pair].percentChange;          
              tickers[pair].volume = data[pair].quoteVolume;            
              tickers[pair].forzen = data[pair].isForzen;               
              tickers[pair].highest = data[pair].high24hr;              
              tickers[pair].lowest = data[pair].low24hr;                
              tickers[pair].updatetime = new Date();                             
              console.log('Ticker updated:' + pair);                   
            }                                                                        
          }                                                                         
        } catch (e) {                                    
          console.error(e.message);  
        }    
      });                                                                            
    }                                                                                
  }).on('error', function(e) {      
    console.error(`https.get error: ${e.message}`);
  });
}

function routineUpdateFunction() {
  httpsGetTickers();
  routineUpdatetime = new Date();
}

function initModule() {

}

var routineUpdatetime = null;
var routineInterval = null;

function startRoutineInterval() {
  console.log('Start trace poloniex price');
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
    // poloniex pair format: USDT_BTC
    pair = pair.toLowerCase();
    var ticker = tickers[pair];
    return ticker;
  },
  getCurrencyInfo: (currency, withTimestamp = true) => {
    currency = currency.toUpperCase();
    var response;
    // for-in loop will looping within key(in this case, key is pair)
    for (pair in tickers) {
      if (pair.indexOf('_' + currency) === -1) {
        continue;
      }
      var price = currency.toUpperCase() + '->' + pair.replace(currency, '').toUpperCase() + ': ' + (Math.round(tickers[pair].last * 10000) / 10000);
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