'use strict';

const mysql = require('mysql');

const logger = require('../../logger');

class LanguageController {
  constructor(mysqlDb) {
    this.mysqlDb = mysqlDb;
  }

  getAll() {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `
					SELECT * FROM language
				`;
        const languagesFounded = await this.mysqlDb.poolQuery(query);

        return resolve(languagesFounded);
      } catch (error) {
        logger.error(`[language.controller][getAll] error:`, error);
        reject(error?.sqlMessage || error);
      }
    });
  }
}

module.exports = LanguageController;
