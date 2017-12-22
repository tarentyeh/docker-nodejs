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
  db.any('SELECT * FROM "users" LIMIT 500', [])
    .then((data) => {
      cb(null, data);
    })
    .catch((error) => {
      cb(error, null);
    })
    //.finally(db.$pool.end);
}

function getUser(sourceId, cb) {
  db.one('SELECT * FROM "users" WHERE "sourceId" = $1', [sourceId])
    .then((data) => {
      cb(null, data);
    })
    .catch((error) => {
      cb(error, null);
    })
    //.finally(db.$pool.end);
}

function setUser(sourceId, hasNotification, notificationTime) {
  getUser(sourceId, (error, data) => {
    let queryString;
    if (error != null) {
      if (error.code === pgp.errors.queryResultErrorCode.noData) {
        console.log('user not exists, use insert query');
        queryString = 'INSERT INTO "users" ("sourceId", "hasNotification", "notificationTime") VALUES ($1, $2, $3)';
      } else {
        console.log(error);
      }
    } else {
      console.log('user exists, use update query');
      queryString = 'UPDATE "users" SET "hasNotification" = $2, "notificationTime" = $3 WHERE "sourceId" LIKE $1';
    }
    db.query(queryString, [sourceId, hasNotification, notificationTime])
      .catch((error) => {
        console.log('setUser:', error);
      })
  });
}

module.exports = {
  getAllUsers,
  getUser,
  setUser,
  errorCode: pgp.errors.queryResultErrorCode,
  poolEnd: () => {
    db.$pool.end;
  },
  end: () => {
    pgp.end();
  }
};
