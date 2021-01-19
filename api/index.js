const app = require('express')();

app.get('/api/test', (req, res) => {
  res.send({ message: 'Hello World' });
});

module.exports = app;
