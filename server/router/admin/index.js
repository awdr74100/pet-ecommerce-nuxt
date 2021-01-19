const router = require('express').Router();
// const { auth } = require('../../connection/firebase');
const { db } = require('../../connection/firebase-admin');

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { key } = await db.ref('/').push({ email, password });
    console.log(key);
    res.send({ email, password });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
