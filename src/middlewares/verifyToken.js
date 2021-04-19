'use strict';

const jwt = require('jsonwebtoken');

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
      return res.status(403).json({ message: 'Not authenticated' });
    }
    req.userId = decoded.userId;
    next();
  });
};

const verifyTokenNotRequired = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return next();
  }
  if (authorization.indexOf('Bearer ') !== 0) {
    return next();
  }

  const token = authorization.replace('Bearer ', '');

  const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test';
  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return next();
    }
    req.userId = decoded.userId;
    next();
  });
};

module.exports = Object.assign({}, { verifyToken, verifyTokenNotRequired });
