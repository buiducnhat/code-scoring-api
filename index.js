'use strict';

const app = require('./src/server');
const config = require('./src/config');

const PORT = config.serverSettings.port || 8888;
console.log(process.env)
app.listen(process.env.PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
