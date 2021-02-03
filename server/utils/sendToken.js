import ms from 'ms';

export const sendAccessToken = (res, accessToken, path) => {
  return res.cookie('accessToken', accessToken, {
    httpOnly: true,
    maxAge: ms('15m'),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path,
  });
};
export const sendRefreshToken = (res, refreshToken, path) => {
  return res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    maxAge: ms('4h'),
    sameSite: 'strict',
    secure: !!process.env.ON_VERCEL,
    path,
  });
};
