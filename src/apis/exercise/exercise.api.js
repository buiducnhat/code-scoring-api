'use strict';

const express = require('express');

const { PERMISSION, EXERCISE_STATUS, RUN_SUBMIT_EXERCISE_TYPE } = require('../../config/constants');
const {
  verifyToken,
  verifyTokenNotRequired,
  checkBody,
  checkPermission,
  multerUpload,
} = require('../../middlewares/');
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

exerciseApi.get('/detail/:exerciseId', verifyTokenNotRequired, (req, res) => {
  const { userId } = req;
  const { exerciseId } = req.params;
  exerciseController
    .getExerciseDetail({ userId, exerciseId })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

exerciseApi.post(
  '/run/:exerciseId',
  verifyToken,
  multerUpload.codeUpload.single('code'),
  (req, res) => {
    const { userId } = req;
    const codeFile = req?.file;
    const { exerciseId } = req.params;
    const { scriptCode, languageId } = req.body;

    if (!codeFile) {
      return res.status(500).json({ message: 'Không tìm thấy file' });
    }

    exerciseController
      .runOrSubmitExercise({
        exerciseId,
        userId,
        scriptCode,
        codeFilePath: codeFile.path,
        languageId,
        typeRunOrSubmit: RUN_SUBMIT_EXERCISE_TYPE.run,
      })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

exerciseApi.post(
  '/submit/:exerciseId',
  verifyToken,
  multerUpload.codeUpload.single('code'),
  (req, res) => {
    const { userId } = req;
    const codeFile = req?.file;
    const { exerciseId } = req.params;
    const { scriptCode, languageId } = req.body;

    if (!codeFile) {
      return res.status(500).json({ message: 'Không tìm thấy file' });
    }

    exerciseController
      .runOrSubmitExercise({
        exerciseId,
        userId,
        scriptCode,
        codeFilePath: codeFile.path,
        languageId,
        typeRunOrSubmit: RUN_SUBMIT_EXERCISE_TYPE.submit,
      })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

exerciseApi.put(
  '/update/:exerciseId',
  verifyToken,
  checkPermission(mysqlDb, PERMISSION.updateExercise),
  checkBody(['title', 'content', 'point', 'testCases', 'languages']),
  (req, res) => {
    const createdBy = req?.userId;
    const { exerciseId } = req.params;
    const { title, content, point, testCases, status, languages } = req.body;

    exerciseController
      .updateExercise({
        exerciseId,
        title,
        content,
        point,
        createdBy,
        testCases,
        status: status || EXERCISE_STATUS.hiden,
        languages,
      })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

exerciseApi.post(
  '/status/:exerciseId',
  verifyToken,
  checkPermission(mysqlDb, PERMISSION.updateExercise),
  checkBody(['status']),
  (req, res) => {
    const { exerciseId } = req.params;
    const { status } = req.body || EXERCISE_STATUS.hiden;

    exerciseController
      .updateExerciseStatus({ exerciseId, status })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

module.exports = exerciseApi;
