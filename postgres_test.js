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
var conn = 'postgres://postgres:example@postgres-db:5432/example_database';

const db = pgp(config);

console.log('connect to pgp');

db.any('SELECT * FROM "user" WHERE "name" LIKE $1', ['%am%'])
	.then((data) => {
		console.log(data);
	})
	.catch((error) => {
		console.log(error);
	})
	.finally(db.$pool.end);
