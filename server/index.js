import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

// import custom middleware
import authenticateToken from './middleware/authenticateToken';

// import custom router
import adminRouter from './routes/admin/index';
import adminProductsRouter from './routes/admin/products';
import adminCouponsRouter from './routes/admin/coupons';
import adminUploadRouter from './routes/admin/upload';
import userRouter from './routes/user/index';

const app = express();

const corsOptions = {
  origin: process.env.NODE_ENV === 'development' || process.env.BASE_URL,
  credentials: true,
};

app.disable('x-powered-by');

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

// authenticate access token
app.use(authenticateToken);

// set custom router
app.use('/admin', adminRouter);
app.use('/admin/products', adminProductsRouter);
app.use('/admin/coupons', adminCouponsRouter);
app.use('/admin/upload', adminUploadRouter);
app.use('/user', userRouter);

export default app;
