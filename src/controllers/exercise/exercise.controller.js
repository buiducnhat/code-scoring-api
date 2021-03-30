'use strict';

const mysql = require('mysql');
const axios = require('axios').default;

const logger = require('../../logger');
const { ORDER_TYPE } = require('../../config/constants');
const compilerConfig = require('../../config/jdoodle');
const { convertJsonScript } = require('../../utils/convertJsonScript');
const fs = require('fs/promises')
class ExerciseController {
  constructor(mysqlDb) {
    this.mysqlDb = mysqlDb;
  }

  createExercise({ title, content, point, createdBy, status, testCases, languages }) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.mysqlDb.beginTransaction();

        let query = ``;

        query = `
          INSERT INTO exercise(title, content, point, created_by, status)
          VALUES(
            ${mysql.escape(title)},
            ${mysql.escape(content)},
            ${mysql.escape(point)},
            ${mysql.escape(createdBy)},
            ${mysql.escape(status)}
          )
        `;

        const insertExerciseResult = await this.mysqlDb.query(query);
        const exerciseId = insertExerciseResult.insertId;

        // Insert into table exercise_has_language
        let exerciseLanguageValue = ``;
        languages.forEach((languageId, index) => {
          if (index !== languages.length - 1) {
            exerciseLanguageValue += `(${mysql.escape(exerciseId)}, ${mysql.escape(languageId)}), `;
          } else {
            exerciseLanguageValue += `(${mysql.escape(exerciseId)}, ${mysql.escape(languageId)})`;
          }
        });

        query = `
          INSERT INTO exercise_has_language(exercise_id, language_id)
          VALUES ${exerciseLanguageValue}
        `;
        await this.mysqlDb.query(query);

        // Insert test cases
        let testCasesValue = ``;
        testCases.forEach((testCase, index) => {
          if (index !== testCases.length - 1) {
            testCasesValue += `(${mysql.escape(index + 1)},${mysql.escape(
              testCase.input
            )}, ${mysql.escape(testCase.output)},${mysql.escape(
              testCase?.limitedTime
            )}, ${mysql.escape(exerciseId)}), `;
          } else {
            testCasesValue += `(${mysql.escape(index + 1)},${mysql.escape(
              testCase.input
            )}, ${mysql.escape(testCase.output)},${mysql.escape(
              testCase?.limitedTime
            )}, ${mysql.escape(exerciseId)})`;
          }
        });

        query = `
          INSERT INTO test_case(test_case_index, input, output, limited_time, exercise_id)
          VALUES ${testCasesValue}
        `;
        await this.mysqlDb.query(query);

        await this.mysqlDb.commit();

        return resolve({
          exerciseId,
          title,
          content,
          point,
          createdBy,
          status,
          testCases,
          languages,
        });
      } catch (error) {
        await this.mysqlDb.rollback();
        logger.error(`[exercise.controller][createExercise] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  listExercise({ page, pageSize, title, orderType }) {
    return new Promise(async (resolve, reject) => {
      try {
        page = parseInt(page) || 1;
        pageSize = parseInt(pageSize) || 10;
        orderType = parseInt(orderType) || null;
        const offset = (page - 1) * pageSize;

        let orderTypeString = ``;
        switch (orderType) {
          case ORDER_TYPE.nameASC:
            orderTypeString = `title ASC`;
            break;
          case ORDER_TYPE.nameDESC:
            orderTypeString = `title DESC`;
            break;
          case ORDER_TYPE.timeASC:
            orderTypeString = `created_at ASC`;
            break;
          case ORDER_TYPE.timeDESC:
            orderTypeString = `created_at DESC`;
            break;
          case ORDER_TYPE.pointASC:
            orderTypeString = `point ASC`;
            break;
          case ORDER_TYPE.pointDESC:
            orderTypeString = `point DESC`;
          default:
            orderTypeString = `created_at DESC`;
        }

        const titleFilterQuery = title ? `WHERE title LIKE '%${title}%'` : '';
        let query = `
          SELECT e.exercise_id, e.title, e.content, e.point, e.created_by, e.status, e.created_at,
          GROUP_CONCAT(l.name) AS language
          FROM exercise AS e
          JOIN user AS u ON e.created_by = u.user_id
          JOIN exercise_has_language AS ehl ON e.exercise_id = ehl.exercise_id
          JOIN language AS l ON ehl.language_id = l.language_id
          ${titleFilterQuery}
          GROUP BY e.exercise_id
          ORDER BY ${orderTypeString}
          LIMIT ${mysql.escape(pageSize)}
          OFFSET ${mysql.escape(offset)}
        `;
        const exercisesFounded = await this.mysqlDb.poolQuery(query);

        return resolve(exercisesFounded);
      } catch (error) {
        logger.error(`[exercise.controller][listExercises] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  getExerciseDetail({ exerciseId }) {
    return new Promise(async (resolve, reject) => {
      try {
        let query = `
          SELECT e.exercise_id, e.title, e.content, e.point, e.created_by, e.status, e.created_at,
          e.updated_at, GROUP_CONCAT(l.name) AS language
          FROM exercise AS e
          JOIN user AS u ON e.created_by = u.user_id
          JOIN exercise_has_language AS ehl ON e.exercise_id = ehl.exercise_id
          JOIN language AS l ON ehl.language_id = l.language_id
          WHERE e.exercise_id = ${mysql.escape(exerciseId)}
          GROUP BY e.exercise_id
        `;
        const exercisesFounded = await this.mysqlDb.poolQuery(query);
        if (!exercisesFounded.length) {
          return reject({ status: 404, message: `Không tìm thấy bài tập này` });
        }
        const exerciseFounded = exercisesFounded[0];

        query = `
          SELECT test_case_id, test_case_index, input, output, limited_time
          FROM test_case
          WHERE exercise_id = ${mysql.escape(exerciseId)}
          ORDER BY test_case_index
        `;
        const testCasesFounded = await this.mysqlDb.poolQuery(query);

        // Only return half of test case, the rest are hidden
        exerciseFounded.testCases = [];
        testCasesFounded.forEach((testCase, index) => {
          if (index < Math.floor(testCasesFounded.length / 2)) {
            exerciseFounded.testCases.push(testCase);
          }
        });

        return resolve(exerciseFounded);
      } catch (error) {
        logger.error(`[exercise.controller][getExerciseDetail] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  submitExercise({ userId, exerciseId, scriptCode, languageId }) {
    return new Promise(async (resolve, reject) => {
      try {
        let query = `
          SELECT * FROM language 
          WHERE language_id = ${mysql.escape(languageId)}
        `;
        const languagesFounded = await this.mysqlDb.poolQuery(query);
        if (!languagesFounded.length) {
          return reject({ status: 400, message: 'Ngôn ngữ không phù hợp' });
        }
        const languageCode = languagesFounded[0].language_code;

        const dataTest = await fs.readFile(__dirname + '/tet.c')
        const t = dataTest.toString()
        

        console.log(compiledResult.data);

        return resolve(compiledResult.data);
      } catch (error) {
        logger.error(`[exercise.controller][doExercise] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }
}

module.exports = ExerciseController;
