'use strict';

const env = process.env.NODE_ENV || 'development'; // dev or prod
console.log('ENV: ', env);

const development = {
  dbSettings: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'gerpan',
    password: process.env.DB_PASS || 'Devzone2021@',
    database: process.env.DB_DBNAME || 'code_scoring',

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  serverSettings: {
    port: process.env.SERVER_PORT || 8888,
  },
};

const production = {
  dbSettings: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DBNAME,

    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },

  serverSettings: {
    port: process.env.SERVER_PORT,
  },
};

const config = {
  development,
  production,
};

module.exports = Object.assign({}, config[env]);
