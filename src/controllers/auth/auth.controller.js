'use strict';

const bcrypt = require('bcryptjs');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');

const { USER_STATUS } = require('../../config/constants');
const logger = require('../../logger');

class AuthController {
  constructor(mysqlDb) {
    this.mysqlDb = mysqlDb;
  }

  checkExistedUser({ email }) {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `
          SELECT * FROM user
          WHERE email = ${mysql.escape(email)}
          LIMIT 1
        `;
        const userFounded = await this.mysqlDb.poolQuery(query);

        if (userFounded.length > 0) {
          return reject(`Email đã được sử dụng`);
        }
        return resolve();
      } catch (error) {
        logger.error(`[auth.controller][checkExistedUser] error:`, error);
        return reject(error);
      }
    });
  }

  register({ email, name, password, avatar, roleId, is_delete }) {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = bcrypt.hashSync(password, 8);
        avatar =
          avatar || `https://ui-avatars.com/api/?size=128&name=${mysql.escape(name).split(`'`)[1]}`;

        const query = `
          INSERT INTO user(email, name, password, avatar, role_id, is_delete)
          VALUES(
            ${mysql.escape(email)},
            ${mysql.escape(name)},
            ${mysql.escape(hashedPassword)},
            ${mysql.escape(avatar)},
            ${mysql.escape(roleId)},
            ${mysql.escape(is_delete)}
          )
        `;

        const result = await this.mysqlDb.poolQuery(query);
        const userId = result.insertId;

        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test';
        const accessToken = jwt.sign({ userId: userId }, JWT_SECRET_KEY, {
          expiresIn: '1d',
        });

        return resolve({
          accessToken,
          payload: {
            userId: result.insertId,
            email,
            name,
            avatar,
            roleId,
          },
        });
      } catch (error) {
        logger.error(`[auth.controller][register] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  login({ email, password }) {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `
          SELECT * FROM user
          WHERE email = ${mysql.escape(email)}
          LIMIT 1
        `;
        const usersFounded = await this.mysqlDb.poolQuery(query);

        if (usersFounded.length !== 1) {
          return reject({ status: 404, message: 'Email không tồn tại' });
        }

        const userFounded = usersFounded[0];

        if (!bcrypt.compareSync(password, userFounded.password)) {
          return reject({ status: 401, message: 'Mật khẩu không chính xác' });
        }

        if (userFounded.is_delete === USER_STATUS.freezed) {
          return reject({
            status: 401,
            message: 'Tài khoản hiện không thể đăng nhập, liên hệ Admin để biết thêm chi tiết',
          });
        }

        const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'test';
        const accessToken = jwt.sign({ userId: userFounded.user_id }, JWT_SECRET_KEY, {
          expiresIn: '1d',
        });

        delete userFounded['password'];

        return resolve({
          accessToken,
          payload: userFounded,
        });
      } catch (error) {
        logger.error(`[auth.controller][login] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  getInfo({ userId }) {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `
          SELECT u.user_id, u.name, u.avatar, u.role_id, u.is_delete, GROUP_CONCAT(p.title)
          FROM user AS u
          JOIN role AS r ON u.role_id = r.role_id
          JOIN role_has_permission AS rhp ON r.role_id = rhp.role_id
          JOIN permission AS p ON rhp.permission_id = p.permission_id
          GROUP BY u.user_id
          WHERE u.user_id = ${userId}
        `;

        const usersFounded = await this.mysqlDb.poolQuery(query);
        if (!usersFounded.length) {
          return reject({ status: 404, message: 'Không tìm thấy tài khoản' });
        }

        const userFounded = usersFounded[0];
        delete userFounded['password'];

        return resolve(userFounded);
      } catch (error) {
        logger.error(`[auth.controller][getInfo] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }
}

module.exports = AuthController;
