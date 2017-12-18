'use strict';

const lineBot = require('@line/bot-sdk');
const express = require('express');
const lineException = require('@line/bot-sdk/exceptions');

const poloniex = require('./poloniex');
const helper = require('./helper');

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

  const reply = {
    type: 'text',
    text: 'follow[' + event.source.type + ',' + event.source.userId + ']'
  }

  return client.replyMessage(event.replyToken, reply)
    .then(() => {
      const notify = {
        type: 'text',
        text: 'follow[' + event.source.type + ',' + event.source.userId + ']'
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

  var reply = null;
  var sourceId = event.source.userId;
  if (event.message.type === 'text') {
    var logText = event.source.userId + '[' + event.source.type + '] text:' + event.message.text;
    if (event.source.type === 'room') {
      sourceId = event.source.roomId;
      logText = event.source.roomId + ',' + logText;
    }
    else if (event.source.type === 'group') {
      sourceId = event.source.groupId;
      logText = event.source.groupId + ',' + logText;
    }
    console.log(logText);

    reply = handleText(sourceId, event.message.text);
  }
  if (event.message.type === 'sticker') {
    console.log(event.source.userId + '[' + event.source.type + ']' +
      ' pid:' + event.message.packageId + ' sid:' + event.message.stickerId);
    reply = {
      type: 'text',
      text: 'sticker[' + event.message.packageId + ',' + event.message.stickerId + ']'
    };
  }

  if (reply !== null) {
    return client.replyMessage(event.replyToken, reply)
      .catch((err) => {
        console.log('handleMessage.replyMessage err:', err);
      });
  }
  else {
    return Promise.resolve(null);
  }
}

var textConfig = {};
function handleText(sourceId, messageText) {
  if (sourceId == undefined) {
    return null;
  }
  // initialize config for each source id
  if (textConfig[sourceId] == undefined)
    textConfig[sourceId] = {};

  var reply = { type: 'text' };
  if (messageText === 'zec' || messageText === 'btc' || messageText === 'eth' || messageText === 'bch') {
    reply.text = poloniex.getCurrencyInfo(messageText);
    console.log('getCurrencyInfo:' + reply.text);
  } else if (messageText === 'notify start') {
    textConfig[sourceId].user = sourceId;
    if (textConfig[sourceId].notify != undefined) {
      clearInterval(textConfig[sourceId].notify);
      textConfig[sourceId].notify = undefined;
    }
    textConfig[sourceId].notify = setInterval(pushNotifyFunc, 30 * 60 * 1000);
    console.log('textConfig notify changed:' + textConfig[sourceId].user);
    reply.text = '開始接收通知';
  } else if (messageText === 'notify stop') {
    textConfig[sourceId].user = sourceId;
    if (textConfig[sourceId].notify != undefined) {
      clearInterval(textConfig[sourceId].notify);
      textConfig[sourceId].notify = undefined;
    }
    console.log('textConfig notify changed:' + textConfig[sourceId].user);
    reply.text = '停止接收通知';
  }
  /*else if (messageText === 'stop echo') {
    textConfig[sourceId].user = sourceId;
    textConfig[sourceId].echo = false;
    console.log('textConfig echo change:' + textConfig);
    reply.text = '啊嗚啊嗚！';
  } else if (messageText === 'start echo') {
    textConfig[sourceId].user = sourceId;
    textConfig[sourceId].echo = true;
    console.log('textConfig echo change:' + textConfig);
    reply.text = '喔耶喔耶！';
  } else if (textConfig[sourceId] == undefined || textConfig[sourceId].echo == undefined ||
    textConfig[sourceId].echo === true) {
    reply.text = messageText;
  }*/

  if (reply.text == undefined || reply.text == '') {
    return null;
  } else {
    return reply;
  }
}

function pushNotifyFunc() {
  for (var id in textConfig) {
    if (textConfig.hasOwnProperty(id) === false || textConfig[id].user == undefined) {
      continue;
    }
    if (textConfig[id].notify == undefined || textConfig[id].notify === false) {
      continue
    }
    var notification = {
      type: 'text',
      text: ''
    }
    notification.text = poloniex.getCurrencyInfo('btc') + '\n';
    notification.text += poloniex.getCurrencyInfo('zec') + '\n';
    notification.text += poloniex.getCurrencyInfo('eth') + '\n';
    notification.text += poloniex.getCurrencyInfo('bch');
    client.pushMessage(textConfig[id].user, notification);
  }
}

// listen on port
const port = process.env.PORT || 8088;
app.listen(port, () => {
  console.log(`listening on ${port}`);
  poloniex.open();
});
