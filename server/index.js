const app = require('express')();
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv').config();

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
app.use('/api/admin', require('./router/admin/index'));

// app.listen(9000, () => console.log(`start localhost 9000`));
module.exports = app;
