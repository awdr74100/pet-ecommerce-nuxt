import express from 'express';
import axios from 'axios';
import ms from 'ms';
import { header, query, validationResult } from 'express-validator';
import { stringify } from 'qs';
import { db } from '../../connection/firebase-admin';
import {
  generateAccessToken,
  generateRefreshToken,
} from '../../utils/generateToken';

const router = express.Router();

router.get(
  '/',
  header('referer').notEmpty(),
  query('provider').notEmpty(),
  async (req, res) => {
    // check header and query
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { referer } = req.headers;
    const { provider } = req.query;
    let url = '/';
    // google oauth action
    if (provider === 'google') {
      const queryString = stringify({
        scope: 'email profile',
        response_type: 'code',
        state: referer,
        redirect_uri: `${process.env.BASE_URL}/api/oauth/google`,
        client_id: process.env.GCP_CLIENT_ID,
      });
      url = `https://accounts.google.com/o/oauth2/v2/auth?${queryString}`;
    }
    // end
    return res.redirect(url);
  },
);

router.get(
  '/google',
  query('code').notEmpty(),
  query('state').notEmpty(),
  async (req, res) => {
    // check query
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const { code, state } = req.query;
    try {
      // exchange authorization code for access token
      const {
        data: { access_token: credential },
      } = await axios.post(
        'https://oauth2.googleapis.com/token',
        stringify({
          client_id: process.env.GCP_CLIENT_ID,
          client_secret: process.env.GCP_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: `${process.env.BASE_URL}/api/oauth/google`,
        }),
      );
      // sign in with oauth credential
      const {
        data: { email, localId, displayName, isNewUser },
      } = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${process.env.FIREBASE_ADMIN_APIKEY}`,
        {
          requestUri: process.env.BASE_URL,
          postBody: `access_token=${credential}&providerId=google.com`,
          returnSecureToken: false,
          returnIdpCredential: false,
        },
      );
      const uid = localId;
      // save user
      let user = '';
      if (isNewUser) {
        user = {
          username: displayName,
          email,
          role: 'user',
          draws: 3, // number of draws (only users)
          tokenVersion: 0,
          provider: 'google',
        };
        await db.ref(`/users/${uid}`).set(user);
      }
      // update user (custom -> google)
      if (!isNewUser) {
        user = (await db.ref(`/users/${uid}`).once('value')).val();
        if (user.username !== displayName) {
          user.username = displayName;
          user.provider = 'google';
          user.role = 'user';
          user.draws = user.draws || 3;
          await db.ref(`/users/${uid}`).update(user);
        }
      }
      // generate token
      const accessToken = generateAccessToken({ uid, ...user }, '15m');
      const refreshToken = generateRefreshToken({ uid, ...user }, '4h');
      // end
      return res
        .cookie('accessToken', accessToken, {
          httpOnly: true,
          maxAge: ms('15m'),
          sameSite: 'strict',
          secure: !!process.env.ON_VERCEL,
          path: '/',
        })
        .cookie('refreshToken', refreshToken, {
          httpOnly: true,
          maxAge: ms('4h'),
          sameSite: 'strict',
          secure: !!process.env.ON_VERCEL,
          path: '/api/user/refresh_token',
        })
        .redirect(state);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const { message } = error.response.data.error;
        return res.send({ success: false, message }); // other error
      }
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default router;
