const { sign } = require('jsonwebtoken');

const generateAccessToken = (payload, expiresIn) => {
  return sign(
    {
      uid: payload.uid,
      role: payload.role,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn },
  );
};

const generateRefreshToken = (payload, expiresIn) => {
  return sign(
    {
      uid: payload.uid,
      role: payload.role,
      tokenVersion: payload.tokenVersion, // for revoke token
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn },
  );
};

module.exports = { generateAccessToken, generateRefreshToken };
