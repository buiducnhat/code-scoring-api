'use strict';

const express = require('express');

const { PERMISSION, EXERCISE_STATUS } = require('../../config/constants');
const { verifyToken, checkBody, checkPermission, multerUpload } = require('../../middlewares/');
const MysqlDB = require('../../model/mysql');
const ResultController = require('../../controllers/result/result.controller');

const mysqlDb = new MysqlDB();
const resultController = new ResultController(mysqlDb);
const resultApi = express.Router();

resultApi.get('/user', verifyToken, (req, res) => {
  const { userId } = req;
  resultController
    .getResultsByUser({ userId })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error }));
});

resultApi.get('/user/exercise/:exerciseId', verifyToken, (req, res) => {
  const { userId } = req;
  const { exerciseId } = req.params;
  resultController
    .getResultOfExerciseByUSer({ userId, exerciseId })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error }));
});

module.exports = resultApi;
