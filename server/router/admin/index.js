const router = require('express').Router();
const {
  // createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} = require('../../utils/promiseAuth');

router.post('/signin', async (req, res) => {
  const { email, password } = req.body;
  console.log(123);
  try {
    const { user } = await signInWithEmailAndPassword(email, password);
    res.send({ user: user.uid });
  } catch (error) {
    console.log(error);
    console.log(error.code);
    console.log(error.message);
    res.send({ error });
  }
});

module.exports = router;
