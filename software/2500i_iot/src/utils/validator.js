// utils/validator.js
const Joi = require('joi');

const commandSchema = Joi.object({
  type: Joi.string().valid('command').required(),
  command: Joi.string().required(),
  id: Joi.string().required(),
  timestamp: Joi.number().required(),
});

function validateCommand(command) {
  const { error } = commandSchema.validate(command);
  return error ? error.message : null;
}

module.exports = {
  validateCommand,
};
