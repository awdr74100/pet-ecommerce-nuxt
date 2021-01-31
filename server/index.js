import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import adminRouter from './router/admin/index';
import adminUploadRouter from './router/admin/upload';
import userRouter from './router/user/index';

const app = express();

const corsOptions = {
  origin: process.env.BASE_URL || true,
  credentials: true,
};

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use('/admin', adminRouter);
app.use('/admin/upload', adminUploadRouter);
app.use('/user', userRouter);

export default app;
