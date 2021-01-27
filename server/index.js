require('dotenv').config();
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
app.use('/api/admin', require('./router/admin/index'));
app.use('/api/admin/upload', require('./router/admin/upload'));
app.use('/api/user', require('./router/user/index'));

app.listen(9000, () => console.log(`start localhost 9000`));
// module.exports = app;
