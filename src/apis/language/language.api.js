'use strict';

const express = require('express');

const { verifyToken, checkBody, checkPermission } = require('../../middlewares/');
const MysqlDB = require('../../model/mysql');
const LanguageController = require('../../controllers/language/language.controller');

const mysqlDb = new MysqlDB();
const languageController = new LanguageController(mysqlDb);
const languageApi = express.Router();

languageApi.get('/', (req, res) => {
  languageController
    .getAll()
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error }));
});

module.exports = languageApi;
