const util = require('util');
const mysql = require('mysql');

const { dbSettings } = require('../../config');
const logger = require('../../logger');

class MysqlDB {
  constructor() {
    this.connection = mysql.createConnection({
      host: dbSettings.host,
      user: dbSettings.user,
      password: dbSettings.password,
      database: dbSettings.database,
    });

    this.pool = mysql.createPool({
      connectionLimit: 32,
      host: dbSettings.host,
      user: dbSettings.user,
      password: dbSettings.password,
      database: dbSettings.database,
    });
  }

  create_connection() {
    this.connection = mysql.createConnection({
      host: dbSettings.host,
      user: dbSettings.user,
      password: dbSettings.password,
      database: dbSettings.database,
    });
  }

  reconnect() {
    //- Destroy the current connection variable
    if (this.connection) this.connection.destroy();

    //- Create a new one
    this.connection = mysql.createConnection({
      host: dbSettings.host,
      user: dbSettings.user,
      password: dbSettings.password,
      database: dbSettings.database,
    });

    //- Try to reconnect
    this.connection.connect((err) => {
      if (err) {
        //- Try to connect every 2 seconds.
        setTimeout(reconnect, 2000);
      } else {
        logger.info(
          '\n\t *** Reconnection successfully. New connection established with the database. ***'
        );
      }
    });
  }

  beginTransaction() {
    return util.promisify(this.connection.beginTransaction).call(this.connection);
  }

  poolQuery(sql) {
    return util.promisify(this.pool.query).call(this.pool, sql);
  }

  query(sql) {
    return util.promisify(this.connection.query).call(this.connection, sql);
  }

  commit() {
    return util.promisify(this.connection.commit).call(this.connection);
  }

  rollback() {
    return util.promisify(this.connection.rollback).call(this.connection);
  }

  close() {
    return util.promisify(this.connection.end).call(this.connection);
  }
}

module.exports = MysqlDB;
