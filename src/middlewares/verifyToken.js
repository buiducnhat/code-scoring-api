'use strict';

const jwt = require('jsonwebtoken');
require('dotenv').config();

const verifyToken = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(403).json({
      message: 'Token is required',
    });
  }
  if (authorization.indexOf('Bearer ') !== 0) {
    return res.status(401).json({
      message: 'Bearer token is required',
    });
  }

  const token = authorization.replace('Bearer ', '');

  const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test';
  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(403)
        .json({ success: false, message: 'Not authenticated' });
    }
    req.userId = decoded.userId;
    next();
  });
};

module.exports = Object.assign({}, { verifyToken });
