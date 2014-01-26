var express = require("express"),
    clientConfig = require("./config.json").client,
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure({
  client: clientConfig
});
app.use(keenioMiddleware);

app.get('/json-method', function (req, res) {
  // Behind the scenes uses res.send().
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.get('/jsonp-method', function (req, res) {
  // Behind the scenes uses res.send().
  res.jsonp({
    special: 'hey',
    abc: 4
  });
});

app.get('/send-method', function (req, res) {
  // @todo: Check whether I can pass in an object.
  // @todo: Whether passing in a json strong causes capture? Eugh.
  res.send({
    special: 'hey',
    abc: 4
  });
});

app.get('/send-method-forcing-json-in-strange-way', function (req, res) {
  res.set('Content-Type', 'application/json');
  res.send("{
    special: 'hey',
    abc: 4
  }");
});

app.get('/redirect-method', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  // But we would still like to capture from it, so
  // it's up for inclusion in the proxy response function. :)
  res.redirect('http://google.co.uk');
});

app.get('/render-method', function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.get('/send-file-method', function (req, res) {
  // I do not think I will need to worry about this, as it does not use res.send().
  // See also: [expressjs#res.sendFile](http://expressjs.com/api.html#res.sendFile)
  res.sendFile('/uploads/download.txt');
});

app.get('/download-method', function (req, res) {
  // Likewise, see also: [expressjs#res.download](http://expressjs.com/api.html#res.download)
  res.download('/uploads/download.txt', 'another-filename.txt');
});

app.listen(3000);
