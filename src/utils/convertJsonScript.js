'use strict';

const { replaceAll } = require('./stringReplaceAll');
/*
Backspace is replaced with \b
Form feed is replaced with \f
Newline is replaced with \n
Carriage return is replaced with \r
Tab is replaced with \t
Double quote is replaced with \"
Backslash is replaced with \\
*/
const convertJsonScript = (script) => {
  replaceAll(script, `\n`, `\\n`);
  replaceAll(script, `\r`, `\\r`);
  replaceAll(script, `\t`, `\\t`);
  // replaceAll(script, `\\`, `\\`)
};
module.exports = Object.assign({}, { convertJsonScript });
