// Defaults for middleware initialisation.
exports = module.exports = {
  // Defaults for client initialisation.
  client: {},
  // Defaults for overridding internal middleware behaviour. An oxymoron.
  handlers: {},
  // Defaults for properties that should not be *SMITED* before they are sent to Keen.IO (further to other validation.)
  whitelistProperties: {},
  // Defaults for properties that should be *SMITED* before they are sent to Keen.IO. This is on addition to any properties like 'password'.
  blacklistProperties: [],
  // Defaults for internal values.
  defaults: {
    MAX_PROPERTY_HIERARCHY_DEPTH: 10,
    MAX_STRING_LENGTH: 1000,
    MAX_PROPERTY_QUANTITY: 300,
    // By default the addons are switched off.
    addons: {
      ipToGeo: false,
      userAgentParser: false
    },
    eventualSchemas: {
      cache: true,
      cachePath: './route-schemas.cache',
      query: {
        MAX_PROPERTIES: 30,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      },
      body: {
        MAX_PROPERTIES: 80,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      },
      reaction: {
        MAX_PROPERTIES: 120,
        NUMBER_OF_INSTANCES: 500,
        NUMBER_OF_DAYS: 7
      }
    }
  }
};