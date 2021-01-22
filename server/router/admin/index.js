const router = require('express').Router();
const jwt = require('jsonwebtoken');
const axios = require('axios').default;
const { body, validationResult } = require('express-validator');
const { db, auth } = require('../../connection/firebase-admin');

const generatorAccessToken = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
};
const generatorRefreshToken = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, { expiresIn });
};

// signup
router.post(
  '/signup',
  body('username').isAlphanumeric().isLength({ min: 2, max: 12 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6, max: 12 }),
  async (req, res) => {
    // validation body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // response client
    const { username, email, password } = req.body;
    try {
      // check username
      const users = (await db.ref('/users').once('value')).val() || {};
      const usernames = Object.values(users).map((userVal) => userVal.username);
      const exist = usernames.includes(username);
      if (exist) return res.send({ success: false, message: '用戶名已存在' }); // response client
      // create user
      const createRequest = { displayName: username, email, password };
      const { uid } = await auth.createUser(createRequest);
      // save user
      await db.ref(`users/${uid}`).set({ username, email, role: 'admin' });
      // complete
      return res.send({ success: true, message: '註冊成功' }); // response client
    } catch (error) {
      if (error.code === 'auth/email-already-exists')
        return res.send({ success: false, message: '信箱已被使用' });
      if (error.code === 'auth/invalid-email')
        return res.send({ success: false, message: '無效電子郵件' });
      if (error.code === 'auth/operation-not-allowed')
        return res.send({ success: false, message: '未至控制台啟用服務' });
      if (error.code === 'auth/invalid-password')
        return res.send({ success: false, message: '密碼強度不夠' });
      return res.status(500).send({ success: false, message: error.message });
    }
  },
);

// signin
router.post(
  '/signin',
  body('usernameOrEmail').notEmpty(),
  body('password').notEmpty(),
  async (req, res) => {
    // validation body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // response client
    const { usernameOrEmail, password } = req.body;
    try {
      // check username and role
      const users = (await db.ref('/users').once('value')).val() || {};
      const user = Object.values(users).find((userVal) => {
        const key = usernameOrEmail.includes('@') ? 'email' : 'username';
        return userVal[key] === usernameOrEmail && userVal.role === 'admin';
      });
      if (!user) return res.send({ success: false, message: '帳號或密碼錯誤' }); // response client
      // signin user
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_ADMIN_APIKEY}`;
      const payload = { email: user.email, password, returnSecureToken: false };
      const { localId: uid } = (await axios.post(url, payload)).data;
      // generator token
      const accessToken = generatorAccessToken({ uid, role: 'admin' }, '20m');
      const refreshToken = generatorRefreshToken({ uid, role: 'admin' }, '1h');
      // complete
      return res // response client
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          maxAge: 1000 * 60 * 20,
          sameSite: 'strict',
          secure: process.env.BASE_URL ? true : undefined,
        })
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          maxAge: 1000 * 60 * 60,
          sameSite: 'strict',
          secure: process.env.BASE_URL ? true : undefined,
        })
        .send({ admin: { email: user.email, username: user.username } });
    } catch (error) {
      if (error.response && error.response.data) {
        const { message } = error.response.data.error;
        if (message === 'EMAIL_NOT_FOUND')
          return res.send({ success: false, message: '帳號或密碼錯誤' });
        if (message === 'INVALID_PASSWORD')
          return res.send({ success: false, message: '帳號或密碼錯誤' });
        if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER'))
          return res.send({
            success: false,
            message: '登入過於頻繁，請稍後在試',
          });
      }
      return res.status(500).send({ success: false, message: error.message });
    }
  },
);

module.exports = router;
