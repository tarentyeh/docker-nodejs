'use strict';

const postgres = require('./postgres.js');

postgres.getUser('test', function(error, data) {
  if (error != null) {
    console.log(error);
    return;
  }
  console.log(data);
  data.hasNotification = false;
  data.notificationTime = '';
  console.log(data);
  postgres.updateUser(data.sourceId, data.hasNotification, data.notificationTime);
});

postgres.getUser('aabb', function(error, data) {
  if (error != null) {
    console.log(error);
    postgres.setUser('aabb', true, new Date().toISOString());
    return;
  }
  console.log(data);
});

//const bitfinex = require('./bitfinex');
//bitfinex.init();
//bitfinex.start();

//const pubRest = new bitfinex('','');

//function HttpsGetTickers() {
//  pubRest.ticker('iotusd', function(error, data) {
//    console.log(data);
//  });
//  pubRest.ticker('iotbtc', function(error, data) {
//    console.log(data);
//  });
//}

//function routineCheckUpdate() {
//  console.log('routine check update', new Date().toISOString());
//  HttpsGetTickers();
//}

//setInterval(routineCheckUpdate, 10 * 1000);