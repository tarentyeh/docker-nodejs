'use strict';

const lineBot = require('@line/bot-sdk');
const express = require('express');
const lineException = require('@line/bot-sdk/exceptions');
const events = require('events');
const eventHandler = new events();

var poloniex;
var bitfinex;
var postgres;

// create LINE SDK config from env variables
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// create LINE SDK client
const client = new lineBot.Client(config);

// create Express app
// about Express itself: https://expressjs.com/
const app = express();

// register a webhook handler with middleware
// about the middleware, please refer to doc
app.post('/webhook', lineBot.middleware(config), (req, res) => {
  Promise
    .all(req.body.events.map(handleEvent))
    .then((result) => res.json(result));
});

app.use((err, req, res, next) => {
  if (err instanceof lineException.SignatureValidationFailed) {
    res.status(401).send(err.signature);
    return;
  } else if (err instanceof lineException.JSONParseError) {
    res.status(400).send(err.raw);
    return;
  }
  next(err);
});

// event handler
function handleEvent(event) {
  switch (event.type) {
    case 'message':
      return handleMessage(event);
      break;
    case 'follow':
      return handleFollow(event);
      break;
    default:
      return Promise.resolve(null);
  }
}

function handleFollow(event) {
  if (event.type !== 'follow') {
    return Promise.resolve(null);
  }
  const sourceId = resolveSourceId(event);
  eventHandler.emit('followReceived', sourceId);
  const reply = {
    type: 'text',
    text: 'follow[' + event.source.type + ',' + sourceId + ']'
  }

  return client.replyMessage(event.replyToken, reply)
    .then(() => {
      const notify = {
        type: 'text',
        text: 'follow[' + event.source.type + ',' + sourceId + ']'
      }
      // notify owner there has user followed bot
      client.pushMessage('U2b1c2b57e07b28577d1fde2f6da0b661', notify);
    })
    .catch((err) => {
      console.log('handleFollow.replyMessage err:', err);
    });
}

function handleMessage(event) {
  if (event.type !== 'message') {
    return Promise.resolve(null);
  }
  const sourceId = resolveSourceId(event);
  var logText = `${sourceId}[${event.source.type}]`;
  // build reply message
  const reply = {
    type: 'text',
    text: ''
  };
  if (event.message.type === 'text') {
    console.log(`${logText} text:${event.message.text}`);
    eventHandler.emit('textReceived', sourceId, event.message.text);
    reply.text = resolveMessageText(sourceId, event.message.text);
  }
  if (event.message.type === 'sticker') {
    reply.text = `sticker[${event.message.packageId},${event.message.stickerId}]`;
  }

  if (reply.text != undefined && reply.text !== '') {
    return client.replyMessage(event.replyToken, reply)
      .catch((err) => {
        console.log('handleMessage.replyMessage err:', err);
      });
  }
  else {
    return Promise.resolve(null);
  }
}

function resolveSourceId(event) {
  var sourceId;
  switch (event.source.type) {
    case 'room':
      sourceId = event.source.roomId;
      break;
    case 'group':
      sourceId = event.source.groupId;
      break;
    default:
      sourceId = event.source.userId;
  }
  return sourceId;
}

const users = {};
function loadLineUsers() {
  // Preload registed users from postgres database
  postgres.getAllUsers((error, data) => {
    if (error == null) {
      for(let key in data) {
        let sourceId = data[key].sourceId;
        let hasNotification = data[key].hasNotification;
        if (users[sourceId] == undefined) {
          users[sourceId] = {};
        }
        if (users[sourceId].notification == undefined && hasNotification == true) {
          users[sourceId].notification = setInterval(pushNotification, 30 * 60 * 1000, sourceId);
          users[sourceId].notificationTime = new Date();
        }
        console.log('Load user:' + sourceId + " has notification:" + hasNotification);
      }
    } else {
      console.log(error);
    }
  });
}

function resolveMessageText(sourceId, messageText) {
  if (sourceId == undefined) {
    return undefined;
  }
  // initialize users for each source id
  if (users[sourceId] == undefined) {
    users[sourceId] = {};
    // access to postgres database
    postgres.getUser(sourceId, (error, data) => {
      if (error != null && error.code === postgres.errorCode.noData) {
        postgres.setUser(sourceId, false, '');
      }
    });
  }

  var replyText;
  switch (messageText.toLowerCase())
  {
    case 'zec':
    case 'btc':
    case 'eth':
    case 'bch':
      replyText = poloniex.getCurrencyInfo(messageText);
      console.log(`get currency info:${replyText}`);
      break;
    case 'iot':
    case 'iota':
      replyText = bitfinex.getCurrencyInfo('iot');
      console.log(`get currency info:${replyText}`);
      break;
    case 'notify':
      if (users[sourceId].notification == undefined) {
        users[sourceId].notification = setInterval(pushNotification, 30 * 60 * 1000, sourceId);
        replyText = 'start receiving notification';
        replyText += '\n';
        replyText += getAllCurrencyInfo();
        users[sourceId].notificationTime = new Date();
        // Update user setting to database, carefull about writing delay in callback
        postgres.setUser(sourceId, true, users[sourceId].notificationTime);
      } else {
        clearInterval(users[sourceId].notification);
        replyText = 'stop receiving notification';
        postgres.setUser(sourceId, false, '');
      }
      console.log(`notification changed:${sourceId}`);
      break;
    default:
  }

  return replyText;
}

function getAllCurrencyInfo() {
  var text;
  // Currently poloniex uses public API get all currency info at one time,
  // just makes first currency has timestamp.
  text = poloniex.getCurrencyInfo('btc') + '\n';
  text += poloniex.getCurrencyInfo('zec', false) + '\n';
  text += poloniex.getCurrencyInfo('eth', false) + '\n';
  text += poloniex.getCurrencyInfo('bch', false) + '\n';
  text += bitfinex.getCurrencyInfo('iot');
  return text;
}

function pushNotification(sourceId) {
  var notify = {
    type: 'text',
    text: ''
  }
  notify.text = getAllCurrencyInfo();
  client.pushMessage(sourceId, notify);
  users[sourceId].notificationTime = new Date();
}

module.exports = {
  handler: eventHandler,
  init: (poloniexModule, bitfinexModule, postgresModule) => {
    poloniex = poloniexModule;
    bitfinex = bitfinexModule;
    postgres = postgresModule;
  },
  start: (port) => {
    if (poloniex == undefined || bitfinex == undefined || postgres == undefined) {
      console.log('The line module must be done init with valid modules before start');
      return;
    }
    loadLineUsers();
    port = port || 8088;
    app.listen(port, () => {
      console.log(`listening on ${port}`);
    });
  },
};

// Modify to do as module
//// listen on port
//const port = process.env.PORT || 8088;
//app.listen(port, () => {
//  console.log(`listening on ${port}`);
//  loadAllUsers();
//  poloniex.init();
//  poloniex.start();
//  bitfinex.init();
//  bitfinex.start();
//});
