import epxress from 'express';

const router = epxress.Router();

/* add product */
router.post('/', (req, res) => {
  res.send({ success: true, message: '新增成功' });
});

export default router;
