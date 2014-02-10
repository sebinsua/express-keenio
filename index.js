// [express-keenio](http://github.com/sebinsua/express-keenio)
//
// Premise
// -------
// * Events can be seen as an intention-reaction mapping.
// * Events belong in a collection together when they can be described by similar properties.
// * We should capture almost everything (events, environment, user identity and metadata e.g. repeat visits.)
// * Installation should be fast.
// 
// See [lib/keenio-middleware](http://sebinsua.github.io/express-keenio/keenio-middleware.html).
module.exports = require('./lib/keenio-middleware');