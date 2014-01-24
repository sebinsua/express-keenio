// Defaults for middleware initialisation.
exports = module.exports = {
  // Defaults for client initialisation.
  client: {},
  // Defaults for overridding internal middleware behaviour. An oxymoron.
  handlers: {},
  // Defaults for properties that should be *SMITED* before they are sent to Keen.IO. This is on addition to any properties like 'password'.
  badProperties: []
};