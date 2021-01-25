const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db } = require('../connection/firebase-admin');

const generateAccessToken = (payload, expiresIn) => {
  return jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn });
};

const generateRefreshToken = async (payload, expiresIn) => {
  const refreshToken = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const setPayload = { iat: now, exp: now + expiresIn, ...payload };
  try {
    await db.ref(`/tokens/${refreshToken}`).set(setPayload);
    return refreshToken;
  } catch (error) {
    return Promise.reject(error);
  }
};

module.exports = { generateAccessToken, generateRefreshToken };
