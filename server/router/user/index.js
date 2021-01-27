const router = require('express').Router();
const axios = require('axios').default;
const ms = require('ms');
const { body, cookie, validationResult } = require('express-validator');
const { db, auth } = require('../../connection/firebase-admin');
const {
  generateAccessToken,
  generateRefreshToken,
} = require('../../utils/generateToken');

// signup
router.post(
  '/signup',
  body('username').isAlphanumeric().isLength({ min: 4, max: 14 }),
  body('email').isEmail(),
  body('password').isLength({ min: 6, max: 14 }),
  async (req, res) => {
    // check body
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { username, email, password } = req.body;
    try {
      // check username
      const users = (await db.ref('/users').once('value')).val() || {};
      const exist = Object.values(users).some((vl) => vl.username === username);
      if (exist) return res.send({ success: false, message: '用戶名已存在' }); // username already exist
      // create user
      const createRequest = { displayName: username, email, password };
      const { uid } = await auth.createUser(createRequest);
      // save user
      const role = 'user';
      const draws = 3; // number of draws
      await db.ref(`users/${uid}`).set({ username, email, role, draws });
      // end
      return res.send({ success: true, message: '註冊成功' });
    } catch (error) {
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

// signin
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
      // check username and role
      const target = usernameOrEmail.includes('@') ? 'email' : 'username';
      const users = (await db.ref('/users').once('value')).val() || {};
      const user = Object.values(users).find((vl) => {
        return vl[target] === usernameOrEmail && vl.role === 'user';
      });
      if (!user) return res.send({ success: false, message: '帳號或密碼錯誤' }); // username not found or role invalid
      // sign in
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_ADMIN_APIKEY}`;
      const payload = { email: user.email, password, returnSecureToken: false };
      const { data } = await axios.post(url, payload);
      // generate token
      const uid = data.localId;
      const role = 'user';
      const accessToken = generateAccessToken({ uid, role }, ms('15m'));
      const refreshToken = await generateRefreshToken({ uid, role }, ms('4h'));
      // end
      return res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          maxAge: ms('15m'),
          sameSite: 'strict',
          secure: process.env.BASE_URL || false,
          path: '/',
        })
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          maxAge: ms('4h'),
          sameSite: 'strict',
          secure: process.env.BASE_URL || false,
          path: '/api/user',
        })
        .send({
          success: true,
          user: { email: user.email, username: user.username },
        });
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const { message } = error.response.data.error;
        if (message === 'EMAIL_NOT_FOUND')
          return res.send({ success: false, message: '帳號或密碼錯誤' }); // email not found
        if (message === 'INVALID_PASSWORD')
          return res.send({ success: false, message: '帳號或密碼錯誤' }); // invalid password
        if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER'))
          return res.send({ success: false, message: '稍後再嘗試登入' }); // too many attempts try later
      }
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

// signout
router.post('/signout', cookie('refreshToken').notEmpty(), async (req, res) => {
  // check cookie
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.send({ success: true, message: '已登出' }); // avoid revoke token
  const { refreshToken: hashKey } = req.cookies;
  try {
    // current timestamp
    const now = Date.now();
    // check refresh token
    const tokens = (await db.ref('/tokens').once('value')).val() || {};
    const token = tokens[hashKey];
    if (!token && token.role !== 'user') {
      return res.send({ success: true, message: '已登出' }); // avoid revoke token
    }
    // revoke refresh tokens
    const updateTokens = Object.keys(tokens).reduce((arr, key) => {
      const revoke = tokens[key].exp < now || tokens[key].uid === token.uid;
      return { ...arr, [`${key}`]: revoke ? null : { ...tokens[key] } };
    }, {});
    await db.ref('tokens').update(updateTokens);
    // end
    return res
      .clearCookie('accessToken', { sameSite: 'strict', path: '/' })
      .clearCookie('refreshToken', { sameSite: 'strict', path: '/api/user' })
      .send({ success: true, message: '已登出' });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

// refresh
router.post('/refresh', cookie('refreshToken').notEmpty(), async (req, res) => {
  // check cookie
  const errs = validationResult(req);
  if (!errs.isEmpty()) return res.status(401).send({ success: false }); // invalid value
  const { refreshToken: hashKey } = req.cookies;
  try {
    // current timestamp
    const now = Date.now();
    // check refresh token
    const tokens = (await db.ref('/tokens').once('value')).val() || {};
    const token = tokens[hashKey];
    if (!token) return res.status(403).send({ success: false }); // refresh token not found
    if (token.exp < now) return res.status(403).send({ success: false }); // refresh token expired
    if (token.role !== 'user') return res.status(403).send({ success: false }); // role invalid
    // revoke refresh tokens
    const updateTokens = Object.keys(tokens).reduce((arr, key) => {
      const revoke = tokens[key].exp < now || tokens[key].uid === token.uid;
      return { ...arr, [`${key}`]: revoke ? null : { ...tokens[key] } };
    }, {});
    await db.ref('tokens').update(updateTokens);
    // generate token
    const { uid } = token;
    const role = 'user';
    const accessToken = generateAccessToken({ uid, role }, ms('15m'));
    const refreshToken = await generateRefreshToken({ uid, role }, ms('4h'));
    // end
    return res
      .cookie('accessToken', accessToken, {
        httpOnly: true,
        maxAge: ms('15m'),
        sameSite: 'strict',
        secure: process.env.BASE_URL || false,
        path: '/',
      })
      .cookie('refreshToken', refreshToken, {
        httpOnly: true,
        maxAge: ms('4h'),
        sameSite: 'strict',
        secure: process.env.BASE_URL || false,
        path: '/api/user',
      })
      .send({ success: true });
  } catch (error) {
    return res.status(500).send({ success: false, message: error.message }); // unknown error
  }
});

module.exports = router;
