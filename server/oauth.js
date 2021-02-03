import express from 'express';
import axios from 'axios';
import { header, query, validationResult } from 'express-validator';
import { stringify } from 'qs';
import { db } from './connection/firebase-admin';
import {
  generateAccessToken,
  generateRefreshToken,
} from './utils/generateToken';
import { sendAccessToken, sendRefreshToken } from './utils/sendToken';

const app = express();

app.disable('x-powered-by');

/* redirect */
app.get(
  '/',
  header('referer').notEmpty(),
  query('provider').notEmpty(),
  async (req, res) => {
    // check header and query
    const errs = validationResult(req);
    if (!errs.isEmpty()) return res.status(400).send({ errors: errs.array() }); // invalid value
    const [{ referer }, { provider }] = [req.headers, req.query];
    // redirect url
    let redirectUrl = '/';
    // google oauth
    if (provider === 'google') {
      redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?${stringify({
        scope: 'email profile',
        response_type: 'code',
        state: referer,
        redirect_uri: `${process.env.BASE_URL}/oauth/google`,
        client_id: process.env.GCP_CLIENT_ID,
      })}`;
    }
    // end
    return res.redirect(redirectUrl);
  },
);

/* google oauth */
app.get(
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
          code,
          client_id: process.env.GCP_CLIENT_ID,
          client_secret: process.env.GCP_CLIENT_SECRET,
          redirect_uri: `${process.env.BASE_URL}/oauth/google`,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      // sign in with oauth credential
      const {
        data: { localId, photoUrl, email, displayName, isNewUser },
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
      let user = {};
      // save user
      if (isNewUser) {
        user = {
          username: '',
          displayName,
          email,
          draws: 3, // number of draws (only user)
          role: 'user',
          tokenVersion: 0,
          providers: ['google'],
          photoUrl,
        };
        await db.ref(`/users/details/${uid}`).set(user);
      }
      // update user
      if (!isNewUser) {
        user = (await db.ref(`/users/details/${uid}`).once('value')).val();
        if (!user.providers.includes('google')) {
          user.displayName = displayName;
          user.photoUrl = photoUrl;
          user.providers = [...user.providers, 'google'];
          await db.ref(`/users/details/${uid}`).update(user);
        }
      }
      // generate token
      const accessToken = generateAccessToken({ uid, ...user }, '15m');
      const refreshToken = generateRefreshToken({ uid, ...user }, '4h');
      // end
      const queryString = stringify({
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
        role: user.role,
      });
      sendAccessToken(res, accessToken, '/');
      sendRefreshToken(res, refreshToken, `/api/${user.role}/refresh_token`);
      return res.redirect(`${state}?${queryString}`);
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        const { message } = error.response.data.error;
        return res.status(400).send({ success: false, message }); // other error
      }
      return res.status(500).send({ success: false, message: error.message }); // unknown error
    }
  },
);

export default app;
