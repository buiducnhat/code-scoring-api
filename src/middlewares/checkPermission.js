'use strict';

const mysql = require('mysql');

const logger = require('../logger');

const checkPermission = (mysqlDb, permission) => async (req, res, next) => {
  try {
    const { userId } = req;

    const query = `
      SELECT *
      FROM role_has_permission AS rp
      JOIN permission AS p ON p.permission_id = rp.permission_id
      JOIN role AS r ON r.role_id = rp.role_id
      JOIN user AS u ON u.role_id = rp.role_id
      WHERE u.user_id = ${mysql.escape(userId)}
      AND p.title = ${mysql.escape(permission)}
    `;

    const result = await mysqlDb.poolQuery(query);
    if (result.length > 0) {
      return next();
    } else {
      logger.error(`[middlewares][checkPermission] error: You don't have this permission`);
      return res.status(401).json({ message: `Không có quyền truy cập` });
    }
  } catch (error) {
    logger.error(`[middlewares][checkPermission] error:`, error);

    if (error.sqlMessage) {
      return res.status(500).json({ message: error.sqlMessage });
    } else {
      return res.status(500).json({ message: `Lỗi từ phía máy chủ` });
    }
  }
};

module.exports = Object.assign({}, { checkPermission });
