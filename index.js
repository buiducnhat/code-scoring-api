'use strict';

const app = require('./src/server');
const config = require('./src/config');

const PORT = config.serverSettings.port || 8888;
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
