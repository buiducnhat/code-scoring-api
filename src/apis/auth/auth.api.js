'use strict';

const express = require('express');

const { verifyToken } = require('../../middlewares/verifyToken');
const { checkBody } = require('../../middlewares/checkBody');
const MysqlDB = require('../../model/mysql');
const AuthController = require('../../controllers/auth/auth.controller');
const { ROLE_ID, USER_STATUS } = require('../../config/constants');

const mysqlDb = new MysqlDB();
const authController = new AuthController(mysqlDb);
const authApi = express.Router();

authApi.post('/register', checkBody(['name', 'email', 'password']), (req, res) => {
  const { name, email, password, avatar } = req.body;

  authController
    .checkExistedUser({ email })
    .then((result1) => {
      authController
        .register({
          email,
          name,
          password,
          avatar,
          roleId: ROLE_ID.user,
          is_delete: USER_STATUS.active,
        })
        .then((result2) => {
          return res.status(200).json(result2);
        })
        .catch((error) =>
          res.status(error?.status || 500).json({ message: error?.message || error })
        );
    })
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

authApi.post('/login', checkBody(['email', 'password']), (req, res) => {
  const { email, password } = req.body;

  authController
    .login({ email, password })
    .then((result) => res.status(200).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

authApi.get('/info', verifyToken, (req, res) => {
  authController
    .getInfo({ userId: req?.userId })
    .then((result) => res.status(500).json(result))
    .catch((error) => res.status(error?.status || 500).json({ message: error?.message || error }));
});

module.exports = authApi;
