var express = require("express"),
    config = require("./config.json"),
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure(config);
app.use(keenioMiddleware);

app.get('/alter-status', function (req, res) {
    res.status(201).json({
        abc: "hey"
    });
});

app.get('/json-method', function (req, res) {
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.get('/jsonp-method', function (req, res) {
  // It doesn't matter about that callback thing, since the object passed in here is an object.
  res.jsonp({
    special: 'hey',
    abc: 4
  });
});

app.get('/send-method', function (req, res) {
  res.send({
    special: 'hey',
    abc: 4
  });
});

app.get('/send-method-swap-the-status-and-body', function (req, res) {
    res.send({ yes: true }, 201);
})

app.get('/json-method-only-status', function (req, res) {
    res.json(201);
});

app.get('/jsonp-method-only-status', function (req, res) {
    res.jsonp(201);
});

app.get('/send-method-only-status', function (req, res) {
    res.send(201);
});

app.get('/send-method-with-json-string', function (req, res) {
  // Somehow Express decides this is a json object... Which is cool but strange imho.
  res.send('{ "special": "hey", "abc": 4 }');
});

app.get('/send-method-forcing-json-in-strange-way', function (req, res) {
  // Somehow Express decides this is a json object irrelevant of the Content-Type...
  // Which means the original behaviour I started with is the right behaviour. SWEET. 
  res.set('Content-Type', 'application/json');
  res.send('{ "special": "hey", "abc": 4 }');
});

app.get('/redirect-method', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  res.redirect('http://google.co.uk');
});

app.get('/redirect-method-with-2-args', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  res.redirect(200, 'http://google.co.uk');
});

app.get('/redirect-method-with-path', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  // @todo: Might be useful to generate a real url from this '../' thing? 
  res.redirect(200, '../');
});

app.get('/render-method', function (req, res) {
  // idgaf ABOUT crashing this test.
  res.render('this-is-not-important-record-options-instead', {
    even: 'html-pages',
    might: 'have-data-that-is-dynamically',
    shown: 'shown-to-the-user'
  });
});

app.get('/send-file-method', function (req, res) {
  // I do not think I will need to worry about this, as it does not use res.send().
  // See also: [expressjs#res.sendFile](http://expressjs.com/api.html#res.sendFile)
  res.sendfile('/uploads/download.txt');
});

app.get('/download-method', function (req, res) {
  // Likewise, see also: [expressjs#res.download](http://expressjs.com/api.html#res.download)
  res.download('/uploads/download.txt', 'another-filename.txt');
});

app.listen(3000);
