const https = require('https');
const autobahn = require('autobahn');
const wsuri = 'wss://api.poloniex.com';
const connection = new autobahn.Connection({
  url: wsuri,
  realm: "realm1"
});

module.exports = {
  open: function() {
    console.log('Open poloniex connection');
    connection.open();
  },
  close: function() {
    connection.close();
  },
  getTicker: function(pair) {
    pair = pair.toUpperCase();
    var ticker = tickersData[pair];
    return ticker;
  },
  getCurrencyInfo: function(currency) {
    currency = currency.toUpperCase();
    var response;
    // for-in loop will looping within key(in this case, key is pair)
    for (pair in tickersData) {
      if (tickersData.hasOwnProperty(pair) === false || pair.indexOf('_' + currency) === -1) {
        continue;
      }
      var last = currency + '->' + pair.replace('_' + currency, '') + ': ' + (Math.round(tickersData[pair].last * 10000) / 10000);
      if (response == undefined) {
        response = tickersData[pair].updatetime.toISOString() + '\n' + last;
      } else {
        response += '\n' + last;
      }
    }
    return response;
  }
};

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
      let rawData = '';                                                           
      res.on('data', function(chunk) { rawData += chunk; });                      
      res.on('end', function() {                                                  
        try {                                                                     
          const parsedData = JSON.parse(rawData);                                 
          //console.log(parsedData);
          for (var pair in parsedData) {                                          
            //console.log(pair);
            if (pair === 'USDT_BTC' || pair === 'USDT_ETH' || pair === 'USDT_ZEC' || 
                pair === 'BTC_ETH' || pair === 'BTC_ZEC' ||                          
                pair === 'ETH_ZEC') {                                                
              if (tickersData[pair] == undefined) {                                  
                tickersData[pair] = {};                                              
                console.log('Received ticker data:' + pair);                         
              }                                                                      
              tickersData[pair].pair = pair;                                         
              tickersData[pair].last = parsedData[pair]['last'];                     
              tickersData[pair].ask = parsedData[pair]['lowestAsk'];                 
              tickersData[pair].bid = parsedData[pair]['highestBid'];                
              tickersData[pair].change = parsedData[pair]['percentChange'];          
              tickersData[pair].volume = parsedData[pair]['quoteVolume'];            
              tickersData[pair].forzen = parsedData[pair]['isForzen'];               
              tickersData[pair].highest = parsedData[pair]['high24hr'];              
              tickersData[pair].lowest = parsedData[pair]['low24hr'];                
              tickersData[pair].updatetime = new Date();                             
              console.log('Ticker updated:' + pair);
              routineUpdatetime = tickersData[pair].updatetime;                      
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

// Poloniex will not fire ticker event in a period of time
var routineUpdatetime;
var routineInterval;
function routineCheckUpdate() {
  var timeDiff = 0;
  if (routineUpdatetime != undefined) {
    timeDiff = Date.now() - routineUpdatetime.getTime();
  }
  // Subscribe seems not working, use public API instead
  httpsGetTickers();
  //// 10 minutes no update will do re-connection
  //if (timeDiff > 10 * 60 * 1000) {
  //  console.log('Long time no update diff:' + timeDiff + ' time:' + routineUpdatetime.toISOString());
  //  // Cleanup this interval check
  //  clearInterval(routineInterval);
  //  connection.close();
  //}
}

var tickersData = {};
connection.onopen = function(session) {
  console.log('Poloniex websocket connection opened');
  function tickerEvent(args, kwargs) {
    //console.log('ticker:' + args);
    if (args[0] === 'USDT_BTC' || args[0] === 'USDT_ETH' || args[0] === 'USDT_ZEC' || args[0] === 'USDT_BCH' ||
        args[0] === 'BTC_ETH' || args[0] === 'BTC_ZEC' || args[0] === 'BTC_BCH' ||
        args[0] === 'ETH_BCH' || args[0] === 'ETH_ZEC') {
      var pair = args[0];
      if (tickersData[pair] == undefined) {
        tickersData[pair] = {};
        console.log('Received ticker data:' + pair);
      }
      tickersData[pair].pair = pair;
      tickersData[pair].last = args[1];
      tickersData[pair].ask = args[2];
      tickersData[pair].bid = args[3];
      tickersData[pair].change = args[4];
      tickersData[pair].volume = args[5];
      tickersData[pair].frozen = args[7];
      tickersData[pair].highest = args[8];
      tickersData[pair].lowest = args[9];
      tickersData[pair].updatetime = new Date();

      routineUpdatetime = tickersData[pair].updatetime;
      //console.log(args);
    }
  }
  function marketEvent(args, kwargs) {
    //console.log('market:' + args);
  }
  function trollboxEvent(args, kwargs) {
    //console.log('trollbox:' + args);
  }
  
  session.subscribe('ticker', tickerEvent);
  //session.subscribe('USDT_BTC', marketEvent);
  //session.subscribe('trollbox', trollboxEvent);
  // Subscribe currently seems not work fine, use public API instead
  httpsGetTickers();
  
  console.log('Set interval routine check update each minute')
  // Reset routineUpdatetime and set interval check update
  routineUpdatetime = undefined;
  // Change to use public API get tickers data for each 5 minutes
  routineInterval = setInterval(routineCheckUpdate, 5 * 60 * 1000);
}

connection.onclose = function() {
  console.log('Poloniex websocket connection closed');
  console.log('Reopen connection in 5 seconds');
  //Poloniex connection may still opened or opening
  //Uses promise checking connection success or fail
  setTimeout(function() {
    connection.open();
  }, 5 * 1000);
}

console.log('Poloniex module has been loaded');
//connection.open();
