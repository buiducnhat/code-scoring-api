'use strict';

const appRootPath = require('app-root-path');
const multer = require('multer');

const DEFAULT_PATH = `${appRootPath}/src/assets/uploads`;
const CODE_PATH = `${appRootPath}/src/assets/codes`;
const IMAGE_PATH = `${appRootPath}/src/assets/images`;

const codeFilter = (req, file, cb) => {
  if (file.mimetype.includes('text') || file.mimetype.includes('application')) {
    cb(null, true);
  } else {
    cb({ message: 'Định dạng file không hợp lệ' }, false);
  }
};

const imageFilter = (req, file, cb) => {
  if (file.mimetype.includes('image')) {
    cb(null, true);
  } else {
    cb({ message: 'Định dạng file không hợp lệ' }, false);
  }
};

const customStorage = (type) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadPath = DEFAULT_PATH;
      switch (type) {
        case 'CODE':
          uploadPath = CODE_PATH;
          break;
        case 'IMAGE':
          uploadPath = IMAGE_PATH;
          break;
        default:
          uploadPath = DEFAULT_PATH;
      }
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    },
  });

const codeUpload = multer({ storage: customStorage('CODE'), fileFilter: codeFilter });
const imageUpload = multer({ storage: customStorage('IMAGE'), fileFilter: imageFilter });

module.exports = Object.assign({}, { codeUpload, imageUpload });
