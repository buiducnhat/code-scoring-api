'use strict';

const mysql = require('mysql');

const logger = require('../../logger');
const {
  ORDER_TYPE,
  LANGUAGE_CODE,
  RUN_SUBMIT_EXERCISE_TYPE,
  EXERCISE_STATUS,
} = require('../../config/constants');
const { c, cpp, java, python, node } = require('compile-run');
const fs = require('fs/promises');
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
        if (!languages.length) {
          return reject({ status: 400, message: `Ngôn ngữ không được trống` });
        }
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
        if (!testCases.length) {
          return reject({ status: 400, message: `Test cases không được trống` });
        }
        testCases.forEach((testCase, index) => {
          testCasesValue += `(${mysql.escape(testCase.input)}, 
          ${mysql.escape(testCase.output)},${mysql.escape(testCase?.limitedTime)},
           ${mysql.escape(exerciseId)})`;
          if (index !== testCases.length - 1) {
            testCasesValue += `,`;
          }
        });

        query = `
          INSERT INTO test_case(input, output, limited_time, exercise_id)
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

  listExercise({ userId, page, pageSize, title, orderType }) {
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

        const titleFilterQuery = title ? `AND title LIKE '%${title}%'` : '';

        // count exercise for pagination
        let query = `
          SELECT COUNT(e.exercise_id) AS countExercises
          FROM exercise AS e
          WHERE 1
          ${titleFilterQuery}
          AND (status = ${mysql.escape(EXERCISE_STATUS.public)}
            OR e.created_by = ${mysql.escape(userId)}
          )
          ORDER BY ${orderTypeString}
          LIMIT ${mysql.escape(pageSize)}
          OFFSET ${mysql.escape(offset)}
        `;
        const countExerciseResult = await this.mysqlDb.poolQuery(query);

        query = `
          SELECT e.exercise_id, e.title, e.content, e.point, e.created_by, e.status, e.created_at, e.updated_at,
          u.name AS author, GROUP_CONCAT(l.name) AS language
          FROM exercise AS e
          JOIN user AS u ON e.created_by = u.user_id
          JOIN exercise_has_language AS ehl ON e.exercise_id = ehl.exercise_id
          JOIN language AS l ON ehl.language_id = l.language_id
          WHERE 1
          ${titleFilterQuery}
          AND (status = ${mysql.escape(EXERCISE_STATUS.public)}
            OR e.created_by = ${mysql.escape(userId)}
          )
          GROUP BY e.exercise_id
          ORDER BY ${orderTypeString}
          LIMIT ${mysql.escape(pageSize)}
          OFFSET ${mysql.escape(offset)}
        `;
        const exercisesFounded = await this.mysqlDb.poolQuery(query);

        return resolve({
          total: countExerciseResult[0].countExercise,
          exercises: exercisesFounded,
        });
      } catch (error) {
        logger.error(`[exercise.controller][listExercises] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  getExerciseDetail({ userId, exerciseId }) {
    return new Promise(async (resolve, reject) => {
      try {
        // find languages
        let query = `
          SELECT language_id FROM exercise_has_language
          WHERE exercise_id = ${mysql.escape(exerciseId)} 
        `;
        const languagesFounded = await this.mysqlDb.poolQuery(query);

        query = `
          SELECT e.exercise_id, e.title, e.content, e.point, e.created_by, e.status, e.created_at,
          u.name AS author, e.updated_at
          FROM exercise AS e
          JOIN user AS u ON e.created_by = u.user_id
          JOIN exercise_has_language AS ehl ON e.exercise_id = ehl.exercise_id
          WHERE e.exercise_id = ${mysql.escape(exerciseId)}
          AND (e.status = ${mysql.escape(EXERCISE_STATUS.public)}
            OR e.created_by = ${mysql.escape(userId)}
          )
          GROUP BY e.exercise_id
        `;
        const exercisesFounded = await this.mysqlDb.poolQuery(query);
        if (!exercisesFounded.length) {
          return reject({ status: 404, message: `Không tìm thấy bài tập này` });
        }
        const exerciseFounded = exercisesFounded[0];

        // find testcases
        query = `
          SELECT test_case_id, input, output, limited_time
          FROM test_case
          WHERE exercise_id = ${mysql.escape(exerciseId)}
          ORDER BY created_at
        `;
        const testCasesFounded = await this.mysqlDb.poolQuery(query);

        // Only return half of test case, the rest are hidden
        // If req user id is author, return all test case
        let isAuthor = exerciseFounded.created_by === (userId || null);
        exerciseFounded.testCases = [];
        testCasesFounded.forEach((testCase, index) => {
          if (index < Math.floor(testCasesFounded.length / 2)) {
            exerciseFounded.testCases.push(testCase);
          } else {
            if (isAuthor) {
              exerciseFounded.testCases.push(testCase);
            }
          }
        });

        exerciseFounded.languages = languagesFounded.map((language) => language.language_id);

        return resolve(exerciseFounded);
      } catch (error) {
        logger.error(`[exercise.controller][getExerciseDetail] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  updateExercise({ exerciseId, title, content, point, createdBy, status, testCases, languages }) {
    return new Promise(async (resolve, reject) => {
      try {
        await this.mysqlDb.beginTransaction();

        let query = ``;

        query = `
          UPDATE exercise SET
          title = ${mysql.escape(title)},
          content = ${mysql.escape(content)},
          point = ${mysql.escape(point)},
          created_by = ${mysql.escape(createdBy)},
          status = ${mysql.escape(status)}
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        const updatedExerciseResult = await this.mysqlDb.query(query);
        if (updatedExerciseResult.affectedRows === 0) {
          return reject({ status: 404, message: `Bài tập không tồn tại` });
        }

        // delete all language-exercise before inserting news
        query = `
          DELETE FROM exercise_has_language
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        await this.mysqlDb.query(query);

        // Insert into table exercise_has_language
        let exerciseLanguageValue = ``;
        languages.forEach((languageId, index) => {
          exerciseLanguageValue += `(${mysql.escape(exerciseId)}, ${mysql.escape(languageId)})`;
          if (index !== languages.length - 1) {
            exerciseLanguageValue += `,`;
          }
        });
        query = `
          INSERT INTO exercise_has_language(exercise_id, language_id)
          VALUES ${exerciseLanguageValue}
        `;
        await this.mysqlDb.query(query);

        // Delete all results
        query = `
          DELETE FROM result
          WHERE exercise_id = ${mysql.escape(exerciseId)} 
        `;
        await this.mysqlDb.query(query);

        // Delete all testcases before inserting new
        query = `
          DELETE FROM test_case
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        await this.mysqlDb.query(query);

        // Insert test cases query
        let testCasesValue = ``;
        testCases.forEach((testCase, index) => {
          testCasesValue += `(${mysql.escape(testCase.input)},
          ${mysql.escape(testCase.output)},${mysql.escape(testCase?.limitedTime)}, 
          ${mysql.escape(exerciseId)})`;
          if (index !== testCases.length - 1) {
            testCasesValue += `,`;
          }
        });

        // Insert new testcases
        query = `
          INSERT INTO test_case(input, output, limited_time, exercise_id)
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
        logger.error(`[exercise.controller][updateExercise] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  updateExerciseStatus({ exerciseId, status }) {
    return new Promise(async (resolve, reject) => {
      try {
        const query = `
          UPDATE exercise 
          SET status = ${mysql.escape(status)}
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        const result = await this.mysqlDb.poolQuery(query);

        if (result.affectedRows === 0) {
          return reject({ status: 404, message: `Không tìm thấy bài tập này` });
        }

        return resolve({ message: 'Ok' });
      } catch (error) {
        return reject(error?.sqlMessage || error);
      }
    });
  }

  runOrSubmitExercise({
    userId,
    exerciseId,
    scriptCode,
    codeFilePath,
    languageId,
    typeRunOrSubmit,
  }) {
    return new Promise(async (resolve, reject) => {
      try {
        let query = ``;

        query = `
          SELECT * from exercise
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        const exercisesFounded = await this.mysqlDb.poolQuery(query);
        if (!exercisesFounded.length) {
          return reject({ status: 404, message: 'Không tìm thấy bài tập này' });
        }
        const exerciseDetail = exercisesFounded[0];
        let isAuthor = exerciseDetail.created_by === (userId || null);

        query = `
          SELECT * FROM language 
          WHERE language_id = ${mysql.escape(languageId)}
        `;
        const languagesFounded = await this.mysqlDb.poolQuery(query);
        if (!languagesFounded.length) {
          return reject({ status: 400, message: 'Ngôn ngữ không phù hợp' });
        }
        const languageCode = languagesFounded[0]?.name;

        query = `
          SELECT * FROM test_case 
          WHERE exercise_id = ${mysql.escape(exerciseId)}
        `;
        let testCases = await this.mysqlDb.poolQuery(query);
        let resultRunTestCases = [];
        let resultToInsert = ``;
        let totalScore = 0;
        const scorePerTestCase = exerciseDetail.point / testCases.length;

        for (let i = 0, len = testCases.length; i < len; i++) {
          const runCodeResult = await this.runCodeByFile(
            languageCode,
            codeFilePath,
            testCases[i].input
          );
          // compare output com runcode with output in db, then assign...
          testCases[i].result = runCodeResult.stdout === testCases[i].output;
          totalScore += testCases[i].result ? scorePerTestCase : 0;

          // push to resultRunTestCases array
          resultRunTestCases.push({
            input: testCases[i].input,
            expectedOutput: testCases[i].output,
            userOutput: runCodeResult.stdout,
            error: runCodeResult.stderr || null,
            result: testCases[i].result,
          });

          // value to insert into table result
          resultToInsert += `(${mysql.escape(userId)}, 
            ${mysql.escape(exerciseId)}, ${mysql.escape(testCases[i].test_case_id)},
             ${mysql.escape(runCodeResult.stdout)},
             ${testCases[i].result ? mysql.escape(scorePerTestCase) : 0})`;
          if (i !== len - 1) {
            resultToInsert += `,`;
          }
        }
        //remove file after uploaded
        await fs.unlink(codeFilePath);

        // If type is just run code, resolve here
        if (typeRunOrSubmit === RUN_SUBMIT_EXERCISE_TYPE.run) {
          return isAuthor
            ? resolve(resultRunTestCases)
            : resolve(resultRunTestCases.slice(0, Math.floor(resultRunTestCases.length / 2)));
        }

        // Begin transaction
        await this.mysqlDb.beginTransaction();

        // Delete all result before inserting new
        query = `
          DELETE FROM result
          WHERE user_id = ${userId} AND exercise_id = ${exerciseId}
        `;
        await this.mysqlDb.query(query);

        // Insert result to table result
        query = `
          INSERT INTO result(user_id, exercise_id, test_case_id, user_output, score)
          VALUES ${resultToInsert}
        `;
        await this.mysqlDb.query(query);

        // Commit transacrion
        await this.mysqlDb.commit();

        return resolve({
          message: `Nộp bài giải thành công`,
          totalScore,
        });
      } catch (error) {
        await this.mysqlDb.rollback();
        logger.error(`[exercise.controller][submitExercise] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }

  runCodeByFile(languageCode, codeFilePath, input, limitedTime) {
    return new Promise(async (resolve, reject) => {
      try {
        let runCodeResult;
        switch (languageCode) {
          case LANGUAGE_CODE.c:
            runCodeResult = await c.runFile(codeFilePath, {
              stdin: input,
              compilationPath: 'gcc',
              timeout: limitedTime,
            });
            break;
          case LANGUAGE_CODE.cpp:
            runCodeResult = await cpp.runFile(codeFilePath, {
              stdin: input,
              compilationPath: 'g++',
              timeout: limitedTime,
            });
            break;
          case LANGUAGE_CODE.java:
            runCodeResult = await java.runFile(codeFilePath, {
              stdin: input,
              compilationPath: 'javac',
              executionPath: 'java',
              timeout: limitedTime * 8,
            });
            break;
          case LANGUAGE_CODE.python:
            runCodeResult = await python.runFile(codeFilePath, {
              stdin: input,
              executionPath: 'python3',
              timeout: limitedTime * 8,
            });
            break;
          case LANGUAGE_CODE.node:
            runCodeResult = await node.runFile(codeFilePath, {
              stdin: input,
              executionPath: 'node',
              timeout: limitedTime * 8,
            });
            break;
        }
        return resolve(runCodeResult);
      } catch (error) {
        logger.error(`[exercise.controller][runCode] error:`, error);
        return reject(error);
      }
    });
  }
}

module.exports = ExerciseController;
