const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../connection/firebase-admin');

module.exports = {
  generatorAccessToken(payload, expiresIn) {
    return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
  },
  async generatorRefreshToken(payload, expiresIn) {
    const refreshToken = crypto.randomBytes(32).toString('hex');
    try {
      await db.ref(`/tokens/${refreshToken}`).set({
        iat: Date.now(),
        exp: Date.now() + expiresIn,
        ...payload,
      });
      return refreshToken;
    } catch (error) {
      return Promise.reject(error);
    }
  },
};
