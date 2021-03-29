'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const path = require('path');
const morgan = require('morgan');
const dotenv = require('dotenv').config({ path: path.join(__dirname, '.env') });

const logger = require('./logger');

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  morgan('combined', {
    stream: logger.stream,
  })
);

app.use('/healthz', (req, res) => {
  res.status(200).json({ message: 'Server is running...' });
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  logger.error(
    `${err.status || 500} - ${err.message} - ${req.originalUrl} -${
      req.method
    } - ${req.ip}`
  );

  // render the error page
  res.status(err.status || 500);
  // res.render('error')
  res.send(err);
});

const api = express.Router();
app.use('/api', api);

const apiV1 = express.Router();
api.use('/v1', apiV1);

const authApi = require('./apis/auth/auth.api');
apiV1.use('/auth', authApi);

module.exports = app;
