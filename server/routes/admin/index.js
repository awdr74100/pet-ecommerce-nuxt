import express from 'express';
import axios from 'axios';
import { verify } from 'jsonwebtoken';
import { body, cookie, validationResult } from 'express-validator';
import { db, auth } from '../../connection/firebase-admin';
import generatePhotoUrl from '../../utils/generatePhotoUrl';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../utils/generateToken';
import { sendAccessToken, sendRefreshToken } from '../../utils/sendToken';

const router = express.Router();

/* signup */
router.post(
  '/signup',
  body('username').isAlphanumeric().isLength({ min: 6, max: 14 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6, max: 14 }),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { username, email, password } = req.body;
    try {
      // check username
      const exist = (
        await db.ref(`/users/usernames/${username}`).once('value')
      ).exists();
      if (exist) throw new Error('custom/username-already-exist');
      // generate photo url
      const photoUrl = generatePhotoUrl(96, 96, username, 48, 'fff', '282828');
      // create user
      const userInfo = {
        displayName: username,
        email,
        password,
        emailVerified: true, // avoid google oauth replace account
        photoURL: photoUrl,
      };
      const { uid } = await auth.createUser(userInfo);
      // save user
      const userData = {
        [`usernames/${username}`]: email,
        [`details/${uid}`]: {
          username,
          displayName: username,
          email,
          role: 'admin',
          tokenVersion: 0,
          providers: ['password'],
          photoUrl,
        },
      };
      await db.ref(`/users`).update(userData);
      // end
      return res.send({ success: true, message: '註冊成功' });
    } catch (error) {
      if (error.message === 'custom/username-already-exist')
        return res.send({ success: false, message: '用戶名已存在' }); // username already exist
      if (error.code === 'auth/email-already-exists')
        return res.send({ success: false, message: '信箱已被使用' }); // email-already-exists
      if (error.code === 'auth/invalid-email')
        return res.send({ success: false, message: '無效電子郵件' }); // invalid-email
      if (error.code === 'auth/operation-not-allowed')
        return res.send({ success: false, message: '未至控制台啟用服務' }); // operation-not-allowed
      if (error.code === 'auth/invalid-password')
        return res.send({ success: false, message: '密碼強度不夠' }); // invalid-password
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* signin */
router.post(
  '/signin',
  body('usernameOrEmail').notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { usernameOrEmail, password } = req.body;
    try {
      // set email
      let email = usernameOrEmail;
      if (!usernameOrEmail.includes('@')) {
        email = (
          await db.ref(`/users/usernames/${usernameOrEmail}`).once('value')
        ).val();
        if (!email) throw new Error('custom/username-not-found');
      }
      // sign in
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_ADMIN_APIKEY}`;
      const payload = { email, password, returnSecureToken: false };
      const { data } = await axios.post(url, payload);
      // get user
      const uid = data.localId;
      const user = (await db.ref(`/users/details/${uid}`).once('value')).val();
      // check role
      if (user.role !== 'admin') throw new Error('custom/invalid-role');
      // generate token
      const accessToken = generateAccessToken({ uid, ...user }, '15m');
      const refreshToken = generateRefreshToken({ uid, ...user }, '4h');
      // end
      sendAccessToken(res, accessToken, '/');
      sendRefreshToken(res, refreshToken, `/api/${user.role}/refresh_token`);
      return res.send({
        success: true,
        user: {
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.message === 'custom/username-not-found')
        return res.send({ success: false, message: '帳號或密碼錯誤' }); // username not found
      if (error.message === 'custom/invalid-role')
        return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid role
      if (error.response && error.response.data && error.response.data.error) {
        const { message } = error.response.data.error;
        if (message === 'EMAIL_NOT_FOUND')
          return res.send({ success: false, message: '帳號或密碼錯誤' }); // email not found
        if (message === 'INVALID_PASSWORD')
          return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid password
        if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER'))
          return res.send({ success: false, message: '稍後再嘗試登入' }); // too many attempts try later
        return res.send({ success: false, message }); // other error
      }
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

/* signout */
router.post('/signout', cookie('accessToken').isJWT(), async (req, res) => {
  const sendClearTokens = (_res) => {
    _res
      .clearCookie('accessToken', {
        sameSite: 'strict',
        path: '/',
      })
      .clearCookie('refreshToken', {
        sameSite: 'strict',
        path: '/api/admin/refresh_token',
      })
      .send({ success: true, message: '已登出' });
  };
  // check cookie
  const errs = validationResult(req);
  if (!errs.isEmpty()) return sendClearTokens(res);
  const { accessToken: credential } = req.cookies;
  try {
    // verify access token
    const secret = process.env.ACCESS_TOKEN_SECRET;
    const { uid, role } = verify(credential, secret);
    // check role
    if (role !== 'admin') return sendClearTokens(res);
    // check user
    const user = (await db.ref(`/users/details/${uid}`).once('value')).val();
    if (!user) return sendClearTokens(res);
    // update refresh token version
    user.tokenVersion += 1;
    await db.ref(`/users/details/${uid}`).update(user);
    // end
    return sendClearTokens(res);
  } catch (error) {
    return sendClearTokens(res);
  }
});

/* refresh token */
router.post(
  '/refresh_token',
  cookie('refreshToken').isJWT(),
  async (req, res) => {
    // check cookie
    const errs = validationResult(req);
    if (!errs.isEmpty()) {
      return res.status(401).send({ success: false, message: '未攜帶令牌' }); // invalid value
    }
    const { refreshToken: credential } = req.cookies;
    try {
      // verify refresh token
      const secret = process.env.REFRESH_TOKEN_SECRET;
      const { uid, role, tokenVersion } = verify(credential, secret);
      // check role
      if (role !== 'admin') throw new Error('custom/invalid-role');
      // check user
      const user = (await db.ref(`/users/details/${uid}`).once('value')).val();
      if (!user) throw new Error('custom/account-has-been-revoked');
      // check refresh token version
      if (user.tokenVersion !== tokenVersion) {
        throw new Error('custom/token-has-been-revoked');
      }
      // update refresh token version
      user.tokenVersion += 1;
      await db.ref(`/users/details/${uid}`).update(user);
      // generate token
      const accessToken = generateAccessToken({ uid, ...user }, '15m');
      const refreshToken = generateRefreshToken({ uid, ...user }, '4h');
      // end
      sendAccessToken(res, accessToken, '/');
      sendRefreshToken(res, refreshToken, `/api/${user.role}/refresh_token`);
      return res.send({
        success: true,
        user: {
          email: user.email,
          username: user.username,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
          role: user.role,
        },
      });
    } catch (error) {
      if (error.message === 'custom/invalid-role')
        return res.status(403).send({ success: false, message: '權限不足' }); // invalid role
      if (error.message === 'custom/account-has-been-revoked')
        return res.status(403).send({ success: false, message: '帳號已註銷' }); // account has been revoked
      if (error.message === 'custom/token-has-been-revoked')
        return res.status(403).send({ success: false, message: '令牌已註銷' }); // token has been revoked
      if (error.message === 'jwt must be provided')
        return res.status(401).send({ success: false, message: '未攜帶令牌' }); // jwt must be provided
      if (error.message === 'invalid token')
        return res.status(401).send({ success: false, message: '無效令牌' }); // invalid token
      if (error.message === 'jwt malformed')
        return res.status(401).send({ success: false, message: '格式錯誤' }); // jwt malformed
      if (error.message === 'jwt signature is required')
        return res.status(401).send({ success: false, message: '需要簽名' }); // jwt signature is required
      if (error.message === 'invalid signature')
        return res.status(401).send({ success: false, message: '無效簽名' }); // invalid signature
      if (error.message === 'jwt expired')
        return res.status(401).send({ success: false, message: '令牌已過期' }); // jwt expired
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default router;
