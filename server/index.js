const app = require('express')();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const corsOptions = {
  origin: process.env.BASE_URL || true,
  credentials: true,
};

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// set router
app.use('/admin', require('./router/admin/index'));
app.use('/admin/upload', require('./router/admin/upload'));
app.use('/user', require('./router/user/index'));

module.exports = app;
