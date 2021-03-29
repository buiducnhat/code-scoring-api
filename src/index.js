'use strict';

const app = require('./server');
const config = require('./config');

const PORT = config.serverSettings.port || 8888;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
