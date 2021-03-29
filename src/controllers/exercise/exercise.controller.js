'use strict';

const mysql = require('mysql');

const logger = require('../../logger');

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
        console.log(query)
        await this.mysqlDb.query(query);

        // Insert test cases
        let testCasesValue = ``;
        testCases.forEach((testCase, index) => {
          if (index !== testCases.length - 1) {
            testCasesValue += `(${mysql.escape(index + 1)},${mysql.escape(testCase.input)}, ${mysql.escape(testCase.output)},${mysql.escape(testCase?.limitedTime)}, ${mysql.escape(exerciseId)}), `;
          } else {
            testCasesValue += `(${mysql.escape(index + 1)},${mysql.escape(testCase.input)}, ${mysql.escape(testCase.output)},${mysql.escape(testCase?.limitedTime)}, ${mysql.escape(exerciseId)})`;
          }
        });

        query = `
          INSERT INTO test_case(test_case_index, input, output, limited_time, exercise_id)
          VALUES ${testCasesValue}
        `;
        console.log(query)
        await this.mysqlDb.query(query);

        await this.mysqlDb.commit();

        return resolve('ok');
      } catch (error) {
        logger.error(`[exercise.controller][createExercise] error:`, error);
        return reject(error?.sqlMessage || error);
      }
    });
  }
}

module.exports = ExerciseController;
