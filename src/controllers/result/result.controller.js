'use strict';

const mysql = require('mysql');

const logger = require('../../logger');
const { ORDER_TYPE, LANGUAGE_CODE, EXERCISE_STATUS } = require('../../config/constants');

class ResultController {
  constructor(mysqlDb) {
    this.mysqlDb = mysqlDb;
  }

  getResultsByUser({ userId }) {
    return new Promise(async (resolve, reject) => {
      try {
        let query = `
          SELECT r.user_id AS userId, r.exercise_id, SUM(score) AS totalScore,
          e.title, e.point, e.status 
          FROM result AS r
          JOIN exercise AS e ON r.exercise_id = e.exercise_id
          WHERE r.user_id = ${mysql.escape(userId)}
          GROUP BY r.exercise_id, r.user_id
        `;
        let resultsFounded = await this.mysqlDb.poolQuery(query);
        if (!resultsFounded.length) {
          return resolve([]);
        }

        query = `
          SELECT tc.test_case_id, tc.test_case_index, tc.input, tc.output, tc.limited_time,
          tc.exercise_id, r.user_output
          FROM test_case AS tc
          JOIN result AS r ON tc.test_case_id = r.test_case_id
          WHERE r.user_id = ${mysql.escape(userId)}
        `;
        const testCases = await this.mysqlDb.poolQuery(query);

        let tempResult = {};
        resultsFounded = resultsFounded.map((result) => {
          tempResult = { ...result };
          tempResult.testCases = [];
          testCases.forEach((testCase) => {
            if (testCase.exercise_id === result.exercise_id) {
              tempResult.testCases.push({
                testCaseId: testCase.test_case_id,
                testCaseIndex: testCase.test_case_index,
                input: testCase.input,
                output: testCase.output,
                userOutput: testCase.user_output,
                check: testCase.output === testCase.user_output,
                limited_time: testCase.limited_time,
              });
            }
          });
          return tempResult;
        });

        return resolve(resultsFounded);
      } catch (error) {
        logger.error(`[result.controller][getResultByUSer] error:`, error);
        reject(error?.sqlMessage || error);
      }
    });
  }

  getResultOfExerciseByUSer({ userId, exerciseId }) {
    return new Promise(async (resolve, reject) => {
      try {
        let query = `
          SELECT r.user_id AS userId, r.exercise_id AS exerciseId, SUM(score) AS totalScore,
          e.title, e.point, e.status 
          FROM result AS r
          JOIN exercise AS e ON r.exercise_id = e.exercise_id
          WHERE r.user_id = ${mysql.escape(userId)} 
          AND e.exercise_id = r.exercise_id
          AND e.exercise_id = ${mysql.escape(exerciseId)}
          GROUP BY r.exercise_id, r.user_id
        `;
        const resultsFounded = await this.mysqlDb.poolQuery(query);
        if (!resultsFounded.length) {
          return resolve(null);
        }
        let resultFounded = resultsFounded[0];

        query = `
          SELECT tc.test_case_id, tc.test_case_index, tc.input, tc.output, tc.limited_time,
          tc.exercise_id, r.user_output
          FROM test_case AS tc
          JOIN result AS r ON tc.test_case_id = r.test_case_id
          WHERE tc.exercise_id = ${mysql.escape(exerciseId)}
        `;
        let testCases = await this.mysqlDb.poolQuery(query);
        testCases = testCases.map((testCase) => ({
          testCaseId: testCase.test_case_id,
          testCaseIndex: testCase.test_case_index,
          input: testCase.input,
          output: testCase.output,
          userOutput: testCase.user_output,
          limitedTime: testCase.limited_time,
          check: testCase.output === testCase.user_output,
        }));

        resultFounded.testCase = testCases;

        return resolve(resultFounded);
      } catch (error) {
        logger.error(`[result.controller][getResultOfExerciseByUSer] error:`, error);
        reject(error?.sqlMessage || error);
      }
    });
  }
}

module.exports = ResultController;
