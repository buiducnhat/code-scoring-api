'use strict'

const mysql = require('mysql')

const check_permission = (mysql_db, permission) => async (req, res, next) => {
    try {
        const {user_id} = req

        const query = `
            SELECT *
            FROM permission_has_role AS rp
            JOIN permission AS p ON p.id = rp.permission_id
            JOIN role AS r ON r.id = rp.role_id
            JOIN user AS u ON u.role_id = rp.role_id
            WHERE u.id = ${mysql.escape(user_id)}
            AND p.title = ${mysql.escape(permission)}
        `

        const result = await mysql_db.p_query(query)
        if (result.length > 0) {
            return next()
        } else {
            logger.error(`[check_permission] err: You don't have this permission`)
            return res.status(401).json({success: false, message: `Không có quyền truy cập`})
        }
    } catch (error) {
        logger.error(`[check_permission] err: `, error)
        if (error.sqlMessage) {
            return res.status(500).json({success: false, message: error.sqlMessage})
        } else {
            return res.status(500).json({success: false, message: `Lỗi từ phía máy chủ`})
        }
    }
}

module.exports = Object.assign({}, {check_permission})
