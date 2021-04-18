'use strict';

const express = require('express');

const { verifyToken, multerUpload } = require('../../middlewares/');
const ImageController = require('../../controllers/image/image.controller');

const imageApi = express.Router();
const imageController = new ImageController();

imageApi.post('/upload', verifyToken, multerUpload.imageUpload.single('image'), (req, res) => {
  return res.status(200).json({ message: 'ok' });
});

imageApi.post(
  '/upload/imgur',
  verifyToken,
  multerUpload.imageUpload.single('image'),
  (req, res) => {
    const imageFile = req?.file;
    if (!imageFile) {
      return res.status(500).json({ message: 'Không tìm thấy file' });
    }

    imageController
      .uploadToImgur({ imageFilePath: imageFile.path })
      .then((result) => res.status(200).json(result))
      .catch((error) =>
        res.status(error?.status || 500).json({ message: error?.message || error })
      );
  }
);

module.exports = imageApi;
