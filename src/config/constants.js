'use strict';

exports.ROLE_ID = {
  admin: 1,
  user: 2,
};

exports.ORDER_TYPE = {
  timeASC: 1,
  timeDESC: 2,
  nameASC: 3,
  nameDESC: 4,
  pointASC: 5,
  pointDESC: 6,
};

exports.PERMISSION = {
  createExercise: 'create exercise',
  updateExercise: 'update exercise',
  listExercises: 'list exercises',
  submitExercise: 'submit exercise',
  updateUser: 'update user',
};

exports.USER_STATUS = {
  active: 1,
  freezed: 2,
};

exports.EXERCISE_STATUS = {
  public: 1,
  hiden: 2,
  deleted: 3,
};

exports.LANGUAGE_CODE = {
  c: 'C',
  cpp: 'C++',
  java: 'Java',
  python: 'Python',
};
