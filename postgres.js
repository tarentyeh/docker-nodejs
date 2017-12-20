const promise = require('bluebird');
const initOptions = {
  promiseLib: promise
};
const pgp = require('pg-promise')(initOptions);
const config = {
  host: 'postgres-db',
  port: 5432,
  database: 'example_database',
  user: 'postgres',
  password: 'example'
};
const pgUri = 'postgres://postgres:example@postgres-db:5432/example_database';

const db = pgp(config);

console.log('connect to pgp');

//db.any('SELECT * FROM "user" WHERE "name" LIKE $1', ['%am%'])
//db.any('SELECT * FROM "user" LIMIT 50', ['%am%'])
//  .then((data) => {
//    console.log(data);
//  })
//  .catch((error) => {
//    console.log(error);
//  })
//  //.finally(db.$pool.end);

function getAllUsers(cb) {
  db.any('SELECT * FROM "users" LIMIT 500', ['%'])
    .then((data) => {
      cb(null, data);
    })
    .catch((error) => {
      cb(error, null);
    })
    //.finally(db.$pool.end);
}

function getUser(sourceId, cb) {
  db.one('SELECT * FROM "users" WHERE "sourceId" LIKE $1', [sourceId])
    .then((data) => {
      cb(null, data);
    })
    .catch((error) => {
      cb(error, null);
    })
    //.finally(db.$pool.end);
}

function setUser(sourceId, hasNotification, notificationTime) {
  db.query('INSERT INTO "users" ("sourceId", "hasNotification", "notificationTime") VALUES ($1, $2, $3)', [sourceId, hasNotification, notificationTime])
    .then((result) => { console.log(result) })
    .catch((error) => { console.log(error) })
    //.finally(db.$pool.end);
}

function updateUser(sourceId, hasNotification, notificationTime) {
  db.query('UPDATE "users" SET "hasNotification" = $2, "notificationTime" = $3 WHERE "sourceId" LIKE $1', [sourceId, hasNotification, notificationTime])
    .then((result) => { console.log(result) })  
    .catch((error) => { console.log(error) })
    //.finally(db.$pool.end);
}

module.exports = {
  getUser,
  setUser,
  updateUser
};
