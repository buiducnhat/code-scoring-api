'use strict';

const appRootPath = require('app-root-path');
const multer = require('multer');

const CODE_PATH = `${appRootPath}/src/assets/codes`;

const codeFilter = (req, file, cb) => {
  console.log(file);
  if (file.mimetype.includes('text') || file.mimetype.includes('application')) {
    cb(null, true);
  } else {
    cb({ message: 'Định dạng file không hợp lệ' }, false);
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CODE_PATH);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const multerUpload = multer({ storage: storage, fileFilter: codeFilter });

module.exports = multerUpload;
