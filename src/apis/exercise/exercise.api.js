'use strict';

const express = require('express');

const { PERMISSION, EXERCISE_STATUS } = require('../../config/constants');
const { verifyToken, checkBody, checkPermission, multerUpload } = require('../../middlewares/');
const MysqlDB = require('../../model/mysql');
const ExerciseController = require('../../controllers/exercise/exercise.controller');

const mysqlDb = new MysqlDB();
const exerciseController = new ExerciseController(mysqlDb);
const exerciseApi = express.Router();

exerciseApi.post(
  '/create',
  verifyToken,
  checkPermission(mysqlDb, PERMISSION.createExercise),
  checkBody(['title', 'content', 'point', 'testCases', 'languages']),
  (req, res) => {
    const { userId } = req;
    const { title, content, point, testCases, languages } = req.body;

    exerciseController
      .createExercise({
        title,
        content,
        point,
        createdBy: userId,
        status: EXERCISE_STATUS.hiden,
        testCases,
        languages,
      })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

exerciseApi.get('/list', (req, res) => {
  const { page, pageSize, title, order } = req.query;
  exerciseController
    .listExercise({ page, pageSize, title, orderType: order })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

exerciseApi.get('/detail/:exerciseId', (req, res) => {
  const { exerciseId } = req.params;
  exerciseController
    .getExerciseDetail({ exerciseId })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

exerciseApi.post('/submit/:exerciseId', verifyToken, multerUpload.single('code'), (req, res) => {
  const { userId } = req;
  const codeFile = req?.file;
  const { exerciseId } = req.params;
  const { scriptCode, languageId } = req.body;

  if (!codeFile) {
    return res.status(500).json({ message: 'Không tìm thấy file' });
  }

  exerciseController
    .submitExercise({
      exerciseId,
      userId,
      scriptCode,
      codeFilePath: codeFile.path,
      languageId,
    })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

module.exports = exerciseApi;
