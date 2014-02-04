var express = require("express"),
    config = require("./config.json"),
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure(config);
app.use(express.json());
app.use(express.cookieParser('S3CRE7'));
app.use(express.session({ store: new express.session.MemoryStore, secret: 'S3CRE7', key: 'sid' }));
app.use(keenioMiddleware);

app.get('/test', function (req, res) {
  if (!req.session.rand) {
    req.session.rand = Math.random();
  }
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.listen(3000);
