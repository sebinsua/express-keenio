var express = require("express"),
    clientConfig = require("./config.json").client,
    keenioMiddleware = require('../');

var app = express();

keenioMiddleware.configure({
  client: clientConfig
});
app.use(keenioMiddleware);

app.get('/json-method', function (req, res) {
  // @todo: Something to note is that we're letting objects become strings, to be come objects again
  //        and this is shitty.
  // Behind the scenes uses res.send().
  res.json({
    special: 'hey',
    abc: 4
  });
});

app.get('/jsonp-method', function (req, res) {
  // @todo: If app.get('json callback something something') is set
  // then you will need to parse something like this:
  // typeof $callbackName === 'function' && $callbackName($json-string);
  // @todo: Deal with in a similar way to how we are going to deal with .json().
  // Behind the scenes uses res.send().
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

app.get('/send-method-with-json-string', function (req, res) {
  // Somehow Express decides this is a json object... Which is cool but strange imho.
  res.send('{ "special": "hey", "abc": 4 }');
});

app.get('/send-method-forcing-json-in-strange-way', function (req, res) {
  // Somehow Express decides this is a json object irrelevant of the Content-Type...
  // Which means the original behaviour I started with is probably the right behaviour. SWEET. 
  res.set('Content-Type', 'application/json');
  res.send('{ "special": "hey", "abc": 4 }');
});

app.get('/redirect-method', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  // But we would still like to capture from it, so
  // it's up for inclusion in the proxy response function. :)
  res.redirect('http://google.co.uk');
});

app.get('/redirect-method-with-2-args', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  // @todo: But we would still like to capture from it, so
  // it's up for inclusion in the proxy response function. :)
  res.redirect(200, 'http://google.co.uk');
});

app.get('/redirect-method-with-path', function (req, res) {
  // Behind the scenes *DOES NOT* use res.send().
  // @todo: But we would still like to capture from it, so
  // it's up for inclusion in the proxy response function. :)
  res.redirect(200, '../');
});

app.get('/render-method', function (req, res) {
  // @todo: We *DEFINITELY* want this - and we definitely aren't currently gettin' it.
  // idgaf ABOUT crashing something, I just want the data. idgaf.
  // What happens when the options is converted into a string and possible goes towards res.send?
  res.render('i-might-record-this-but-options-are-more-important', {
    even: 'html-pages',
    might: 'have-data-that-is-dynamically',
    shown: 'shown-to-the-user'
  });
});

app.get('/send-file-method', function (req, res) {
  // I do not think I will need to worry about this, as it does not use res.send().
  // See also: [expressjs#res.sendFile](http://expressjs.com/api.html#res.sendFile)
  // @todo: Create some way of getting out a simple reaction.
  res.sendFile('/uploads/download.txt');
});

app.get('/download-method', function (req, res) {
  // Likewise, see also: [expressjs#res.download](http://expressjs.com/api.html#res.download)
  // @todo: Create a way of getting out a simple reaction.
  res.download('/uploads/download.txt', 'another-filename.txt');
});

app.listen(3000);
