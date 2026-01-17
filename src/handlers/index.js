const { setupHandlers } = require('./handlers');
const helpers = require('./helpers');
const messages = require('../messages');
const keyboards = require('../keyboards');

module.exports = {
  setupHandlers,
  ...helpers,
  messages,
  keyboards
};
