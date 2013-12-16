var keenioMiddleware = function () {
    
    return function (req, res, next) {
        next();
    };
};

exports = module.exports = keenioMiddleware;