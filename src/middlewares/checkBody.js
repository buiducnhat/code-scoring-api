'use strict';

const checkBody = (requiredFields) => (req, res, next) => {
  const missingFields = requiredFields.filter((requiredField) => {
    if (!req.body.hasOwnProperty(requiredField)) {
      return requiredField;
    }
  });
  if (missingFields.length > 0) {
    return res
      .status(400)
      .json({ message: `${missingFields.toString()} are required!!` });
  }
  next();
};

module.exports = checkBody;
