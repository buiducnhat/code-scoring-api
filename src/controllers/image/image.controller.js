const axios = require('axios').default;
var FormData = require('form-data');
const fs = require('fs');

class ImageController {
  constructor() {}

  uploadToImgur({ imageFilePath }) {
    return new Promise(async (resolve, reject) => {
      try {
        const formData = new FormData();
        formData.append('image', fs.createReadStream(imageFilePath));
        formData.append('type', 'file');
        const config = {
          method: 'post',
          url: 'https://api.imgur.com/3/upload',
          headers: {
            ...formData.getHeaders(),
          },
          data: formData,
        };

        const response = await axios(config);
        const imageUrlResult = response.data.data.link;

        fs.unlinkSync(imageFilePath);
        
        return resolve({ url: imageUrlResult });
      } catch (error) {
        return reject(error);
      }
    });
  }
}

module.exports = ImageController;
