'use strict';

const { checkBody } = require('./checkBody');
const { checkPermission } = require('./checkPermission');
const { verifyToken } = require('./verifyToken');
const multerUpload = require('./multerUpload');

module.exports = Object.assign({}, { checkBody, checkPermission, verifyToken, multerUpload });
